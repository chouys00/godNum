import assert from "node:assert/strict";
import { createApiScheduler, retryDelay } from "../../src/background/api-scheduler.js";

function harness(options = {}) {
  let time = 0;
  let stored;
  const writes = [];
  const dependencies = {
    now: () => time,
    sleep: async (ms) => { time += ms + (options.oversleep || 0); },
    load: async () => stored,
    save: async (value) => { stored = { ...value }; writes.push({ ...value }); }
  };
  return { dependencies, writes, now: () => time, advance: (ms) => { time += ms; } };
}

// Concurrent callers, adjacent batches and mixed endpoints share a single gate.
for (const oversleep of [0, 7000]) {
  const h = harness({ oversleep });
  const schedule = createApiScheduler(h.dependencies);
  const starts = [];
  await Promise.all(Array.from({ length: 90 }, (_, i) => {
    const kind = i % 3 === 0 ? "gallery" : "search";
    return schedule(kind, async () => {
      starts.push({ kind, at: h.now() });
      if (i % 7 === 0) h.advance(5000);
    });
  }));
  for (let i = 0; i < starts.length; i += 1) {
    const current = starts[i];
    const window = starts.filter((item) => item.at <= current.at && item.at > current.at - 60000);
    assert.ok(window.length <= 20, "all API requests stay below 20/min");
    assert.ok(window.filter((item) => item.kind === "search").length <= 10, "search stays below 10/min");
    if (i) assert.ok(current.at - starts[i - 1].at >= 3100, "no timer catch-up burst");
  }
}

const h = harness();
let schedule = createApiScheduler(h.dependencies);
await schedule("search", async () => {});
schedule = createApiScheduler(h.dependencies);
await schedule("search", async () => assert.equal(h.now(), 6100));
await assert.rejects(schedule("gallery", async (backoff) => {
  backoff("120");
  throw new Error("429");
}), /429/);
const failedAt = h.now();
schedule = createApiScheduler(h.dependencies);
await schedule("gallery", async () => assert.ok(h.now() >= failedAt + 120000));
assert.ok(h.writes.every((value) => Object.keys(value).sort().join() === "globalAt,searchAt"), "store contains no query data");

// Simulate termination during fetch, before the completion write.
const crash = harness();
const first = createApiScheduler(crash.dependencies);
await first("search", async () => {
  const restarted = createApiScheduler(crash.dependencies);
  await restarted("gallery", async () => assert.equal(crash.now(), 61000));
});

let requested = false;
const cancelled = createApiScheduler(harness().dependencies);
await assert.rejects(cancelled("gallery", async () => { requested = true; }, () => true), /取消/);
assert.equal(requested, false);
const broken = createApiScheduler({ ...harness().dependencies, save: async () => { throw new Error("disk failure"); } });
await assert.rejects(broken("gallery", async () => { requested = true; }), /disk failure/);
assert.equal(requested, false, "storage failure must fail closed");
const corrupt = createApiScheduler({ ...harness().dependencies, load: async () => ({ globalAt: -1 }) });
await assert.rejects(corrupt("gallery", async () => { requested = true; }), /無效/);
assert.equal(requested, false);

const epoch = Date.parse("2026-09-13T00:00:00Z");
assert.equal(retryDelay("120", epoch), 120000);
assert.equal(retryDelay("Sun, 13 Sep 2026 00:02:00 GMT", epoch), 120000);
for (const value of [null, "", "invalid", "0", "-1", "99999999999999999999999999"]) {
  assert.equal(retryDelay(value, epoch), 61000);
}
console.log("api-scheduler.test.mjs: rate windows, restarts, cooldown, cancellation and persistence failures passed");

import assert from "node:assert/strict";
import { createRateStore } from "../../src/background/api-scheduler.js";

function event() {
  const listeners = [];
  return { addListener: (listener) => listeners.push(listener), fire: (...args) => listeners.forEach((listener) => listener(...args)) };
}

// Storage keeps only two timestamps, never a query, title, URL or API payload.
let stored;
const storage = {
  get: async (key) => ({ [key]: stored && { ...stored } }),
  set: async (value) => { assert.deepEqual(Object.keys(value), ["apiPacingV1"]); stored = { ...value.apiPacingV1 }; }
};
const store = createRateStore(storage);
await store.save({ globalAt: 0, searchAt: 0, query: "must not persist" });
assert.deepEqual(await store.load(), { globalAt: 0, searchAt: 0 });

const originals = { chrome: globalThis.chrome, fetch: globalThis.fetch, setTimeout, clearTimeout, now: Date.now };
let time = 0;
let nextTimer = 0;
const timers = new Map();
const calls = [];
let responseMode = "normal";
let sharedTitle = false;
const runtime = { id: "test", getURL: (path) => `chrome-extension://test/${path}`, onConnect: event(), onMessage: event(), onInstalled: event() };
globalThis.chrome = { runtime, storage: { local: storage } };
Date.now = () => time;
globalThis.setTimeout = (callback, ms) => { const id = ++nextTimer; timers.set(id, { at: time + ms, callback }); return id; };
globalThis.clearTimeout = (id) => timers.delete(id);
globalThis.fetch = (url, options) => new Promise((resolve, reject) => {
  calls.push({ url, at: time });
  assert.equal(options.credentials, "omit");
  assert.equal(options.redirect, "error");
  const isSearch = url.includes("/search?");
  const id = Number(url.split("/").pop());
  const status = responseMode === "429" ? 429 : responseMode === "missing" && id === 123450 ? 404 : 200;
  const timer = setTimeout(() => resolve({
    status, ok: status === 200, headers: { get: () => "120" },
    json: async () => isSearch ? { result: [] } : { id, title: { japanese: sharedTitle ? "同じ作品" : `作品${id}` }, tags: [], num_pages: 20 }
  }), 100);
  options.signal.addEventListener("abort", () => {
    clearTimeout(timer);
    const error = new Error("aborted"); error.name = "AbortError"; reject(error);
  }, { once: true });
});

async function until(predicate) {
  for (let i = 0; i < 20000; i += 1) {
    for (let j = 0; j < 30; j += 1) await Promise.resolve();
    if (predicate()) return;
    const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
    if (next) { timers.delete(next[0]); time = next[1].at; next[1].callback(); }
  }
  throw new Error("simulation did not finish");
}

function port(senderUrl = runtime.getURL("src/ui/side-panel-v2.html")) {
  const messages = [];
  const connection = {
    name: "lookup", sender: { id: "test", url: senderUrl },
    onMessage: event(), onDisconnect: event(), disconnected: false,
    postMessage(message) { messages.push({ ...message, at: time }); },
    disconnect() { this.disconnected = true; this.onDisconnect.fire(); }
  };
  runtime.onConnect.fire(connection);
  return { connection, messages, done: () => messages.some((message) => message.type === "DONE") };
}

try {
  await import("../../src/background/service-worker-v2.js");
  const denied = port("https://nhentai.net/");
  assert.equal(denied.connection.disconnected, true);
  const invalid = port();
  invalid.connection.onMessage.fire({ type: "BATCH_LOOKUP", numbers: ["bad"] });
  assert.equal(invalid.messages[0].type, "ERROR");
  assert.equal(calls.length, 0);

  const batch = port();
  const numbers = Array.from({ length: 10 }, (_, i) => String(123450 + i));
  batch.connection.onMessage.fire({ type: "BATCH_LOOKUP", numbers });
  batch.connection.onMessage.fire({ type: "BATCH_LOOKUP", numbers }); // replay ignored
  await until(batch.done);
  assert.equal(calls.length, 20);
  assert.equal(batch.messages.filter((message) => message.type === "SOURCE").length, 10);
  assert.equal(batch.messages.filter((message) => message.type === "RESULT").length, 10);
  const firstSource = batch.messages.find((message) => message.type === "SOURCE").at;
  const firstResult = batch.messages.find((message) => message.type === "RESULT").at;
  const finishedAt = time;
  assert.equal(firstSource, 100);
  assert.equal(firstResult, 3200);
  assert.equal(finishedAt, 59000);
  console.log(`lookup-stream: simulated 100ms API, 10 distinct titles: first metadata ${firstSource}ms, first complete ${firstResult}ms, batch ${finishedAt}ms (old display waited for batch)`);

  sharedTitle = true;
  const countBefore = calls.length;
  const same = port();
  same.connection.onMessage.fire({ type: "BATCH_LOOKUP", numbers: numbers.slice(0, 3) });
  await until(same.done);
  assert.equal(calls.length - countBefore, 4, "three shared titles use three gallery calls and one search");

  const stop = port();
  const countAtStop = calls.length;
  stop.connection.onMessage.fire({ type: "BATCH_LOOKUP", numbers });
  await until(() => stop.messages.some((message) => message.type === "SOURCE"));
  stop.connection.disconnect();
  await until(() => timers.size === 0);
  assert.equal(calls.length - countAtStop, 1, "closing panel cancels queued search and remaining galleries");

  responseMode = "429";
  const limited = port();
  limited.connection.onMessage.fire({ type: "BATCH_LOOKUP", numbers: [numbers[0]] });
  await until(limited.done);
  assert.equal(limited.messages.find((message) => message.type === "RESULT").entry.ok, false);
  const limitedAt = time;
  responseMode = "normal";
  const countAtLimit = calls.length;
  const later = port();
  later.connection.onMessage.fire({ type: "BATCH_LOOKUP", numbers: [numbers[0]] });
  await until(later.done);
  assert.ok(calls[countAtLimit].at >= limitedAt + 120000, "429 cools all later panel requests");

  responseMode = "missing";
  const mixed = port();
  mixed.connection.onMessage.fire({ type: "BATCH_LOOKUP", numbers: numbers.slice(0, 2) });
  await until(mixed.done);
  assert.deepEqual(mixed.messages.filter((message) => message.type === "RESULT").map((message) => message.entry.ok), [false, true]);

  responseMode = "normal";
  const left = port();
  const right = port();
  left.connection.onMessage.fire({ type: "BATCH_LOOKUP", numbers: [numbers[0]] });
  right.connection.onMessage.fire({ type: "BATCH_LOOKUP", numbers: [numbers[1]] });
  await until(() => left.done() && right.done());
  assert.deepEqual(left.messages.filter((message) => message.type === "SOURCE").map((message) => message.number), [numbers[0]]);
  assert.deepEqual(right.messages.filter((message) => message.type === "SOURCE").map((message) => message.number), [numbers[1]]);
  for (const call of calls) {
    const window = calls.filter((item) => item.at <= call.at && item.at > call.at - 60000);
    assert.ok(window.length <= 20);
    assert.ok(window.filter((item) => item.url.includes("/search?")).length <= 10);
  }

  const activeStop = port();
  const countBeforeActive = calls.length;
  activeStop.connection.onMessage.fire({ type: "BATCH_LOOKUP", numbers });
  await until(() => calls.length > countBeforeActive);
  activeStop.connection.disconnect();
  await until(() => timers.size === 0);
  assert.equal(calls.length, countBeforeActive + 1, "active request is aborted without subsequent requests");
  assert.deepEqual(Object.keys(stored).sort(), ["globalAt", "searchAt"]);
} finally {
  globalThis.chrome = originals.chrome;
  globalThis.fetch = originals.fetch;
  globalThis.setTimeout = originals.setTimeout;
  globalThis.clearTimeout = originals.clearTimeout;
  Date.now = originals.now;
}
console.log("lookup-stream.test.mjs: streaming, deduplication, sender validation, cancellation and 429 passed");

import assert from "node:assert/strict";

class Element {
  constructor() { this.children = []; this.listeners = {}; this.dataset = {}; this.attributes = {}; }
  append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  remove() { this.parent.children = this.parent.children.filter((node) => node !== this); }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  querySelector(selector) {
    for (const child of this.children) {
      if (child.className === selector.slice(1)) return child;
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }
}
const elements = Object.fromEntries(["lookup-form", "lookup-numbers", "lookup-button", "status", "batch-result-list"].map((id) => [id, new Element()]));
let receive;
let disconnect;
let sent;
let heartbeatCleared = 0;
const originals = { document: globalThis.document, window: globalThis.window, chrome: globalThis.chrome, setInterval, clearInterval };
globalThis.document = { querySelector: (selector) => elements[selector.slice(1)], createElement: () => new Element() };
globalThis.window = { addEventListener() {}, removeEventListener() {} };
globalThis.setInterval = () => 1;
globalThis.clearInterval = () => { heartbeatCleared += 1; };
globalThis.chrome = {
  runtime: {
    connect: () => ({
      onMessage: { addListener: (callback) => { receive = callback; } },
      onDisconnect: { addListener: (callback) => { disconnect = callback; } },
      postMessage: (message) => { sent = message; }, disconnect: () => disconnect()
    })
  }
};
try {
  await import("../../src/ui/side-panel-v2.js");
  elements["lookup-numbers"].value = "123456 234567";
  const submit = elements["lookup-form"].listeners.submit({ preventDefault() {} });
  assert.deepEqual(sent.numbers, ["123456", "234567"]);
  assert.equal(elements["lookup-button"].disabled, true);
  const source = { number: "123456", searchTitle: "作品", sourceUrl: "https://nhentai.net/g/123456/", artists: [], groups: [] };
  receive({ type: "SOURCE", number: "123456", source });
  const list = elements["batch-result-list"];
  assert.equal(list.hidden, false);
  assert.equal(list.children.length, 1);
  const firstCard = list.children[0];
  const sourceFields = firstCard.querySelector(".source-fields");
  assert.match(firstCard.querySelector(".versions-pending").textContent, /正在查詢/);
  receive({ type: "RESULT", entry: { number: "123456", ok: true, result: { source, chineseVersions: [], versionsError: null } } });
  assert.equal(list.children.length, 1);
  assert.equal(firstCard.querySelector(".source-fields"), sourceFields, "source fields retain keyboard focus when editions arrive");
  assert.equal(firstCard.querySelector(".versions-pending"), null);
  receive({ type: "RESULT", entry: { number: "234567", ok: false, error: "找不到這個作品。" } });
  receive({ type: "DONE" });
  await submit;
  assert.equal(list.children.length, 2);
  assert.match(elements.status.textContent, /1\/2/);
  assert.equal(elements["lookup-button"].disabled, false);
  assert.equal(heartbeatCleared, 1);

  const next = elements["lookup-form"].listeners.submit({ preventDefault() {} });
  assert.equal(list.children.length, 0, "new batch clears previous data");
  receive({ type: "SOURCE", number: "123456", source });
  disconnect();
  await next;
  assert.match(list.children[0].querySelector(".versions-pending").textContent, /已中斷/);
  assert.equal(elements["lookup-button"].disabled, false);
  assert.equal(heartbeatCleared, 2);
} finally {
  globalThis.document = originals.document;
  globalThis.window = originals.window;
  globalThis.chrome = originals.chrome;
  globalThis.setInterval = originals.setInterval;
  globalThis.clearInterval = originals.clearInterval;
}
console.log("side-panel-stream.test.mjs: immediate display, stable fields, partial failure and disconnect cleanup passed");

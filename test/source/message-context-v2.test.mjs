import assert from "node:assert/strict";
import { isSidePanelSender } from "../../src/core/message-context-v2.js";

const base = "chrome-extension://extension-id/";
assert.equal(isSidePanelSender({
  id: "extension-id",
  url: "chrome-extension://extension-id/src/ui/side-panel-v2.html"
}, "extension-id", base), true);
assert.equal(isSidePanelSender({
  id: "extension-id",
  url: "chrome-extension://extension-id/src/ui/side-panel.html"
}, "extension-id", base), false);
assert.equal(isSidePanelSender({
  id: "other-id",
  url: "chrome-extension://extension-id/src/ui/side-panel-v2.html"
}, "extension-id", base), false);
assert.equal(isSidePanelSender(null, "extension-id", base), false);

console.log("message-context-v2.test.mjs: all assertions passed");

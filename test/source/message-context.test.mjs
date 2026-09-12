import assert from "node:assert/strict";
import {
  isCurrentSourceMessageSender,
  isCurrentDlsiteMessageSender,
  isExtensionMessageSender
} from "../../src/core/message-context.js";

const runtimeId = "extension-id";
const extensionBaseUrl = "chrome-extension://extension-id/";
assert.equal(
  isExtensionMessageSender({ id: runtimeId, url: extensionBaseUrl + "src/ui/side-panel.html" }, runtimeId, extensionBaseUrl),
  true
);
assert.equal(isExtensionMessageSender({ id: "other", url: extensionBaseUrl }, runtimeId, extensionBaseUrl), false);
assert.equal(isExtensionMessageSender({ id: runtimeId, url: "https://nhentai.net/" }, runtimeId, extensionBaseUrl), false);
assert.equal(isExtensionMessageSender({ id: runtimeId, url: extensionBaseUrl + "src/ui/other.html" }, runtimeId, extensionBaseUrl), false);
assert.equal(isExtensionMessageSender({ id: runtimeId, url: extensionBaseUrl + "src/ui/side-panel.html?x=1" }, runtimeId, extensionBaseUrl), false);
assert.equal(isExtensionMessageSender({ id: runtimeId }, runtimeId, extensionBaseUrl), false);

const state = {
  currentLookup: {
    number: "460733",
    sourceUrl: "https://nhentai.net/g/460733/",
    sourceTabId: 17
  }
};
assert.equal(
  isCurrentSourceMessageSender(
    { id: runtimeId, tab: { id: 17, url: "https://nhentai.net/g/460733/" } },
    state,
    runtimeId
  ),
  true
);
for (const sender of [
  { id: "other", tab: { id: 17, url: "https://nhentai.net/g/460733/" } },
  { id: runtimeId, tab: { id: 18, url: "https://nhentai.net/g/460733/" } },
  { id: runtimeId, tab: { id: 17, url: "https://nhentai.net/g/299075/" } },
  { id: runtimeId, tab: { id: 17, url: "https://example.test/g/460733/" } },
  { id: runtimeId }
]) {
  assert.equal(isCurrentSourceMessageSender(sender, state, runtimeId), false);
}

console.log("message-context.test.mjs: all assertions passed");

const dlsiteState = {
  currentLookup: {
    dlsite: {
      status: "searching",
      activeUrl: "https://www.dlsite.com/maniax/fsr/=/keyword/%E6%9E%B6%E7%A9%BA",
      activeTabId: 23
    }
  }
};
assert.equal(isCurrentDlsiteMessageSender({ id: runtimeId, tab: { id: 23, url: dlsiteState.currentLookup.dlsite.activeUrl } }, dlsiteState, runtimeId), true);
assert.equal(isCurrentDlsiteMessageSender({ id: runtimeId, tab: { id: 24, url: dlsiteState.currentLookup.dlsite.activeUrl } }, dlsiteState, runtimeId), false);
assert.equal(isCurrentDlsiteMessageSender({ id: "other", tab: { id: 23, url: dlsiteState.currentLookup.dlsite.activeUrl } }, dlsiteState, runtimeId), false);
assert.equal(isCurrentDlsiteMessageSender({ id: runtimeId, tab: { id: 23, url: "https://example.test/" } }, dlsiteState, runtimeId), false);

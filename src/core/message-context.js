import { isApprovedSourceUrl } from "./lookup.js";
import { isApprovedDlsiteSearchUrl } from "../adapters/dlsite/dlsite-adapter.js";

export function isExtensionMessageSender(sender, runtimeId, extensionBaseUrl) {
  if (!sender || sender.id !== runtimeId || typeof sender.url !== "string") return false;
  try {
    const expectedUrl = new URL("src/ui/side-panel.html", extensionBaseUrl);
    const senderUrl = new URL(sender.url);
    return senderUrl.href === expectedUrl.href && !senderUrl.username && !senderUrl.password;
  } catch {
    return false;
  }
}

export function isCurrentSourceMessageSender(sender, state, runtimeId) {
  const lookup = state?.currentLookup;
  return Boolean(
    sender &&
      sender.id === runtimeId &&
      sender.tab &&
      Number.isInteger(sender.tab.id) &&
      isApprovedSourceUrl(sender.tab.url) &&
      lookup &&
      sender.tab.url === lookup.sourceUrl &&
      (lookup.sourceTabId === null || lookup.sourceTabId === sender.tab.id)
  );
}

export function isCurrentDlsiteMessageSender(sender, state, runtimeId) {
  const dlsite = state?.currentLookup?.dlsite;
  return Boolean(
    sender && sender.id === runtimeId && sender.tab && Number.isInteger(sender.tab.id) &&
    isApprovedDlsiteSearchUrl(sender.tab.url) && dlsite && dlsite.status === "searching" &&
    sender.tab.url === dlsite.activeUrl && (dlsite.activeTabId === null || dlsite.activeTabId === sender.tab.id)
  );
}

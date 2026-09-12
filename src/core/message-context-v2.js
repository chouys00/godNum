export function isSidePanelSender(sender, runtimeId, extensionBaseUrl) {
  if (!sender || sender.id !== runtimeId || typeof sender.url !== "string") return false;
  try {
    const expectedUrl = new URL("src/ui/side-panel-v2.html", extensionBaseUrl);
    const senderUrl = new URL(sender.url);
    return senderUrl.href === expectedUrl.href && !senderUrl.username && !senderUrl.password;
  } catch {
    return false;
  }
}

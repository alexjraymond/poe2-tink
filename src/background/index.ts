// Background service worker (Manifest V3).
// Runs in the extension's background context; no DOM access here.

chrome.runtime.onInstalled.addListener((details) => {
  console.log("[POE2 Tink] Extension installed:", details.reason);
});

// Example message handler. Content scripts / popup can call:
//   chrome.runtime.sendMessage({ type: "PING" }, (res) => ...)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PING") {
    sendResponse({ type: "PONG", timestamp: Date.now() });
  }
  // Return true to indicate we may respond asynchronously.
  return true;
});

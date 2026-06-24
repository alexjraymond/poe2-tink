// Content script. Runs in the context of matched web pages and has DOM access.

console.log("[POE2 Tink] Content script loaded on:", window.location.href);

// Example: ping the background service worker on load.
chrome.runtime.sendMessage({ type: "PING" }, (response) => {
  if (chrome.runtime.lastError) {
    return;
  }
  console.log("[POE2 Tink] Background responded:", response);
});

export {};

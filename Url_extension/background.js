// ThreatLens - Chrome Extension Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log("ThreatLens extension installed");

  chrome.storage.local.get(["userEmail", "backendUrl"]).then((result) => {
    if (!result.userEmail || !result.backendUrl) {
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#ff4444" });
      chrome.action.setTitle({
        title: "ThreatLens - Configuration Required"
      });
    } else {
      chrome.action.setBadgeText({ text: "" });
      chrome.action.setTitle({
        title: "ThreatLens - Active"
      });
    }
  });
});

// Listen for changes to the saved configuration
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (
    namespace === "local" &&
    (changes.userEmail || changes.backendUrl)
  ) {
    chrome.storage.local.get(["userEmail", "backendUrl"]).then((result) => {
      if (result.userEmail && result.backendUrl) {
        chrome.action.setBadgeText({ text: "" });
        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
        chrome.action.setTitle({
          title: "ThreatLens - Active"
        });

        // Notify open Gmail tabs that the configuration has changed
        chrome.tabs.query(
          { url: "https://mail.google.com/*" },
          (tabs) => {
            tabs.forEach((tab) => {
              if (tab.id !== undefined) {
                chrome.tabs.sendMessage(tab.id, {
                  action: "settingsUpdated",
                  settings: result
                }).catch(() => {
                  // Ignore tabs where the content script is unavailable
                });
              }
            });
          }
        );
      } else {
        chrome.action.setBadgeText({ text: "!" });
        chrome.action.setBadgeBackgroundColor({ color: "#ff4444" });
        chrome.action.setTitle({
          title: "ThreatLens - Configuration Required"
        });
      }
    });
  }
});

// Receive and store phishing detection results
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "logPhishingResult") {
    console.log("ThreatLens phishing detection result:", request.data);

    chrome.storage.local.get(["detectionHistory"]).then((result) => {
      const history = result.detectionHistory || [];

      history.unshift({
        ...request.data,
        timestamp: Date.now(),
        tabId: sender.tab?.id
      });

      // Keep only the latest 100 detection results
      if (history.length > 100) {
        history.splice(100);
      }

      chrome.storage.local.set({
        detectionHistory: history
      });
    });
  }

  sendResponse({ success: true });
  return true;
});
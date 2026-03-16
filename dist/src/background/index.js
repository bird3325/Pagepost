(function() {
  "use strict";
  console.log("PagePost Background Worker Initialized");
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "create-note",
      title: "PagePost: 여기에 메모 남기기",
      contexts: ["all"]
    });
  });
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "create-note" && tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "CREATE_NOTE_CLICK" }).catch((error) => {
        console.warn("SendMessage failed (likely context invalidated or content script not ready):", error.message);
      });
    }
  });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url || changeInfo.status === "complete") {
      chrome.tabs.get(tabId, (tab) => {
        if (tab.url) {
          chrome.tabs.sendMessage(tabId, {
            type: "URL_UPDATED",
            url: tab.url
          }).catch(() => {
          });
        }
      });
    }
  });
  chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.frameId === 0) {
      chrome.tabs.sendMessage(details.tabId, {
        type: "URL_UPDATED",
        url: details.url
      }).catch(() => {
      });
    }
  });
})();

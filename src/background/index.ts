/// <reference types="chrome" />

console.log('PagePost Background Worker Initialized');

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "create-note",
        title: "PagePost: 여기에 메모 남기기",
        contexts: ["all"]
    });
});

chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    if (info.menuItemId === "create-note" && tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "CREATE_NOTE_CLICK" }).catch((error) => {
            console.warn('SendMessage failed (likely context invalidated or content script not ready):', error.message);
        });
    }
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    // Also notify on status complete to be safe
    if (changeInfo.url || changeInfo.status === 'complete') {
        chrome.tabs.get(tabId, (tab) => {
            if (tab.url) {
                chrome.tabs.sendMessage(tabId, {
                    type: "URL_UPDATED",
                    url: tab.url
                }).catch(() => { });
            }
        });
    }
});

// Robust SPA navigation detection
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.frameId === 0) { // Only main frame
        chrome.tabs.sendMessage(details.tabId, {
            type: "URL_UPDATED",
            url: details.url
        }).catch(() => { });
    }
});

// Handle screen capture requests
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'CAPTURE_TAB') {
        chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                console.error('Capture failed:', chrome.runtime.lastError.message);
                sendResponse({ error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ dataUrl });
            }
        });
        return true; // Keep message channel open for async response
    }

    if (message.type === 'SYNC_NOTE') {
        const { service, data, apiKeys } = message;

        const performSync = async () => {
            try {
                if (service === 'notion') {
                    // 1. Get database schema to find the title property name
                    const dbResponse = await fetch(`https://api.notion.com/v1/databases/${apiKeys.notionDatabaseId}`, {
                        headers: {
                            'Authorization': `Bearer ${apiKeys.notionToken}`,
                            'Notion-Version': '2022-06-28'
                        }
                    });

                    if (!dbResponse.ok) {
                        const errorData = await dbResponse.json();
                        throw new Error(`Database Access Error: ${errorData.message || dbResponse.status}`);
                    }

                    const dbData = await dbResponse.json();
                    const titleProperty = Object.entries(dbData.properties).find(([_, prop]: any) => prop.type === 'title');
                    const titleKey = titleProperty ? titleProperty[0] : 'Name'; // Fallback

                    // 2. Create page with content in blocks (more robust than properties)
                    const response = await fetch('https://api.notion.com/v1/pages', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKeys.notionToken}`,
                            'Content-Type': 'application/json',
                            'Notion-Version': '2022-06-28'
                        },
                        body: JSON.stringify({
                            parent: { database_id: apiKeys.notionDatabaseId },
                            properties: {
                                [titleKey]: { title: [{ text: { content: data.content.substring(0, 100) || "PagePost Note" } }] }
                            },
                            children: [
                                {
                                    object: 'block',
                                    type: 'heading_2',
                                    heading_2: { rich_text: [{ text: { content: "📝 PagePost Memo" } }] }
                                },
                                {
                                    object: 'block',
                                    type: 'paragraph',
                                    paragraph: {
                                        rich_text: [
                                            { text: { content: data.content }, annotations: { italic: true } }
                                        ]
                                    }
                                },
                                {
                                    object: 'block',
                                    type: 'divider',
                                    divider: {}
                                },
                                {
                                    object: 'block',
                                    type: 'paragraph',
                                    paragraph: {
                                        rich_text: [
                                            { text: { content: "🌐 Source: " }, annotations: { bold: true } },
                                            { text: { content: data.url }, href: data.url }
                                        ]
                                    }
                                },
                                {
                                    object: 'block',
                                    type: 'paragraph',
                                    paragraph: {
                                        rich_text: [
                                            { text: { content: "🏢 Domain: " }, annotations: { bold: true } },
                                            { text: { content: data.domain } }
                                        ]
                                    }
                                }
                            ]
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || `Notion Error: ${response.status}`);
                    }

                    const result = await response.json();
                    sendResponse({ ok: true, id: result.id });

                } else if (service === 'slack') {
                    const response = await fetch(apiKeys.slackWebhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: `*PagePost Note Captured!*\n\n*Domain:* ${data.domain}\n*URL:* ${data.url}\n*Content:* \n> ${data.content}\n\n_Sent via PagePost Productivity_`
                        })
                    });
                    if (!response.ok) throw new Error(await response.text());
                    sendResponse({ ok: true, id: `slack-${Date.now()}` });

                } else if (service === 'trello') {
                    const params = new URLSearchParams({
                        name: `PagePost: ${data.domain}`,
                        desc: `${data.content}\n\nURL: ${data.url}`,
                        idList: apiKeys.trelloListId,
                        key: apiKeys.trelloKey,
                        token: apiKeys.trelloToken
                    });
                    const response = await fetch(`https://api.trello.com/1/cards?${params.toString()}`, {
                        method: 'POST'
                    });
                    if (!response.ok) throw new Error(await response.text());
                    const result = await response.json();
                    sendResponse({ ok: true, id: result.id });
                }
            } catch (err: any) {
                console.error(`PagePost: ${service} sync error:`, err);
                sendResponse({ ok: false, error: err.message });
            }
        };

        performSync();
        return true;
    }
});

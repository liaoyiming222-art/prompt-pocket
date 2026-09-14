// Window-scoped visibility survives service worker suspension.
const panelKey = windowId => `promptPocketPanel:${windowId}`;
const closedTabs = new Set();
chrome.action.onClicked.addListener(tab => { closedTabs.delete(tab.id); });
async function panelVisible(windowId) {
  return Boolean((await chrome.storage.session.get(panelKey(windowId)))[panelKey(windowId)]);
}
async function setPanelVisible(windowId, visible) {
  await chrome.storage.session.set({ [panelKey(windowId)]: visible });
  const tabs = await chrome.tabs.query({ windowId });
  await Promise.all(tabs.map(tab => chrome.tabs.sendMessage(tab.id, {
    channel: "prompt-pocket-control", action: "visibility", visible: !visible && !closedTabs.has(tab.id),
  }).catch(() => {})));
}
chrome.sidePanel.onOpened?.addListener(({ windowId }) => { setPanelVisible(windowId, true); });
chrome.sidePanel.onClosed?.addListener(({ windowId }) => { setPanelVisible(windowId, false); });
chrome.tabs.onRemoved.addListener(id => closedTabs.delete(id));
chrome.windows.onRemoved.addListener(id => chrome.storage.session.remove(panelKey(id)));

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.channel !== "prompt-pocket-sidebar" || sender.id !== chrome.runtime.id) return;
  let operation;
  try {
    if (sender.tab && sender.url !== chrome.runtime.getURL("sidebar.html")) {
      const { windowId, id } = sender.tab;
      if (message.action === "open") {
        // Call before any await so the orb click retains its user gesture.
        operation = chrome.sidePanel.open({ windowId }).then(() => setPanelVisible(windowId, true));
      } else if (message.action === "visibility") {
        operation = panelVisible(windowId).then(open => ({ visible: !open && !closedTabs.has(id) }));
      } else if (message.action === "input-changed") {
        operation = chrome.runtime.sendMessage({ channel: "prompt-pocket-input", tabId: id, windowId }).catch(() => {});
      } else return;
    } else if (message.action === "close") {
      operation = (async () => {
        if (message.dismiss) {
          const [tab] = await chrome.tabs.query({ active: true, windowId: message.windowId });
          if (tab) closedTabs.add(tab.id);
        }
        await chrome.sidePanel.close({ windowId: message.windowId });
        await setPanelVisible(message.windowId, false);
      })();
    } else if (message.action === "page") {
      operation = (async () => {
        const [tab] = await chrome.tabs.query({ active: true, windowId: message.windowId });
        if (!tab || (message.tabId != null && message.tabId !== tab.id)) throw Error("页面已切换，请重新操作");
        const result = await chrome.tabs.sendMessage(tab.id, {
          channel: "prompt-pocket-control", action: message.operation, content: message.content,
        });
        return { ...result, tabId: tab.id };
      })();
    } else return;
  } catch (error) { respond({ ok: false, error: error.message }); return; }
  Promise.resolve(operation).then(result => respond({ ok: true, ...result }))
    .catch(error => respond({ ok: false, error: error.message || "当前网页不支持读取或插入" }));
  return true;
});

// Populate pages that were already open when this extension was installed/reloaded.
async function initializeOpenPages() {
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  await Promise.all(tabs.map(tab => chrome.scripting.executeScript({
    target: { tabId: tab.id }, files: ["content-widget.js"],
  }).catch(() => {})));
}
chrome.runtime.onInstalled.addListener(initializeOpenPages);

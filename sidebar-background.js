// Window-scoped visibility survives service worker suspension.
const panelKey = windowId => `promptPocketPanel:${windowId}`;
const dismissedKey = id => `promptPocketDismissed:${id}`;
const minimizeKey = id => `promptPocketMinimizing:${id}`;
async function orbVisible(id) {
  const state = await chrome.storage.session.get([panelKey(id), dismissedKey(id)]);
  return !state[panelKey(id)] && !state[dismissedKey(id)];
}
async function resumeWidget(id) {
  await chrome.storage.session.remove(dismissedKey(id));
  await setPanelVisible(id, await panelVisible(id));
}
async function panelVisible(windowId) {
  return Boolean((await chrome.storage.session.get(panelKey(windowId)))[panelKey(windowId)]);
}
async function setPanelVisible(windowId, visible) {
  await chrome.storage.session.set({ [panelKey(windowId)]: visible });
  const showOrb = await orbVisible(windowId);
  const tabs = await chrome.tabs.query({ windowId });
  await Promise.all(tabs.map(tab => chrome.tabs.sendMessage(tab.id, {
    channel: "prompt-pocket-control", action: "visibility", visible: showOrb,
  }).catch(() => {})));
}
chrome.sidePanel.onOpened?.addListener(({ windowId }) => {
  chrome.storage.session.remove([dismissedKey(windowId), minimizeKey(windowId)])
    .then(() => setPanelVisible(windowId, true));
});
async function handlePanelClosed(windowId) {
  const key = minimizeKey(windowId);
  const state = await chrome.storage.session.get(key);
  await chrome.storage.session.set({ [dismissedKey(windowId)]: !state[key] });
  await chrome.storage.session.remove(key);
  await setPanelVisible(windowId, false);
}
chrome.sidePanel.onClosed?.addListener(({ windowId }) => { handlePanelClosed(windowId); });
chrome.windows.onRemoved.addListener(id => chrome.storage.session.remove([panelKey(id), dismissedKey(id), minimizeKey(id)]));

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
        operation = orbVisible(windowId).then(visible => ({ visible }));
      } else if (message.action === "input-changed") {
        operation = chrome.runtime.sendMessage({ channel: "prompt-pocket-input", tabId: id, windowId }).catch(() => {});
      } else return;
    } else if (message.action === "close") {
      operation = (async () => {
        await chrome.storage.session.set({ [minimizeKey(message.windowId)]: true });
        try {
          await chrome.sidePanel.close({ windowId: message.windowId });
        } catch (error) {
          await chrome.storage.session.remove(minimizeKey(message.windowId));
          throw error;
        }
        await chrome.storage.session.remove(dismissedKey(message.windowId));
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

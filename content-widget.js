(() => {
  if (window.top !== window || document.getElementById("prompt-pocket-host")) return;

  const sidebar = location.protocol === "chrome-extension:" && location.pathname === "/sidebar.html";
  const t = PromptPocketI18n.t;
  if (sidebar) {
    document.documentElement.lang = PromptPocketI18n.locale;
    document.title = t("extensionName");
  }
  let windowId, capturedSource = null, captureSequence = 0;
  // Generated from icons/brand.svg by icons/export-brand.mjs.
  const BRAND_ICON_DATA = "data:image/png;base64,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";
  const STORAGE_KEY = "promptPocketData";
  const POSITION_KEY = "promptPocketWidgetPosition";
  const POSITION_MODEL = "box-v1";
  let preferredPosition = null;
  let positionChangeSerial = 0;
  const ORB_SIZE = 52;
  const EDGE_GAP = 8;
  const host = document.createElement("div");
  host.id = "prompt-pocket-host";
  host.style.cssText = `all:initial;display:none;position:fixed;z-index:2147483647;right:22px;bottom:24px;width:${ORB_SIZE}px;height:${ORB_SIZE}px;`;
  document.documentElement.append(host);
  const root = host.attachShadow({ mode: "closed" });

  for (const eventName of ["keydown", "keyup", "keypress", "beforeinput", "input"]) {
    root.addEventListener(eventName, (event) => event.stopPropagation());
  }

  root.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; }
      button, input, textarea { font: inherit; }
      button { cursor: pointer; }
      .wrap { position: relative; width: 52px; height: 52px; font-family: Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; color: #1d2433; }
      .orb { position: absolute; right: 0; bottom: 0; width: 52px; height: 52px; padding: 0; border: 0; border-radius: 18px; color: white; background: linear-gradient(145deg,#8b7cf6,#5947d7); box-shadow: 0 10px 28px rgba(65,52,170,.34); font-size: 21px; font-weight: 800; user-select: none; transition: transform .15s, border-radius .15s; }
      .orb:hover { transform: translateY(-2px); }
      .orb { background:transparent;box-shadow:none; }
      .orb img { display:block;width:52px;height:52px;pointer-events:none; }
      .logo { background:transparent; }
      .logo img { display:block;width:30px;height:30px;pointer-events:none; }
      .orb.open { border-radius: 50%; }
      .panel { position: absolute; right: 0; bottom: 64px; width: 340px; max-height: min(520px, calc(100vh - 100px)); overflow: hidden; border: 1px solid #e8e9ee; border-radius: 17px; background: white; box-shadow: 0 18px 55px rgba(29,36,51,.22); opacity: 0; pointer-events: none; transform: translateY(10px) scale(.98); transform-origin: right bottom; transition: .16s ease; }
      .panel.open { opacity: 1; pointer-events: auto; transform: none; }
      .head { height: 55px; padding: 0 14px; display: flex; align-items: center; justify-content: space-between; color: white; background: linear-gradient(120deg,#303550,#4d5377); }
      .brand { display: flex; align-items: center; gap: 9px; }
      .logo { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 9px; color: #5b49d8; background: white; font-weight: 850; }
      .brand strong { display: block; font-size: 13px; }
      .brand small { display: block; margin-top: 1px; color: #d7daea; font-size: 11px; font-weight: 400; }
      .head-actions { display: flex; gap: 5px; }
      .head-btn { height: 29px; padding: 0 9px; border: 0; border-radius: 8px; color: #e3e5f0; background: rgba(255,255,255,.08); font-size: 11px; }
      .head-btn:hover { background: rgba(255,255,255,.16); }
      .body { padding: 13px; }
      .save-box { display: flex; gap: 8px; }
      .save-box textarea { flex: 1; height: 74px; padding: 9px 10px; border: 1px solid #e7e8ee; border-radius: 10px; outline: 0; resize: none; color: #1d2433; background: #f7f7fa; font-size: 13px; line-height: 1.45; }
      .save-box textarea:focus { border-color: #bcb5f5; box-shadow: 0 0 0 3px #efedff; background: white; }
      .save { width: 62px; border: 0; border-radius: 10px; color: white; background: #6c5ce7; font-size: 13px; font-weight: 700; }
      .save:hover { background: #5847d6; }
      .capture-meta { height: 25px; margin: 3px 1px 2px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .hint { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #858b99; font-size: 11px; }
      .reread { flex: 0 0 auto; padding: 5px 8px; border: 0; border-radius: 6px; color: #6555d7; background: #efedff; font-size: 11px; }
      .search { width: 100%; height: 38px; padding: 0 11px; border: 1px solid #e7e8ee; border-radius: 10px; outline: 0; color: #1d2433; background: #f7f7fa; font-size: 13px; }
      .search:focus { border-color: #bcb5f5; background: white; }
      .label { display: flex; justify-content: space-between; margin: 12px 2px 7px; color: #4e5463; font-size: 12px; font-weight: 700; }
      .list { display: grid; gap: 6px; max-height: 258px; overflow-y: auto; scrollbar-width: thin; }
      .item { position: relative; min-width: 0; padding: 10px 114px 10px 10px; border: 1px solid #e9eaf0; border-radius: 10px; background: white; }
      .item:hover { border-color: #c9c3f4; background: #fdfcff; }
      .insert { width: 100%; padding: 0; border: 0; background: none; text-align: left; color: inherit; }
      .title, .preview { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .title { font-size: 13px; font-weight: 750; }
      .preview { margin-top: 4px; color: #7c8290; font-size: 11px; }
      .tools { position: absolute; top: 50%; right: 7px; display: flex; gap: 4px; transform: translateY(-50%); }
      .tool { height: 30px; padding: 0 8px; border: 0; border-radius: 7px; color: #6f7584; background: #f4f4f8; font-size: 11px; }
      .tool:hover { color: #6c5ce7; background: #efedff; }
      .empty { padding: 27px 10px; text-align: center; color: #858b99; font-size: 12px; line-height: 1.6; }
      .toast { position: absolute; left: 50%; bottom: 12px; max-width: 290px; padding: 8px 11px; border-radius: 8px; color: white; background: #22283a; box-shadow: 0 6px 18px rgba(0,0,0,.2); font-size: 12px; opacity: 0; pointer-events: none; transform: translate(-50%,6px); transition: .16s; }
      .toast.show { opacity: 1; transform: translate(-50%,0); }
      .title-modal { position: absolute; inset: 0; z-index: 10; display: grid; place-items: center; padding: 18px; background: rgba(28,32,48,.42); backdrop-filter: blur(2px); }
      .title-modal[hidden] { display: none; }
      .reader { position: absolute; inset: 55px 0 0; z-index: 5; padding: 16px; display: flex; flex-direction: column; gap: 10px; background: white; }
      .reader[hidden] { display: none; }
      .reader-head { display: flex; align-items: flex-start; gap: 12px; }
      .reader-heading { flex: 1; min-width: 0; margin: 0; overflow-wrap: anywhere; font-size: 14px; }
      .reader-close { flex-shrink: 0; font-size: 22px; width: 32px; padding: 0; }
      .reader-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #72798a; font-size: 11px; }
      .reader-history-toggle { padding: 5px 8px; border: 0; border-radius: 7px; color: #6555d7; background: #efedff; font-size: 11px; }
      .reader-history { flex: 0 0 auto; max-height: 150px; padding: 6px; display: grid; gap: 4px; overflow-y: auto; border: 1px solid #e7e8ee; border-radius: 9px; background: #f7f7fa; }
      .reader-history[hidden] { display: none; }
      .reader-version { width: 100%; padding: 7px 9px; display: flex; justify-content: space-between; gap: 8px; border: 0; border-radius: 7px; color: #555c6d; background: transparent; font-size: 11px; text-align: left; }
      .reader-version:hover, .reader-version.active { color: #5947d7; background: #efedff; }
      .reader-content { flex: 1; min-height: 0; width: 100%; padding: 10px; overflow: auto; resize: none; border: 1px solid transparent; border-radius: 9px; outline: 0; color: #1d2433; background: white; white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; font-size: 13px; line-height: 1.7; }
      .reader-content:not([readonly]) { border-color: #aaa1f1; background: #fdfcff; box-shadow: 0 0 0 3px #efedff; }
      .reader-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; color: #72798a; }
      .reader-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; margin-left: auto; }
      .reader-action { min-height: 36px; padding: 0 12px; border: 1px solid #e7e8ee; border-radius: 8px; color: #545b6a; background: white; }
      .reader-action.primary { border-color: #6c5ce7; color: white; background: #6c5ce7; }
      .item { display: flex; align-items: center; gap: 10px; padding: 10px; }
      .insert { flex: 1; min-width: 0; }
      .tools { position: static; flex: 0 0 auto; transform: none; }
      .title-dialog { width: 100%; padding: 18px; border-radius: 14px; background: white; box-shadow: 0 18px 45px rgba(29,36,51,.3); }
      .title-dialog h3 { margin: 0 0 13px; color: #252b3b; font-size: 15px; }
      .title-input { width: 100%; height: 40px; padding: 0 11px; border: 1px solid #dfe1e8; border-radius: 9px; outline: 0; color: #1d2433; background: #f8f8fb; font-size: 13px; }
      .title-input:focus { border-color: #aaa1f1; box-shadow: 0 0 0 3px #efedff; background: white; }
      .title-actions { display: flex; justify-content: flex-end; gap: 7px; margin-top: 14px; }
      .title-action { height: 34px; padding: 0 11px; border: 0; border-radius: 8px; color: #646a78; background: #f1f2f6; font-size: 12px; }
      .title-action:hover { background: #e8e9ef; }
      .title-action.primary { color: white; background: #6c5ce7; font-weight: 700; }
      .title-action.primary:hover { background: #5847d6; }
      @media (max-width: 430px) { .panel { width: min(340px, calc(100vw - 24px)); } }
    </style>
    <div class="wrap">
      <section class="panel" aria-label="${t("extensionName")}">
        <header class="head">
          <div class="brand"><span class="logo"><img src="${BRAND_ICON_DATA}" width="30" height="30" alt=""></span><span><strong>${t("extensionName")}</strong><small>${t("widgetSubtitle")}</small></span></div>
          <div class="head-actions">
            <button class="head-btn manage" title="${t("openManager")}">${t("manage")}</button>
            <button class="head-btn minimize" title="${t("minimize")}" aria-label="${t("minimize")}">—</button>
          </div>
        </header>
        <div class="body">
          <div class="save-box"><textarea class="draft" placeholder="${t("draftPlaceholder")}"></textarea><button class="save">${t("save")}</button></div>
          <div class="capture-meta"><span class="hint"></span><button class="reread">${t("reread")}</button></div>
          <input class="search" type="search" placeholder="${t("searchPlaceholder")}" />
          <div class="label"><span>${t("prompts")}</span><span class="count"></span></div>
          <div class="list"></div>
        </div>
        <section class="reader" hidden aria-labelledby="readerHeading">
          <header class="reader-head"><h2 id="readerHeading" class="reader-heading"></h2><button class="tool reader-close" type="button" title="${t("closePreview")}" aria-label="${t("closePreview")}">×</button></header>
          <div class="reader-meta"><span class="reader-version-meta"></span><button class="reader-history-toggle" type="button">${t("history")}</button></div>
          <div class="reader-history" hidden></div>
          <textarea class="reader-content" readonly aria-label="${t("content")}"></textarea>
          <footer class="reader-footer"><span class="reader-feedback" role="status"></span><div class="reader-actions"></div></footer>
        </section>
        <div class="toast"></div>
        <div class="title-modal" hidden>
          <form class="title-dialog">
            <h3>${t("optionalTitle")}</h3>
            <input class="title-input" maxlength="80" placeholder="${t("inputTitle")}" autocomplete="off" />
            <div class="title-actions">
              <button class="title-action title-cancel" type="button">${t("cancel")}</button>
              <button class="title-action title-skip" type="button">${t("skipTitle")}</button>
              <button class="title-action primary" type="submit">${t("save")}</button>
            </div>
          </form>
        </div>
      </section>
      <button class="orb" title="${t("openPocket")}" aria-label="${t("openPocket")}"><img src="${BRAND_ICON_DATA}" width="52" height="52" alt=""></button>
    </div>`;

  const ui = {
    panel: root.querySelector(".panel"), orb: root.querySelector(".orb"), draft: root.querySelector(".draft"),
    save: root.querySelector(".save"), search: root.querySelector(".search"), list: root.querySelector(".list"),
    count: root.querySelector(".count"), hint: root.querySelector(".hint"), toast: root.querySelector(".toast"),
    minimize: root.querySelector(".minimize"), manage: root.querySelector(".manage"), reread: root.querySelector(".reread"),
    titleModal: root.querySelector(".title-modal"), titleForm: root.querySelector(".title-dialog"), titleInput: root.querySelector(".title-input"),
    titleCancel: root.querySelector(".title-cancel"), titleSkip: root.querySelector(".title-skip"),
  };
  if (sidebar) {
    host.style.cssText = 'display:block;width:100%;min-height:100vh';
    const style = document.createElement('style');
    style.textContent = '.wrap{width:100%;height:100vh}.orb{display:none}.panel,.panel.open{position:relative;inset:auto;width:100%;height:100vh;max-height:none;border:0;border-radius:0;box-shadow:none;opacity:1;pointer-events:auto;transform:none;display:flex;flex-direction:column}.body{flex:1;min-height:0;display:flex;flex-direction:column}.list{max-height:none;flex:1;overflow:auto;align-content:start}.head{flex-shrink:0}.head-actions{gap:6px}.head-btn{width:44px;height:32px;padding:0;flex-shrink:0}.save-box textarea{min-width:0}.title-modal{position:fixed}';
    root.append(style);
    ui.panel.classList.add('open');
  }
  let data = { schemaVersion: 1, prompts: [] };
  const reader = root.querySelector('.reader');
  const readerContent = root.querySelector('.reader-content');
  const readerClose = root.querySelector('.reader-close');
  const readerHistory = root.querySelector('.reader-history');
  const readerActions = root.querySelector('.reader-actions');
  const readerFeedback = root.querySelector('.reader-feedback');
  let readerState = null;
  let readerTrigger = null;
  function closeReader() {
    if (readerDirty() && !confirm(t("discardShort"))) return;
    reader.hidden = true;
    readerHistory.hidden = true;
    readerState = null;
    root.querySelector('.body').inert = false;
    (readerTrigger?.isConnected ? readerTrigger : ui.search).focus({preventScroll:true});
  }
  readerClose.addEventListener('click', closeReader);
  reader.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeReader(); }
  });
  root.querySelector('.reader-history-toggle').addEventListener('click', () => {
    readerHistory.hidden = !readerHistory.hidden;
  });
  readerContent.addEventListener('input', updateReaderActions);
  let lastEditable = isEditable(document.activeElement) ? document.activeElement : null;
  let lastInputContent = lastEditable ? readValue(lastEditable) : "";
  let toastTimer;
  let pointerStart = null;
  let lastSelectionRange = null;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.channel !== "prompt-pocket-control") return;
    if (sidebar) return;
    if (message.action === 'visibility') {
      host.style.display = message.visible ? 'block' : 'none';
      if (message.visible) keepWidgetInViewport();
      sendResponse({ok:true}); return;
    }
    if (message.action === 'capture') {
      captureDraft();
      sendResponse({ok:true, content: ui.draft.value, source:pageSource(), hint:ui.hint.textContent}); return;
    }
    if (message.action === 'insert') {
      try {
        if (!isEditable(lastEditable) || !lastEditable.isConnected) throw Error(t("clickInputFirst"));
        writeValue(lastEditable, String(message.content || ''));
        lastInputContent = readValue(lastEditable);
        sendResponse({ok:true});
      } catch(error) { sendResponse({ok:false,error:error.message}); }
      return;
    }
    if (message.action === "show") {
      sidebarRequest("visibility").then(result => { host.style.display = result.visible ? "block" : "none"; });
      sendResponse({ ok: true });
      return;
    }
    sendResponse({ ok: false, error: t("unknownWidgetAction") });
  });

  document.addEventListener("focusin", (event) => {
    if (sidebar) return;
    const editable = editableFromEvent(event);
    if (editable) {
      lastEditable = editable;
      lastInputContent = readValue(editable);
    }
  }, true);
  document.addEventListener("input", (event) => {
    if (sidebar) return;
    const editable = editableFromEvent(event);
    if (!editable) return;
    lastEditable = editable;
    lastInputContent = readValue(editable);
    sidebarRequest("input-changed");
    if (ui.panel.classList.contains("open") && document.activeElement !== host) {
      ui.draft.value = lastInputContent;
      ui.hint.textContent = t("syncedInput");
    }
  }, true);
  document.addEventListener("selectionchange", rememberEditableSelection, true);

  ui.orb.addEventListener("click", async () => {
    if (pointerStart?.moved) return;
    const response = await sidebarRequest('open');
    if (!response.ok) { ui.orb.title = t("cannotOpenSidebar", response.error); }
  });
  ui.minimize.addEventListener("click", closePanel);
  ui.manage.addEventListener("click", async () => {
    const response = await sendDataMessage("open-manager");
    if (!response.ok) showToast(response.error || t("cannotOpenManager"));
  });
  ui.reread.addEventListener("click", captureDraft);
  ui.search.addEventListener("input", render);
  ui.save.addEventListener("click", requestSaveDraft);
  ui.titleCancel.addEventListener("click", closeTitleDialog);
  ui.titleSkip.addEventListener("click", () => confirmSaveDraft(""));
  ui.titleForm.addEventListener("submit", (event) => {
    event.preventDefault();
    confirmSaveDraft(ui.titleInput.value);
  });
  ui.titleInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTitleDialog();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (!sidebar && area === "local" && changes[POSITION_KEY]) {
      positionChangeSerial++;
      preferredPosition = changes[POSITION_KEY].newValue || null;
      if (!pointerStart?.moved) keepWidgetInViewport();
    }
    if (area === "local" && changes[STORAGE_KEY]) {
      data = normalizeData(changes[STORAGE_KEY].newValue);
      render();
      if (!reader.hidden) syncReaderFromStorage();
    }
  });
  if (sidebar) {
    chrome.windows.getCurrent().then(async window => {
      windowId = window.id;
      await loadData(); render(); captureDraft();
    });
    chrome.tabs.onActivated.addListener(info => { if (info.windowId === windowId) captureDraft(); });
    chrome.tabs.onUpdated.addListener((_id, change, tab) => {
      if (tab.active && tab.windowId === windowId && change.status === 'complete') captureDraft();
    });
    chrome.runtime.onMessage.addListener(message => {
      if (message?.channel === 'prompt-pocket-input' && message.windowId === windowId) {
        chrome.tabs.query({active:true,windowId}).then(([tab]) => { if (tab?.id === message.tabId) captureDraft(); });
      }
    });
  } else {
    enableDragging(); restorePosition();
    window.addEventListener('resize', keepWidgetInViewport);
    sidebarRequest('visibility').then(result => { host.style.display = result.visible ? 'block' : 'none'; });
  }

  async function sidebarRequest(action, payload = {}) {
    try { return await chrome.runtime.sendMessage({channel:'prompt-pocket-sidebar',action,windowId,...payload}); }
    catch { return {ok:false,error:t("serviceUnavailable")}; }
  }

  async function loadData() {
    const response = await sendDataMessage("get");
    data = normalizeData(response.data);
  }

  function normalizeData(value) {
    return value && Array.isArray(value.prompts) ? value : { schemaVersion: 1, prompts: [] };
  }

  async function captureDraft() {
    if (sidebar) {
      if (windowId == null) return;
      const sequence = ++captureSequence;
      const result = await sidebarRequest('page', {operation:'capture'});
      if (sequence !== captureSequence) return;
      capturedSource = result.source || null;
      ui.draft.value = result.content || '';
      ui.hint.textContent = result.ok ? result.hint : t("cannotReadPage");
      return;
    }
    ui.draft.value = '';
    const active = deepActiveElement();
    if (isEditable(active)) {
      lastEditable = active;
      lastInputContent = readValue(active);
    }
    if (active?.matches?.("iframe, frame") && !lastInputContent.trim()) {
      ui.hint.textContent = t("iframeUnsupported");
      return;
    }
    if ((!isEditable(lastEditable) || !lastEditable.isConnected) && !lastInputContent.trim()) {
      ui.hint.textContent = t("noChatInput");
      return;
    }
    const content = (isEditable(lastEditable) && lastEditable.isConnected ? readValue(lastEditable) : lastInputContent).trim();
    if (content) {
      ui.draft.value = content;
      ui.hint.textContent = t("readChars", content.length);
    } else {
      ui.hint.textContent = t("emptyInput");
    }
  }

  function requestSaveDraft() {
    const content = ui.draft.value.trim();
    if (!content) return showToast(t("enterPrompt"));
    ui.titleInput.value = "";
    ui.titleModal.hidden = false;
    requestAnimationFrame(() => ui.titleInput.focus());
  }

  function closeTitleDialog() {
    ui.titleModal.hidden = true;
    ui.titleInput.value = "";
  }

  async function confirmSaveDraft(title) {
    if (ui.titleModal.hidden) return;
    const content = ui.draft.value.trim();
    if (!content) {
      closeTitleDialog();
      return showToast(t("enterPrompt"));
    }
    ui.titleModal.hidden = true;
    ui.save.disabled = true;
    const response = await sendDataMessage("save-confirmed", {
      content,
      title: String(title || "").trim(),
      source: pageSource(),
    });
    ui.save.disabled = false;
    if (!response.ok) return showToast(response.error || t("saveFailed"));
    data = normalizeData(response.data);
    render();
    if (response.result === "duplicate-title-updated") showToast(t("titleUpdated"));
    else if (response.result === "duplicate") showToast(t("duplicatePrompt"));
    else showToast(t("savedLibrary"));
  }

  function render() {
    const savedScroll = ui.list.scrollTop;
    const query = ui.search.value.trim().toLocaleLowerCase();
    const prompts = [...data.prompts]
      .filter((prompt) => {
        const content = currentVersion(prompt)?.content || "";
        return !query || `${prompt.title}\n${content}`.toLocaleLowerCase().includes(query);
      })
      .sort((a, b) => (b.lastUsedAt || b.updatedAt).localeCompare(a.lastUsedAt || a.updatedAt));
    ui.count.textContent = t("countItems", prompts.length);
    ui.list.replaceChildren();
    if (!prompts.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = query ? t("noMatchingPrompts") : t("emptyLibrary");
      ui.list.append(empty);
      return;
    }
    prompts.forEach((prompt) => ui.list.append(createItem(prompt)));
    if (!reader.hidden) ui.list.scrollTop = savedScroll;
  }

  function promptRevision(prompt) {
    return JSON.stringify([prompt.title, prompt.currentVersionId, prompt.versions.map(version => [version.id, version.content])]);
  }

  function readerDirty() {
    return Boolean(readerState?.editing && readerContent.value !== readerState.baseline);
  }

  function formatVersionDate(value) {
    return new Intl.DateTimeFormat(PromptPocketI18n.locale, {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
  }

  function actionButton(label, handler, primary = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `reader-action${primary ? ' primary' : ''}`;
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  }

  function openReader(prompt, version = currentVersion(prompt)) {
    readerState = {
      promptId: prompt.id,
      versionId: version.id,
      baseline: version.content,
      revision: promptRevision(prompt),
      editing: false,
      conflict: false,
    };
    root.querySelector('.reader-heading').textContent = prompt.title;
    readerContent.value = version.content;
    readerContent.readOnly = true;
    readerFeedback.textContent = '';
    readerHistory.hidden = true;
    reader.hidden = false;
    root.querySelector('.body').inert = true;
    readerContent.scrollTop = 0;
    renderReaderHistory(prompt);
    updateReaderActions();
    readerClose.focus({preventScroll:true});
  }

  function renderReaderHistory(prompt) {
    readerHistory.replaceChildren();
    [...prompt.versions].reverse().forEach(version => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `reader-version${version.id === readerState.versionId ? ' active' : ''}`;
      button.innerHTML = `<strong>V${version.number || ''}${version.id === prompt.currentVersionId ? ` · ${t("currentShort")}` : ''}</strong><span>${formatVersionDate(version.createdAt)}</span>`;
      button.addEventListener('click', () => {
        if (readerDirty() && !confirm(t("switchVersionConfirm"))) return;
        readerState.versionId = version.id;
        readerState.baseline = version.content;
        readerState.editing = false;
        readerContent.value = version.content;
        readerContent.readOnly = true;
        readerFeedback.textContent = '';
        readerHistory.hidden = true;
        renderReaderHistory(prompt);
        updateReaderActions();
      });
      readerHistory.append(button);
    });
  }

  function updateReaderActions() {
    if (!readerState) return;
    const prompt = data.prompts.find(item => item.id === readerState.promptId);
    const version = prompt?.versions.find(item => item.id === readerState.versionId);
    const isCurrent = Boolean(prompt && version && version.id === prompt.currentVersionId);
    root.querySelector('.reader-version-meta').textContent = version
      ? `${isCurrent ? t("currentVersion") : t("historicalVersion")} V${version.number || ''} · ${formatVersionDate(version.createdAt)}`
      : t("versionMissing");
    readerActions.replaceChildren();
    if (readerState.editing) {
      readerActions.append(
        actionButton(t("cancel"), () => {
          if (readerDirty() && !confirm(t("discardEditConfirm"))) return;
          readerContent.value = readerState.baseline;
          readerContent.readOnly = true;
          readerState.editing = false;
          readerFeedback.textContent = '';
          updateReaderActions();
        }),
        actionButton(t("save"), saveReaderEdit, true),
      );
      readerActions.lastElementChild.disabled = readerState.conflict || !readerDirty();
      return;
    }
    if (!isCurrent) readerActions.append(actionButton(t("returnLatest"), () => openReader(prompt, currentVersion(prompt))));
    readerActions.append(actionButton(t("copy"), copyReaderContent));
    if (isCurrent) readerActions.append(actionButton(t("edit"), () => {
      readerState.editing = true;
      readerContent.readOnly = false;
      readerContent.focus();
      updateReaderActions();
    }, true));
    else readerActions.append(actionButton(t("restore"), restoreReaderVersion, true));
  }

  async function copyReaderContent() {
    readerFeedback.textContent = await copyText(readerContent.value) ? t("copied") : t("copyFailed");
  }

  async function saveReaderEdit() {
    if (!readerState || readerState.conflict || !readerDirty()) return;
    const content = readerContent.value.trim();
    if (!content) return void (readerFeedback.textContent = t("contentEmpty"));
    const prompt = data.prompts.find(item => item.id === readerState.promptId);
    const response = await sendDataMessage('update', {id:prompt.id,title:prompt.title,content,expectedRevision:readerState.revision});
    if (!response.ok) {
      readerState.conflict = true;
      readerFeedback.textContent = response.error || t("saveFailedDraft");
      return updateReaderActions();
    }
    data = normalizeData(response.data);
    const updated = response.prompt;
    const latest = currentVersion(updated);
    openReader(updated, latest);
    readerFeedback.textContent = response.result === 'version' ? t("savedNewVersion") : t("unchangedNoVersion");
    render();
  }

  async function restoreReaderVersion() {
    if (!readerState || readerState.conflict) return;
    const response = await sendDataMessage('restore-version', {id:readerState.promptId,versionId:readerState.versionId,expectedRevision:readerState.revision});
    if (!response.ok) {
      readerState.conflict = true;
      readerFeedback.textContent = response.error || t("restoreFailed");
      return updateReaderActions();
    }
    data = normalizeData(response.data);
    openReader(response.prompt, currentVersion(response.prompt));
    readerFeedback.textContent = t("restoredGenerated");
    render();
  }

  function syncReaderFromStorage() {
    if (!readerState) return;
    const prompt = data.prompts.find(item => item.id === readerState.promptId);
    if (!prompt || promptRevision(prompt) !== readerState.revision) {
      if (readerDirty()) {
        readerState.conflict = true;
        readerFeedback.textContent = t("conflictDraftCopy");
        return updateReaderActions();
      }
      if (!prompt) {
        readerState.conflict = true;
        readerFeedback.textContent = t("promptWasDeleted");
        return updateReaderActions();
      }
      const selected = prompt.versions.find(item => item.id === readerState.versionId) || currentVersion(prompt);
      openReader(prompt, selected);
    }
  }

  function createItem(prompt) {
    const version = currentVersion(prompt);
    const item = document.createElement("article");
    item.className = "item";
    const insert = document.createElement("button");
    insert.className = "insert";
    insert.type = "button";
    insert.title = t("insertInput");
    const title = document.createElement("span");
    title.className = "title";
    title.textContent = prompt.title;
    const preview = document.createElement("span");
    preview.className = "preview";
    preview.textContent = version.content.replace(/\s+/g, " ");
    insert.append(title, preview);
    insert.addEventListener("click", () => insertPrompt(prompt));
    const tools = document.createElement("div");
    tools.className = "tools";
    const copy = document.createElement("button");
    copy.className = "tool";
    copy.type = "button";
    copy.textContent = t("copy");
    copy.addEventListener("click", async () => {
      if (!await copyText(version.content)) return showToast(t("copyManual"));
      await markUsed(prompt);
      showToast(t("copied"));
    });
    const remove = document.createElement("button");
    remove.className = "tool";
    remove.type = "button";
    remove.textContent = t("delete");
    remove.title = t("deletePrompt");
    remove.addEventListener("click", async () => {
      if (!confirm(t("deletePromptConfirm", prompt.title))) return;
      const response = await sendDataMessage("delete", { id: prompt.id });
      if (!response.ok) return showToast(response.error || t("deleteFailed"));
      data = normalizeData(response.data);
      render();
      showToast(t("deleted"));
    });
    const view = document.createElement('button');
    view.className = 'tool';
    view.type = 'button';
    view.textContent = t("preview");
    view.addEventListener('click', () => {
      readerTrigger = view;
      openReader(prompt, version);
    });
    tools.append(view, copy, remove);
    item.append(insert, tools);
    return item;
  }

  async function insertPrompt(prompt) {
    const content = currentVersion(prompt).content;
    if (sidebar) {
      const response = await sidebarRequest('page', {operation:'insert', content});
      if (!response.ok) {
        const copied = await copyText(content);
        return showToast(copied ? t("insertFailedCopied") : t("insertCopyFailed"));
      }
      await markUsed(prompt); closePanel(); return;
    }
    if (!isEditable(lastEditable) || !lastEditable.isConnected) {
      const copied = await copyText(content);
      return showToast(copied ? t("clickInputCopied") : t("noInputCopyFailed"));
    }
    try {
      writeValue(lastEditable, content);
    } catch {
      const copied = await copyText(content);
      return showToast(copied ? t("pageRejectedCopied") : t("pageRejectedCopyFailed"));
    }
    lastInputContent = content;
    await markUsed(prompt);
    closePanel();
  }

  async function markUsed(prompt) {
    const response = await sendDataMessage("mark-used", { id: prompt.id });
    if (response.ok) data = normalizeData(response.data);
  }

  async function sendDataMessage(action, payload = {}) {
    try {
      return await chrome.runtime.sendMessage({ channel: "prompt-pocket", action, ...payload });
    } catch {
      return { ok: false, error: t("serviceUnavailable") };
    }
  }

  function pageSource() {
    if (sidebar) return capturedSource;
    return {
      url: `${location.origin}${location.pathname}`,
      host: location.hostname,
      title: document.title,
    };
  }

  function currentVersion(prompt) {
    return prompt.versions.find((version) => version.id === prompt.currentVersionId) || prompt.versions.at(-1);
  }

  function isEditable(element) {
    return element instanceof HTMLElement && !element.matches("input[type='password'], [readonly], [disabled]") && !isSensitiveEditable(element) &&
      (element.matches("textarea, input:not([type]), input[type='text'], input[type='search']") || element.isContentEditable);
  }

  function editableFromEvent(event) {
    return event.composedPath?.().find((node) => isEditable(node)) || (isEditable(event.target) ? event.target : null);
  }

  function deepActiveElement() {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return active;
  }

  function isSensitiveEditable(element) {
    const signal = [element.id, element.getAttribute("name"), element.getAttribute("autocomplete"), element.getAttribute("aria-label")]
      .filter(Boolean).join(" ").toLocaleLowerCase();
    return /(?:pass|password|secret|token|api[-_ ]?key|otp|one-time|cc-|card.?number|cvv|cvc|security.?code|ssn|身份证)/i.test(signal);
  }

  function rememberEditableSelection() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !isEditable(lastEditable)) return;
    const range = selection.getRangeAt(0);
    if (lastEditable.contains(range.commonAncestorContainer)) lastSelectionRange = range.cloneRange();
  }

  async function copyText(content) {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch {}
    const fallback = document.createElement("textarea");
    fallback.value = content;
    fallback.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    root.append(fallback);
    fallback.select();
    let copied = false;
    try { copied = document.execCommand("copy"); } catch {}
    fallback.remove();
    return copied;
  }

  function readValue(element) {
    return element.isContentEditable ? element.innerText : element.value;
  }

  function writeValue(element, content) {
    element.focus();
    if (element.isContentEditable) {
      const selection = window.getSelection();
      const activeRange = selection?.rangeCount && element.contains(selection.anchorNode)
        ? selection.getRangeAt(0)
        : lastSelectionRange && element.contains(lastSelectionRange.commonAncestorContainer) ? lastSelectionRange : null;
      if (activeRange) {
        const range = activeRange.cloneRange();
        range.deleteContents();
        const node = document.createTextNode(content);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        range.insertNode(document.createTextNode(content));
      }
      element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: content }));
    } else {
      const start = element.selectionStart ?? element.value.length;
      const end = element.selectionEnd ?? start;
      const prototype = element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      const value = element.value.slice(0, start) + content + element.value.slice(end);
      setter ? setter.call(element, value) : (element.value = value);
      element.setSelectionRange(start + content.length, start + content.length);
      element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: content }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function suggestTitle(content) {
    const first = content.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || t("unnamedPrompt");
    return first.length > 28 ? `${first.slice(0, 28)}…` : first;
  }

  function closePanel() {
    if (sidebar) {
      closeTitleDialog();
      sidebarRequest('close').then(result => { if (!result.ok) showToast(result.error); }); return;
    }
    closeTitleDialog();
    ui.panel.classList.remove("open");
    ui.orb.classList.remove("open");
  }


  function alignPanel() {
    const rect = host.getBoundingClientRect();
    if (rect.left < 355) {
      ui.panel.style.right = "auto";
      ui.panel.style.left = "0";
    } else {
      ui.panel.style.left = "auto";
      ui.panel.style.right = "0";
    }
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    ui.toast.textContent = message;
    ui.toast.classList.add("show");
    toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 1900);
  }

  async function restorePosition() {
    const serial = positionChangeSerial;
    const stored = await chrome.storage.local.get(POSITION_KEY);
    if (serial === positionChangeSerial) preferredPosition = stored[POSITION_KEY] || null;
    keepWidgetInViewport();
  }

  function setHostPosition(x, y) {
    const maxX = Math.max(EDGE_GAP, innerWidth - ORB_SIZE - EDGE_GAP);
    const maxY = Math.max(EDGE_GAP, innerHeight - ORB_SIZE - EDGE_GAP);
    const next = {
      x: Math.max(EDGE_GAP, Math.min(maxX, x)),
      y: Math.max(EDGE_GAP, Math.min(maxY, y)),
    };
    host.style.left = `${next.x}px`;
    host.style.top = `${next.y}px`;
    host.style.right = "auto";
    host.style.bottom = "auto";
    return next;
  }

  async function savePosition() {
    const rect = host.getBoundingClientRect();
    const right = innerWidth - rect.right, bottom = innerHeight - rect.bottom;
    preferredPosition = {
      model: "edge-v2",
      horizontal: rect.left <= right ? "left" : "right",
      vertical: rect.top <= bottom ? "top" : "bottom",
      x: Math.max(EDGE_GAP, Math.min(rect.left, right)),
      y: Math.max(EDGE_GAP, Math.min(rect.top, bottom)),
    };
    await chrome.storage.local.set({
      [POSITION_KEY]: preferredPosition,
    });
  }

  function keepWidgetInViewport() {
    if (sidebar) return;
    const position = preferredPosition;
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      setHostPosition(innerWidth - ORB_SIZE - 22, innerHeight - ORB_SIZE - 24);
    } else if (position.model === "edge-v2") {
      setHostPosition(position.horizontal === "right" ? innerWidth - ORB_SIZE - position.x : position.x,
        position.vertical === "bottom" ? innerHeight - ORB_SIZE - position.y : position.y);
    } else {
      const offset = position.model === POSITION_MODEL ? 0 : ORB_SIZE;
      setHostPosition(position.x - offset, position.y - offset);
    }
  }

  function enableDragging() {
    ui.orb.addEventListener("pointerdown", (event) => {
      pointerStart = { x: event.clientX, y: event.clientY, left: host.getBoundingClientRect().left, top: host.getBoundingClientRect().top, moved: false };
      ui.orb.setPointerCapture(event.pointerId);
    });
    ui.orb.addEventListener("pointermove", (event) => {
      if (!pointerStart) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      if (Math.hypot(dx, dy) < 4 && !pointerStart.moved) return;
      pointerStart.moved = true;
      closePanel();
      host.style.right = "auto";
      host.style.bottom = "auto";
      setHostPosition(pointerStart.left + dx, pointerStart.top + dy);
    });
    ui.orb.addEventListener("pointerup", async () => {
      if (!pointerStart) return;
      const moved = pointerStart.moved;
      if (moved) await savePosition();
      setTimeout(() => { pointerStart = null; }, 0);
    });
    ui.orb.addEventListener("pointercancel", () => { pointerStart = null; keepWidgetInViewport(); });
  }
})();

(() => {
  if (window.top !== window || document.getElementById("prompt-pocket-host")) return;

  const sidebar = location.protocol === "chrome-extension:" && location.pathname === "/sidebar.html";
  const t = PromptPocketI18n.t;
  if (sidebar) {
    document.documentElement.lang = PromptPocketI18n.locale;
    document.title = t("extensionName");
  }
  let windowId, capturedSource = null, captureSequence = 0;
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
          <div class="brand"><span class="logo">P</span><span><strong>${t("extensionName")}</strong><small>${t("widgetSubtitle")}</small></span></div>
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
      <button class="orb" title="${t("openPocket")}" aria-label="${t("openPocket")}">P</button>
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

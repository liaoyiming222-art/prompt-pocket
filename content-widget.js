(() => {
  if (window.top !== window || document.getElementById("prompt-pocket-host")) return;

  const sidebar = location.protocol === "chrome-extension:" && location.pathname === "/sidebar.html";
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
      .reader { position: absolute; inset: 55px 0 0; z-index: 5; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: white; }
      .reader[hidden] { display: none; }
      .reader-head { display: flex; align-items: flex-start; gap: 12px; }
      .reader-heading { flex: 1; min-width: 0; margin: 0; overflow-wrap: anywhere; font-size: 14px; }
      .reader-close { flex-shrink: 0; font-size: 22px; width: 32px; padding: 0; }
      .reader-content { flex: 1; min-height: 0; margin: 0; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; font-size: 13px; line-height: 1.7; }
      .reader-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; color: #72798a; }
      .reader-copy { min-height: 36px; padding: 0 18px; border: 0; border-radius: 8px; background: #6c5ce7; color: white; }
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
      <section class="panel" aria-label="提示词口袋">
        <header class="head">
          <div class="brand"><span class="logo">P</span><span><strong>提示词口袋</strong><small>点击条目插入刚才的输入框</small></span></div>
          <div class="head-actions">
            <button class="head-btn manage" title="打开完整管理页">管理</button>
            <button class="head-btn minimize" title="收起窗口" aria-label="收起窗口">—</button>
          </div>
        </header>
        <div class="body">
          <div class="save-box"><textarea class="draft" placeholder="网页输入内容会自动同步到这里"></textarea><button class="save">保存</button></div>
          <div class="capture-meta"><span class="hint"></span><button class="reread">重新读取</button></div>
          <input class="search" type="search" placeholder="搜索标题或内容" />
          <div class="label"><span>提示词</span><span class="count"></span></div>
          <div class="list"></div>
        </div>
        <section class="reader" hidden aria-labelledby="readerHeading">
          <header class="reader-head"><h2 id="readerHeading" class="reader-heading"></h2><button class="tool reader-close" type="button" title="关闭预览" aria-label="关闭预览">×</button></header>
          <pre class="reader-content" tabindex="0"></pre>
          <footer class="reader-footer"><span class="reader-feedback" role="status"></span><button class="reader-copy" type="button">复制</button></footer>
        </section>
        <div class="toast"></div>
        <div class="title-modal" hidden>
          <form class="title-dialog">
            <h3>提示词标题（选填）</h3>
            <input class="title-input" maxlength="80" placeholder="输入标题" autocomplete="off" />
            <div class="title-actions">
              <button class="title-action title-cancel" type="button">取消</button>
              <button class="title-action title-skip" type="button">先不填写</button>
              <button class="title-action primary" type="submit">保存</button>
            </div>
          </form>
        </div>
      </section>
      <button class="orb" title="打开提示词口袋" aria-label="打开提示词口袋">P</button>
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
  let readerTrigger = null;
  function closeReader() {
    reader.hidden = true;
    root.querySelector('.body').inert = false;
    (readerTrigger?.isConnected ? readerTrigger : ui.search).focus({preventScroll:true});
  }
  readerClose.addEventListener('click', closeReader);
  reader.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeReader(); }
  });
  root.querySelector('.reader-copy').addEventListener('click', async () => {
    const button = root.querySelector('.reader-copy');
    button.disabled = true;
    try {
      const copied = await copyText(readerContent.textContent);
      root.querySelector('.reader-feedback').textContent = copied ? '已复制' : '复制失败，请重试';
    } finally { button.disabled = false; }
  });
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
        if (!isEditable(lastEditable) || !lastEditable.isConnected) throw Error('请先点击网页输入框');
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
    sendResponse({ ok: false, error: "未知的悬浮助手操作" });
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
      ui.hint.textContent = "已同步当前网页输入";
    }
  }, true);
  document.addEventListener("selectionchange", rememberEditableSelection, true);

  ui.orb.addEventListener("click", async () => {
    if (pointerStart?.moved) return;
    const response = await sidebarRequest('open');
    if (!response.ok) { ui.orb.title = '无法打开侧边栏：' + response.error; }
  });
  ui.minimize.addEventListener("click", closePanel);
  ui.manage.addEventListener("click", async () => {
    const response = await sendDataMessage("open-manager");
    if (!response.ok) showToast(response.error || "无法打开管理窗口");
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
    catch { return {ok:false,error:'插件服务暂不可用，请重新加载扩展'}; }
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
      ui.hint.textContent = result.ok ? result.hint : '当前页面无法读取，请先点击普通网页输入框';
      return;
    }
    ui.draft.value = '';
    const active = deepActiveElement();
    if (isEditable(active)) {
      lastEditable = active;
      lastInputContent = readValue(active);
    }
    if (active?.matches?.("iframe, frame") && !lastInputContent.trim()) {
      ui.hint.textContent = "输入框位于内嵌页面，当前版本暂不支持读取";
      return;
    }
    if ((!isEditable(lastEditable) || !lastEditable.isConnected) && !lastInputContent.trim()) {
      ui.hint.textContent = "未读取到聊天框，请先点击输入框";
      return;
    }
    const content = (isEditable(lastEditable) && lastEditable.isConnected ? readValue(lastEditable) : lastInputContent).trim();
    if (content) {
      ui.draft.value = content;
      ui.hint.textContent = `已读取聊天框 · ${content.length} 字`;
    } else {
      ui.hint.textContent = "当前输入框为空，可在上方直接新建";
    }
  }

  function requestSaveDraft() {
    const content = ui.draft.value.trim();
    if (!content) return showToast("请输入要保存的提示词");
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
      return showToast("请输入要保存的提示词");
    }
    ui.titleModal.hidden = true;
    ui.save.disabled = true;
    const response = await sendDataMessage("save-confirmed", {
      content,
      title: String(title || "").trim(),
      source: pageSource(),
    });
    ui.save.disabled = false;
    if (!response.ok) return showToast(response.error || "保存失败");
    data = normalizeData(response.data);
    render();
    if (response.result === "duplicate-title-updated") showToast("已更新提示词标题");
    else if (response.result === "duplicate") showToast("这条提示词已经保存过");
    else showToast("已保存到提示词库");
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
    ui.count.textContent = `${prompts.length} 条`;
    ui.list.replaceChildren();
    if (!prompts.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = query ? "没有匹配的提示词" : "还没有提示词，在上方保存第一条吧";
      ui.list.append(empty);
      return;
    }
    prompts.forEach((prompt) => ui.list.append(createItem(prompt)));
    if (!reader.hidden) ui.list.scrollTop = savedScroll;
  }

  function createItem(prompt) {
    const version = currentVersion(prompt);
    const item = document.createElement("article");
    item.className = "item";
    const insert = document.createElement("button");
    insert.className = "insert";
    insert.type = "button";
    insert.title = "插入网页输入框";
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
    copy.textContent = "复制";
    copy.addEventListener("click", async () => {
      if (!await copyText(version.content)) return showToast("复制失败，请在管理页手动复制");
      await markUsed(prompt);
      showToast("已复制");
    });
    const remove = document.createElement("button");
    remove.className = "tool";
    remove.type = "button";
    remove.textContent = "删除";
    remove.title = "删除提示词";
    remove.addEventListener("click", async () => {
      if (!confirm(`确定删除“${prompt.title}”及其全部版本吗？`)) return;
      const response = await sendDataMessage("delete", { id: prompt.id });
      if (!response.ok) return showToast(response.error || "删除失败");
      data = normalizeData(response.data);
      render();
      showToast("已删除");
    });
    const view = document.createElement('button');
    view.className = 'tool';
    view.type = 'button';
    view.textContent = '预览';
    view.addEventListener('click', () => {
      readerTrigger = view;
      root.querySelector('.reader-heading').textContent = prompt.title;
      readerContent.textContent = version.content;
      root.querySelector('.reader-feedback').textContent = '';
      reader.hidden = false;
      root.querySelector('.body').inert = true;
      readerContent.scrollTop = 0;
      readerClose.focus({preventScroll:true});
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
        return showToast(copied ? '未能插入；内容已复制' : '未能插入，复制也失败了');
      }
      await markUsed(prompt); closePanel(); return;
    }
    if (!isEditable(lastEditable) || !lastEditable.isConnected) {
      const copied = await copyText(content);
      return showToast(copied ? "请先点击输入框；内容已复制" : "未找到输入框，复制也失败了");
    }
    try {
      writeValue(lastEditable, content);
    } catch {
      const copied = await copyText(content);
      return showToast(copied ? "网页拒绝插入；内容已复制" : "网页拒绝插入，复制也失败了");
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
      return { ok: false, error: "插件服务暂不可用，请重新加载扩展" };
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
    const first = content.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "未命名提示词";
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

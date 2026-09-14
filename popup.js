const STORAGE_KEY = "promptPocketData";
const MAX_IMPORT_BYTES = 8 * 1024 * 1024;

const state = {
  data: { schemaVersion: 1, prompts: [] },
  editingId: null,
  sourceForNewPrompt: null,
  standalone: false,
};

const $ = (id) => document.getElementById(id);
const els = {
  listView: $("listView"), editorView: $("editorView"), settingsView: $("settingsView"),
  searchInput: $("searchInput"), promptList: $("promptList"), emptyState: $("emptyState"), listTitle: $("listTitle"),
  titleInput: $("titleInput"), contentInput: $("contentInput"), sourceMeta: $("sourceMeta"),
  editorModeLabel: $("editorModeLabel"), deleteButton: $("deleteButton"), historySection: $("historySection"),
  versionList: $("versionList"), versionCount: $("versionCount"), toast: $("toast"), dataSummary: $("dataSummary"),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  state.standalone = new URLSearchParams(location.search).get("view") === "manager";
  if (state.standalone) document.body.classList.add("standalone");
  await loadData();
  bindEvents();
  chrome.storage.onChanged.addListener(handleStorageChange);
  renderList();
}

function handleStorageChange(changes, area) {
  if (area !== "local" || !changes[STORAGE_KEY]?.newValue) return;
  const value = changes[STORAGE_KEY].newValue;
  if (!Array.isArray(value.prompts)) return;
  state.data = value;
  if (!els.listView.hidden) renderList();
}

function bindEvents() {
  $("settingsButton").addEventListener("click", showSettings);
  $("settingsBackButton").addEventListener("click", showList);
  $("editorBackButton").addEventListener("click", showList);
  $("newButton").addEventListener("click", () => openEditor());
  $("emptyNewButton").addEventListener("click", () => openEditor());
  $("editorForm").addEventListener("submit", saveEditor);
  $("deleteButton").addEventListener("click", deleteCurrentPrompt);
  $("exportButton").addEventListener("click", exportData);
  $("importButton").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", importData);
  els.searchInput.addEventListener("input", renderList);
}

async function loadData() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY];
  if (value && Array.isArray(value.prompts)) state.data = value;
}

function showView(target) {
  [els.listView, els.editorView, els.settingsView].forEach((view) => { view.hidden = view !== target; });
}

function showList() {
  showView(els.listView);
  state.editingId = null;
  state.sourceForNewPrompt = null;
  renderList();
}

function showSettings() {
  showView(els.settingsView);
  const versions = state.data.prompts.reduce((total, prompt) => total + prompt.versions.length, 0);
  els.dataSummary.textContent = `${state.data.prompts.length} 条提示词 · ${versions} 个版本`;
}

function currentVersion(prompt) {
  return prompt.versions.find((version) => version.id === prompt.currentVersionId) || prompt.versions.at(-1);
}

function renderList() {
  const query = els.searchInput.value.trim().toLocaleLowerCase();
  const prompts = [...state.data.prompts]
    .filter((prompt) => {
      const content = currentVersion(prompt)?.content || "";
      return !query || `${prompt.title}\n${content}`.toLocaleLowerCase().includes(query);
    })
    .sort((a, b) => (b.lastUsedAt || b.updatedAt).localeCompare(a.lastUsedAt || a.updatedAt));

  els.listTitle.textContent = query ? `搜索结果（${prompts.length}）` : state.standalone ? "全部提示词" : "最近使用";
  els.promptList.replaceChildren();
  els.emptyState.hidden = prompts.length > 0 || Boolean(query);

  if (!prompts.length && query) {
    const message = document.createElement("div");
    message.className = "empty-state";
    message.innerHTML = "<div class=\"empty-icon\">⌕</div><h3>没有匹配结果</h3><p>换一个关键词，或手动新建提示词。</p>";
    els.promptList.append(message);
    return;
  }

  for (const prompt of prompts) {
    const version = currentVersion(prompt);
    const item = document.createElement("article");
    item.className = "prompt-item";

    const main = document.createElement("button");
    main.className = "prompt-main";
    main.type = "button";
    main.title = state.standalone ? "点击编辑" : "点击插入当前网页";
    const title = document.createElement("span");
    title.className = "prompt-title";
    title.textContent = prompt.title;
    const preview = document.createElement("span");
    preview.className = "prompt-preview";
    preview.textContent = version.content.replace(/\s+/g, " ");
    main.append(title, preview);
    main.addEventListener("click", () => state.standalone ? openEditor(prompt.id) : insertPrompt(prompt.id));

    const actions = document.createElement("div");
    actions.className = "prompt-actions";
    actions.append(miniButton("编辑", "编辑", () => openEditor(prompt.id)));
    item.append(main, actions);
    els.promptList.append(item);
  }
}

function miniButton(label, title, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mini-button";
  button.textContent = label === "复制" ? "拷" : "改";
  button.title = title;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", handler);
  return button;
}

function openEditor(id = null, seed = {}) {
  state.editingId = id;
  const prompt = id ? state.data.prompts.find((item) => item.id === id) : null;
  const version = prompt ? currentVersion(prompt) : null;
  els.editorModeLabel.textContent = prompt ? "编辑提示词" : "新建提示词";
  els.titleInput.value = prompt?.title || seed.title || "";
  els.contentInput.value = version?.content || seed.content || "";
  els.deleteButton.hidden = !prompt;
  els.historySection.hidden = !prompt;
  const source = prompt?.source || state.sourceForNewPrompt;
  els.sourceMeta.textContent = source?.host ? `来源：${source.host}` : "";
  showView(els.editorView);
  if (prompt) renderVersions(prompt);
  setTimeout(() => (els.titleInput.value ? els.contentInput : els.titleInput).focus(), 0);
}

function renderVersions(prompt) {
  const versions = [...prompt.versions].reverse();
  els.versionCount.textContent = `${versions.length} 个版本`;
  els.versionList.replaceChildren();
  versions.forEach((version, index) => {
    const row = document.createElement("div");
    row.className = "version-item";
    const copy = document.createElement("div");
    copy.className = "version-copy";
    const label = document.createElement("strong");
    label.textContent = `V${prompt.versions.length - index} · ${formatDate(version.createdAt)}`;
    const preview = document.createElement("span");
    preview.textContent = version.content.replace(/\s+/g, " ");
    copy.append(label, preview);
    if (version.id === prompt.currentVersionId) {
      const current = document.createElement("span");
      current.className = "version-current";
      current.textContent = "当前版本";
      row.append(copy, current);
    } else {
      const restore = document.createElement("button");
      restore.className = "restore-button";
      restore.type = "button";
      restore.textContent = "恢复";
      restore.addEventListener("click", () => restoreVersion(prompt.id, version.id));
      row.append(copy, restore);
    }
    els.versionList.append(row);
  });
}

async function saveEditor(event) {
  event.preventDefault();
  const title = els.titleInput.value.trim();
  const content = els.contentInput.value.trim();
  if (!title || !content) return toast("请填写标题和提示词内容");
  if (state.editingId) {
    const response = await request("update", { id: state.editingId, title, content });
    if (!response.ok) return toast(response.error || "保存失败");
    state.data = response.data;
    toast(response.result === "version" ? "已保存为新版本" : "已保存");
  } else {
    const response = await request("create", { title, content, source: state.sourceForNewPrompt });
    if (!response.ok) return toast(response.error || "保存失败");
    state.data = response.data;
    toast("提示词已保存");
  }
  setTimeout(showList, 350);
}

async function restoreVersion(promptId, versionId) {
  const response = await request("restore-version", { id: promptId, versionId });
  if (!response.ok) return toast(response.error || "恢复失败");
  state.data = response.data;
  els.contentInput.value = currentVersion(response.prompt).content;
  renderVersions(response.prompt);
  toast("已恢复，并保留为新版本");
}

async function deleteCurrentPrompt() {
  const prompt = state.data.prompts.find((item) => item.id === state.editingId);
  if (!prompt || !confirm(`确定删除“${prompt.title}”及其全部版本吗？`)) return;
  const response = await request("delete", { id: prompt.id });
  if (!response.ok) return toast(response.error || "删除失败");
  state.data = response.data;
  toast("已删除");
  setTimeout(showList, 250);
}

async function request(action, payload = {}) {
  try { return await chrome.runtime.sendMessage({ channel: "prompt-pocket", action, ...payload }); }
  catch { return { ok: false, error: "插件服务暂不可用，请重新加载扩展" }; }
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function exportData() {
  const payload = JSON.stringify({ ...state.data, exportedAt: new Date().toISOString() }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  const stamp = new Date().toISOString().slice(0, 10);
  chrome.downloads.download({ url, filename: `提示词口袋备份-${stamp}.json`, saveAs: true }, () => setTimeout(() => URL.revokeObjectURL(url), 1000));
}

async function importData(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    if (file.size > MAX_IMPORT_BYTES) throw new Error("too-large");
    const incoming = JSON.parse(await file.text());
    const response = await request("import", { data: incoming });
    if (!response.ok) throw new Error(response.error || "invalid");
    state.data = response.data;
    showSettings();
    toast("备份已导入");
  } catch {
    toast("文件格式不正确，导入失败");
  }
}

let toastTimer;
function toast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

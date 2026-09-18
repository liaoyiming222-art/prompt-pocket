const STORAGE_KEY = "promptPocketData";
const MAX_IMPORT_BYTES = 8 * 1024 * 1024;

const state = {
  data: { schemaVersion: 1, prompts: [] },
  editingId: null,
  sourceForNewPrompt: null,
  standalone: false,
  baseline: null,
  revision: null,
  busy: false,
  conflict: false,
  preview: null,
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
  if (state.preview && !state.busy) syncPreview();
  if (!els.listView.hidden) renderList();
  if (!els.editorView.hidden && state.editingId && !state.busy) syncEditor();
}

function revision(prompt) {
  return JSON.stringify([prompt.title, prompt.currentVersionId, prompt.versions.map(v => [v.id, v.content])]);
}
function dirty() {
  return !els.editorView.hidden && state.baseline &&
    (els.titleInput.value !== state.baseline.title || els.contentInput.value !== state.baseline.content);
}
function mayLeave() {
  if (state.busy) return false;
  return !dirty() || confirm("有未保存的修改，确定放弃这些修改吗？");
}
function adopt(prompt) {
  els.titleInput.value = prompt.title;
  els.contentInput.value = currentVersion(prompt).content;
  state.baseline = {title: els.titleInput.value, content: els.contentInput.value};
  state.revision = revision(prompt);
  state.conflict = false;
  $("conflictNotice").hidden = true;
  renderVersions(prompt);
}
function syncEditor() {
  const prompt = state.data.prompts.find(p => p.id === state.editingId);
  if (prompt && revision(prompt) === state.revision) { renderVersions(prompt); return; }
  if (prompt && !dirty() && !state.conflict) { adopt(prompt); return; }
  state.conflict = true;
  $("conflictNotice").hidden = false;
  $("conflictText").textContent = prompt
    ? "其他页面已修改此提示词。你的草稿已保留；请载入最新内容，或将草稿另存为新提示词。"
    : "此提示词已在其他页面删除。你的草稿已保留，可另存为新提示词。";
  $("reloadLatestButton").disabled = !prompt;
  if (prompt) renderVersions(prompt);
  else { els.versionList.replaceChildren(); els.versionCount.textContent = "已删除"; }
}
async function mutate(action, payload) {
  if (state.busy) return null;
  state.busy = true;
  const controls = [...document.querySelectorAll('button, input, textarea')];
  const disabled = controls.map(el => el.disabled);
  controls.forEach(el => { el.disabled = true; });
  let response;
  try {
    response = await request(action, payload);
    if (!response.ok) { toast(response.error || "操作失败"); await loadData(); }
    else state.data = response.data;
  } finally {
    state.busy = false;
    controls.forEach((el, i) => { el.disabled = disabled[i]; });
  }
  if (!response?.ok && state.editingId) syncEditor();
  return response?.ok ? response : null;
}

function bindEvents() {
  $("homeButton").addEventListener("click", () => {
    if (!mayLeave()) return;
    els.searchInput.value = "";
    showView(els.listView);
    state.editingId = null;
    state.sourceForNewPrompt = null;
    renderList();
    window.scrollTo({ top: 0 });
  });
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
  window.addEventListener("beforeunload", event => {
    if (dirty() || previewDirty() || state.busy) { event.preventDefault(); event.returnValue = ""; }
  });
  $("closePreviewButton").addEventListener("click", closePreview);
  $("versionPreview").addEventListener("cancel", event => { event.preventDefault(); closePreview(); });
  $("versionPreview").addEventListener("close", () => { state.preview = null; });
  $("previewContent").addEventListener("input", syncPreview);
  $("savePreviewButton").addEventListener("click", savePreview);
  $("restorePreviewButton").addEventListener("click", async () => {
    if (!previewReady()) return;
    const response = await restoreVersion(state.preview.promptId, state.preview.versionId);
    if (response) $("versionPreview").close();
  });
  $("deletePreviewButton").addEventListener("click", async () => {
    if (!previewReady()) return;
    const response = await deleteVersion(state.preview.promptId, state.preview.versionId);
    if (response) $("versionPreview").close();
  });
  $("copyPreviewButton").addEventListener("click", async () => {
    const button = $("copyPreviewButton");
    button.disabled = true;
    try {
      await navigator.clipboard.writeText($("previewContent").value);
      $("previewFeedback").textContent = "已复制";
    } catch {
      $("previewFeedback").textContent = "复制失败，请重试";
    } finally { button.disabled = false; }
  });
  $("reloadLatestButton").addEventListener("click", () => {
    if (!mayLeave()) return;
    const prompt = state.data.prompts.find(p => p.id === state.editingId);
    if (prompt) adopt(prompt);
  });
  $("saveDraftCopyButton").addEventListener("click", async () => {
    const title = els.titleInput.value.trim(), content = els.contentInput.value.trim();
    if (!title || !content) return toast("请填写标题和提示词内容");
    const response = await mutate("create", {title, content});
    if (response) { state.baseline = null; showList(); toast("草稿已另存为新提示词"); }
  });
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
  if (!mayLeave()) return;
  showView(els.listView);
  state.editingId = null;
  state.sourceForNewPrompt = null;
  renderList();
}

function showSettings() {
  if (!mayLeave()) return;
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
  button.textContent = label;
  button.title = title;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", handler);
  return button;
}

function openEditor(id = null, seed = {}) {
  if (!mayLeave()) return;
  state.editingId = id;
  const prompt = id ? state.data.prompts.find((item) => item.id === id) : null;
  const version = prompt ? currentVersion(prompt) : null;
  els.editorModeLabel.textContent = prompt ? "编辑提示词" : "新建提示词";
  els.titleInput.value = prompt?.title || seed.title || "";
  els.contentInput.value = version?.content || seed.content || "";
  state.baseline = {title: els.titleInput.value, content: els.contentInput.value};
  state.revision = prompt ? revision(prompt) : null;
  state.conflict = false;
  $("conflictNotice").hidden = true;
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
    label.textContent = `V${version.number || prompt.versions.length - index} · ${formatDate(version.createdAt)}`;
    const preview = document.createElement("span");
    preview.textContent = version.content.replace(/\s+/g, " ");
    copy.append(label, preview);
    if (version.id === prompt.currentVersionId) {
      const current = document.createElement("span");
      current.className = "version-current";
      current.textContent = "当前版本";
      copy.append(current);
    }
    const actions = document.createElement("div");
    actions.className = "version-actions";
    const isCurrent = version.id === prompt.currentVersionId;
    const restore = miniButton("恢复", isCurrent ? "已是当前版本" : "恢复此版本", () => restoreVersion(prompt.id, version.id));
    const remove = miniButton("删除", isCurrent ? "不能删除当前版本" : "删除此历史版本", () => deleteVersion(prompt.id, version.id));
    restore.disabled = isCurrent || state.conflict || state.busy;
    remove.disabled = isCurrent || state.conflict || state.busy;
    const previewButton = miniButton("预览", "查看完整正文", () => {
      state.preview = {promptId: prompt.id, versionId: version.id, original: version.content, revision: revision(prompt)};
      $("previewHeading").textContent = `查看与编辑版本 · ${prompt.title} · ${label.textContent}`;
      $("previewContent").value = version.content;
      $("previewFeedback").textContent = "";
      syncPreview();
      $("versionPreview").showModal();
    });
    actions.append(restore, remove, previewButton);
    row.append(copy, actions);
    els.versionList.append(row);
  });
}

function previewDirty() {
  return state.preview && $("versionPreview").open && $("previewContent").value !== state.preview.original;
}
function closePreview() {
  if (state.busy || (previewDirty() && !confirm("有未保存的修改，确定放弃这些修改吗？"))) return;
  $("versionPreview").close();
}
function previewReady() {
  const preview = state.preview;
  const prompt = state.data.prompts.find(p => p.id === preview?.promptId);
  if (state.busy || !preview || !prompt || revision(prompt) !== preview.revision || state.conflict) {
    $("previewFeedback").textContent = "此提示词已更新或删除。草稿已保留，可复制后关闭窗口，处理最新内容再操作。";
    return false;
  }
  return true;
}
function syncPreview() {
  const preview = state.preview;
  if (!preview) return;
  const prompt = state.data.prompts.find(p => p.id === preview.promptId);
  const stale = !prompt || revision(prompt) !== preview.revision;
  const current = prompt?.currentVersionId === preview.versionId;
  $("deletePreviewButton").disabled = stale || current || state.conflict;
  $("restorePreviewButton").disabled = stale || current || state.conflict;
  $("savePreviewButton").disabled = stale || state.conflict || !previewDirty();
  if (stale) $("previewFeedback").textContent = "此提示词已更新或删除。草稿已保留，请复制后处理最新内容。";
}
async function savePreview() {
  if (!previewReady() || !previewDirty()) return;
  const content = $("previewContent").value.trim();
  if (!content) { $("previewFeedback").textContent = "请填写提示词内容"; return; }
  if (dirty() && !confirm("主编辑页有未保存的修改，保存此版本将替换这些修改，是否继续？")) return;
  const preview = state.preview;
  const prompt = state.data.prompts.find(p => p.id === preview.promptId);
  const response = await mutate("update", {id: prompt.id, title: prompt.title, content, expectedRevision: preview.revision});
  if (!response) {
    $("previewFeedback").textContent = "保存失败，草稿已保留，请检查是否有其他页面更新。";
    syncPreview();
    return;
  }
  adopt(response.prompt);
  const version = currentVersion(response.prompt);
  state.preview = {promptId: prompt.id, versionId: version.id, original: version.content, revision: revision(response.prompt)};
  $("previewContent").value = version.content;
  $("previewHeading").textContent = `查看与编辑版本 · ${response.prompt.title} · V${version.number} · ${formatDate(version.createdAt)}`;
  $("previewFeedback").textContent = response.result === "version" ? "已保存为最新版" : "已保存，正文与最新版相同，未新增版本";
  syncPreview();
}

async function saveEditor(event) {
  event.preventDefault();
  if (state.busy) return;
  if (state.conflict) return toast("请先处理其他页面的修改，或将草稿另存");
  const title = els.titleInput.value.trim();
  const content = els.contentInput.value.trim();
  if (!title || !content) return toast("请填写标题和提示词内容");
  if (state.editingId) {
    const response = await mutate("update", { id: state.editingId, title, content, expectedRevision: state.revision });
    if (!response) return;
    state.data = response.data;
    toast(response.result === "version" ? "已保存为新版本" : "已保存");
  } else {
    const response = await mutate("create", { title, content, source: state.sourceForNewPrompt });
    if (!response) return;
    state.data = response.data;
    toast("提示词已保存");
  }
  state.baseline = null;
  showList();
}

async function restoreVersion(promptId, versionId) {
  if (state.busy || state.conflict) return;
  if (dirty() && !confirm("恢复将放弃当前未保存的修改，是否继续？")) return;
  const response = await mutate("restore-version", { id: promptId, versionId, expectedRevision: state.revision });
  if (!response) return;
  state.data = response.data;
  adopt(response.prompt);
  toast("已恢复，并保留为新版本");
  return response;
}

async function deleteVersion(promptId, versionId) {
  if (state.busy || state.conflict || !confirm("确定删除此历史版本吗？删除后无法恢复。")) return;
  const response = await mutate("delete-version", {id: promptId, versionId, expectedRevision: state.revision});
  if (!response) return;
  state.revision = revision(response.prompt);
  renderVersions(response.prompt);
  toast("历史版本已删除");
  return response;
}

async function deleteCurrentPrompt() {
  if (state.busy || state.conflict) return;
  const prompt = state.data.prompts.find((item) => item.id === state.editingId);
  if (!prompt || !confirm(`确定删除“${prompt.title}”及其全部版本吗？`)) return;
  const response = await mutate("delete", { id: prompt.id, expectedRevision: state.revision });
  if (!response) return;
  state.data = response.data;
  toast("已删除");
  state.baseline = null;
  showList();
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

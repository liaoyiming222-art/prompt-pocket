importScripts("sidebar-background.js");
const STORAGE_KEY = "promptPocketData";
const MAX_PROMPTS = 2000;
const MAX_VERSIONS_PER_PROMPT = 100;
const MAX_TITLE_LENGTH = 80;
const MAX_CONTENT_LENGTH = 100000;
const MAX_TOTAL_CONTENT_LENGTH = 3000000;
const CONTENT_SCRIPT_ACTIONS = new Set(["get", "save-confirmed", "delete", "mark-used", "open-manager"]);
let mutationQueue = Promise.resolve();

chrome.action.onClicked.addListener((tab) => {
  resumeWidget(tab.windowId).then(() => showWidget(tab)).catch((error) => {
    console.error("提示词口袋无法显示悬浮助手：", error?.message || error);
  });
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.channel !== "prompt-pocket") return;
  try {
    authorizeMessage(message, sender);
  } catch (error) {
    sendResponse({ ok: false, error: error.message });
    return;
  }
  const operation = message.action === "get"
    ? mutationQueue.catch(() => {}).then(() => handleDataMessage(message))
    : (mutationQueue = mutationQueue.then(() => handleDataMessage(message), () => handleDataMessage(message)));
  operation
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

async function handleDataMessage(message) {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const data = normalizeData(stored[STORAGE_KEY]);
  for (const prompt of data.prompts) ensureVersionNumbers(prompt);

  if (["update", "restore-version", "delete-version", "delete"].includes(message.action) && message.expectedRevision !== undefined) {
    const prompt = data.prompts.find(item => item.id === message.id);
    if (!prompt || promptRevision(prompt) !== message.expectedRevision) {
      throw new Error("此提示词已被其他页面修改或删除。草稿已保留，请先查看最新内容再保存。");
    }
  }

  if (message.action === "delete-version") {
    const prompt = data.prompts.find(item => item.id === message.id);
    if (!prompt) throw new Error("提示词不存在");
    if (prompt.currentVersionId === message.versionId) throw new Error("不能删除当前版本");
    if (!prompt.versions.some(item => item.id === message.versionId)) throw new Error("历史版本不存在");
    prompt.versions = prompt.versions.filter(item => item.id !== message.versionId);
    prompt.updatedAt = new Date().toISOString();
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    return { data, prompt };
  }

  if (message.action === "get") return { data };

  if (message.action === "create") {
    const content = String(message.content || "").trim();
    if (!content) throw new Error("提示词内容不能为空");
    if (content.length > MAX_CONTENT_LENGTH) throw new Error("提示词内容过长");
    const title = String(message.title || suggestTitle(content)).trim();
    if (!title || title.length > MAX_TITLE_LENGTH) throw new Error("标题长度不正确");
    const now = new Date().toISOString();
    const version = { id: crypto.randomUUID(), content, createdAt: now };
    const prompt = {
      id: crypto.randomUUID(),
      title,
      versions: [version],
      currentVersionId: version.id,
      source: message.source || null,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
      useCount: 0,
    };
    data.prompts.push(prompt);
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    return { data, prompt };
  }

  if (message.action === "update") {
    const prompt = data.prompts.find((item) => item.id === message.id);
    const title = String(message.title || "").trim();
    const content = String(message.content || "").trim();
    if (!prompt) throw new Error("提示词不存在");
    if (!title || !content) throw new Error("请填写标题和提示词内容");
    if (title.length > MAX_TITLE_LENGTH) throw new Error("标题不能超过 80 个字符");
    if (content.length > MAX_CONTENT_LENGTH) throw new Error("提示词内容过长");
    const active = currentVersion(prompt);
    prompt.title = title;
    prompt.updatedAt = new Date().toISOString();
    let result = "updated";
    if (active.content !== content) {
      if (prompt.versions.length >= MAX_VERSIONS_PER_PROMPT) throw new Error("历史版本已达到 100 个上限");
      const version = { id: crypto.randomUUID(), content, createdAt: prompt.updatedAt };
      prompt.versions.push(version);
      ensureVersionNumbers(prompt);
      prompt.currentVersionId = version.id;
      result = "version";
    }
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    return { data, prompt, result };
  }

  if (message.action === "restore-version") {
    const prompt = data.prompts.find((item) => item.id === message.id);
    const source = prompt?.versions.find((version) => version.id === message.versionId);
    if (!prompt || !source) throw new Error("历史版本不存在");
    if (prompt.versions.length >= MAX_VERSIONS_PER_PROMPT) throw new Error("历史版本已达到 100 个上限");
    const now = new Date().toISOString();
    const restored = { id: crypto.randomUUID(), content: source.content, createdAt: now };
    prompt.versions.push(restored);
    ensureVersionNumbers(prompt);
    prompt.currentVersionId = restored.id;
    prompt.updatedAt = now;
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    return { data, prompt };
  }

  if (message.action === "save-confirmed") {
    const content = String(message.content || "").trim();
    if (!content) throw new Error("提示词内容不能为空");
    if (content.length > MAX_CONTENT_LENGTH) throw new Error("提示词内容过长");
    const suppliedTitle = String(message.title || "").trim();
    if (suppliedTitle.length > MAX_TITLE_LENGTH) throw new Error("标题不能超过 80 个字符");
    const duplicate = data.prompts.find((prompt) => currentVersion(prompt)?.content === content);
    if (duplicate) {
      if (suppliedTitle && suppliedTitle !== duplicate.title) {
        duplicate.title = suppliedTitle;
        duplicate.updatedAt = new Date().toISOString();
        await chrome.storage.local.set({ [STORAGE_KEY]: data });
        return { data, prompt: duplicate, result: "duplicate-title-updated" };
      }
      return { data, prompt: duplicate, result: "duplicate" };
    }

    const now = new Date().toISOString();
    const version = { id: crypto.randomUUID(), content, createdAt: now };
    const prompt = {
      id: crypto.randomUUID(), title: suppliedTitle || suggestTitle(content), versions: [version], currentVersionId: version.id,
      source: message.source || null, createdAt: now, updatedAt: now, lastUsedAt: now, useCount: 0,
    };
    data.prompts.push(prompt);
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    return { data, prompt, result: "created" };
  }

  if (message.action === "delete") {
    data.prompts = data.prompts.filter((prompt) => prompt.id !== message.id);
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    return { data };
  }

  if (message.action === "mark-used") {
    const prompt = data.prompts.find((item) => item.id === message.id);
    if (prompt) {
      prompt.useCount = (prompt.useCount || 0) + 1;
      prompt.lastUsedAt = new Date().toISOString();
      await chrome.storage.local.set({ [STORAGE_KEY]: data });
    }
    return { data };
  }

  if (message.action === "open-manager") {
    const tab = await chrome.tabs.create({ url: chrome.runtime.getURL("popup.html?view=manager") });
    return { tabId: tab.id };
  }

  if (message.action === "import") {
    const incoming = validateData(message.data);
    const merged = new Map(data.prompts.map((prompt) => [prompt.id, prompt]));
    for (const prompt of incoming.prompts) {
      const existing = merged.get(prompt.id);
      if (!existing || Date.parse(prompt.updatedAt) > Date.parse(existing.updatedAt || 0)) merged.set(prompt.id, prompt);
    }
    data.prompts = validateData({ schemaVersion: 1, prompts: [...merged.values()] }).prompts;
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    return { data };
  }

  throw new Error("未知的数据操作");
}

function normalizeData(value) {
  return value && Array.isArray(value.prompts) ? value : { schemaVersion: 1, prompts: [] };
}

function ensureVersionNumbers(prompt) {
  let high = Math.max(Number.isSafeInteger(prompt.versionCounter) ? prompt.versionCounter : 0,
    ...prompt.versions.map(v => Number.isSafeInteger(v.number) && v.number > 0 ? v.number : 0));
  for (const version of prompt.versions) {
    if (!Number.isSafeInteger(version.number) || version.number < 1) version.number = ++high;
  }
  prompt.versionCounter = high;
}

function promptRevision(prompt) {
  return JSON.stringify([prompt.title, prompt.currentVersionId, prompt.versions.map(v => [v.id, v.content])]);
}

function authorizeMessage(message, sender) {
  if (sender?.id !== chrome.runtime.id) throw new Error("拒绝未授权的扩展请求");
  // Extension pages opened in a tab also have sender.tab. Trust only our
  // exact manager document, never a page URL supplied in the message payload.
  try {
    const senderUrl = new URL(sender.url);
    const managerUrl = new URL(chrome.runtime.getURL("popup.html"));
    if (senderUrl.protocol === managerUrl.protocol &&
        senderUrl.host === managerUrl.host &&
        senderUrl.pathname === managerUrl.pathname &&
        sender.frameId === 0) return;
  } catch {}
  if (sender.tab && !CONTENT_SCRIPT_ACTIONS.has(message.action)) throw new Error("当前页面无权执行此操作");
}

function suggestTitle(content) {
  const first = content.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "未命名提示词";
  return first.length > 28 ? `${first.slice(0, 28)}…` : first;
}

function currentVersion(prompt) {
  return prompt.versions.find((version) => version.id === prompt.currentVersionId) || prompt.versions.at(-1);
}

function validateData(value) {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.prompts)) throw new Error("文件格式或版本不受支持");
  if (value.prompts.length > MAX_PROMPTS) throw new Error("提示词数量超过上限");
  const promptIds = new Set();
  let totalContentLength = 0;
  const prompts = value.prompts.map((prompt) => {
    const id = requiredString(prompt?.id, 128, "提示词 ID");
    if (promptIds.has(id)) throw new Error("备份中存在重复的提示词 ID");
    promptIds.add(id);
    const title = requiredString(prompt.title, MAX_TITLE_LENGTH, "标题");
    if (!Array.isArray(prompt.versions) || !prompt.versions.length || prompt.versions.length > MAX_VERSIONS_PER_PROMPT) {
      throw new Error("历史版本数量不正确");
    }
    const versionIds = new Set();
    let previousNumber = 0;
    const versions = prompt.versions.map((version) => {
      const versionId = requiredString(version?.id, 128, "版本 ID");
      if (versionIds.has(versionId)) throw new Error("备份中存在重复的版本 ID");
      versionIds.add(versionId);
      if (typeof version.content !== "string" || !version.content.trim() || version.content.length > MAX_CONTENT_LENGTH) {
        throw new Error("提示词正文长度不正确");
      }
      totalContentLength += version.content.length;
      if (totalContentLength > MAX_TOTAL_CONTENT_LENGTH) throw new Error("备份内容总量超过上限");
      const number = Number.isSafeInteger(version.number) && version.number > previousNumber ? version.number : previousNumber + 1;
      previousNumber = number;
      return { id: versionId, number, content: version.content, createdAt: validDate(version.createdAt, "版本时间") };
    });
    const currentVersionId = typeof prompt.currentVersionId === "string" && versionIds.has(prompt.currentVersionId)
      ? prompt.currentVersionId
      : versions.at(-1).id;
    return {
      id,
      title,
      versions,
      versionCounter: Math.max(previousNumber, Number.isSafeInteger(prompt.versionCounter) ? prompt.versionCounter : 0),
      currentVersionId,
      source: normalizeSource(prompt.source),
      createdAt: validDate(prompt.createdAt, "创建时间"),
      updatedAt: validDate(prompt.updatedAt, "更新时间"),
      lastUsedAt: validDate(prompt.lastUsedAt || prompt.updatedAt, "最近使用时间"),
      useCount: Number.isSafeInteger(prompt.useCount) && prompt.useCount >= 0 ? prompt.useCount : 0,
    };
  });
  return { schemaVersion: 1, prompts };
}

function requiredString(value, maxLength, label) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) throw new Error(`${label}不正确`);
  return value.trim();
}

function validDate(value, label) {
  const timestamp = typeof value === "string" ? Date.parse(value) : NaN;
  if (!Number.isFinite(timestamp)) throw new Error(`${label}不正确`);
  return new Date(timestamp).toISOString();
}

function normalizeSource(source) {
  if (!source || typeof source !== "object") return null;
  const host = typeof source.host === "string" ? source.host.slice(0, 253) : "";
  const title = typeof source.title === "string" ? source.title.slice(0, 300) : "";
  let url = "";
  if (typeof source.url === "string") {
    try {
      const parsed = new URL(source.url);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") url = `${parsed.origin}${parsed.pathname}`;
    } catch {}
  }
  return host || title || url ? { host, title, url } : null;
}

async function showWidget(tab) {
  if (!tab?.id || !/^https?:\/\//i.test(tab.url || "")) return;
  let response;
  try {
    response = await sendWidgetMessage(tab.id, 1);
  } catch (error) {
    if (!/Receiving end does not exist/i.test(error?.message || "")) throw error;
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content-widget.js"],
    });
    response = await sendWidgetMessage(tab.id);
  }
  if (!response?.ok) throw new Error(response?.error || "悬浮助手未响应");
}

async function sendWidgetMessage(tabId, attempts = 6) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await chrome.tabs.sendMessage(tabId, {
        channel: "prompt-pocket-control",
        action: "show",
      });
    } catch (error) {
      lastError = error;
      if (!/Receiving end does not exist/i.test(error?.message || "")) throw error;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw lastError || new Error("悬浮助手未载入");
}

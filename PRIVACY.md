# 提示词口袋 / Prompt Pocket 隐私说明

本说明适用于提示词口袋 / Prompt Pocket 0.6.8。该扩展是本地优先的 Microsoft Edge 和 Google Chrome 扩展。

## 数据处理

- 扩展获准在所有网站上运行后，会在普通 HTTP/HTTPS 网页加载悬浮球与输入框连接脚本。
- 扩展在本地内存中记录最近使用的非敏感文本输入框，以便用户主动读取或插入提示词。
- 只有用户点击“保存”后，提示词正文、标题和脱敏后的来源信息才会写入浏览器本地扩展存储。
- 来源地址不包含查询参数或网址片段。
- 扩展不会将提示词、浏览记录或使用数据发送给开发者或第三方。
- 扩展不包含分析统计、广告、远程代码或云同步。

## 用户控制

- 用户可以查看、编辑、恢复或删除本地提示词。
- 用户可以导出 JSON 备份，也可以导入符合格式和容量限制的备份。
- 删除扩展时，浏览器会按照自身机制移除扩展本地数据；如需保留，请先导出备份。

## 权限用途

- HTTP/HTTPS 网站权限：在普通网页显示悬浮球并连接输入框。
- `activeTab`、`scripting`：恢复悬浮球并初始化已打开网页。
- `sidePanel`：显示与收起浏览器原生侧边栏。
- `storage`：保存本地提示词、版本历史和界面位置。
- `downloads`：保存用户主动导出的 JSON 文件。

---

# Prompt Pocket Privacy Notice

This notice applies to Prompt Pocket 0.6.8, a local-first extension for Microsoft Edge and Google Chrome.

## Data handling

- When site access is allowed, the extension loads its floating button and input-field helper on regular HTTP/HTTPS webpages.
- The extension keeps the most recently used non-sensitive text field in local memory so the user can explicitly read from it or insert a prompt.
- Prompt content, titles, and sanitized source information are written to local extension storage only after the user clicks Save.
- Stored source URLs exclude query parameters and fragments.
- Prompts, browsing information, and usage data are not sent to the developer or any third party.
- The extension contains no analytics, advertising, remote code, or cloud synchronization.

## User control

- Users can view, edit, restore, or delete locally stored prompts.
- Users can export JSON backups and import backups that meet the format and size limits.
- Removing the extension causes the browser to remove its local data according to the browser's own behavior. Export a backup first if the data should be retained.

## Why permissions are used

- HTTP/HTTPS site access: show the floating button and connect to input fields on regular webpages.
- `activeTab` and `scripting`: restore the floating button and initialize pages that are already open.
- `sidePanel`: show and minimize the browser's native side panel.
- `storage`: store prompts, version history, and interface position locally.
- `downloads`: save JSON files only when the user explicitly exports a backup.

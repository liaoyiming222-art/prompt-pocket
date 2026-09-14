# 发布清单

## Microsoft Edge 加载项

上传 `release/edge-addons-v0.6.1/提示词口袋-edge-v0.6.1.zip`。ZIP 根目录已经直接包含 `manifest.json`，不要再套一层文件夹。

在 Partner Center 中填写 `STORE_LISTING.md` 的文案，并上传 `release/edge-addons-v0.6.1/store-assets` 中的素材：

- `logo-128.png`：扩展徽标。
- `small-promo-440x280.png`：小型宣传磁贴。
- `screenshot-1-sidebar-1280x800.png`：侧边栏主要界面。
- `screenshot-2-manager-1280x800.png`：管理页面。

提交前完成以下检查：

- 用最终 ZIP 解压后的目录在 Edge 开发者模式中加载并走一遍保存、搜索、插入、编辑、恢复、导入和导出。
- 确认悬浮球在普通网页刷新、跳转和切换标签页后仍显示。
- 确认侧边栏最小化后恢复悬浮球，管理按钮打开新标签页。
- 建立公开 GitHub 仓库，并将 Partner Center 的网站、支持与隐私政策 URL 换成真实地址。
- 确认发布者名称、联系邮箱和素材版权信息准确。

微软要求上传包含清单及运行文件的 ZIP，并在商店资料中提供准确的功能、权限、隐私和视觉信息。审核期间不要删除公开的隐私政策页面。

## GitHub

推荐仓库：

- 仓库名：`prompt-pocket`
- 显示标题：提示词口袋（Prompt Pocket）
- 简介：`本地优先的 Edge/Chrome 提示词管理扩展：侧边栏保存、搜索、插入提示词，并保留历史版本。`
- 可见性建议：Public
- Topics：`browser-extension`, `microsoft-edge`, `chrome-extension`, `manifest-v3`, `prompt-manager`, `productivity`, `side-panel`, `local-first`

新仓库不要勾选自动生成 README、.gitignore 或 License，避免首次推送冲突；本项目已经包含 README 和 .gitignore。

公开前仍需选择许可证。若希望允许他人使用、修改和分发，可选择 MIT；若暂时不希望授予这些权利，就先不添加许可证。许可证属于权利决定，本项目不替你自动选择。

建议首次发布标签：`v0.6.1`，Release 标题：`提示词口袋 v0.6.1`。

Release 说明：

> 首个公开版本。支持普通网页悬浮球、Microsoft Edge 原生侧边栏、提示词本地保存与搜索、网页输入框插入、历史版本恢复，以及 JSON 导入导出。所有提示词数据仅保存在当前浏览器。


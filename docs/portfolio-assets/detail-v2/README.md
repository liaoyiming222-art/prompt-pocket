# 提示词口袋详情页素材 v2

任务编号：detail-v2-20261104-prompt-pocket。2026-11-04。产品 ID：prompt-pocket。

仓库：https://github.com/liaoyiming222-art/prompt-pocket
素材分支：codex/detail-v2-20261104
完整拍摄代码 SHA：f1216008752b1e2c2ea3b4ae582a77fd2700bc74
与 A 段界面基线 a6d00f93e73377ddfda8d37958573df73872559d 的产品代码相同。版本 0.6.8；实际浏览器 Edge 156.0.4314.58。拍摄前逐文件核对产品代码与固定提交一致，仅忽略 Git 在 Windows 的换行差异。

源目录 main 的 output/、tmp/ 未跟踪内容保留；在独立 worktree 拍摄和提交，未纳入任何用户工作区内容。未改业务代码、权限、部署、旧 hero/card/icon 或造物集仓库。本目录仅交本轮9张详情成品及必要证据、文档与复现文件。

## 九张交付图

| 文件 | 尺寸 | 场景 |
| --- | --- | --- |
| prompt-pocket-context-desktop.webp | 1920×1200 | 独立扩展页当前正文预览，主视觉回退 |
| prompt-pocket-context-mobile.webp | 900×1200 | 桌面扩展页核心局部，V3短正文 |
| prompt-pocket-search-shared.webp | 900×1200 | 实际保存后以“展览”搜索，命中一条 |
| prompt-pocket-insert-desktop.webp | 1600×1200 | 受控桌面网页真实插入结果 |
| prompt-pocket-insert-mobile.webp | 900×1200 | 输入结果区独立局部，原文与完整提示词 |
| prompt-pocket-history-list-desktop.webp | 1600×1200 | 三个版本，V2预览按钮实际焦点 |
| prompt-pocket-history-list-mobile.webp | 900×1200 | 三个版本自然窄幅列表 |
| prompt-pocket-history-preview-desktop.webp | 1600×1200 | 同一提示词V2正文查看 |
| prompt-pocket-history-preview-mobile.webp | 900×1200 | V2标识与完整短正文独立局部 |

文件路径、格式、像素尺寸、SHA-256、中文 alt、场景、来源类型与限制见 [manifest.json](manifest.json)。原始 PNG 在 evidence/，拍摄状态与操作断言见 [record.json](record.json)，检查结果见 [verification.json](verification.json)。九张是成品数，evidence 中检查图及原始截图不计为额外交付成品。

## 真实操作与来源

在全新临时 Edge 配置加载未打包的真实扩展，真实 storage 与后台消息，无 API 模拟，无个人数据，无付费或生成服务。以“展览介绍写作”为同一虚构示例，后台创建 V1，在真实管理页表单编辑、保存 V2 和 V3，实际搜索并断言命中一条；人工编写的提示词不代表 AI 生成输出。

插入图的外部网页是本目录 writing-demo.html 自备受控演示素材，仅本地服务提供。先聚焦真实 textarea，将光标移到原文末尾，再通过已安装扩展的 chrome.tabs.sendMessage 调用真实 content script 的 insert 操作。操作成功后逐字断言原有文字加 V3 正文等于输入框值；没有模拟插入结果或自动提交，也没有声称侧栏按钮点击全流程已验证。桌面/窄幅图的网页完全相同，仅响应式取景不同；窄幅图通过实际鼠标拖动将浮球移到结果区外，未抹除浮球或遮挡正文。

扩展页仅将 closed Shadow DOM 改为 open 以检查组件，产品 DOM 内容与样式不改。版本预览通过真实按钮打开，正文与 V2 原文逐字比对。只查看历史，没有恢复成功或 JSON 备份结果的宣称。

图片只对原始截图做等比缩放、必要局部取景和单层暖白留白，没有绘制 UI、添加宣传标题、多层外壳、光晕或手机设备框。产品自身文字和配色原样保留。

## 明确缺口与接入图注

- 原生侧栏与网页同场截图未取得；按任务包允许的回退交付真实独立扩展页。主视觉图注应写“桌面独立扩展页取景”，不能沿用“桌面网页旁打开原生侧栏”的 alt。manifest 已采用准确 alt。预览态会遮住侧栏搜索，是原产品行为；搜索状态由独立搜索图展示。
- 原产品管理页没有选中行状态。列表截图保留打开 V2 后返回的真实焦点框，图注应写“三个历史版本，V2预览按钮获得焦点”；下张为同一 V2 正文。没有人工高亮或伪造选择状态。
- 四张 mobile 与 shared 图均为桌面扩展/桌面受控网页局部，网页应加“桌面扩展局部”或“桌面网页操作局部”图注，不暗示手机安装。
- 仅普通 textarea 的选定场景验证成功，不承诺任意网站、iframe、受保护页面或复杂编辑器直接插入。没有账号、云同步或 AI 生成；本地 JSON 备份仅能力说明，未另拍结果。

## 尺寸与展示检查

九张成品尺寸、格式与 SHA-256 校验通过，原始 PNG 校验通过。检查桌面图829/1184px宽、窄屏图288/358px宽；查看完整短正文、按钮、版本标识和裁切，插入局部正文完整，未拉伸。版本列表和正文预览分开交付。

窄屏真实历史列表的原生版本字号约11px，288px展示时约11–12px，低于共用规则“约14px”的建议目标；未为提高字号篡改 UI。该项作为明确限制保留，建议页面允许点开原图，接入后复核；不能将本轮图片检查称为整页手机验收通过。主视觉辅助文字由后续功能局部解释。

## 复现

依赖复用上层 docs/portfolio-assets/package.json：Node.js 24、Playwright 1.62.1、sharp 0.35.5。安装依赖后在项目根运行：

~~~sh
node docs/portfolio-assets/detail-v2/make.mjs
node docs/portfolio-assets/detail-v2/verify.mjs
~~~

已有依赖可通过 PORTFOLIO_MODULES 指定依赖目录，浏览器通过 BROWSER_PATH 指定；默认使用标准位置 Edge。不依赖作者项目绝对路径或外站资源。make 首先验证拍摄代码与基线一致；成功后关闭并删除本次临时浏览器配置。原始截图的时间由产品实际生成，重拍时间、版本 ID 会变化。

最终素材提交 SHA 由回执给出，不循环写入自身 manifest。只在独立素材分支上传，造物集接入由总控后续执行。

# 提示词口袋正式品牌素材

日期：2026-10-27。源码基线 b7454e0，manifest 0.6.8，加本地品牌改动；图标方向为用户确认的A精致轻立体。正式母版为 `../../icons/brand.svg`，16/32/48/128浏览器PNG、中英文300px商店Logo与1024px母版由 `../../icons/export-brand.mjs` 导出。浮球内联PNG同步自同一份128px图，避免宿主网站跨域图片限制。

三张JPEG均由浏览器直接截图，未合成界面或替换截图内图标：`sidebar.jpg` 为420×470独立侧栏局部，`manager.jpg` 为管理页全页，`history.jpg` 为V2弹窗局部。裁切只在采集时进行，图中正文为虚构写作示例。

从项目根目录运行 `node scripts/brand-preview.mjs`，打开 `http://127.0.0.1:4198/pp/sidebar.html` 或 `/pp/popup.html?view=manager`。每次加载使用独立内存，以真实 `background.js` 的create/update处理创建三条提示词、发布简报的三个版本。管理页中点击产品发布简报，再点击V2预览即可复现。

此HTTP工作台替代Chrome存储、消息和活动标签环境；只把sidebar对扩展协议的判断映射为本地路由，界面、版本处理、筛选与渲染代码均来自产品文件。数据不会写入用户插件或磁盘。未安装扩展、连接真实网页输入框、验证商店包或重新发布；旧商店素材与release保持原发布记录。

本次确认独立侧栏的三条内容、管理页三个历史版本和V2弹窗可见，新品牌实际出现在两界面中。浏览器采集环境对无body的辅助文档产生过MutationObserver警告，修正工作台使用实际HTML后页面正常渲染；不据此宣称扩展全回归通过。图片SHA-256与观察记录见 `verification.json`。

## 卡片与窄幅取景

[sidebar-narrow.jpg](sidebar-narrow.jpg)：320px真实侧栏组件的宣传取景；保留搜索、保存和三条提示词，不表示手机安装扩展。 以实际图片尺寸与校验记录为准。

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium,sharp,browserPath} from './runtime.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const file=n=>path.join(dir,n);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const data=async(n,type='image/png')=>'data:'+type+';base64,'+(await fs.readFile(file(n))).toString('base64');
await fs.copyFile(path.resolve(dir,'../../icons/brand.svg'),file('icon.svg'));
await sharp(file('icon.svg'),{density:384}).resize(512,512).png().toFile(file('icon-512.png'));
await sharp(file('captures/manager.png')).extract({left:24,top:650,width:1052,height:260}).png().toFile(file('captures/history-crop.png'));
const icon=await data('icon.svg','image/svg+xml'),side=await data('captures/sidebar.png'),narrow=await data('captures/sidebar-narrow.png'),history=await data('captures/history-crop.png'),version=await data('captures/version.png');
const top=`<div class="top"><img src="${icon}" alt="提示词口袋图标"><div><div class="name">提示词口袋</div><div class="en">PROMPT POCKET</div></div></div>`;
const tags='<div class="pills"><span>本地保存</span><span>快速搜索</span><span>复制复用</span></div>';
const foot='<div class="foot">Edge / Chrome 桌面扩展 · 真实界面 / 虚构示例</div>';
const configs=[
 {id:'hero',width:1920,height:1200,alt:'提示词口袋首页宣传图，紫色口袋图标、随手存随时用标题与真实提示词侧栏',use:'造物集首页展台',content:`${top}<div class="edition">LOCAL FIRST / 0.6.8</div><div class="copy"><div class="kicker">把常用提示词，收进口袋</div><h1>让好用的提示词<br><em>随手存，随时用</em></h1><p>在浏览器中保存、搜索与复用提示词<br>让每次认真写下的指令，都有处可寻</p>${tags}</div><div class="shot-label">01 / 真实侧栏 · 收藏与复用</div><div class="shot"><img src="${side}"></div><div class="aside"><b>你的提示词库</b>，留在当前浏览器</div>${foot}<div class="index">PROMPT / SAVE / REUSE</div>`},
 {id:'card',width:1200,height:900,alt:'提示词口袋作品卡片，左侧用途和本地保存功能短语，右侧真实提示词库侧栏',use:'造物集作品卡片',content:`${top}<div class="edition">桌面浏览器扩展</div><div class="copy"><div class="kicker">SAVE ONCE, REUSE ANYTIME</div><h1>常用提示词<br><em>随手存，随时用</em></h1><p>保存、搜索与复用<br>你的本地提示词库</p>${tags}</div><div class="shot-label">真实侧栏 / 三条虚构写作示例</div><div class="shot"><img src="${side}"></div>${foot}<div class="index">0.6.8 / LOCAL FIRST</div>`},
 {id:'mobile',width:900,height:1200,alt:'用于手机浏览作品集的竖版宣传图，展示真实窄幅侧栏，注明仅为桌面浏览器扩展',use:'造物集窄屏展示，非手机安装入口',content:`${top}<div class="edition">本地优先</div><div class="copy"><div class="kicker">保存 · 搜索 · 复制复用</div><h1>好用的提示词，<em>收进口袋</em></h1><p>在浏览器中保存与复用你的提示词</p></div><div class="shot"><img src="${narrow}"></div><div class="foot">仅支持桌面 Edge / Chrome · 窄屏作品展示 · 虚构示例</div>`},
 {id:'detail-01',layout:'detail',width:1920,height:1200,alt:'提示词口袋版本历史功能详情，展示管理页真实三个历史版本和V2正文预览，可复制或恢复',use:'关键功能详情：版本历史，与主图的提示词库列表不同',content:`${top}<div class="edition">FEATURE / VERSION HISTORY</div><div class="copy"><div class="kicker">02 / 留下每一次修改</div><h1>提示词会变好<br><em>好版本也留得住</em></h1><p>修改正文并保存，自动生成新版本<br>回看、复制或恢复，让迭代有迹可循</p><div class="pills"><span>版本历史</span><span>正文预览</span><span>恢复旧版</span></div></div><div class="shot-label history-label">管理页 · 历史版本局部</div><div class="shot history"><img src="${history}"></div><div class="shot-label version-label">V2 / 查看与编辑版本</div><div class="shot version"><img src="${version}"></div><div class="note">同一条虚构提示词，真实保存的三个版本<br>恢复旧版仍会保留后续记录</div>${foot}<div class="index">EDIT / REVIEW / RESTORE</div>`}
];
const template=await fs.readFile(file('layout.html'),'utf8');
const browser=await chromium.launch({executablePath:browserPath,headless:true});
const assets=[];
try {for(const c of configs){
 const html=template.replaceAll('{{layout}}',c.layout||c.id).replaceAll('{{width}}',String(c.width)).replaceAll('{{height}}',String(c.height)).replace('{{content}}',c.content);
 // Self-contained HTML is also a portable, editable layout source.
 await fs.writeFile(file(c.id+'.html'),html);
 const p=await browser.newPage({viewport:{width:c.width,height:c.height},deviceScaleFactor:1});
 await p.setContent(html);await p.evaluate(()=>document.fonts.ready);
 const png=await p.screenshot();await sharp(png).webp({quality:95,effort:6}).toFile(file(c.id+'.webp'));
 assets.push({path:c.id+'.webp',alt:c.alt,purpose:c.use,source:'layout.html + build.mjs; unretouched extension screenshots from captures/; HTML/CSS typography and composition, no generative service'});
 await p.close();
}} finally {await browser.close()}
assets.unshift({path:'icon.svg',alt:'提示词口袋正式紫色引号卡片口袋图标',purpose:'产品图标与矢量母版',source:'Unmodified copy of ../../icons/brand.svg'},{path:'icon-512.png',alt:'提示词口袋正式图标512像素透明背景版',purpose:'造物集产品图标',source:'icon.svg rendered with sharp at 512 × 512'});
for(const a of assets){const b=await fs.readFile(file(a.path));const m=await sharp(b).metadata();Object.assign(a,{width:m.width,height:m.height,format:m.format,sha256:hash(b)})}
const record=JSON.parse(await fs.readFile(file('captures/record.json'),'utf8'));
const manifest={schema_version:1,product_id:'prompt-pocket',product_name:'提示词口袋 / Prompt Pocket',repository:'https://github.com/liaoyiming222-art/prompt-pocket',branch:'main',product_version:'0.6.8',interface_code_commit:record.code_commit,asset_commit:'Resolve from the fixed Git commit containing this manifest; intentionally not self-referential',created_date:'2026-11-02',capabilities:['桌面Edge/Chrome本地提示词库','保存、搜索、插入与复制','正文编辑与版本历史、预览、复制、恢复','JSON导入导出','简体中文及英文界面'],boundaries:['仅桌面 Chromium 142+；mobile.webp仅供窄屏作品集展示，不表示手机安装','无账号、云同步、AI生成、AI分类、标签、文件夹或模板变量','iframe、受保护页面无法读取插入；复杂编辑器可能回退复制','宣传素材使用隔离浏览器配置中的虚构示例，无个人数据','真实运行未使用API模拟；sidebar.html以扩展页取景，不冒充原生侧栏外壳','本次验证限拍摄所涉及的保存、列表、三个版本与预览；未验证商店安装、所有网页插入或全功能回归'],capture:record,assets};
manifest.supporting_images=[];
for(const name of (await fs.readdir(file('captures'))).filter(n=>n.endsWith('.png')).sort()){
 const b=await fs.readFile(file('captures/'+name)),meta=await sharp(b).metadata();
 const qa=name.startsWith('qa-');
 manifest.supporting_images.push({path:'captures/'+name,width:meta.width,height:meta.height,format:meta.format,sha256:hash(b),alt:qa?'提示词口袋展示尺寸或图标清晰度检查图：'+name:'提示词口袋真实扩展界面采集：'+name,purpose:qa?'制作检查证据，不作为作品集入口图':'界面取景原始证据或无修饰矩形裁切',source:qa?'verify.mjs：交付图等比缩放或32/40px图标检查':name==='history-crop.png'?'build.mjs：manager.png矩形裁切':'capture.mjs：隔离配置中实际运行扩展的浏览器截图'});
}
await fs.writeFile(file('manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Built',assets.map(a=>`${a.path} ${a.width}x${a.height}`).join('\n'));

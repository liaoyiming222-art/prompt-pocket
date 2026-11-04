import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {chromium,sharp,browserPath} from '../runtime.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../../..');
const baseline='f1216008752b1e2c2ea3b4ae582a77fd2700bc74';
for(const name of ['background.js','content-widget.js','sidebar-background.js','popup.js','popup.css','popup.html','sidebar.html','i18n.js','manifest.json'])assert.equal((await fs.readFile(path.join(root,name),'utf8')).replaceAll('\r\n','\n'),execFileSync('git',['show',baseline+':'+name],{cwd:root,encoding:'utf8'}).replaceAll('\r\n','\n'));
await fs.mkdir(path.join(dir,'evidence'),{recursive:true});
const file=n=>path.join(dir,n),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const fixture=await fs.readFile(file('writing-demo.html'));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(fixture)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'pp-detail-v2-'));
const ctx=await chromium.launchPersistentContext(profile,{executablePath:browserPath,headless:true,locale:'zh-CN',deviceScaleFactor:2,viewport:{width:400,height:534},args:['--disable-extensions-except='+root,'--load-extension='+root,'--lang=zh-CN']});
const versions=['请为虚构的社区展览写一段介绍，说明主题和参观对象。','请为虚构的社区展览写一段介绍，说明主题、参观对象和两项看点。','请为虚构的社区展览写一段介绍，说明主题、参观对象和两项看点。控制在150字以内，语气亲切。'];
const assets=[],checks={},errors=[];ctx.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
async function save(p,id,w,h,alt,scene,source,locator){
 const raw=locator?await locator.screenshot():await p.screenshot();
 await fs.writeFile(file('evidence/'+id+'.png'),raw);
 const meta=await sharp(raw).metadata();
 const scale=Math.min(w/meta.width,h/meta.height,id==="context-desktop"?680/meta.width:Infinity),sw=Math.round(meta.width*scale),sh=Math.round(meta.height*scale);
 const image=await sharp(raw).resize(sw,sh).png().toBuffer();
 await sharp({create:{width:w,height:h,channels:4,background:'#faf9f6'}}).composite([{input:image,left:Math.floor((w-sw)/2),top:Math.floor((h-sh)/2)}]).webp({quality:98,effort:6}).toFile(file('prompt-pocket-'+id+'.webp'));
 const b=await fs.readFile(file('prompt-pocket-'+id+'.webp'));
 assets.push({path:'prompt-pocket-'+id+'.webp',width:w,height:h,format:'webp',sha256:hash(b),alt,scene,source_type:source,source:'evidence/'+id+'.png',limits:source.includes('extension')?'真实独立扩展页局部；不代表手机安装或原生侧栏外壳':'受控虚构网页的真实输入结果；仅验证普通textarea'});
}
try{
 const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker',{timeout:20000});
 const url=n=>worker.url().replace('background.js',n);
 const send=message=>worker.evaluate(async m=>handleDataMessage(m),message);
 await send({action:'create',title:'展览介绍写作',content:versions[0]});
 const manager=await ctx.newPage();await manager.setViewportSize({width:800,height:750});await manager.goto(url('popup.html?view=manager'));
 await manager.getByText('展览介绍写作',{exact:true}).click();
 for(const v of versions.slice(1)){await manager.locator('#contentInput').fill(v);await manager.locator('button[type=submit]').click();await manager.locator('.prompt-main').first().click()}
 assert.equal(await manager.locator('.version-item').count(),3);checks.three_versions_saved_via_real_manager=true;
 const side=await ctx.newPage();await side.addInitScript(()=>{const a=Element.prototype.attachShadow;Element.prototype.attachShadow=function(o){return a.call(this,{...o,mode:'open'})}});
 await side.setViewportSize({width:400,height:534});await side.goto(url('sidebar.html'));await side.locator('.item').first().waitFor();
 await side.getByRole('button',{name:'预览',exact:true}).click();await side.locator('.reader-content').waitFor();
 await save(side,'context-desktop',1920,1200,'提示词口袋独立桌面扩展页，显示展览介绍写作的正文预览','模块1；独立扩展页取景，未取得原生侧栏与网页同场','real-extension-page');
 await side.setViewportSize({width:300,height:400});
 await save(side,'context-mobile',900,1200,'桌面扩展侧栏局部，显示展览介绍提示词的标题和正文','模块1窄屏；桌面插件局部','real-extension-page');
 await side.locator('.reader-close').click();await side.locator('.search').fill('展览');assert.equal(await side.locator('.item').count(),1);checks.actual_saved_search_hit=true;
 await save(side,'search-shared',900,1200,'提示词口袋侧栏以展览关键词搜到已保存的展览介绍提示词','模块2；真实保存后关键词命中','real-extension-page');
 const web=await ctx.newPage();await web.setViewportSize({width:800,height:600});await web.goto('http://127.0.0.1:'+server.address().port);
 await web.locator('#prompt-pocket-host').waitFor({state:'visible'});await web.locator('textarea').focus();
 const before=await web.locator('textarea').inputValue();await web.locator('textarea').evaluate(el=>el.setSelectionRange(el.value.length,el.value.length));
 const tab=await worker.evaluate(async()=> (await chrome.tabs.query({url:'http://127.0.0.1/*'}))[0]);
 const result=await worker.evaluate(async ({id,content})=>chrome.tabs.sendMessage(id,{channel:'prompt-pocket-control',action:'insert',content}),{id:tab.id,content:versions[2]});
 assert.equal(result.ok,true);assert.equal(await web.locator('textarea').inputValue(),before+versions[2]);
 checks.insertion={method:'Actual installed content-script insert operation via chrome.tabs.sendMessage; focused real textarea, no response mock',before,after:before+versions[2],ok:true};
 await save(web,'insert-desktop',1600,1200,'展览介绍提示词插入桌面写作输入框后的实际结果','模块3；受控网页textarea真实插入，保留原有文字','controlled-webpage-real-insertion');
 await web.setViewportSize({width:300,height:600}); const orb=await web.locator("#prompt-pocket-host").boundingBox(); await web.mouse.move(orb.x+26,orb.y+26);await web.mouse.down();await web.mouse.move(260,30,{steps:8});await web.mouse.up();await web.evaluate(()=>getSelection()?.removeAllRanges());
 await save(web,'insert-mobile',900,1200,'桌面写作输入区局部，显示插入的展览介绍提示词与原有文字','模块3窄屏；桌面网页操作局部','controlled-webpage-real-insertion',web.locator('#result'));
 for(const mobile of [false,true]){
  await manager.setViewportSize({width:mobile?300:800,height:mobile?730:750});
  await manager.locator('.version-item').nth(1).getByRole('button',{name:'预览',exact:true}).click();
  assert.equal(await manager.locator('#previewContent').inputValue(),versions[1]);
  await save(manager,'history-preview-'+(mobile?'mobile':'desktop'),mobile?900:1600,1200,'选中旧版本V2的展览介绍提示词正文预览及版本标识','模块4；V2旧版查看状态，完整短样本','real-extension-page',manager.locator('#versionPreview'));
  await manager.keyboard.press('Escape');
  await manager.keyboard.press('Tab');await manager.keyboard.press('Shift+Tab');await manager.mouse.move(0,0);
  await save(manager,'history-list-'+(mobile?'mobile':'desktop'),mobile?900:1600,1200,'桌面管理页三个正文版本；V2预览按钮获得焦点，与旧版正文图对应','模块4；真实三个版本，V2预览控制获得焦点；原产品无选中行样式','real-extension-page',manager.locator('#historySection'));
 }
 checks.v2_preview_matches_saved_body=true;checks.no_restore_or_backup_claim=true;
 const record={task_id:'detail-v2-20261104-prompt-pocket',code_commit:baseline,interface_equivalent_commit:'a6d00f93e73377ddfda8d37958573df73872559d',browser:ctx.browser().version(),date:'2026-11-04',source_worktree_state:'main at f121600 with untracked output/ and tmp/ preserved; captured from clean isolated worktree',examples:{title:'展览介绍写作',versions},checks,page_errors:errors,native_context_gap:'原生侧栏外壳未截图；主视觉按授权回退为真实独立扩展页，不拼接网页或伪造浏览器布局'};
 await fs.writeFile(file('record.json'),JSON.stringify(record,null,2)+'\n');
 for(const a of assets){const raw=await fs.readFile(file(a.source)),meta=await sharp(raw).metadata();a.capture={path:a.source,width:meta.width,height:meta.height,sha256:hash(raw),format:'png'}}
 await fs.writeFile(file('manifest.json'),JSON.stringify({schema_version:2,product_id:'prompt-pocket',repository:'https://github.com/liaoyiming222-art/prompt-pocket',branch:'codex/detail-v2-20261104',code_commit:baseline,task_id:record.task_id,primary_image_count:9,record:'record.json',boundaries:['仅桌面Chromium142+；mobile为桌面局部，不代表手机安装','无账号、云同步或AI生成','仅受控textarea插入验证；不声称所有网站兼容','历史仅查看；未执行恢复与JSON备份','主视觉为独立扩展页回退；未取得网页与原生侧栏同场','列表没有原生选中行；V2预览按钮焦点对应正文图'],assets},null,2)+'\n');
 console.log('Captured 9 actual UI states',record.browser,checks);
}finally{await ctx.close();await new Promise(r=>server.close(r));await fs.rm(profile,{recursive:true,force:true})}

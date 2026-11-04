import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {chromium,sharp,browserPath} from '../runtime.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../../..'),f=n=>path.join(dir,n);
const original='3fad26caa1ae3359845724d376177b41caca8929',baseline='f1216008752b1e2c2ea3b4ae582a77fd2700bc74';
const m=JSON.parse(await fs.readFile(f('manifest.json'),'utf8')),record=JSON.parse(await fs.readFile(f('record.json'),'utf8'));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const name of ['background.js','content-widget.js','sidebar-background.js','popup.js','popup.css','popup.html','sidebar.html','i18n.js','manifest.json'])assert.equal((await fs.readFile(path.join(root,name),'utf8')).replaceAll('\r\n','\n'),execFileSync('git',['show',baseline+':'+name],{cwd:root,encoding:'utf8'}));
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'pp-r1-'));await fs.mkdir(path.join(profile,'Default'));
await fs.writeFile(path.join(profile,'Default/Preferences'),JSON.stringify({webkit:{webprefs:{minimum_font_size:25,minimum_logical_font_size:25}}}));
const ctx=await chromium.launchPersistentContext(profile,{executablePath:browserPath,headless:true,locale:'zh-CN',viewport:{width:400,height:1000},deviceScaleFactor:2,args:['--disable-extensions-except='+root,'--load-extension='+root,'--lang=zh-CN']});
const revision={task_id:'detail-v2-20261104-prompt-pocket-r1',original_task_id:record.task_id,code_commit:baseline,original_asset_commit:original,browser:null,settings:{minimum_font_size:25,minimum_logical_font_size:25,tab_zoom:1,viewport:{width:400,height:1000},device_scale_factor:2},captures:[]};
try{
 const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');revision.browser=ctx.browser().version();
 const send=message=>worker.evaluate(async m=>handleDataMessage(m),message);
 const first=await send({action:'create',title:record.examples.title,content:record.examples.versions[0]});
 for(const content of record.examples.versions.slice(1))await send({action:'update',id:first.prompt.id,title:record.examples.title,content});
 const p=await ctx.newPage();await p.goto(worker.url().replace('background.js','popup.html?view=manager'));await p.getByText(record.examples.title,{exact:true}).click();
 assert.equal(await p.locator('.version-item').count(),3);
 await p.locator('.version-item').nth(1).getByRole('button',{name:'预览',exact:true}).click();
 assert.equal(await p.locator('#previewContent').inputValue(),record.examples.versions[1]);
 const dialog=await p.locator('#versionPreview').boundingBox(),heading=await p.locator('.preview-heading').boundingBox(),body=await p.locator('#previewContent').boundingBox();
 // Actual, contiguous upper dialog crop; includes complete title, V2 and short body.
 const clip={x:Math.floor(dialog.x),y:Math.floor(dialog.y),width:Math.ceil(dialog.width),height:Math.ceil(body.y-dialog.y+160)};
 const preview=await p.screenshot({clip});
 await p.keyboard.press('Escape');await p.setViewportSize({width:500,height:1000});await p.locator('#versionList').evaluate(el=>el.scrollTop=0);await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');await p.mouse.move(0,0);
 assert.equal(await p.locator('.version-item').nth(1).getByRole('button',{name:'预览',exact:true}).evaluate(el=>el===document.activeElement),true);
 await p.locator('#versionList').evaluate(el=>el.scrollTop=0);const listState=await p.locator('#versionList').evaluate(el=>({height:el.clientHeight,scrollHeight:el.scrollHeight}));assert(listState.scrollHeight<=listState.height,'List overflow '+JSON.stringify(listState));revision.list_scroll_state=listState;const list=await p.locator('#historySection').screenshot();
 async function exportImage(id,raw,minHeight){
  const capturePath='evidence/'+id+'.png';await fs.writeFile(f(capturePath),raw);const meta=await sharp(raw).metadata(),height=Math.round(meta.height*900/meta.width),outHeight=Math.max(minHeight,height);
  const scaled=await sharp(raw).resize(900,height).png().toBuffer();
  await sharp({create:{width:900,height:outHeight,channels:4,background:'#faf9f6'}}).composite([{input:scaled,left:0,top:0}]).webp({quality:98,effort:6}).toFile(f('prompt-pocket-'+id+'.webp'));
  const a=m.assets.find(a=>a.path==='prompt-pocket-'+id+'.webp');a.width=900;a.height=outHeight;a.sha256=digest(await fs.readFile(f(a.path)));a.capture={path:capturePath,width:meta.width,height:meta.height,format:'png',sha256:digest(raw)};a.revision_task_id=revision.task_id;a.browser_settings={...revision.settings,viewport:{width:id.includes("list")?500:400,height:1000}};
  a.source=capturePath;
  revision.captures.push({path:a.path,browser_settings:a.browser_settings,raw_width:meta.width,raw_height:meta.height,output_width:900,output_height:outHeight,method:'Width-only proportional resize to 900, no contain shrink; plain bottom space only if required',minimum_rendered_font_estimate_at_288:25*288/(meta.width/2),clip:id.includes('preview')?clip:'actual #historySection element'});
 }
 await exportImage('history-list-mobile',list,1600);await exportImage('history-preview-mobile',preview,1200);
 for(const a of m.assets.filter(a=>!a.path.includes('history-list-mobile')&&!a.path.includes('history-preview-mobile'))){assert.deepEqual(await fs.readFile(f(a.path)),execFileSync('git',['show',original+':docs/portfolio-assets/detail-v2/'+a.path],{cwd:root,maxBuffer:10000000}))}
 revision.other_seven_image_bytes_unchanged=true;revision.no_product_styles_injected=true;revision.same_v2_body_verified=true;revision.actual_v2_focus_verified=true;
 m.revision={task_id:revision.task_id,original_task_id:record.task_id,original_asset_commit:original,record:'revision-r1.json',changed_primary_images:['prompt-pocket-history-list-mobile.webp','prompt-pocket-history-preview-mobile.webp']};
 await fs.writeFile(f('revision-r1.json'),JSON.stringify(revision,null,2)+'\n');await fs.writeFile(f('manifest.json'),JSON.stringify(m,null,2)+'\n');
 console.log(JSON.stringify(revision,null,2));
}finally{await ctx.close();await fs.rm(profile,{recursive:true,force:true})}

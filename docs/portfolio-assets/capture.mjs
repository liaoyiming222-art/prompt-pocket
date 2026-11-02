// Run the unpacked extension in a fresh, disposable browser profile. No API mock.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium,browserPath} from './runtime.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../..');
await fs.mkdir(path.join(dir,'captures'),{recursive:true});
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'pocket-portfolio-'));
const ctx=await chromium.launchPersistentContext(profile,{executablePath:browserPath,headless:true,locale:'zh-CN',viewport:{width:1100,height:940},args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`,'--lang=zh-CN']});
const errors=[];
ctx.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
try {
 const w=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker',{timeout:20000});
 const send=message=>w.evaluate(async m=>handleDataMessage(m),message);
 const first=await send({action:'create',title:'产品发布简报',content:'为一款效率工具编写产品发布简报，包括目标用户、核心价值、发布渠道和时间计划。'});
 await send({action:'update',id:first.prompt.id,title:'产品发布简报',content:'为一款效率工具编写产品发布简报，包括目标用户、核心价值、发布渠道、时间计划、成功指标和主要风险。'});
 await send({action:'update',id:first.prompt.id,title:'产品发布简报',content:'为一款效率工具编写产品发布简报，包括目标用户、核心价值、发布渠道、时间计划、成功指标、负责人和主要风险。最后附上一页发布检查清单。'});
 await send({action:'create',title:'每周研究总结',content:'总结本周研究内容，分别整理已确认结论、待解决问题和建议的下一步，保持语言简洁。'});
 await send({action:'create',title:'客户访谈提纲',content:'准备一份30分钟的客户访谈提纲，了解工作流程、痛点、替代方案和期望结果，使用开放式问题。'});
 const manager=await ctx.newPage();
 await manager.goto(w.url().replace('background.js','popup.html?view=manager'));
 assert.equal(await manager.locator('.prompt-item').count(),3);
 await manager.getByText('产品发布简报',{exact:true}).click();
 await manager.locator('.version-item').first().waitFor();
 assert.equal(await manager.locator('.version-item').count(),3);
 await manager.screenshot({path:path.join(dir,'captures/manager.png')});
 await manager.locator('.version-item').nth(1).getByRole('button',{name:'预览',exact:true}).click();
 assert.match(await manager.locator('#previewContent').inputValue(),/成功指标/);
 await manager.locator('#versionPreview').screenshot({path:path.join(dir,'captures/version.png')});
 const side=await ctx.newPage();
 // Test-only shadow inspection; markup, styles, storage and messages are unchanged.
 await side.addInitScript(()=>{const original=Element.prototype.attachShadow;Element.prototype.attachShadow=function(o){return original.call(this,{...o,mode:'open'})}});
 await side.setViewportSize({width:440,height:800});
 await side.goto(w.url().replace('background.js','sidebar.html'));
 await side.locator('.item').first().waitFor();
 assert.equal(await side.locator('.item').count(),3);
 await side.screenshot({path:path.join(dir,'captures/sidebar.png'),clip:{x:0,y:0,width:440,height:590}});
 await side.setViewportSize({width:360,height:800});
 await side.screenshot({path:path.join(dir,'captures/sidebar-narrow.png'),clip:{x:0,y:0,width:360,height:600}});
 await fs.writeFile(path.join(dir,'captures/record.json'),JSON.stringify({code_commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),version:'0.6.8',method:'Fresh-profile Edge unpacked extension; native storage and background handlers, no API bridge; sidebar.html opened as extension page, not browser side-panel chrome',fictional_examples:true,checks:{prompt_count:3,version_count:3,v2_body_verified:true},page_errors:errors},null,2)+'\n');
 console.log('Captured real extension UI',errors);
} finally {await ctx.close();await fs.rm(profile,{recursive:true,force:true});}

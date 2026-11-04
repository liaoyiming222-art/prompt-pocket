import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {sharp} from '../runtime.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url)),f=n=>path.join(dir,n),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const m=JSON.parse(await fs.readFile(f('manifest.json'),'utf8'));
assert.equal(m.assets.length,9);
const results=[];
for(const a of m.assets){
 const b=await fs.readFile(f(a.path)),meta=await sharp(b).metadata();assert.equal(meta.width,a.width);assert.equal(meta.height,a.height);assert.equal(meta.format,'webp');assert.equal(hash(b),a.sha256);
 const raw=await fs.readFile(f(a.source));assert.equal(hash(raw),a.capture.sha256);
 const target=a.path.includes('mobile')||a.path.includes('shared')?[288,358]:[829,1184];
 for(const width of target)await sharp(b).resize({width}).png().toFile(f('evidence/check-'+path.basename(a.path,'.webp')+'-'+width+'.png'));
 results.push({path:a.path,dimensions_format_sha256:'passed',display_widths:target});
}
const sources=[];
for(const name of (await fs.readdir(f('evidence'))).filter(n=>n.endsWith('.png')).sort()){
 const b=await fs.readFile(f('evidence/'+name)),meta=await sharp(b).metadata();
 sources.push({path:'evidence/'+name,width:meta.width,height:meta.height,format:meta.format,sha256:hash(b),alt:name.startsWith('check-')?'目标展示宽度检查图：'+name:name==='contact-sheet.png'?'九张成品的构图检查联系表':'真实界面原始采集：'+name,source_type:name.startsWith('check-')?'uniform-downscale-for-review':'capture-or-contact-sheet',purpose:'制作验证证据，不是额外成品'});
}
m.supporting_images=sources;await fs.writeFile(f('manifest.json'),JSON.stringify(m,null,2)+'\n');
await fs.writeFile(f('verification.json'),JSON.stringify({date:'2026-11-04',results,visual_review:{no_fake_UI:true,nine_specified_images:true,no_stretch:true,original_data_retained:true,known_gaps:['原生侧栏与网页同场未取得，采用独立扩展页回退','预览覆盖侧栏搜索属真实产品行为；搜索另图展示','历史列表无选中行样式，以V2预览按钮真实焦点关联','288px展示时列表版本小字约11–12px，低于约14px建议目标；请保留自然高度并支持原图查看，页面接入后复核'],insertion_mobile:'独立取受控网页结果区，保留原文、完整插入正文及来源；浮球实际拖至取景外'}},null,2)+'\n');
console.log('PASS: 9 image dimensions/formats/hashes and original captures; generated 288/358 and 829/1184px review previews');

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium,sharp,browserPath} from './runtime.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url)),file=n=>path.join(dir,n);
const m=JSON.parse(await fs.readFile(file('manifest.json'),'utf8'));
for(const a of [...m.assets,...(m.supporting_images||[])]){const b=await fs.readFile(file(a.path)),meta=await sharp(b).metadata();assert.equal(meta.width,a.width);assert.equal(meta.height,a.height);assert.equal(meta.format,a.format);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),a.sha256)}
const browser=await chromium.launch({executablePath:browserPath,headless:true});
const checks=[];
try{for(const n of ['hero','card','mobile','detail-01']){
 const p=await browser.newPage();await p.setContent(await fs.readFile(file(n+'.html'),'utf8'));await p.evaluate(()=>document.fonts.ready);
 const result=await p.evaluate(()=>[...document.querySelectorAll('.top,.copy,.shot,.shot-label,.foot,.index,.edition,.note')].filter(el=>getComputedStyle(el).display!=='none').map(el=>{const r=el.getBoundingClientRect(),m=document.querySelector('main').getBoundingClientRect();return {class:el.className,inside:r.left>=0&&r.top>=0&&r.right<=m.width&&r.bottom<=m.height}}));
 assert(result.every(r=>r.inside),JSON.stringify(result));
 checks.push({image:n,composition_elements_inside_canvas:true});
 for(const width of [390,960])await sharp(file(n+'.webp')).resize({width}).png().toFile(file(`captures/qa-${n}-${width}.png`));
 await p.close();
}
const p=await browser.newPage({viewport:{width:600,height:220},deviceScaleFactor:1});
const icon='data:image/png;base64,'+(await fs.readFile(file('icon-512.png'))).toString('base64');
await p.setContent(`<style>body{margin:0;font:14px Arial;display:flex}section{width:300px;height:220px;padding:28px;box-sizing:border-box;background:#f7f3fa;color:#30233f}section+section{background:#30233f;color:white}div{display:flex;align-items:center;gap:30px;margin-top:25px}img{display:block}</style><section>Light / native pixels<div><img src="${icon}" width="32" height="32"><img src="${icon}" width="40" height="40"></div></section><section>Dark / native pixels<div><img src="${icon}" width="32" height="32"><img src="${icon}" width="40" height="40"></div></section>`);
await p.screenshot({path:file('captures/qa-icons.png')});await p.close();
}finally{await browser.close()}
await fs.writeFile(file('verification.json'),JSON.stringify({manifest_dimensions_formats_sha256:'passed',compositions:checks,preview_widths:[390,960],icon_sizes:[32,40],icon_backgrounds:['light','dark'],visual_review:'See README for human-readable visual observations; generated previews in captures/qa-*'},null,2)+'\n');
console.log('Verified all manifest hashes, dimensions and formats; composition bounds; generated 390/960px previews and 32/40px icon checks');

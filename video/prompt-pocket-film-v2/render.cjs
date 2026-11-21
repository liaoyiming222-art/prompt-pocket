const { chromium } = require('playwright');
const { buildSync } = require('esbuild');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { createHash } = require('node:crypto');
const sharp = require('sharp');

const ffmpeg = process.env.FFMPEG_PATH;
const python = process.env.PYTHON_PATH || 'python';
const out = join(__dirname, 'output');
const library = join(__dirname, '../prompt-pocket-film-v1/vendor/three');
const input = join(__dirname, '../prompt-pocket-reuse-study/shot.html');
const samples = [40, 230, 352, 430, 515, 779, 780, 906, 974, 1079, 1080, 1295, 1340, 1510, 1625, 1770, 1919];
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const run = (exe, args) => {
  const result = spawnSync(exe, args, { windowsHide: true });
  if (result.error || result.status !== 0) throw result.error || new Error(result.stderr.toString());
  return result.stderr.toString();
};

async function main() {
  if (!ffmpeg) throw new Error('Set FFMPEG_PATH');
  mkdirSync(out, { recursive: true });
  buildSync({ entryPoints: [join(__dirname, 'hero.js')], bundle: true, format: 'iife', outfile: join(out, 'hero.bundle.js'), alias: {
    three: join(library, 'build/three.module.js'), 'three/addons': join(library, 'examples/jsm')
  } });
  const generated = join(__dirname, 'stage.generated.html');
  const template = readFileSync(input, 'utf8');
  if (!template.includes('</script></html>')) throw new Error('Unexpected study template');
  writeFileSync(generated, template.replace('</style>', '</style><link rel="stylesheet" href="film.css">').replace('</script></html>', '</script><script src="film.js"></script><script src="output/hero.bundle.js"></script><script>window.filmReady = Promise.all([window.ready, window.heroReady]).then(() => window.filmFrame(0));</script></html>'));
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  let encoder;
  const errors = [];
  const sampleDrift = {};
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(generated).href);
    await page.evaluate(() => window.filmReady).catch(error => { throw new Error(errors.join('\n'), { cause: error }); });
    const seek = frame => page.evaluate(value => window.filmFrame(value), frame);
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    for (const frame of samples) {
      await seek(frame);
      await settle();
      const shot = await page.screenshot({ path: join(out, `frame-${frame}.png`) });
      await seek((frame + 601) % 1920);
      await seek(frame);
      await settle();
      const replay = await page.screenshot();
      const [first, second] = await Promise.all([shot, replay].map(buffer => sharp(buffer).resize(480, 270).removeAlpha().raw().toBuffer()));
      const drift = first.reduce((sum, value, index) => sum + Math.abs(value - second[index]), 0) / first.length;
      sampleDrift[frame] = Number(drift.toFixed(5));
      if (drift > .12) throw new Error(`Inconsistent frame ${frame}: mean RGB difference ${drift}`);
    }
    if (errors.length) throw new Error(errors.join('\n'));
    if (process.argv.includes('--stills')) return;
    run(python, [join(__dirname, 'score.py')]);
    const movie = join(out, 'prompt-pocket-1080p60.mp4');
    encoder = spawn(ffmpeg, ['-hide_banner', '-v', 'error', '-y', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-framerate', '60', '-i', 'pipe:0',
      '-i', join(out, 'score.wav'), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'fast', '-crf', '17',
      '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-t', '32', '-movflags', '+faststart', movie], { windowsHide: true });
    let diagnostics = '';
    encoder.stderr.on('data', data => diagnostics += data);
    encoder.stdin.on('error', error => diagnostics += error.message);
    const complete = once(encoder, 'close');
    for (let frame = 0; frame < 1920; frame++) {
      await seek(frame);
      const jpeg = await page.screenshot({ type: 'jpeg', quality: 97 });
      if (!encoder.stdin.write(jpeg)) await once(encoder.stdin, 'drain');
      if (frame % 300 === 299) console.log(`${frame + 1}/1920`);
    }
    encoder.stdin.end();
    if ((await complete)[0]) throw new Error(diagnostics);
    const decoded = run(ffmpeg, ['-v', 'info', '-i', movie, '-c:v', 'libx264', '-c:a', 'aac', '-f', 'null', '-']);
    if (!/1920x1080[^\r\n]*60 fps/.test(decoded) || !/frame=\s*1920\b/.test(decoded) || !/Duration: 00:00:32\.00/.test(decoded) || !decoded.includes('Audio: aac') || errors.length) throw new Error('Final decode or browser validation failed');
    writeFileSync(join(out, 'verification.json'), JSON.stringify({ width: 1920, height: 1080, fps: 60, duration: 32, decodedFrames: 1920, audio: 'AAC', replayMeanRgbDifferenceAt480x270: sampleDrift, browserErrors: errors, sha256: digest(movie) }, null, 2));
  } finally {
    if (encoder && encoder.exitCode === null) encoder.kill();
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

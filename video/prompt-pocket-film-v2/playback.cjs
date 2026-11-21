const { chromium } = require('playwright');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { writeFileSync } = require('node:fs');
const sharp = require('sharp');

const landmarks = [1.3, 4.5, 5.85, 8.8, 13.74, 15.12, 15.78, 18.26, 21.7, 23.14, 25.21, 30.2];
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
    await page.goto(pathToFileURL(join(__dirname, 'preview.html')).href);
    const report = await page.evaluate(async landmarks => {
      const video = document.querySelector('video');
      const displayed = [];
      const sample = (_, frame) => {
        displayed.push(frame.mediaTime);
        if (!video.ended) video.requestVideoFrameCallback(sample);
      };
      const done = new Promise((resolve, reject) => {
        video.addEventListener('ended', resolve, { once: true });
        video.addEventListener('error', () => reject(new Error(video.error.message)), { once: true });
      });
      video.muted = true;
      video.requestVideoFrameCallback(sample);
      await video.play();
      await done;
      return { duration: video.duration, playedTo: video.currentTime, presented: displayed.length, width: video.videoWidth, height: video.videoHeight, phasesPresented: landmarks.every(time => displayed.some(frame => Math.abs(frame - time) < .15)) };
    }, landmarks);
    if (report.duration !== 32 || report.playedTo !== 32 || !report.phasesPresented || report.width !== 1920 || report.height !== 1080) throw new Error(JSON.stringify(report));
    const video = page.locator('video');
    await video.evaluate(element => { element.controls = false; });
    const images = [];
    for (const time of landmarks) {
      await video.evaluate(async (video, time) => {
        const seeked = new Promise(resolve => video.addEventListener('seeked', resolve, { once: true }));
        video.currentTime = time;
        await seeked;
      }, time);
      images.push(await sharp(await video.screenshot()).resize(480, 270).png().toBuffer());
    }
    const out = join(__dirname, 'output');
    await sharp({ create: { width: 1440, height: 1080, channels: 3, background: '#f2eaf7' } }).composite(images.map((frame, index) => ({
      input: frame, left: index % 3 * 480, top: Math.floor(index / 3) * 270
    }))).png().toFile(join(out, 'encoded-review.png'));
    writeFileSync(join(out, 'playback.json'), JSON.stringify({ ...report, landmarks }, null, 2));
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

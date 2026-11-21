const stage = by('stage');
const side = stage.querySelector('.side');
const browserCopy = stage.querySelector('.copy');
const heading = browserCopy.querySelector('h1');
const kicker = browserCopy.querySelector('.kicker');
const subtitle = browserCopy.querySelector('p');
const footer = stage.querySelector('.foot span:last-child');
const search = stage.querySelector('.search');
search.lastChild.remove();
search.insertAdjacentHTML('beforeend', '<span class="search-text" id="query"></span>');
side.id = 'side';
side.insertAdjacentHTML('beforeend', '<div class="ghosts" id="ghosts"><span>研究总结</span><span>访谈提纲</span></div>');
by('card').insertAdjacentHTML('beforeend', '<span class="peek" id="peek">预览</span>');
world.insertAdjacentHTML('beforeend', `
<section class="revision" id="revision">
 <small id="edit-mode">条目预览 / 快速编辑</small><h2>展览介绍</h2>
 <div class="revision-box" id="revision-box">请为虚构社区展览<br>写一段介绍<span class="addition" id="addition"></span></div>
 <div class="actions" id="actions"><span id="edit-status">编辑原提示词</span><b class="save" id="save">保存新版本</b></div>
</section>
<aside class="history" id="history"><small>同一个条目</small><h3>历史版本</h3>
 <div class="version" id="second"><strong>V2</strong>当前 · 补充看点</div>
 <div class="version" id="first"><strong>V1</strong>原版 · 展览介绍</div>
 <div class="status" id="history-status"></div>
</aside>`);
stage.insertAdjacentHTML('beforeend', `
<div class="hero-shell" id="hero-shell"><div class="halo"></div><div class="shadow" id="shadow"></div>
 <canvas id="hero-canvas"></canvas><div class="hero-copy" id="hero-copy">
 <div class="kicker" id="hero-kicker"></div><h1 id="hero-title"></h1><p id="hero-line"></p>
 </div></div>`);

const reuseFrame = window.seekFrame;
const show = (id, opacity) => { by(id).style.opacity = opacity; };
const chars = (value, ratio) => Array.from(value).slice(0, Math.floor(value.length * ratio)).join('');
const copy = (label, title, line) => {
  kicker.textContent = label;
  if (heading.dataset.title !== title) { heading.innerHTML = title; heading.dataset.title = title; }
  subtitle.textContent = line;
};
window.filmFrame = frame => {
  const time = frame / 60;
  const searchEnd = 13;
  const editBegin = 18;
  const opening = 1 - fade(time, 5.25, 6.4);
  const closing = fade(time, 26.65, 27.85);
  const heroOpacity = Math.max(opening, closing);
  show('hero-shell', heroOpacity);
  footer.textContent = heroOpacity > .75 ? 'PROMPT POCKET' : '操作示意 · 虚构提示词';
  if (heroOpacity > 0) {
    const end = time >= 26.65;
    const reveal = fade(time, .16, 2.45);
    by('hero-kicker').textContent = end ? 'PROMPT POCKET' : '提示词口袋';
    by('hero-title').innerHTML = end ? '提示词口袋' : '好用的，<br>值得留下';
    by('hero-line').textContent = end ? '随手存，随时用' : '给写过的好提示词，一个可回去的地方';
    show('hero-copy', end ? fade(time, 27.78, 28.57) : fade(time, .28, 1.52) * (1 - fade(time, 4.95, 5.57)));
    show('shadow', end ? .85 : reveal * .8);
    window.heroFrame({
      orbit: end ? mix(.55, -.27, fade(time, 26.65, 30.5)) : mix(.95, -.1, reveal),
      lift: end ? 0 : 1.04 * (1 - fade(time, 2.55, 4.36)),
      closing,
      distance: end ? mix(9.15, 9.7, fade(time, 26.65, 30.9)) : mix(7.2, 10.2, reveal),
    });
  }

  reuseFrame(Math.max(0, Math.min(299, frame - searchEnd * 60)));
  const searching = time < searchEnd;
  const editing = time >= editBegin;
  stage.querySelector('.mast span:last-child').textContent = 'PROMPT POCKET';
  const query = time < 8.27 ? '' : time < 8.74 ? '展' : '展览';
  by('query').textContent = query || '搜索提示词';
  const narrowing = fade(time, 8.31, 9.28);
  show('ghosts', 1 - narrowing);
  by('ghosts').style.transform = `translateY(${narrowing * 13}px)`;
  by('card').style.transform = `translateY(${searching ? (1 - narrowing) * 4 : 0}px)`;
  if (searching) {
    copy('从已存的提示词里找', '要用时，<br>搜得到', '输入「展览」，找到上次写好的那条');
    const sway = 1 - fade(time, 7.1, 13);
    world.style.transform += ` rotateY(${8 * sway}deg) translateY(${18 * sway}px)`;
    by('card').classList.toggle('active', time >= 8.74);
    show('guide', fade(time, 9.8, 11));
    const target = point(search, 43, 22);
    const reach = fade(time, 7.24, 7.98);
    const ring = clamp((time - 7.98) / .29);
    move(cursor, target[0] + 102 * (1 - reach), target[1] + 79 * (1 - reach));
    show('cursor', fade(time, 7.2, 7.42) * (1 - fade(time, 8, 8.27)));
    move(pulse, target[0] - 19, target[1] - 19, `scale(${.36 + ring * 1.42})`);
    show('pulse', time >= 7.98 ? 1 - ring : 0);
  } else if (!editing) {
    copy('把已有提示词用起来', '找到，<br>就能再用', '点击已存条目，原文落在光标处');
  } else {
    copy('给原来的写法留一份', '改了，<br>还能回看', '修改正文并保存，旧版依然可查');
  }
  browserCopy.style.opacity = searching
    ? fade(time, 6.06, 6.92) * (1 - fade(time, 12.57, 13))
    : !editing ? fade(time, 13.04, 13.56) * (1 - fade(time, 17.66, 18))
    : fade(time, 18.25, 18.92) * (1 - fade(time, 26.36, 27));
  const towardEdit = fade(time, 18.21, 19.16);
  const saved = fade(time, 22.2, 22.82);
  const reviewing = time >= 24.55;
  world.style.transform += ` rotateY(${8 * towardEdit * (1 - .5 * saved)}deg) translateX(${15 * towardEdit}px)`;
  show('revision', towardEdit);
  show('side', 1 - saved);
  show('history', saved);
  by('history').style.transform = `translate3d(${(1 - saved) * 42}px,0,${34 + 22 * saved}px)`;
  by('addition').textContent = reviewing ? '' : chars('，并列出两个看点', fade(time, 19.85, 21.55));
  by('edit-mode').textContent = reviewing ? '历史正文 / V1' : saved > .5 ? '当前正文 / V2' : '条目预览 / 快速编辑';
  by('edit-status').textContent = reviewing ? '正在回看旧版正文' : saved > .5 ? '已保存为 V2' : '编辑原提示词';
  by('history-status').textContent = reviewing ? 'V2 仍是当前版本' : 'V1 已保留';
  by('first').classList.toggle('selected', reviewing);
  by('second').classList.toggle('selected', !reviewing);
  show('save', 1 - saved);
  show('peek', fade(time, 17.55, 17.96) * (1 - fade(time, 18.23, 18.55)));
  const clickAt = time < 19 ? 18.2 : time < 23 ? 22.2 : 24.55;
  if (time >= 17.55) {
    const targetId = clickAt < 19 ? 'peek' : clickAt < 23 ? 'save' : 'first';
    const button = point(by(targetId), clickAt < 19 ? 17 : clickAt < 23 ? 54 : 66, clickAt < 19 ? 11 : 21);
    const travel = fade(time, clickAt - .52, clickAt);
    const clickRing = clamp((time - clickAt) / .29);
    move(cursor, button[0] + (1 - travel) * 115, button[1] + (1 - travel) * 86);
    show('cursor', fade(time, clickAt - .61, clickAt - .39) * (1 - fade(time, clickAt + .08, clickAt + .38)));
    move(pulse, button[0]-19, button[1]-19, `scale(${.36 + clickRing * 1.42})`);
    show('pulse', time >= clickAt ? 1 - clickRing : 0);
  }
};

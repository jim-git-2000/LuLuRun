/* LuLu Run: all assets, sound synthesis and saves stay on this device. */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('world');
  const ctx = canvas.getContext('2d', { alpha: false });
  const { Run, sanitizeSave, JUMP_TIME, SLIDE_TIME } = LuluCore;
  const SAVE_KEY = 'lulu.run.v1';
  let save;
  try { save = sanitizeSave(JSON.parse(localStorage.getItem(SAVE_KEY))); }
  catch (_) { save = sanitizeSave(null); }
  let run = new Run();
  let scene = 'home';
  let w = 390, h = 844, clock = 0, last = 0;
  let settled = false, countdown = 0, countdownAction = null;
  let toastUntil = 0, crashFlash = 0, missionStage = 0;
  let audio = null, musicBeat = -1;
  const frames = {}, particles = [];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tips = { crate: '大木箱跳不过去，试试左右换道。', hurdle: '遇到橙白路栏，上滑跳过去。', gate: '遇到绿色横杆，下滑从下面穿过。' };

  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
    catch (_) { toast('存储空间不足，本次记录暂未保存'); }
  }

  function resize() {
    const rect = $('app').getBoundingClientRect();
    w = rect.width; h = rect.height;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function syncSettings() {
    document.querySelectorAll('.sound-button').forEach(button => {
      button.textContent = button.id === 'pause-sound' ? `声音：${save.sound ? '开' : '关'}` : save.sound ? '♪' : '♩';
      button.setAttribute('aria-label', save.sound ? '关闭声音' : '开启声音');
      button.setAttribute('aria-pressed', String(save.sound));
    });
    $('controls-toggle').textContent = `辅助按键：${save.buttons ? '开' : '关'}`;
    $('controls-toggle').setAttribute('aria-pressed', String(save.buttons));
    $('touch-controls').hidden = !save.buttons;
    $('home-best').textContent = save.best.toLocaleString();
    $('home-bank').textContent = save.bank.toLocaleString();
  }
  syncSettings();

  function unlockAudio() {
    if (!save.sound) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    } catch (_) { /* A silent device can still play the entire game. */ }
  }

  function tone(freq, duration = 0.1, type = 'sine', volume = 0.06, delay = 0) {
    if (!save.sound || !audio || audio.state !== 'running') return;
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    const t = audio.currentTime + delay;
    oscillator.type = type; oscillator.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.start(t); oscillator.stop(t + duration + 0.01);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  function music() {
    const beat = Math.floor(run.time / 0.3);
    if (beat === musicBeat) return;
    musicBeat = beat;
    const notes = [523.25, 0, 659.25, 783.99, 0, 659.25, 587.33, 0, 523.25, 659.25, 0, 880, 783.99, 0, 659.25, 587.33];
    const note = notes[beat % notes.length];
    if (note) tone(note, 0.18, 'sine', 0.018);
    if (beat % 4 === 0) tone(130.81, 0.24, 'triangle', 0.025);
  }

  function toast(message) {
    $('toast').textContent = message;
    $('toast').classList.add('visible');
    toastUntil = clock + 2.4;
  }

  function show(name) {
    $('home').hidden = name !== 'home';
    $('hud').hidden = name === 'home';
    $('pause-screen').hidden = name !== 'paused';
    $('result-screen').hidden = name !== 'over';
    $('help-screen').hidden = true;
    scene = name;
  }

  function start() {
    unlockAudio();
    run = new Run(); settled = false; missionStage = 0; musicBeat = -1;
    particles.length = 0; crashFlash = 0;
    show('running');
    run.start();
    toast(save.tutorial ? '新的一程，出发！' : '先试试左右滑动，收集闪闪的金币');
    save.tutorial = true; persist();
    updateHud();
    tone(523, .12); tone(659, .12, 'sine', .06, .10); tone(784, .2, 'sine', .06, .20);
  }

  function settle() {
    if (settled) return;
    settled = true;
    const record = run.score > save.best;
    save.best = Math.max(save.best, run.score);
    save.bank += run.coins;
    save.distance += Math.floor(run.distance);
    save.runs++;
    persist(); syncSettings();
    $('result-kicker').textContent = record ? 'NEW PERSONAL BEST!' : 'NICE RUN!';
    $('result-title').textContent = record ? '哇，跑出新纪录！' : '这一程，真开心';
    $('result-score').textContent = run.score.toLocaleString();
    $('result-distance').textContent = `${Math.floor(run.distance)} m`;
    $('result-coins').textContent = `+${run.coins}`;
    $('result-best').textContent = save.best.toLocaleString();
    $('crash-tip').textContent = tips[run.reason] || '金币已经装进口袋，下次继续冒险。';
  }

  function pause() {
    if (countdown > 0) {
      countdown = 0; countdownAction = null; $('countdown').hidden = true;
      show('paused');
      if (audio && audio.state === 'running') audio.suspend().catch(() => {});
      return;
    }
    if (scene !== 'running') return;
    run.pause(); show('paused');
    if (audio && audio.state === 'running') audio.suspend().catch(() => {});
  }
  window.pauseGame = pause;

  function resume() {
    if (countdown > 0) return;
    unlockAudio();
    $('pause-screen').hidden = true;
    $('countdown').hidden = false;
    $('countdown').textContent = '3';
    countdown = 3;
    countdownAction = () => { show('running'); run.resume(); };
    tone(440, .12);
  }

  function goHome() {
    countdown = 0; countdownAction = null; $('countdown').hidden = true;
    run.pause(); particles.length = 0; show('home'); syncSettings();
  }

  window.handleBack = () => {
    if (!$('help-screen').hidden) { $('help-screen').hidden = true; return true; }
    if (scene === 'home') return false;
    if (scene === 'running') pause();
    else if (scene === 'paused') {
      if (countdown > 0) { countdown = 0; countdownAction = null; $('countdown').hidden = true; $('pause-screen').hidden = false; }
      else resume();
    } else goHome();
    return true;
  };

  $('start').addEventListener('click', start);
  $('retry').addEventListener('click', start);
  $('pause').addEventListener('click', pause);
  $('resume').addEventListener('click', resume);
  $('back-home').addEventListener('click', goHome);
  $('quit').addEventListener('click', () => { settle(); goHome(); });
  $('help-open').addEventListener('click', () => { $('help-screen').hidden = false; });
  $('help-close').addEventListener('click', () => { $('help-screen').hidden = true; });
  $('reload').addEventListener('click', () => location.reload());
  $('controls-toggle').addEventListener('click', () => { save.buttons = !save.buttons; persist(); syncSettings(); });
  document.querySelectorAll('.sound-button').forEach(button => button.addEventListener('click', () => {
    save.sound = !save.sound;
    if (save.sound) { unlockAudio(); tone(660); }
    else if (audio) audio.suspend().catch(() => {});
    persist(); syncSettings();
  }));
  document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('pointerdown', event => {
    event.preventDefault(); act(button.dataset.action);
  }));

  function act(action) {
    if (scene !== 'running' || countdown > 0) return;
    unlockAudio(); run.input(action);
  }
  let gesture = null;
  $('app').addEventListener('pointerdown', event => {
    if (event.target.closest('button') || scene !== 'running' || !event.isPrimary) return;
    gesture = { x: event.clientX, y: event.clientY, id: event.pointerId };
    $('app').setPointerCapture(event.pointerId);
  });
  $('app').addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < Math.max(22, w * .055)) return;
    act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'slide' : 'jump'));
    gesture = null;
  });
  const clearGesture = () => { gesture = null; };
  $('app').addEventListener('pointerup', clearGesture);
  $('app').addEventListener('pointercancel', clearGesture);
  document.addEventListener('keydown', event => {
    const action = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'jump', w: 'jump', ' ': 'jump', ArrowDown: 'slide', s: 'slide' }[event.key];
    if (action && scene === 'running') { event.preventDefault(); if (!event.repeat) act(action); }
    if (event.key === 'Escape') { event.preventDefault(); window.handleBack(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', pause);
  window.addEventListener('pagehide', () => { if (scene !== 'home' && !settled) settle(); });

  function updateHud() {
    $('distance').textContent = Math.floor(run.distance).toLocaleString();
    $('coins').textContent = run.coins;
    $('speed-label').textContent = ['轻快起跑', '风在耳边', '全速向前', '小镇飞毛腿'][run.level - 1];
    const goals = [{ text: '小目标 · 收集 20 枚金币', value: run.coins, max: 20 }, { text: '小目标 · 跑过 500 米', value: Math.floor(run.distance), max: 500 }, { text: '小目标 · 收集 80 枚金币', value: run.coins, max: 80 }];
    if (missionStage < goals.length && goals[missionStage].value >= goals[missionStage].max) {
      missionStage++;
      toast(missionStage === goals.length ? '今天的小目标，全部达成！' : '小目标达成！继续向前');
      tone(660, .15); tone(880, .25, 'sine', .05, .12);
    }
    const goal = goals[Math.min(missionStage, goals.length - 1)];
    $('mission-text').textContent = missionStage === goals.length ? '小目标全部达成 · 挑战最高分' : goal.text;
    $('mission-progress').textContent = missionStage === goals.length ? '✓' : `${Math.min(goal.value, goal.max)} / ${goal.max}`;
    $('mission-fill').style.width = `${Math.min(1, goal.value / goal.max) * 100}%`;
    for (const type of ['shield', 'magnet']) {
      const element = $(`${type}-status`);
      element.hidden = run[type] <= 0;
      element.querySelector('b').textContent = `${Math.ceil(run[type])}s`;
    }
    $('run-hint').style.opacity = run.distance < 170 || save.buttons ? '1' : '.4';
  }

  function polygon(points, color) {
    ctx.fillStyle = color; ctx.beginPath();
    points.forEach((p, index) => index ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.closePath(); ctx.fill();
  }
  function rounded(x, y, width, height, radius, color) {
    if (width <= 0 || height <= 0) return;
    const r = Math.min(radius, width / 2, height / 2);
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r); ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath(); ctx.fill();
  }
  function ellipse(x, y, rx, ry, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2); ctx.fill();
  }
  function line(x, y, x2, y2, color, width = 1) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function label(text, x, y, size, color, weight = '700') {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.fillText(text, x, y);
  }

  function project(lane, z) {
    const p = 22 / (22 + Math.max(-10, z));
    const horizon = h * (scene === 'home' ? .40 : .30);
    return { x: w / 2 + lane * w * .245 * p, y: horizon + (h * .88 - horizon) * p, p };
  }

  function background() {
    const horizon = h * (scene === 'home' ? .40 : .30);
    const sky = ctx.createLinearGradient(0, 0, 0, horizon + 100);
    sky.addColorStop(0, '#9ddfd8'); sky.addColorStop(1, '#fff0c8');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ellipse(w * .82, horizon * .62, w * .13, w * .13, '#fff7d599');
    ellipse(w * .82, horizon * .62, w * .095, w * .095, '#fff9df');
    for (let i = 0; i < 4; i++) {
      const x = ((i * .31 * w + clock * (reducedMotion ? 0 : 2)) % (w + 120)) - 50;
      const y = horizon * (.25 + (i % 3) * .19);
      ellipse(x, y, 33, 9, '#fffdf578'); ellipse(x + 15, y - 6, 21, 12, '#fffdf578');
    }
    for (let i = 0; i < 17; i++) {
      const bx = i * w / 15 - 10, bh = (19 + Math.sin(i * 7) * 15 + i % 4 * 12);
      rounded(bx, horizon - bh, w / 13, bh + 15, 3, i % 2 ? '#95c6b494' : '#b0d4bb');
      for (let j = 0; j < 3; j++) ctx.fillRect(bx + 8, horizon - bh + 8 + j * 12, 3, 4);
    }
    ctx.fillStyle = '#80b69a'; ctx.fillRect(0, horizon + 8, w, h);
    polygon([[w / 2 - 15, horizon], [w / 2 + 15, horizon], [w * 1.8, h], [-w * .8, h]], '#e1d3ae');
    polygon([[w / 2 - 7, horizon], [w / 2 + 7, horizon], [w * 1.15, h], [-w * .15, h]], '#64817a');
    const travel = scene === 'home' ? clock * 4 : run.distance;
    for (let i = 30; i >= -2; i--) {
      const z = i * 5 - (travel % 5);
      const a = project(0, z), b = project(0, z + 5);
      const aw = w * .405 * a.p, bw = w * .405 * b.p;
      polygon([[a.x - aw, a.y], [a.x + aw, a.y], [b.x + bw, b.y], [b.x - bw, b.y]], (i + Math.floor(travel / 5)) % 2 ? '#6a8780' : '#68857e');
      for (const side of [-1, 1]) {
        polygon([[a.x + side * aw, a.y], [a.x + side * (aw + 8 * a.p), a.y], [b.x + side * (bw + 8 * b.p), b.y], [b.x + side * bw, b.y]], (i + Math.floor(travel / 5)) % 2 ? '#fff2cc' : '#d3bea0');
      }
      if ((i + Math.floor(travel / 5)) % 2 === 0) {
        for (const lane of [-.5, .5]) {
          const q = project(lane, z + 1), r = project(lane, z + 4);
          polygon([[q.x - 1.7 * q.p, q.y], [q.x + 1.7 * q.p, q.y], [r.x + 1.7 * r.p, r.y], [r.x - 1.7 * r.p, r.y]], '#e6e5c884');
        }
      }
    }
    // A hand-painted town: buildings and trees move with the same projection as obstacles.
    for (let i = 11; i >= 0; i--) {
      const z = i * 15 - (travel % 15);
      if (z < -7) continue;
      const index = i + Math.floor(travel / 15);
      for (const side of [-1, 1]) {
        const p = project(side * 2.7, z);
        building(p.x, p.y, p.p, index + (side + 1) * 3);
        const t = project(side * 1.94, z - 5);
        tree(t.x, t.y, t.p, index);
      }
    }
    // A small town welcome sign stays at the vanishing point.
    const sy = horizon + 11;
    line(w * .40, sy, w * .40, sy + 38, '#778a6b', 2);
    line(w * .60, sy, w * .60, sy + 38, '#778a6b', 2);
    rounded(w * .385, sy - 4, w * .23, 18, 4, '#fff1cc');
    label('SUNNY TOWN', w / 2, sy + 8, 6, '#507b68');
  }

  function building(x, y, p, seed) {
    const bw = w * .32 * p, bh = w * (.43 + (seed % 3) * .10) * p;
    if (x + bw < 0 || x - bw > w) return;
    const palettes = [['#eaaa8f', '#b67963'], ['#e9ce96', '#b5a27a'], ['#a5c9ba', '#729e90'], ['#e9c6b4', '#b49183']];
    const colors = palettes[((seed % 4) + 4) % 4];
    polygon([[x + bw * .35, y], [x + bw * .65, y - bh * .14], [x + bw * .65, y - bh * 1.05], [x + bw * .35, y - bh]], colors[1]);
    rounded(x - bw * .5, y - bh, bw * .86, bh, 3 * p, colors[0]);
    rounded(x - bw * .56, y - bh - 6 * p, bw, 10 * p, 2 * p, '#f5e7c6');
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const wx = x - bw * .35 + col * bw * .37, wy = y - bh + 16 * p + row * bh * .23;
        rounded(wx, wy, bw * .19, bh * .15, 2 * p, '#f9eace');
        rounded(wx + 3 * p, wy + 3 * p, bw * .19 - 6 * p, bh * .15 - 5 * p, p, '#54877d');
        line(wx + bw * .095, wy + 3 * p, wx + bw * .095, wy + bh * .15, '#d4d7b7', p);
      }
    }
    rounded(x - bw * .30, y - bh * .23, bw * .5, bh * .23, 3 * p, '#3e6b62');
    const awningY = y - bh * .28;
    for (let i = 0; i < 5; i++) rounded(x - bw * .38 + i * bw * .13, awningY, bw * .13, 13 * p, 2 * p, i % 2 ? '#e6af78' : '#fff0cf');
    if (p > .3) label(seed % 2 ? 'CAFÉ' : 'LULU', x - bw * .045, awningY - 5 * p, 9 * p, '#fff8df');
  }

  function tree(x, y, p, seed) {
    ellipse(x, y, 24 * p, 6 * p, '#294f3c24');
    rounded(x - 3 * p, y - 52 * p, 6 * p, 52 * p, p, '#a08357');
    ellipse(x, y - 63 * p, 23 * p, 34 * p, seed % 2 ? '#448c71' : '#5b9d78');
    ellipse(x - 8 * p, y - 71 * p, 15 * p, 24 * p, '#75b18a');
    ellipse(x + 8 * p, y - 80 * p, 7 * p, 13 * p, '#96c69288');
    rounded(x - 14 * p, y - 9 * p, 28 * p, 10 * p, 3 * p, '#bead89');
  }

  function coin(x, y, size, phase = 0) {
    const rx = size * (.66 + .22 * Math.sin(phase));
    ellipse(x + 2, y + 2, rx, size, '#b98825');
    ellipse(x, y, rx, size, '#ffca45');
    ctx.strokeStyle = '#ffe88b'; ctx.lineWidth = Math.max(1, size * .15);
    ctx.beginPath(); ctx.ellipse(x, y, rx * .73, size * .78, 0, 0, Math.PI * 2); ctx.stroke();
    if (size > 5) label('L', x, y + size * .4, size * 1.05, '#c48c26', '900');
    ellipse(x - size * .24, y - size * .45, size * .12, size * .08, '#fff4c3');
  }

  function obstacle(item) {
    const p = project(item.lane - 1, item.z), x = p.x, y = p.y, s = w * .19 * p.p;
    if (item.z < -4 || item.resolved && item.kind === run.reason && scene === 'over') return;
    if (item.kind === 'coin') {
      coin(x, y - s * .40 + Math.sin(clock * 4 + item.id) * 2 * p.p, s * .15, clock * 3 + item.id);
      return;
    }
    ellipse(x, y, s * .55, s * .10, '#284b3a30');
    if (item.kind === 'crate') {
      const top = y - s * 1.13;
      polygon([[x - s * .43, top], [x + s * .30, top], [x + s * .50, top - s * .18], [x - s * .24, top - s * .18]], '#e9bd7a');
      polygon([[x + s * .30, y], [x + s * .50, y - s * .15], [x + s * .50, top - s * .18], [x + s * .30, top]], '#9a6747');
      rounded(x - s * .43, top, s * .74, s * 1.13, 3 * p.p, '#c59159');
      rounded(x - s * .35, top + s * .08, s * .58, s * .96, 2 * p.p, '#b77e4d');
      line(x - s * .3, top + s * .16, x + s * .18, y - s * .14, '#e0b17a', s * .10);
      line(x + s * .18, top + s * .16, x - s * .3, y - s * .14, '#d7a36b', s * .10);
      label('×', x - s * .06, top + s * .69, s * .39, '#fff0cc');
    } else if (item.kind === 'hurdle') {
      for (const side of [-1, 1]) {
        rounded(x + side * s * .36 - s * .045, y - s * .51, s * .09, s * .55, 2 * p.p, '#eee8d1');
        rounded(x + side * s * .36 - s * .11, y - s * .025, s * .22, s * .07, 2 * p.p, '#355b53');
      }
      rounded(x - s * .5, y - s * .57, s, s * .30, 3 * p.p, '#fff4dc');
      for (let i = 0; i < 3; i++) polygon([[x - s * .47 + i * s * .34, y - s * .55], [x - s * .29 + i * s * .34, y - s * .55], [x - s * .39 + i * s * .34, y - s * .29], [x - s * .55 + i * s * .34, y - s * .29]], '#ed925d');
      label('↑', x, y - s * .65, s * .22, '#fff9df');
    } else if (item.kind === 'gate') {
      for (const side of [-1, 1]) rounded(x + side * s * .48 - s * .055, y - s * 1.72, s * .11, s * 1.76, 3 * p.p, '#356f65');
      rounded(x - s * .56, y - s * 1.75, s * 1.12, s * .73, 5 * p.p, '#4daa94');
      rounded(x - s * .49, y - s * 1.65, s * .98, s * .48, 3 * p.p, '#83c9af');
      label('↓', x, y - s * 1.28, s * .38, '#fff5d1', '900');
      for (const side of [-1, 1]) rounded(x + side * s * .48 - s * .055, y - s * .65, s * .11, s * .18, p.p, '#ffe2a0');
    } else {
      const py = y - s * .68 + Math.sin(clock * 4) * 4 * p.p;
      ellipse(x, py, s * .33, s * .33, item.kind === 'shield' ? '#8edbd4' : '#eda595');
      ctx.strokeStyle = '#fff3d2'; ctx.lineWidth = 2 * p.p; ctx.beginPath(); ctx.arc(x, py, s * .27, 0, Math.PI * 2); ctx.stroke();
      label(item.kind === 'shield' ? '◇' : 'U', x, py + s * .15, s * .45, '#fffdf1', '900');
    }
  }

  function player() {
    const home = scene === 'home';
    const p = project(run.x - 1, 0);
    const x = home ? w / 2 : p.x;
    const feet = home ? Math.min(h * .745, h - 218) : p.y;
    const size = home ? Math.min(w * .59, h * .30) : w * .35;
    const jump = home ? Math.sin(clock * 2) * 2 : run.height * w * .27;
    const slide = !home && run.slide > 0;
    ellipse(x, feet + 1, size * (slide ? .36 : .28) * (1 - (home ? 0 : run.height * .28)), size * .055, '#244f3c32');
    if (!home && run.shield > 0) {
      ellipse(x, feet - size * .42 - jump, size * .45, size * .54, '#a4f8ea22');
      ctx.strokeStyle = '#c9fff0aa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, feet - size * .42 - jump, size * .45, size * .54, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const animation = home ? 'idle' : run.jump > 0 ? 'jump' : slide ? 'slide' : 'run';
    const set = frames[animation];
    if (!set) return;
    let index;
    if (animation === 'jump') index = Math.min(set.length - 1, Math.floor((1 - run.jump / JUMP_TIME) * set.length));
    else if (animation === 'slide') index = Math.min(set.length - 1, Math.floor((1 - run.slide / SLIDE_TIME) * set.length));
    else index = Math.floor((home ? clock * 9 : run.time * 14) % set.length);
    const image = set[index];
    ctx.save();
    ctx.translate(x, feet - jump);
    if (!home && run.invincible > 0) ctx.globalAlpha = .55 + .45 * Math.sin(clock * 40) ** 2;
    if (!home) ctx.rotate((run.lane - run.x) * .13);
    const bob = !home && !slide && run.jump <= 0 && !reducedMotion ? Math.sin(run.time * 20) * 2.5 : 0;
    const anchorY = home ? 464 : image.anchorY;
    ctx.drawImage(image, -size / 2, -size * anchorY / image.naturalHeight + bob, size, size);
    ctx.restore();
    if (!home && run.magnet > 0) {
      ctx.strokeStyle = '#ffe19ab0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, feet - size * .3, size * .55, size * .18, Math.sin(clock * 2) * .3, 0, Math.PI * 2); ctx.stroke();
    }
    if (home) {
      for (let i = 0; i < 3; i++) coin(x + (i - 1) * 43, feet - size - 8 - (i === 1 ? 12 : 0), 9, clock * 2 + i);
    }
  }

  function burst(lane, color, count = 12) {
    const p = project(lane - 1, 0);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, speed = 40 + Math.random() * 100;
      particles.push({ x: p.x, y: p.y - w * .12, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 80, life: .55, color });
    }
  }

  function events() {
    for (const event of run.drainEvents()) {
      if (event.type === 'collect') {
        burst(event.lane, event.kind === 'coin' ? '#ffe08a' : '#b8fff0', reducedMotion ? 3 : 10);
        if (event.kind === 'coin') tone(1000 + run.coins % 5 * 110, .08, 'sine', .035);
        else { toast(event.kind === 'shield' ? '护盾就位！抵挡一次碰撞' : '磁铁启动！三条跑道都能吸'); tone(660, .2); tone(990, .3, 'sine', .05, .12); }
      } else if (event.type === 'shield-break') {
        burst(run.x, '#cafff1', 24); toast('护盾保护了你，继续跑！'); tone(330, .3, 'triangle');
      } else if (event.type === 'action') {
        if (event.action === 'jump') tone(440, .12, 'triangle', .035);
        else if (event.action === 'slide') tone(220, .12, 'triangle', .025);
      } else if (event.type === 'crash') {
        crashFlash = .28; burst(run.x, '#ffe2b0', 20);
        tone(150, .35, 'triangle', .1); tone(95, .4, 'triangle', .08, .12);
        updateHud(); settle(); show('over');
      }
    }
  }

  let hudClock = 0;
  function frame(timestamp) {
    const delta = Math.min((timestamp - (last || timestamp)) / 1000, .1);
    last = timestamp;
    if (!document.hidden) clock += delta;
    if (countdown > 0) {
      const previous = Math.ceil(countdown);
      countdown = Math.max(0, countdown - delta);
      if (Math.ceil(countdown) !== previous && countdown > 0) tone(440 + (3 - Math.ceil(countdown)) * 110, .12);
      $('countdown').textContent = Math.ceil(countdown);
      if (countdown === 0) {
        $('countdown').hidden = true;
        const action = countdownAction; countdownAction = null;
        if (action) action();
      }
    }
    if (scene === 'running') { run.update(delta); events(); if (run.state === 'running') music(); }
    hudClock += delta;
    if (scene === 'running' && hudClock >= .08) { updateHud(); hudClock = 0; }
    if (clock > toastUntil) $('toast').classList.remove('visible');
    background();
    if (scene !== 'home') {
      const objects = [...run.objects].sort((a, b) => b.z - a.z);
      objects.filter(item => item.z >= 0).forEach(obstacle);
      player();
      objects.filter(item => item.z < 0).forEach(obstacle);
    } else player();
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (scene === 'running' || scene === 'over') {
        p.life -= delta; p.x += p.vx * delta; p.y += p.vy * delta; p.vy += delta * 160;
      }
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life / .55);
      rounded(p.x, p.y, 4, 4, 1, p.color);
    }
    ctx.globalAlpha = 1;
    if (crashFlash > 0) {
      ctx.fillStyle = `rgba(255,225,187,${crashFlash})`; ctx.fillRect(0, 0, w, h); crashFlash -= delta;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  async function loadFrames() {
    const runner = {
      run: [1096, 1060, 1066, 1083, 1100, 1067, 1060, 1099],
      jump: [1064, 1101, 1059, 1075],
      slide: [1068, 1110, 1054, 1064]
    };
    function loadImage(src, anchorY) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => { image.anchorY = anchorY; resolve(image); };
        image.onerror = reject;
        image.src = src;
      });
    }
    try {
      frames.idle = await Promise.all(Array.from({ length: 12 }, (_, index) =>
        loadImage(`pet/lulu_idle_${String(index * 7 + 1).padStart(4, '0')}.png`, 464)));
      await Promise.all(Object.entries(runner).map(async ([name, anchors]) => {
        frames[name] = await Promise.all(anchors.map((anchorY, index) =>
          loadImage(`runner/lulu_${name}_${String(index + 1).padStart(2, '0')}.png`, anchorY)));
      }));
      $('start').disabled = false; $('start-text').textContent = '开始跑跑';
    } catch (_) { $('load-error').hidden = false; }
  }
  loadFrames();
})();

// Exercise the actual page controller with platform doubles; this is not a browser renderer.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../app/src/main/assets/game/core.js');
const gameDir = path.join(__dirname, '../app/src/main/assets/game');

async function page({ brokenImage = false, brokenManifest = false } = {}) {
  const listeners = target => Object.assign(target, {
    handlers: {},
    addEventListener(type, handler) { (this.handlers[type] ||= []).push(handler); },
    fire(type, event = {}) {
      for (const handler of this.handlers[type] || []) handler({ preventDefault() {}, ...event });
    }
  });
  const gradient = { addColorStop() {} };
  const context = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' ? () => gradient : () => {} });
  const element = () => listeners({
    hidden: false, disabled: false, style: {}, dataset: {}, attributes: {}, textContent: '',
    classList: { add() {}, remove() {} },
    setAttribute(key, value) { this.attributes[key] = value; },
    getBoundingClientRect() { return { width: 390, height: 844 }; },
    getContext() { return context; },
    querySelector() { return this.child ||= element(); },
    closest() { return null; }, setPointerCapture() {}
  });
  const nodes = {};
  const html = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
  for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
    nodes[match[1]] = Object.assign(element(), {
      id: match[1], hidden: /\bhidden\b/.test(match[0]), disabled: /\bdisabled\b/.test(match[0])
    });
  }
  let currentRun, nextFrame, timestamp = 1000, decoded = 0, peakDecoders = 0;
  const bitmaps = [], timers = new Map(), stored = new Map();
  const document = listeners({
    hidden: false,
    getElementById(id) { assert.ok(nodes[id], `Missing ${id}`); return nodes[id]; },
    querySelectorAll(selector) { return selector === '.sound-button' ? [nodes['pause-sound']] : []; },
    createElement(tag) { assert.equal(tag, 'canvas'); const item = element(); bitmaps.push(item); return item; }
  });
  const window = listeners({ devicePixelRatio: 1, matchMedia: () => ({ matches: false }) });
  const sandbox = {
    document, window, AbortController,
    LuluCore: { ...core, Run: class extends core.Run { constructor() { super(42); currentRun = this; } } },
    localStorage: { getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value) },
    location: { reload() {} },
    requestAnimationFrame(callback) { nextFrame = callback; },
    setTimeout(callback) { const id = Symbol(); timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    async fetch(src) {
      return { ok: !brokenManifest, json: async () => JSON.parse(fs.readFileSync(path.join(gameDir, src), 'utf8')) };
    },
    Image: class {
      set src(value) {
        if (!value) return;
        decoded++;
        peakDecoders = Math.max(decoded, peakDecoders);
        queueMicrotask(() => { decoded--; if (brokenImage) this.onerror?.(); else this.onload?.(); });
      }
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(gameDir, 'game.js'), 'utf8'), sandbox);
  await new Promise(resolve => setImmediate(resolve));
  function advance(seconds) {
    for (let n = 0; n < Math.ceil(seconds * 60); n++) {
      timestamp += 1000 / 60;
      nextFrame(timestamp);
    }
  }
  return {
    nodes, document, window, bitmaps, timers, peakDecoders, advance,
    click(id) { nodes[id].fire('click'); },
    get run() { return currentRun; },
    get save() { return JSON.parse(stored.get('lulu.run.v1')); }
  };
}

test('page loads both manifests, bounds decoding concurrency and enables play', async () => {
  const p = await page();
  assert.equal(p.nodes.start.disabled, false);
  assert.equal(p.nodes['load-error'].hidden, true);
  assert.equal(p.bitmaps.length, 28);
  assert.ok(p.bitmaps.every(image => image.width === 512 && image.height === 512));
  assert.ok(p.peakDecoders <= 2);
  assert.equal(p.timers.size, 0);
  p.click('start'); p.advance(.5);
  assert.ok(p.run.distance > 0);
});

test('missing manifest or image leaves start disabled with a stable retry message', async () => {
  for (const options of [{ brokenImage: true }, { brokenManifest: true }]) {
    const p = await page(options);
    assert.equal(p.nodes.start.disabled, true);
    assert.equal(p.nodes['load-error'].hidden, false);
    assert.equal(p.nodes['start-text'].textContent, '热身未完成');
    p.click('start');
    assert.equal(p.run.state, 'ready');
    assert.equal(p.timers.size, 0);
  }
});

test('pagehide and interrupted countdown preserve the run for one final settlement', async () => {
  const p = await page();
  p.click('start');
  p.run.objects = []; p.run.nextRow = 10000;
  p.advance(.5); p.run.coins = 2;
  p.window.fire('pagehide', { persisted: true });
  assert.equal(p.run.state, 'paused');
  assert.equal(p.save.runs, 0);
  const distance = p.run.distance;
  p.click('resume'); p.advance(1); p.window.fire('blur');
  assert.equal(p.nodes.countdown.hidden, true);
  assert.equal(p.nodes['pause-screen'].hidden, false);
  assert.equal(p.run.distance, distance);
  p.document.fire('keydown', { key: 'Escape', repeat: true });
  assert.equal(p.nodes.countdown.hidden, true);
  p.click('resume'); p.advance(3.5);
  assert.equal(p.run.state, 'running');
  p.run.coins = 5;
  p.click('pause'); p.click('quit'); p.click('quit');
  assert.equal(p.save.runs, 1);
  assert.equal(p.save.bank, 5);
  assert.ok(p.save.distance > distance);
});

test('pause discards unfinished gestures and uppercase WASD works after resume', async () => {
  const p = await page();
  p.click('start');
  p.run.objects = []; p.run.nextRow = 10000;
  p.nodes.app.fire('pointerdown', { target: p.nodes.world, isPrimary: true, pointerId: 1, clientX: 100, clientY: 100 });
  p.click('pause'); p.click('resume'); p.advance(3.5);
  p.nodes.app.fire('pointermove', { pointerId: 1, clientX: 200, clientY: 100 });
  assert.equal(p.run.lane, 1);
  p.document.fire('keydown', { key: 'D' });
  assert.equal(p.run.lane, 2);
  p.document.fire('keydown', { key: 'W' });
  assert.ok(p.run.jump > 0);
});

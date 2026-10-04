/* Shared by the Android game and Node checks. No rendering or platform dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LuluCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STEP = 1 / 120;
  const JUMP_TIME = 0.96;
  const SLIDE_TIME = 0.85;
  const HAZARDS = ['crate', 'hurdle', 'gate'];

  function seededRandom(seed) {
    let state = (seed >>> 0) || 1;
    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  class Run {
    constructor(seed = Date.now()) {
      this.random = seededRandom(seed);
      this.state = 'ready';
      this.distance = 0;
      this.time = 0;
      this.coins = 0;
      this.dodged = 0;
      this.lane = 1;
      this.x = 1;
      this.jump = 0;
      this.slide = 0;
      this.shield = 0;
      this.magnet = 0;
      this.invincible = 0;
      this.objects = [];
      this.events = [];
      this.rows = 0;
      this.nextId = 1;
      this.nextRow = 48;
      this.accumulator = 0;
      this.reason = '';
      while (this.nextRow < 130) this.spawnRow();
    }

    get speed() { return Math.min(32, 16 + this.distance / 180); }
    get score() { return Math.floor(this.distance) + this.coins * 10; }
    get height() { return this.jump > 0 ? Math.sin(Math.PI * (1 - this.jump / JUMP_TIME)) : 0; }
    get level() { return Math.min(4, 1 + Math.floor(this.distance / 600)); }

    start() { if (this.state === 'ready') this.state = 'running'; }
    pause() { if (this.state === 'running') this.state = 'paused'; }
    resume() { if (this.state === 'paused') this.state = 'running'; }

    input(action) {
      if (this.state !== 'running') return false;
      if (action === 'left' || action === 'right') {
        const lane = Math.max(0, Math.min(2, this.lane + (action === 'left' ? -1 : 1)));
        if (lane === this.lane) return false;
        this.lane = lane;
      } else if (action === 'jump') {
        if (this.jump > 0) return false;
        this.slide = 0;
        this.jump = JUMP_TIME;
      } else if (action === 'slide') {
        if (this.slide > 0) return false;
        this.jump = 0;
        this.slide = SLIDE_TIME;
      } else return false;
      this.events.push({ type: 'action', action });
      return true;
    }

    add(kind, lane, z) {
      this.objects.push({ id: this.nextId++, kind, lane, z, resolved: false });
    }

    spawnRow() {
      const z = this.nextRow;
      const safe = Math.floor(this.random() * 3);
      if (this.rows < 3) {
        this.add(['hurdle', 'gate', 'crate'][this.rows], 1, z);
      } else {
        for (let lane = 0; lane < 3; lane++) {
          if (lane !== safe && (this.random() < 0.8 || lane === (safe + 1) % 3)) {
            this.add(HAZARDS[Math.floor(this.random() * HAZARDS.length)], lane, z);
          }
        }
      }
      const coinLane = this.rows < 3 ? 0 : safe;
      for (let i = 0; i < 5; i++) this.add('coin', coinLane, z - 12 + i * 2.3);
      if (this.rows > 1 && this.rows % 4 === 2) {
        this.add(this.rows % 8 === 2 ? 'shield' : 'magnet', safe, z + 7);
      }
      this.rows++;
      // At top speed a row is still at least 0.9 s away from its neighbour.
      this.nextRow += 30 + this.random() * 9;
    }

    update(delta) {
      if (this.state !== 'running' || !Number.isFinite(delta) || delta <= 0) return;
      // Never fast-forward through a return from the background or a long frame.
      this.accumulator += Math.min(delta, 0.1);
      while (this.accumulator + 1e-10 >= STEP && this.state === 'running') {
        this.tick(STEP);
        this.accumulator -= STEP;
      }
    }

    tick(dt) {
      const travel = this.speed * dt;
      this.distance += travel;
      this.time += dt;
      const dx = this.lane - this.x;
      this.x += Math.sign(dx) * Math.min(Math.abs(dx), dt * 9);
      for (const key of ['jump', 'slide', 'shield', 'magnet', 'invincible']) {
        this[key] = Math.max(0, this[key] - dt);
      }
      for (const item of this.objects) {
        const before = item.z;
        item.z -= travel;
        if (item.resolved) continue;
        const isHazard = HAZARDS.includes(item.kind);
        const inLane = Math.abs(item.lane - this.x) < (isHazard ? 0.62 : 0.55);
        const magnetic = item.kind === 'coin' && this.magnet > 0 && item.z <= 9 && item.z >= -1;
        if (magnetic || (before > 0 && item.z <= 0)) {
          item.resolved = true;
          if (!isHazard) {
            if (inLane || magnetic) {
              if (item.kind === 'coin') this.coins++;
              else this[item.kind] = 9;
              this.events.push({ type: 'collect', kind: item.kind, lane: item.lane });
            }
          } else {
            const cleared = !inLane || (item.kind === 'hurdle' && this.height > 0.40)
              || (item.kind === 'gate' && this.slide > 0);
            if (cleared || this.invincible > 0) {
              this.dodged++;
            } else if (this.shield > 0) {
              this.shield = 0;
              this.invincible = 1.2;
              this.events.push({ type: 'shield-break' });
            } else {
              this.state = 'over';
              this.reason = item.kind;
              this.events.push({ type: 'crash', kind: item.kind });
              break;
            }
          }
        }
      }
      this.objects = this.objects.filter(item => item.z > -12 && !(item.resolved && !HAZARDS.includes(item.kind)));
      this.nextRow -= travel;
      while (this.nextRow < 130) this.spawnRow();
    }

    drainEvents() {
      const events = this.events;
      this.events = [];
      return events;
    }
  }

  function sanitizeSave(value) {
    const v = value && typeof value === 'object' ? value : {};
    const number = key => Number.isFinite(v[key]) ? Math.max(0, Math.min(1e9, Math.floor(v[key]))) : 0;
    return {
      best: number('best'), bank: number('bank'), runs: number('runs'),
      distance: number('distance'), sound: v.sound !== false,
      buttons: v.buttons === true, tutorial: v.tutorial === true
    };
  }

  return { Run, seededRandom, sanitizeSave, STEP, JUMP_TIME, SLIDE_TIME, HAZARDS };
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Run, HAZARDS, sanitizeSave, animationIndex, JUMP_TIME, SLIDE_TIME } = require('../app/src/main/assets/game/core.js');
const animation = require('../app/src/main/assets/game/runner/manifest.json');

function emptyRun() {
  const run = new Run(2026);
  run.objects = [];
  run.nextRow = 10000;
  run.start();
  return run;
}

function advance(run, seconds, fps = 60) {
  for (let i = 0; i < Math.round(seconds * fps); i++) run.update(1 / fps);
}

test('distance and movement are independent of 30 / 60 / 120 Hz rendering', () => {
  const runs = [30, 60, 120].map(fps => {
    const run = emptyRun();
    run.input('right');
    advance(run, 10, fps);
    return run;
  });
  for (const run of runs) {
    assert.ok(Math.abs(run.distance - runs[0].distance) < 1e-8);
    assert.equal(run.x, 2);
  }
});

test('same seed produces the same town and obstacle sequence', () => {
  assert.deepEqual(new Run(42).objects, new Run(42).objects);
  assert.notDeepEqual(new Run(42).objects, new Run(43).objects);
});

test('every generated obstacle row leaves a free lane and adequate reaction time', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const run = new Run(seed);
    for (let n = 0; n < 40; n++) run.spawnRow();
    const rows = new Map();
    for (const item of run.objects.filter(item => HAZARDS.includes(item.kind))) {
      if (!rows.has(item.z)) rows.set(item.z, new Set());
      rows.get(item.z).add(item.lane);
    }
    let previous = null;
    for (const [z, lanes] of rows) {
      assert.ok(lanes.size < 3, `seed ${seed} has a blocked row`);
      if (previous !== null) assert.ok((z - previous) / 32 >= .9);
      previous = z;
    }
  }
});

test('all generated rows can be survived by switching to a free lane', () => {
  for (let seed = 1; seed <= 15; seed++) {
    const run = new Run(seed);
    run.start();
    // Run beyond the speed cap, with actual animated lane movement and hitboxes.
    for (let tick = 0; tick < 20000; tick++) {
      const next = run.objects.filter(item => HAZARDS.includes(item.kind) && !item.resolved && item.z > 0).sort((a, b) => a.z - b.z)[0];
      if (next && next.z < 21) {
        const lanes = run.objects.filter(item => HAZARDS.includes(item.kind) && Math.abs(item.z - next.z) < .01).map(item => item.lane);
        const safe = [0, 1, 2].find(lane => !lanes.includes(lane));
        if (run.lane !== safe) run.input(safe < run.lane ? 'left' : 'right');
      }
      run.update(1 / 60);
      assert.equal(run.state, 'running', `seed ${seed}, distance ${run.distance}`);
    }
    assert.ok(run.speed === 32);
  }
});

test('pause freezes distance, movement and power-up duration', () => {
  const run = emptyRun();
  run.shield = 8; run.input('jump'); run.pause();
  const snapshot = JSON.stringify(run);
  advance(run, 5);
  assert.equal(JSON.stringify(run), snapshot);
  assert.equal(run.input('left'), false);
  run.resume(); advance(run, .5);
  assert.ok(run.distance > 0);
  assert.ok(run.shield < 8);
});

test('background-sized delta is capped, never skips entire obstacle rows', () => {
  const run = emptyRun();
  run.update(90);
  assert.ok(run.distance < 2);
  run.update(NaN); run.update(-1); run.update(Infinity);
  assert.ok(Number.isFinite(run.distance));
});

test('a crate requires a lane change even while jumping', () => {
  const run = emptyRun();
  run.add('crate', 1, 7);
  run.input('jump'); advance(run, .6);
  assert.equal(run.state, 'over');
  assert.equal(run.reason, 'crate');
});

test('a timed jump clears a hurdle while walking hits it', () => {
  const jumping = emptyRun(), walking = emptyRun();
  for (const run of [jumping, walking]) run.add('hurdle', 1, 7);
  jumping.input('jump'); advance(jumping, .6); advance(walking, .6);
  assert.equal(jumping.state, 'running');
  assert.equal(walking.state, 'over');
});

test('slide clears a gate, jumping does not', () => {
  const sliding = emptyRun(), jumping = emptyRun();
  for (const run of [sliding, jumping]) run.add('gate', 1, 7);
  sliding.input('slide'); jumping.input('jump');
  advance(sliding, .6); advance(jumping, .6);
  assert.equal(sliding.state, 'running');
  assert.equal(jumping.state, 'over');
});

test('late lane switching cannot teleport across a hazard', () => {
  const run = emptyRun();
  run.add('crate', 1, .05); run.input('right'); advance(run, .1);
  assert.equal(run.state, 'over');
});

test('completed lane change avoids a crate', () => {
  const run = emptyRun();
  run.add('crate', 1, 7); run.input('right'); advance(run, .6);
  assert.equal(run.state, 'running');
  assert.equal(run.dodged, 1);
});

test('lane boundaries and jump / slide transitions are valid', () => {
  const run = emptyRun();
  run.input('left'); run.input('left'); assert.equal(run.lane, 0);
  run.input('right'); run.input('right'); run.input('right'); assert.equal(run.lane, 2);
  run.input('jump'); assert.equal(run.input('jump'), false);
  run.input('slide'); assert.equal(run.jump, 0); assert.ok(run.slide > 0);
  assert.equal(run.input('slide'), false);
  run.input('jump'); assert.equal(run.slide, 0);
});

test('shield absorbs one collision then expires, invulnerability prevents a double hit', () => {
  const run = emptyRun();
  run.shield = 9;
  run.add('crate', 1, 1); run.add('gate', 1, 1);
  advance(run, .3);
  assert.equal(run.state, 'running'); assert.equal(run.shield, 0);
  assert.equal(run.drainEvents().filter(event => event.type === 'shield-break').length, 1);
  advance(run, 1.5);
  run.add('crate', 1, 1); advance(run, .2);
  assert.equal(run.state, 'over');
});

test('coins are collected exactly once and only from the active lane without magnet', () => {
  const run = emptyRun();
  for (const lane of [0, 1, 2]) run.add('coin', lane, 1);
  advance(run, 1);
  assert.equal(run.coins, 1);
  assert.equal(run.score, Math.floor(run.distance) + 10);
  advance(run, 1); assert.equal(run.coins, 1);
});

test('magnet collects all three lanes and does not protect against obstacles', () => {
  const run = emptyRun(); run.magnet = 9;
  for (const lane of [0, 1, 2]) run.add('coin', lane, 8);
  advance(run, .1); assert.equal(run.coins, 3);
  run.add('crate', 1, 1); advance(run, .2);
  assert.equal(run.state, 'over');
});

test('power-ups are collectible and expire after nine seconds', () => {
  const run = emptyRun(); run.add('magnet', 1, 1);
  advance(run, .2); assert.ok(run.magnet > 8);
  advance(run, 9); assert.equal(run.magnet, 0);
});

test('finished run stops producing distance, coins and duplicate crash events', () => {
  const run = emptyRun(); run.add('crate', 1, 1); advance(run, .5);
  const distance = run.distance;
  advance(run, 5); assert.equal(run.distance, distance);
  assert.equal(run.drainEvents().filter(event => event.type === 'crash').length, 1);
  assert.deepEqual(run.drainEvents(), []);
});

test('corrupt or future saves cannot break scores or settings', () => {
  assert.deepEqual(sanitizeSave(null), { best: 0, bank: 0, runs: 0, distance: 0, sound: true, buttons: false, tutorial: false });
  const save = sanitizeSave({ best: -10, bank: Infinity, runs: '3', distance: 2.9, sound: false, buttons: true });
  assert.equal(save.best, 0); assert.equal(save.bank, 0); assert.equal(save.runs, 0);
  assert.equal(save.distance, 2); assert.equal(save.sound, false); assert.equal(save.buttons, true);
});

test('run animation follows distance and stays frozen while paused', () => {
  const run = emptyRun();
  run.distance = animation.strideMeters * 2.4;
  const expected = Math.floor(.4 * animation.groups.run.length);
  assert.equal(animationIndex(run, 'run', animation), expected);
  run.pause(); advance(run, 3);
  assert.equal(animationIndex(run, 'run', animation), expected);
  run.distance += animation.strideMeters;
  assert.equal(animationIndex(run, 'run', animation), expected);
});

test('jump and slide use their complete one-shot timeline, including the last frame', () => {
  const run = emptyRun();
  for (const [name, duration] of [['jump', JUMP_TIME], ['slide', SLIDE_TIME]]) {
    let previous = 0;
    animation.phaseEnds[name].forEach((end, index) => {
      run[name] = duration * (1 - (previous + end) / 2);
      assert.equal(animationIndex(run, name, animation), index);
      previous = end;
    });
    run[name] = 0;
    assert.equal(animationIndex(run, name, animation), animation.groups[name].length - 1);
  }
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../assets/gallery.js'), 'utf8');

function galleryMotion(angle, reduce = false) {
  const state = { angle, target: angle, frame: 0, time: 0 };
  const pages = Array.from({ length: 4 }, () => ({
    style: { setProperty(name, value) { this[name] = value; } }
  }));
  const context = vm.createContext({
    rail: { current: { firstElementChild: { children: pages } } },
    motion: { current: state },
    reducedMotion: { matches: reduce },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {}
  });
  vm.runInContext(source.slice(source.indexOf('  function paintRotation()'), source.indexOf('  function changeCategory(')), context);
  return { state, pages, context };
}

test('rear cards soften progressively, front cards stay sharp', () => {
  const { pages, context } = galleryMotion(30);
  context.paintRotation();
  const blur = pages.map(page => Number(page.style['--depth-blur']));
  assert.ok(blur[0] > 0 && blur[1] > blur[0]);
  assert.deepEqual(blur.slice(2), [0, 0]);
});

test('rotation eases toward the wheel or drag target and settles', () => {
  const { state, context } = galleryMotion(0);
  context.rotateBy(70);
  context.tick(16);
  assert.ok(state.angle > 0 && state.angle < 70);
  for (let time = 32; time <= 1000 && state.frame; time += 16) context.tick(time);
  assert.equal(state.angle, 70);
  assert.equal(state.frame, 0);
});

test('reduced motion applies the requested rotation without inertia', () => {
  const { state, context } = galleryMotion(10, true);
  context.rotateBy(-45);
  context.tick(16);
  assert.equal(state.angle, -35);
  assert.equal(state.frame, 0);
});

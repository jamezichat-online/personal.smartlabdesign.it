const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../assets/gallery.js'), 'utf8');
const followPointer = source.slice(source.indexOf('function followPointer(event)'), source.indexOf('function resetHover()'));

// Captured Home geometry: the featured face extends beyond its fixed layout slot.
const rect = (left, top, width, height) => ({ left, top, right: left + width, bottom: top + height, width, height });
const cards = Array.from({ length: 5 }, (_, i) => ({
  getBoundingClientRect: () => rect(96 + i * 117, 374, 128, 209),
  firstElementChild: { getBoundingClientRect: () => i === 2 ? rect(253, 304, 282, 334) : rect(99 + i * 117, 353, 124, 251) }
}));
function select(x, y, selected = 3) {
  let result;
  const scope = { phase: 'home', focused: null, featured: selected, hoveredRef: { current: selected }, hoverAvailable: { matches: true },
    setFocused() {}, queueHover(value) { result = value; } };
  vm.createContext(scope);
  vm.runInContext(followPointer + '\nthis.move = followPointer;', scope);
  scope.move({ clientX: x, clientY: y, pointerType: 'mouse', currentTarget: { querySelectorAll: () => cards } });
  return result;
}
test('keep the enlarged card selected over its visible upper face', () => assert.equal(select(395, 330), 3));
test('keep the enlarged card selected over its visible lower face', () => assert.equal(select(395, 620), 3));
test('moving across the original row still selects the adjacent card', () => assert.equal(select(510, 475), 4));
test('leaving all card surfaces clears the selection', () => assert.equal(select(50, 280), null));

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function fixture(value, mode = 'single') {
  class Input {
    constructor() { this.events = []; }
    get value() { return this.current || ''; }
    set value(next) { this.current = next; }
    closest() { return null; }
    getBoundingClientRect() { return { right: 400, bottom: 80 }; }
    dispatchEvent(event) { this.events.push(event.type); }
  }
  const input = new Input();
  input.value = value;
  const dropdown = { style: {}, classList: { add() {}, remove() {} } };
  const context = vm.createContext({
    window: { HTMLInputElement: Input, innerWidth: 1024, innerHeight: 768, addEventListener() {} },
    document: {
      getElementById: id => id === 'date' ? input : dropdown,
      addEventListener() {}, body: { appendChild() {} },
    },
    Event: class { constructor(type) { this.type = type; } },
    icon: () => '',
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/calendar/calendar.js'), 'utf8'), context);
  // Rendering is browser-tested separately; these regressions isolate the
  // field/plugin boundary and the exact events consumed by React onChange.
  vm.runInContext('calRender = function() {};', context);
  context.openCalendar({ displayId: 'date', mode });
  return { input, context };
}

test('opening and dismissing preserves an existing single date', () => {
  const { input, context } = fixture('18/12/2026');
  context.calSave();
  assert.equal(input.value, '18/12/2026');
  assert.deepEqual(input.events, ['input', 'change']);
});

test('single picker opens in the selected month instead of today', () => {
  const { context } = fixture('18/12/2026');
  assert.equal(vm.runInContext('_calState.month', context), 11);
  assert.equal(vm.runInContext('_calState.year', context), 2026);
});

test('range display is restored without hidden start/end fields', () => {
  const { input, context } = fixture('01/11/2026 - 30/11/2026', 'range');
  context.calSave();
  assert.equal(input.value, '01/11/2026 - 30/11/2026');
});

test('explicit clear still empties a selected date and emits changes', () => {
  const { input, context } = fixture('18/12/2026');
  context.calClear();
  context.calSave();
  assert.equal(input.value, '');
  assert.deepEqual(input.events, ['input', 'change']);
});

test('ISO and empty values are supported', () => {
  for (const [value, expected] of [['2026-12-18', '18/12/2026'], ['', '']]) {
    const { input, context } = fixture(value);
    context.calSave();
    assert.equal(input.value, expected);
  }
});

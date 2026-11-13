/**
 * Enhetstestfall för tangentmappning.
 *
 * @license CC-BY 4.0
 * @see KeyMap
 */

it('kan mappa ett standardkommando', () => {
  let target = '';
  const action = (name) => (target = name);
  const map = new KeyMap();
  const event = {
    altKey: false,
    ctrlKey: true,
    key: 't',
    metaKey: false,
    shiftKey: false,
  };
  map.map('*', action);
  map.action(event);
  expect(target).toBe('');

  event.ctrlKey = false;
  map.action(event);
  expect(target).toBe('t');

  event.key = 'W';
  map.action(event);
  expect(target).toBe('w');
});

it.with(
  [undefined, 'ska'],
  ['altKey', 'ska inte'],
  ['ctrlKey', 'ska inte'],
  ['metaKey', 'ska inte'],
  ['shiftKey', 'ska inte']
)("mappning utan modifierare {1} aktiveras för '{0}'", (modifier, will) => {
  let target = '';
  const action = (name) => (target = name);
  const map = new KeyMap();
  const event = {
    altKey: false,
    ctrlKey: false,
    key: 't',
    metaKey: false,
    shiftKey: false,
  };
  map.map('T', action);

  event.ctrlKey = false;
  map.action(event);
  expect(target).toBe('t');

  target = '';
  event.key = 'W';
  map.action(event);
  expect(target).toBe('');

  if (undefined !== modifier) {
    event[modifier] = true;
    event.key = 't';
    target = '';
    map.action(event);
    expect(target).toBe('');
  }
});

it('mapping med 1 modifierare aktiveras bara för den', () => {
  let target = '';
  const action = (name) => (target = name);
  const map = new KeyMap();
  const event = {
    altKey: false,
    ctrlKey: false,
    key: 't',
    metaKey: false,
    shiftKey: false,
  };
  map.map('T', action, 'Ctrl');

  event.ctrlKey = false;
  map.action(event);
  expect(target).toBe('');

  event.ctrlKey = true;
  event.shiftKey = true;
  map.action(event);
  expect(target).toBe('');

  event.shiftKey = false;
  map.action(event);
  expect(target).toBe('t');
});

it('mapping med 2 modifierare aktiveras bara för dem', () => {
  let target = '';
  const action = (name) => (target = name);
  const map = new KeyMap();
  const event = {
    altKey: false,
    ctrlKey: false,
    key: 't',
    metaKey: false,
    shiftKey: false,
  };
  map.map('T', action, 'Shift+Ctrl');

  event.ctrlKey = false;
  map.action(event);
  expect(target).toBe('');

  event.altKey = true;
  event.ctrlKey = true;
  map.action(event);
  expect(target).toBe('');

  event.altKey = false;
  event.shiftKey = true;
  map.action(event);
  expect(target).toBe('t');
});

// Importera beroenden.
import { KeyMap } from '../../js/common/KeyMap.js';
import { expect, it } from '../functions.js';

/**
 * Enhetstestfall för rullgardinslista.
 *
 * @license CC-BY 4.0
 * @see Dropdown
 */

let doc;
let fixture;
let listbox;
let listeners;
let observer;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Händelselyssnarlistan.
  listeners = mock.eventListenerList();

  // Listrutan.
  listbox = mock({
    attach: () => {},
    detach: () => {},
    focus: () => {},
    reset: () => {},
    subscribe: () => {},
    unfocus: () => {},
  });

  // DOM-dokumentet.
  const button = mock.eventTarget('button', {}, { contains: () => false });
  const list = mock.element('ul', {}, { contains: () => false });
  const dropdown = mock.element('div', { children: [button, list] }, {});

  doc = {
    body: mock.eventTarget('body'),
    button,
    dropdown,
    list,
    getElementById: (id) => doc.list.children.find((o) => o.id === id),
  };

  // Tangentmapparen.
  const keyMap = {
    _map: {},
    action: (e) => keyMap._map[e.key](e.key),
    map: (k, a) => (keyMap._map[k] = a),
  };

  // Skapa en instans av rullgardinslistan.
  fixture = new Dropdown(listbox, listeners, keyMap, doc);
});

it('kopplar rullgardinslistan till knapp och listruta', () => {
  fixture.attach(...doc.dropdown.children);
  expect(listbox.attach).toHaveBeenCalled.with(doc.list);
  expect(doc.button.addEventListener).toHaveBeenCalled.atLeastOnce();
  expect(doc.body.addEventListener).toHaveBeenCalled.once();
});

it('hämtar och sätter textinnehållet i knappen', () => {
  const text = 'Hello, World!';
  fixture.attach(...doc.dropdown.children);
  fixture.buttonText = text;
  expect(fixture.buttonText).toBe(text);
});

it('förmedlar observatörer till listrutan', () => {
  fixture.attach(...doc.dropdown.children);
  const observer = () => {};
  fixture.subscribe(observer);
  expect(listbox.subscribe).toHaveBeenCalled.with(observer);
});

it('städar bort kopplade händelselyssnare', () => {
  fixture.attach(...doc.dropdown.children);
  fixture.detach();
  expect(listeners.removeAll).toHaveBeenCalled.once();
  expect(listbox.detach).toHaveBeenCalled.once();
});

it('återställer alla valdmarkeringar', () => {
  const selected = ['foo', 'bar'];
  fixture.attach(...doc.dropdown.children);
  fixture.reset(selected);
  expect(listbox.reset).toHaveBeenCalled.once().with(selected);
});

describe('Mushändelser', () => {
  it('växlar listans tillstånd klick på knappen', () => {
    fixture.attach(...doc.dropdown.children);
    doc.button.triggerEvent({ type: 'click' });

    // Ska ha lagt till attributet `aria-expanded` på knappen.
    expect(doc.button.setAttribute)
      .toHaveBeenCalled.once()
      .with('aria-expanded', 'true');

    // Ska ha satt fokus till listrutan.
    expect(listbox.focus).toHaveBeenCalled.once();

    // Simulera att användaren klickar på knappen igen.
    doc.button.triggerEvent({ type: 'click' });

    // Ska ha tagit bort attributet `aria-expanded` från knappen.
    expect(doc.button.removeAttribute)
      .toHaveBeenCalled.once()
      .with('aria-expanded');
  });

  it('drar upp rullgardinen vid klick utanför knappen och listan', () => {
    fixture.attach(...doc.dropdown.children);

    // Simulera att användaren drar ned rullgardinen och sedan klickar på
    // ett sidans bakgrund.
    doc.button.triggerEvent({ type: 'click' });
    doc.body.triggerEvent({ type: 'mousedown' });

    // Ska ha dragit upp rullgardinen.
    expect(doc.button.removeAttribute)
      .toHaveBeenCalled.once()
      .with('aria-expanded');
    expect(listbox.unfocus).toHaveBeenCalled.once();
  });
});

describe('Tangentbordshändelser', () => {
  it('växlar listans tillstånd vid tryck på Enter', () => {
    fixture.attach(...doc.dropdown.children);

    // Simulera att användaren trycker på Enter-tangenten när ett ele-
    // ment i behållaren har fokus.
    doc.button.triggerEvent({ key: 'Enter', type: 'keydown' });

    // Ska ha lagt till attributet `aria-expanded` på knappen.
    expect(doc.button.setAttribute)
      .toHaveBeenCalled.once()
      .with('aria-expanded', 'true');

    // Ska ha satt fokus till listrutan.
    expect(listbox.focus).toHaveBeenCalled.once();

    // Simulera att användaren trycker på Enter-tangenten igen.
    doc.button.triggerEvent({ key: 'Enter', type: 'keydown' });

    // Ska ha tagit bort attributet `aria-expanded` från knappen.
    expect(doc.button.removeAttribute)
      .toHaveBeenCalled.once()
      .with('aria-expanded');
    expect(listbox.unfocus).toHaveBeenCalled.once();

    // Ska ha satt fokus till knappen.
    expect(doc.button.focus).toHaveBeenCalled.times(2);
  });

  it('drar upp rullgardinen vid tryck på Escape', (element) => {
    fixture.attach(...doc.dropdown.children);

    // Simulera att användaren drar ned rullgardinen och sedan trycker
    // på Escape-tangenten.
    doc.button.triggerEvent({ type: 'click' });
    doc.button.triggerEvent({ key: 'Escape', type: 'keydown' });

    // Ska ha tagit bort attributet `aria-expanded` från knappen.
    expect(doc.button.removeAttribute)
      .toHaveBeenCalled.once()
      .with('aria-expanded');
  });

  it('fokuserar första elementet vid tryck på nedåtpil när knappen har fokus', () => {
    fixture.attach(...doc.dropdown.children);

    // Simulera att användaren trycker på uppåtpil.
    doc.button.triggerEvent({ key: 'ArrowDown', type: 'keydown' });

    // Ska ha lagt till attributet `aria-expanded` på knappen.
    expect(doc.button.setAttribute)
      .toHaveBeenCalled.once()
      .with('aria-expanded', 'true');

    // Ska ha satt fokus till listan och satt första elementet som
    // aktivt element.
    expect(listbox.focus).toHaveBeenCalled.with(0);
  });

  it('fokuserar sista elementet vid tryck på uppåtpil', () => {
    fixture.attach(...doc.dropdown.children);

    // Simulera att användaren trycker på uppåtpil.
    doc.button.triggerEvent({ key: 'ArrowUp', type: 'keydown' });

    // Ska ha lagt till attributet `aria-expanded` på knappen.
    expect(doc.button.setAttribute)
      .toHaveBeenCalled.once()
      .with('aria-expanded', 'true');

    // Ska ha satt fokus till listan och satt sista elementet som
    // aktivt element.
    expect(listbox.focus).toHaveBeenCalled.with(-1);
  });
});

// Importera beroenden.
import { Dropdown } from '../../js/view/Dropdown.js';
import { beforeEach, describe, expect, mock, it } from '../functions.js';

/**
 * Enhetstestfall för menycontrollern.
 *
 * @license CC-BY 4.0
 * @see MenuController
 */

let controller;
let doc;
let focus;
let menu;

beforeEach(() => {
  doc = { body: mock.eventTarget('') };
  controller = new MenuController(doc);
  focus = mock({ focus: () => ({}) });
  menu = {
    id: 'test',
    observers: [],
    addObserver: (o) => menu.observers.push(o),
    down: () => focus,
    left: () => focus,
    nextMatchingItem: () => focus,
    right: () => focus,
    up: () => focus,
  };
});

it('registrerar en observatör på tillagt subjekt', () => {
  const menu = mock({ id: 'test', addObserver: () => {} });
  controller.handle(menu);
  expect(menu.addObserver).toHaveBeenCalled.once().with(expect.anyFunction());
});

it('ignorerar stängningshändelser från menyer', () => {
  controller.handle(menu);
  expect(menu.observers[0]({ source: menu, type: 'close' })).toBe(false);
});

describe('Mushändelser', () => {
  const event = (source, target) => ({ source, target, type: 'click' });

  it('växlar synlighet på undermeny vid klick på element', () => {
    const item = mock({ toggle: () => true });
    menu.current = item;
    controller.handle(menu);
    expect(menu.observers[0](event(menu, item))).toBe(true);
    expect(item.toggle).toHaveBeenCalled.once();
    expect(menu.current).toBe(item);
  });

  it('stänger en öppen meny innan en syskonmeny öppnas', () => {
    const item = (name, p) =>
      mock(
        {
          name,
          parentItem: p,
          submenu: {},
        },
        {
          close: () => {},
          closeAll: () => {},
          toggle: () => true,
        }
      );
    const top1 = item('top1', null);
    const top2 = item('top2', null);
    const sub1 = item('sub1', top2);
    const sub2 = item('sub2', top2);
    menu.current = top1;
    controller.handle(menu);

    // Öppna andra toppmenyn; ska stänga första toppmenyn.
    expect(menu.observers[0](event(menu, top2))).toBe(true);
    expect(top1.closeAll).toHaveBeenCalled.once();
    expect(top2.toggle).toHaveBeenCalled.once();
    expect(menu.current).toBe(top2);

    // Öppna första undermenyn.
    expect(menu.observers[0](event(menu, sub1))).toBe(true);
    expect(top2.close).toHaveBeenCalled.never();
    expect(sub1.toggle).toHaveBeenCalled.once();
    expect(menu.current).toBe(sub1);

    // Öppna andra undermenyn; ska stänga första undermenyn.
    expect(menu.observers[0](event(menu, sub2))).toBe(true);
    expect(top2.close).toHaveBeenCalled.never();
    expect(sub1.close).toHaveBeenCalled.once();
    expect(sub2.toggle).toHaveBeenCalled.once();
    expect(menu.current).toBe(sub2);
  });

  it('stänger en öppen meny innan en kusinmeny öppnas', () => {
    const item = (name, p) =>
      mock(
        {
          name,
          parentItem: p,
          submenu: {},
        },
        {
          close: () => {},
          closeAll: () => {},
          toggle: () => true,
        }
      );
    const top1 = item('top1', null);
    const top2 = item('top2', null);
    const sub1 = item('sub1', top2);
    const sub2 = item('sub2', top2);
    menu.current = top2;
    controller.handle(menu);

    // Öppna första undermenyn.
    expect(menu.observers[0](event(menu, sub1))).toBe(true);
    expect(sub1.toggle).toHaveBeenCalled.once();
    expect(menu.current).toBe(sub1);

    // Öppna första toppmenyn; ska stänga undermenyn och andra toppmenyn.
    expect(menu.observers[0](event(menu, top1))).toBe(true);
    expect(sub1.closeAll).toHaveBeenCalled.once();
    expect(top1.toggle).toHaveBeenCalled.once();
    expect(menu.current).toBe(top1);
  });

  it('aktiverar en lövnod vid klick', () => {
    const parent = {};
    const item = {
      activate: () => parent,
      toggle: () => false,
    };
    menu.current = { closeAll: () => {} };
    controller.handle(menu);
    expect(menu.observers[0](event(menu, item))).toBe(false);
  });

  it('stänger en öppen undermeny vid klick utanför menyn', () => {
    const menu = mock({ addObserver: () => {}, closeAll: () => {} });
    controller.handle(menu);
    doc.body.triggerEvent({ type: 'click' });
    expect(menu.closeAll).toHaveBeenCalled.once();
  });
});

describe('Tangenthändelser', () => {
  const event = (key, source, target) => ({ key, source, target, type: 'key' });

  it.with(['Enter'], ['Space'])('{0} öppnar en stängd undermeny', (key) => {
    const item = mock({ activate: () => ({ focus: () => item }) });
    menu.current = item;
    controller.handle(menu);
    expect(menu.observers[0](event(key, menu, item))).toBe(true);
    expect(item.activate).toHaveBeenCalled.once();
  });

  it.with(['Enter'], ['Space'])('{0} aktiverar en lövnod', (key) => {
    const item = mock({ activate: () => null });
    menu.current = item;
    controller.handle(menu);
    expect(menu.observers[0](event(key, menu, item))).toBe(false);
    expect(item.activate).toHaveBeenCalled.once();
  });

  it('Escape stänger aktuell undermeny', () => {
    const item = { parentItem: mock({ close: () => focus }) };
    menu.current = item;
    controller.handle(menu);
    expect(menu.observers[0](event('Escape', menu, item))).toBe(true);
    expect(focus.focus).toHaveBeenCalled.once();
  });

  it('Escape stänger toppmeny när ägarelementet är aktivt', () => {
    const item = mock(
      {
        submenu: {},
      },
      {
        close: () => {},
        focus: () => {},
      }
    );
    menu.current = item;
    controller.handle(menu);
    expect(menu.observers[0](event('Escape', menu, item))).toBe(true);
    expect(item.focus).toHaveBeenCalled.once();
  });

  it("nedåtpil utför funktionen 'nedåt' i aktuell meny", () => {
    const item = { parentMenu: menu };
    menu.current = item;
    controller.handle(menu);
    expect(menu.observers[0](event('ArrowDown', menu, item))).toBe(true);
    expect(focus.focus).toHaveBeenCalled.once();
  });

  it("uppåtpil utför funktionen 'uppåt' i aktuell meny", () => {
    const item = { parentMenu: menu };
    menu.current = item;
    controller.handle(menu);
    expect(menu.observers[0](event('ArrowUp', menu, item))).toBe(true);
    expect(focus.focus).toHaveBeenCalled.once();
  });

  it("högerpil utför funktionen 'höger' i aktuell meny", () => {
    const item = { parentMenu: menu };
    menu.current = item;
    controller.handle(menu);
    expect(menu.observers[0](event('ArrowRight', menu, item))).toBe(true);
    expect(focus.focus).toHaveBeenCalled.once();
  });

  it("vänsterpil utför funktionen 'vänster' i aktuell meny", () => {
    const item = { parentMenu: menu };
    menu.current = item;
    controller.handle(menu);
    expect(menu.observers[0](event('ArrowLeft', menu, item))).toBe(true);
    expect(focus.focus).toHaveBeenCalled.once();
  });

  it("skrivbart tecken utför funktionen 'nästa matchande'", () => {
    const item = { parentMenu: menu };
    menu.current = item;
    controller.handle(menu);
    expect(menu.observers[0](event('x', menu, item))).toBe(true);
    expect(focus.focus).toHaveBeenCalled.once();
  });

  it('icke skrivbart tecken hanteras inte', () => {
    const item = { parentMenu: menu };
    menu.current = item;
    controller.handle(menu);
    expect(menu.observers[0](event('Tab', menu, item))).toBe(false);
    expect(focus.focus).toHaveBeenCalled.never();
  });
});

// Importera beroenden.
import { MenuController } from '../../js/menu/MenuController.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

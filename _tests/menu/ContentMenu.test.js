/**
 * Enhetstester för innehållsmenyn.
 *
 * @license CC-BY 4.0
 * @see ContentMenu
 */

let doc;
let items;
let menu;
let win;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Menyns underliggande listelement.
  const element = { setAttribute: () => {} };

  // Menyelement.
  const item = (id, y) => {
    const item = {
      current: null,
      focusable: false,
      href: `#${id}`,
      id,
      offsetTop: y,
      parentItem: null,
      parentMenu: null,
      close: () => item,
      closeAll: () => item.parentItem,
    };
    return item;
  };

  items = [item('a', 176), item('b', 315), item('c', 409)];

  // DOM-dokumentet.
  doc = mock.eventTarget('', {
    documentElement: { scrollTop: 0 },
    main: { offsetTop: 144 },
    getElementById: (id) => items.find((item) => id === item.id),
    querySelector: () => doc.main,
  });

  // Fönsterobjektet.
  win = {
    document: doc,
    innerHeight: 200,
  };

  // Skapa en menyinstans.
  menu = new ContentMenu(element, 'Test', win);
  items.forEach((item) => menu.add(item));
});

it('markerar det synliga elementet vid skrollning', () => {
  const positions = [
    [0, -1],
    [300, 0],
    [400, 1],
    [500, 2],
    [800, 2],
  ];
  for (const [pos, index] of positions) {
    doc.documentElement.scrollTop = pos;
    doc.triggerEvent({ type: 'scroll' });
    for (const [i, item] of items.entries()) {
      expect(item.current).toBe(i === index ? 'location' : null);
    }
  }
});

it('inkluderar aktuellt element i tabbordningen', () => {
  expect(items[0].focusable).toBe(true);
});

it('ändrar aktuellt element vid navigering nedåt', () => {
  menu.down(items[0]);
  expect(items[0].focusable).toBe(false);
  expect(items[1].focusable).toBe(true);
});

it('ändrar aktuellt element vid navigering uppåt', () => {
  menu.up(items[0]);
  expect(items[0].focusable).toBe(false);
  expect(items[2].focusable).toBe(true);
});

it('ignorerar navigering åt vänster', () => {
  expect(menu.handleLeft(items[1])).toBe(items[1]);
});

// Importera beroenden.
import { ContentMenu } from '../../js/menu/ContentMenu.js';
import { beforeEach, expect, it, mock } from '../functions.js';

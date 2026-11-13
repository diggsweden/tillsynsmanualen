/**
 * Enhetstestfall för menyelement.
 *
 * @license CC-BY 4.0
 * @see MenuItem
 */

let element;
let parentItem;
let parentMenu;
let submenu;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  element = mock.element(
    'a',
    {
      attrs: { href: '#test' },
      textContent: 'Test',
    },
    {
      click: () => {},
    }
  );

  parentItem = mock({ closeAll: () => parentItem });
  parentMenu = {};
  submenu = mock({ firstItem: {}, closeAll: () => {} });
});

it('sätter roll och attribut på elementet', () => {
  const item = new MenuItem(element);
  expect(element.tabIndex).toBe(-1);
  expect(element.getAttribute('role')).toBe('menuitem');
  expect(element.getAttribute('tabindex')).toBe('-1');
  expect(element.getAttribute('aria-expanded')).toBe('');
  expect(element.getAttribute('aria-haspopup')).toBe('');
});

it('returnerar länkelementets href-attribut', () => {
  const item = new MenuItem(element);
  expect(item.href).toBe(element.getAttribute('href'));
});

it('sätter ARIA-attribut för tillagd undermeny', () => {
  const item = new MenuItem(element);
  item.parentMenu = parentMenu;
  item.submenu = submenu;
  expect(element.getAttribute('aria-expanded')).toBe('false');
  expect(element.getAttribute('aria-haspopup')).toBe('menu');
  expect(submenu.parentItem).toBe(item);
  expect(submenu.parentMenu).toBe(parentMenu);
});

it('tar bort ARIA-attribut om undermeny sätts till null', () => {
  const item = new MenuItem(element);
  item.submenu = submenu;
  item.submenu = null;
  expect(element.getAttribute('aria-expanded')).toBe('');
  expect(element.getAttribute('aria-haspopup')).toBe('');
});

it('returnerar angiven föräldrameny', () => {
  const item = new MenuItem(element);
  expect(item.parentMenu).toBe(undefined);
  item.parentMenu = parentMenu;
  expect(item.parentMenu).toBe(parentMenu);
});

it('sätter angiven föräldrameny för befintlig undermeny', () => {
  const item = new MenuItem(element);
  item.submenu = submenu;
  item.parentMenu = parentMenu;
  expect(item.submenu.parentMenu).toBe(parentMenu);
});

it('returnerar angivet föräldraelement', () => {
  const item = new MenuItem(element);
  expect(item.parentItem).toBe(undefined);
  item.parentItem = parentItem;
  expect(item.parentItem).toBe(parentItem);
});

it('returnerar angiven undermeny', () => {
  const item = new MenuItem(element);
  expect(item.submenu).toBe(undefined);
  item.submenu = submenu;
  expect(item.submenu).toBe(submenu);
});

it('returnerar satt fokuserbarhet', () => {
  const item = new MenuItem(element);
  expect(item.focusable).toBe(false);
  expect(element.getAttribute('tabindex')).toBe('-1');
  expect(element.tabIndex).toBe(-1);
  item.focusable = true;
  expect(item.focusable).toBe(true);
  expect(element.getAttribute('tabindex')).toBe('0');
  expect(element.tabIndex).toBe(0);
});

it('returnerar satt aktualitetsvärde', () => {
  const item = new MenuItem(element);
  const value = 'location';
  expect(item.current).toBe(null);
  item.current = value;
  expect(item.current).toBe(value);
  expect(element.getAttribute('aria-current')).toBe(value);
  item.current = null;
  expect(item.current).toBe(null);
  expect(element.getAttribute('aria-current')).toBe('');
});

it('returnerar om elementets innehåll börjar med angiven bokstav', () => {
  const item = new MenuItem(element);
  expect(item.startsWith('T')).toBe(true);
  expect(item.startsWith('t')).toBe(true);
  expect(item.startsWith('q')).toBe(false);
});

it('hanterar inte innehållselementet i en lövnod', () => {
  const item = new MenuItem(element);
  item.parentItem = parentItem;
  expect(item.activate()).toBe(null);
  expect(parentItem.closeAll).toHaveBeenCalled.once();
});

it('aktiverar en undermeny', () => {
  const item = new MenuItem(element);
  item.submenu = submenu;
  expect(item.activate()).toBe(submenu.firstItem);
  expect(element.getAttribute('aria-expanded')).toBe('true');
  expect(element.click).toHaveBeenCalled.never();
  expect(parentItem.closeAll).toHaveBeenCalled.never();
});

it('őppnar en undermeny', () => {
  const item = new MenuItem(element);
  item.submenu = submenu;
  expect(item.open()).toBe(submenu);
  expect(element.getAttribute('aria-expanded')).toBe('true');
});

it('stänger underordnade menyer', () => {
  const item = new MenuItem(element);
  item.submenu = submenu;
  expect(item.open()).toBe(submenu);
  expect(item.close()).toBe(item);
  expect(element.getAttribute('aria-expanded')).toBe('false');
  expect(submenu.closeAll).toHaveBeenCalled.once();
});

it('stänger underordnade och överordnade menyer', () => {
  const item = new MenuItem(element);
  item.parentItem = parentItem;
  item.submenu = submenu;
  item.open();
  expect(item.closeAll()).toBe(parentItem);
  expect(element.getAttribute('aria-expanded')).toBe('false');
  expect(submenu.closeAll).toHaveBeenCalled.once();
  expect(parentItem.closeAll).toHaveBeenCalled.once();
});

it('fokuserar menyelementet', () => {
  const item = new MenuItem(element);
  expect(item.focus()).toBe(item);
  expect(element.focus).toHaveBeenCalled.once();
});

it('växlar synlighet för undermenyn', () => {
  const item = new MenuItem(element);
  expect(item.toggle()).toBe(false); // Ingen undermeny.
  item.submenu = submenu;
  expect(item.toggle()).toBe(true);
  expect(element.getAttribute('aria-expanded')).toBe('true');
  expect(item.toggle()).toBe(true);
  expect(element.getAttribute('aria-expanded')).toBe('false');
  expect(submenu.closeAll).toHaveBeenCalled.once();
});

it('anger om elementet är angivet nod', () => {
  const item = new MenuItem(element);
  expect(item.is(element)).toBe(true);
  expect(item.is({})).toBe(false);
});

// Importera beroenden.
import { MenuItem } from '../../js/menu/MenuItem.js';
import { beforeEach, expect, it, mock } from '../functions.js';

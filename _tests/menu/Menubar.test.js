/**
 * Enhetstestfall för menyrad.
 *
 * @license CC-BY 4.0
 * @see Menubar
 */

let element;
const item = (name, parent = null) => {
  const item = mock(
    {
      name,
      parentItem: parent,
      submenu: {
        firstItem: mock({ focus: () => item.submenu.firstItem }),
        lastItem: mock({ focus: () => item.submenu.lastItem }),
      },
    },
    {
      close: () => item,
      closeAll: () => item.parentItem ?? item,
      focusable: false,
      focus: () => item,
      open: () => item.submenu,
    }
  );
  return item;
};

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  element = mock.eventTarget('ul');
});

it('sätter roll och attribut på elementet', () => {
  const menubar = new Menubar(element);
  expect(element.getAttribute('role')).toBe('menubar');
  expect(element.getAttribute('aria-label')).toBe('');
});

it('returnerar horisontell orientering', () => {
  const menubar = new Menubar(element);
  expect(menubar.orientation).toBe('horizontal');
});

it('gör aktuellt element fokuserbart', () => {
  const item1 = item('foo');
  const item2 = item('bar');
  const menubar = new Menubar(element);
  menubar.add(item1);
  menubar.add(item2);
  expect(item1.focusable).toBe(true);
  expect(item2.focusable).toBe(false);

  menubar.current = item2;
  expect(item1.focusable).toBe(false);
  expect(item2.focusable).toBe(true);
});

it('går till föregående element vid navigering åt vänster', () => {
  const item1 = item('foo');
  const item2 = item('bar');
  const menubar = new Menubar(element);
  menubar.add(item1);
  menubar.add(item2);
  menubar.current = item2;

  expect(menubar.left(item2)).toBe(item1);
  expect(menubar.current).toBe(item1);
  expect(menubar.left(item1)).toBe(item2);
  expect(menubar.current).toBe(item2);
  expect(item2.close).toHaveBeenCalled.once();
});

it('går till föregående toppelement vid vänsternavigering i undermeny', () => {
  const item1 = item('foo');
  const item2 = item('bar');
  const item3 = item('baz', item2);
  const menubar = new Menubar(element);
  menubar.add(item1);
  menubar.add(item2);
  menubar.current = item2;

  menubar.handleLeft(item3);
  expect(item3.closeAll).toHaveBeenCalled.once();
  expect(item1.open).toHaveBeenCalled.once();
  expect(menubar.current).toBe(item1);
  expect(item1.focusable).toBe(true);
  expect(item2.focusable).toBe(false);
});

it('går till nästa element vid navigering åt höger', () => {
  const item1 = item('foo');
  const item2 = item('bar');
  const menubar = new Menubar(element);
  menubar.add(item1);
  menubar.add(item2);
  menubar.current = item1;

  expect(menubar.right(item1)).toBe(item2);
  expect(menubar.current).toBe(item2);
  expect(menubar.right(item2)).toBe(item1);
  expect(menubar.current).toBe(item1);
  expect(item1.close).toHaveBeenCalled.once();
});

it("funktionen 'nedåt' öppnar undermeny", () => {
  const item1 = item('foo');
  const menubar = new Menubar(element);
  menubar.add(item1);
  menubar.current = item1;

  expect(menubar.down(item1)).toBe(item1.submenu.firstItem);
  expect(item1.open).toHaveBeenCalled.once();
  expect(item1.submenu.firstItem.focus).toHaveBeenCalled.once();
});

it("funktionen 'uppåt' öppnar undermeny", () => {
  const item1 = item('foo');
  const menubar = new Menubar(element);
  menubar.add(item1);
  menubar.current = item1;

  expect(menubar.up(item1)).toBe(item1.submenu.lastItem);
  expect(item1.open).toHaveBeenCalled.once();
  expect(item1.submenu.lastItem.focus).toHaveBeenCalled.once();
});

it('stänger alla menyer', () => {
  const item1 = mock({ submenu: {} }, { close: () => {} });
  const menubar = new Menubar(element);
  menubar.add(item1);
  menubar.closeAll();
  expect(item1.close).toHaveBeenCalled.once();
});

// Importera beroenden.
import { Menubar } from '../../js/menu/Menubar.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

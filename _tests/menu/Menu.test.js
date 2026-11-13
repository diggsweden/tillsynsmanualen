/**
 * Enhetstestfall för meny.
 *
 * @license CC-BY 4.0
 * @see Menu
 */

const item = (name) => {
  const item = mock(
    {
      name,
      parentItem: null,
      parentMenu: null,
      submenu: null,
    },
    {
      close: () => item,
      closeAll: () => item.parentItem,
      focus: () => {},
      is: (e) => e === name,
      open: () => item.submenu,
      startsWith: (c) => item.name.toLowerCase().startsWith(c.toLowerCase()),
    }
  );
  return item;
};

let element;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  element = mock.eventTarget('ul');
});

it('sätter roll och attribut på elementet', () => {
  const label = 'Test';
  const menu = new Menu(element, label);
  expect(element.getAttribute('role')).toBe('menu');
  expect(element.getAttribute('aria-label')).toBe(label);
});

it('sätter föräldrameny på tillagda element', () => {
  const item1 = item('Test');
  const menu = new Menu(element, 'Test');
  menu.add(item1);
  expect(item1.parentMenu).toBe(menu);
});

it('sätter eventuellt föräldraelement på tillagda element', () => {
  const items = [item('Parent'), item('Child')];
  const menu = new Menu(element, 'Test');
  menu.parentItem = items[0];
  menu.add(items[1]);
  expect(items[1].parentItem).toBe(items[0]);
});

it('returnerar vertikal orientering', () => {
  const menu = new Menu(element, 'Test');
  expect(menu.orientation).toBe('vertical');
});

it('sätter ID för underliggande element', () => {
  const id = 'Keith';
  const menu = new Menu(element, 'Test');
  menu.id = id;
  expect(menu.id).toBe(id);
  expect(element.id).toBe(id);
});

it('sätter ID för beskrivande element', () => {
  const id = 'Keith';
  const menu = new Menu(element, 'Test');
  menu.labelledBy = id;
  expect(menu.labelledBy).toBe(id);
  expect(element.getAttribute('aria-label')).toBe('');
  expect(element.getAttribute('aria-labelledby')).toBe(id);
});

it('sätter aktivt menyelement i toppmeny', () => {
  const items = [item('First'), item('Second')];
  const menu = new Menu(element, 'Test');
  menu.add(items[0]);
  menu.add(items[1]);
  expect(menu.current).toBe(items[0]);
  menu.current = items[1];
  expect(menu.current).toBe(items[1]);
});

it('ignorerar aktivt menyelement i undermeny', () => {
  const items = [item('First'), item('Second')];
  const menu = new Menu(element, 'Test');
  menu.parentItem = items[0];
  menu.add(items[1]);
  menu.current = items[1];
  expect(menu.current).toBe(undefined);
});

it('returnerar rotmenyn', () => {
  const grandparent = new Menu(element, 'Grandparent');
  const parent = new Menu(element, 'Parent');
  const child = new Menu(element, 'Child');
  parent.parentMenu = grandparent;
  child.parentMenu = parent;
  expect(child.root).toBe(grandparent);
});

it('meddelar registrerade observatörer när händelser inträffar', () => {
  const events = [];
  const items = [item('First'), item('Second')];
  const menu = new Menu(element, 'Test');
  const observer = (event) => events.push(event);
  menu.add(items[0]);
  menu.add(items[1]);
  menu.addObserver(observer);
  element.triggerEvent({ target: 'First', type: 'click' });
  element.triggerEvent({ target: 'Second', type: 'keydown', key: 'Enter' });
  element.triggerEvent({
    target: 'Second',
    type: 'keydown',
    key: ' ',
    code: 'Space',
  });
  menu.closeAll();
  expect(events).toEqual([
    { source: menu, target: items[0], type: 'click' },
    { source: menu, target: items[1], type: 'key', key: 'Enter' },
    { source: menu, target: items[1], type: 'key', key: 'Space' },
    { source: menu, type: 'close' },
  ]);
});

it('stänger alla underordnade menyer', () => {
  const items = [item('First'), item('Second')];
  const menu = new Menu(element, 'Test');
  items[0].submenu = {};
  items[1].submenu = {};
  menu.add(items[0]);
  menu.add(items[1]);
  menu.current = items[1];
  expect(menu.closeAll()).toBe(items[1]);
  expect(items[0].close).toHaveBeenCalled.once();
  expect(items[1].close).toHaveBeenCalled.once();
});

it('returnerar första menyelementet', () => {
  const items = [item('First'), item('Second')];
  const menu = new Menu(element, 'Test');
  items[0].submenu = {};
  items[1].submenu = {};
  menu.add(items[0]);
  menu.add(items[1]);
  expect(menu.firstItem).toBe(items[0]);
});

it('returnerar sista menyelementet', () => {
  const items = [item('First'), item('Second')];
  const menu = new Menu(element, 'Test');
  items[0].submenu = {};
  items[1].submenu = {};
  menu.add(items[0]);
  menu.add(items[1]);
  expect(menu.lastItem).toBe(items[1]);
});

it('returnerar nästa menyelement efter referensen', () => {
  const items = [item('First'), item('Second')];
  const menu = new Menu(element, 'Test');
  items[0].submenu = {};
  items[1].submenu = {};
  menu.add(items[0]);
  menu.add(items[1]);
  expect(menu.nextItem(items[0])).toBe(items[1]);
  expect(menu.nextItem(items[1])).toBe(items[0]); // Börja om.
});

it('returnerar menyelementet nedanför referensen', () => {
  const items = [item('First'), item('Second')];
  const menu = new Menu(element, 'Test');
  items[0].submenu = {};
  items[1].submenu = {};
  menu.add(items[0]);
  menu.add(items[1]);
  expect(menu.down(items[0])).toBe(items[1]);
  expect(menu.down(items[1])).toBe(items[0]); // Börja om.
});

it('returnerar föregående menyelement före referensen', () => {
  const items = [item('First'), item('Second')];
  const menu = new Menu(element, 'Test');
  items[0].submenu = {};
  items[1].submenu = {};
  menu.add(items[0]);
  menu.add(items[1]);
  expect(menu.previousItem(items[1])).toBe(items[0]);
  expect(menu.previousItem(items[0])).toBe(items[1]); // Börja om.
});

it('returnerar menyelementet ovanför referensen', () => {
  const items = [item('First'), item('Second')];
  const menu = new Menu(element, 'Test');
  items[0].submenu = {};
  items[1].submenu = {};
  menu.add(items[0]);
  menu.add(items[1]);
  expect(menu.up(items[1])).toBe(items[0]);
  expect(menu.up(items[0])).toBe(items[1]); // Börja om.
});

it('stänger överordnad meny vid navigering åt vänster', () => {
  const items = [item('Parent'), item('Child')];
  const menu = new Menu(element, 'Test');
  menu.add(items[1]);
  items[1].parentItem = items[0];
  menu.handleLeft(items[1]);
  expect(items[0].close).toHaveBeenCalled.once();
});

it('överlåter hantering till menyrad vid navigering åt vänster', () => {
  const items = [item('Parent'), item('Child')];
  const menu = new Menu(element, 'Test');
  const menubar = mock({ orientation: 'horizontal' }, { handleLeft: () => {} });
  items[0].parentMenu = menubar;
  menu.add(items[1]);
  items[1].parentItem = items[0];
  menu.left(items[1]);
  expect(items[0].close).toHaveBeenCalled.never();
  expect(menubar.handleLeft).toHaveBeenCalled.once();
});

it('öppnar undermeny vid högerpil', () => {
  const items = [item('Parent'), item('Child')];
  const parent = new Menu(element, 'Parent');
  const child = new Menu(element, 'Child');
  child.parentMenu = parent;
  items[1].parentItem = items[0];
  items[0].submenu = child;
  parent.add(items[0]);
  child.add(items[1]);
  parent.right(items[0]);
  expect(items[0].open).toHaveBeenCalled.once();
});

it('navigerar till nästa toppmeny vid högerpil', () => {
  const items = [item('P1'), item('P2'), item('C1'), item('C2')];
  const parent = new Menu(element, 'Parent');
  const child1 = new Menu(element, 'Child 1');
  const child2 = new Menu(element, 'Child 2');
  const root = { orientation: 'horizontal', parentMenu: null };
  root.root = root;
  parent.parentMenu = root;
  parent.add(items[0]);
  parent.add(items[1]);
  child1.add(items[2]);
  child2.add(items[3]);
  child1.parentItem = items[0];
  child1.parentMenu = parent;
  child2.parentItem = items[1];
  child2.parentMenu = parent;
  items[0].submenu = child1;
  items[1].submenu = child2;
  items[2].parentItem = items[0];
  items[3].parentItem = items[1];
  child1.right(items[2]);
  expect(items[2].closeAll).toHaveBeenCalled.once();
  expect(items[1].open).toHaveBeenCalled.once();
});

it('returnerar nästa element som matchar angivet tecken', () => {
  const items = [item('First'), item('Second')];
  const menu = new Menu(element, 'Test');
  items[0].submenu = {};
  items[1].submenu = {};
  menu.add(items[0]);
  menu.add(items[1]);
  expect(menu.matchNextItem(items[0], 's')).toBe(items[1]);
  expect(menu.matchNextItem(items[1], 's')).toBe(items[1]);
  expect(menu.matchNextItem(items[1], 'f')).toBe(items[0]);
  expect(menu.matchNextItem(items[0], 'x')).toBe(undefined);
});

// Importera beroenden.
import { Menu } from '../../js/menu/Menu.js';
import { beforeEach, expect, it, mock } from '../functions.js';

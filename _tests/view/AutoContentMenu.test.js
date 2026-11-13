/**
 * Enhetstestfall för den automatiska innehållsmenyn.
 *
 * @license CC-BY 4.0
 * @see AutoContentMenu
 */

let container;
let doc;
let menu;
let sibling;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Behållarelementet med rubriker att skapa länkar till.
  const h = (id, text, top) =>
    mock(
      {
        id,
        offsetTop: top,
        tabIndex: null,
        textContent: text,
      },
      {
        focus: () => {},
        scrollIntoView: () => {},
      }
    );

  container = {
    headings: [
      h('first', 'First', 0),
      h('second', 'Second', 300),
      h('third', 'Third', 500),
    ],
    querySelectorAll: () => container.headings,
  };

  // Syskonelementet som menyn ska infogas före.
  sibling = {
    parentNode: mock({ insertBefore: (n, c) => n }),
  };

  // DOM-dokumentet.
  const element = (tag) => {
    const e = mock.eventTarget(
      tag,
      {
        firstChild: {},
        _attrs: { href: '' },
        get hash() {
          return e._attrs.href;
        },
      },
      {}
    );
    doc._created.push(e);
    return e;
  };

  doc = mock.eventTarget(
    '',
    {
      body: mock.element('body'),
      _created: [],
    },
    {
      createElement: (t) => element(t),
      getElementById: (id) => container.headings.find((h) => id === h.id),
      querySelector: () => ({ offsetTop: 144 }),
    }
  );

  const win = {
    document: doc,
    innerHeight: 200,
  };

  // Skapa och bygg en menyinstans.
  menu = new AutoContentMenu(win);
  menu.build(sibling, container);
});

it('bygger en innehållsmeny från H2-rubrikerna i behållaren', () => {
  const c = doc._created;
  let i = 0;
  expect(c.length).toBe(12);

  expect(c[i++].tagName).toBe('NAV');
  expect(c[i].tagName).toBe('UL');
  expect(c[i++].id).toBe('content-menu');

  expect(c[i].tagName).toBe('LI');
  expect(c[i++].getAttribute('role')).toBe('none');
  expect(c[i].tagName).toBe('A');
  expect(c[i++].getAttribute('href')).toBe('#first');
  expect(c[i].tagName).toBe('SPAN');
  expect(c[i++].textContent).toBe('First');

  // Ska ha infogat ett `nav`-element före angivet syskon.
  expect(sibling.parentNode.insertBefore)
    .toHaveBeenCalled.once()
    .with(c[0], sibling);

  expect(container.headings.every((h) => -1 === h.tabIndex)).toBe(true);
});

it('skrollar till målrubriken vid klick på menylänk', () => {
  doc._created[6].triggerEvent({ type: 'click' });
  expect(container.headings[1].scrollIntoView).toHaveBeenCalled.once();
});

it('tar bort det skapade navigeringselementet', () => {
  menu.remove();
  expect(doc._created[0].remove).toHaveBeenCalled.once();
});

// Importera beroenden.
import { AutoContentMenu } from '../../js/view/AutoContentMenu.js';
import { beforeEach, expect, it, mock } from '../functions.js';

/**
 * Enhetstestfall för menyknapp.
 *
 * @license CC-BY 4.0
 * @see MenuButton
 */

let button;
let doc;
let element;
const item = () => mock({ focus: () => {} });
let menu;
let parent;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  element = mock.eventTarget('button', { type: '' }, {});

  menu = mock(
    {
      firstItem: mock({ focus: () => {} }),
      id: 'test',
      labelledBy: '',
      lastItem: mock({ focus: () => {} }),
      observers: [],
    },
    {
      addObserver: (o) => menu.observers.push(o),
    }
  );

  parent = mock({ firstChild: {} }, { insertBefore: () => {} });

  doc = {
    body: mock.eventTarget(),
    createElement: () => element,
  };

  button = new MenuButton(parent, 'Test', menu, doc);
});

it('skapar och infogar en knapp', () => {
  expect(element.getAttribute('aria-controls')).toBe(menu.id);
  expect(element.getAttribute('aria-haspopup')).toBe('menu');
  expect(element.id).toBe(`${menu.id}-button`);
  expect(element.textContent).toBe('Test');
  expect(element.type).toBe('button');
  expect(menu.labelledBy).toBe(`${menu.id}-button`);
  expect(menu.addObserver).toHaveBeenCalled.once();
  expect(parent.insertBefore)
    .toHaveBeenCalled.once()
    .with(element, parent.firstChild);
});

it('stänger menyn när den ber om det', () => {
  element.triggerEvent({ type: 'click' });
  expect(element.getAttribute('aria-expanded')).toBe('true');

  expect(menu.observers[0]({ source: menu, type: 'close' })).toBe(true);
  expect(element.getAttribute('aria-expanded')).toBe('');
});

it.with(['click'], ['key'])('ignorerar {0}-händelser från menyn', (type) => {
  expect(menu.observers[0]({ source: menu, type })).toBe(false);
});

describe('Mushändelser för knappen', () => {
  it('växlar menyns synlighet vid musklick på knappen', () => {
    element.triggerEvent({ type: 'click' });
    expect(element.getAttribute('aria-expanded')).toBe('true');

    element.triggerEvent({ type: 'click' });
    expect(element.getAttribute('aria-expanded')).toBe('');
  });

  it('stänger menyn vid musklick utanför knappen och menyn', () => {
    element.triggerEvent({ type: 'click' });
    expect(element.getAttribute('aria-expanded')).toBe('true');

    doc.body.triggerEvent({ type: 'click' });
    expect(element.getAttribute('aria-expanded')).toBe('');
  });
});

describe('Tangentbordshändelser för knappen', () => {
  const event = (key) => ({ key, type: 'keydown' });

  it.with(['Enter'], ['Space'])(
    '{0} på knappen växlar knappens tillstånd',
    (key) => {
      element.triggerEvent(event(key));
      expect(element.getAttribute('aria-expanded')).toBe('true');
      expect(menu.firstItem.focus).toHaveBeenCalled.once();

      element.triggerEvent(event(key));
      expect(element.getAttribute('aria-expanded')).toBe('');
    }
  );

  it('Escape stänger menyn', () => {
    element.setAttribute('aria-expanded', 'true');
    element.triggerEvent(event('Escape'));
    expect(element.getAttribute('aria-expanded')).toBe('');
  });

  it('Nedåtpil öppnar menyn och fokuserar första elementet', () => {
    element.triggerEvent(event('ArrowDown'));
    expect(element.getAttribute('aria-expanded')).toBe('true');
    expect(menu.firstItem.focus).toHaveBeenCalled.once();
  });

  it('Uppåtpil öppnar menyn och fokuserar sista elementet', () => {
    element.triggerEvent(event('ArrowUp'));
    expect(element.getAttribute('aria-expanded')).toBe('true');
    expect(menu.lastItem.focus).toHaveBeenCalled.once();
  });
});

// Importera beroenden.
import { MenuButton } from '../../js/menu/MenuButton.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

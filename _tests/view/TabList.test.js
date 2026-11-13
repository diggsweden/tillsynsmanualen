/**
 * Enhetstestfall för tabbflikslistan.
 *
 * @license CC-BY 4.0
 * @see TabList
 */

let doc;
let fixture;
const links = [];
let listeners;
const panels = [];
const tabs = [];

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // DOM-dokumentet.
  doc = {
    callNumber: 0,
    createElement: () => links[doc.callNumber++],
    getElementById: (id) =>
      ({
        'first-panel': panels[0],
        'first-tab': tabs[0],
        'second-panel': panels[1],
        'second-tab': tabs[1],
      })[id] || null,
  };

  // Händelselyssnarlistan.
  listeners = mock.eventListenerList();

  // Tabbflikar, paneler och länkar.
  links.length = panels.length = tabs.length = 0;
  ['first', 'second'].forEach((id, index) => {
    tabs.push(
      mock.element(
        'button',
        {
          _attrs: { 'aria-controls': `${id}-panel` },
          tabIndex: -index,
        },
        {}
      )
    );

    panels.push(
      mock.element(
        'fieldset',
        {
          _attrs: { 'aria-labelledby': `${id}-tab` },
        },
        {}
      )
    );

    links.push(
      mock.eventTarget(
        'a',
        {
          href: '',
          get hash() {
            return links[index].getAttribute('href');
          },
        },
        {}
      )
    );
  });

  // Tangentmapparen.
  const keyMap = { map: () => {} };

  // Skapa en instans av tabbflikslistan.
  fixture = new TabList(listeners, keyMap, doc);
});

it('kopplar tabbflikar till paneler', () => {
  fixture.attach(tabs);

  // Ska ha lagt till händelselyssnare på tabbflikarna.
  tabs.forEach((button) => {
    expect(button.addEventListener).toHaveBeenCalled.with(
      ['click', expect.anyFunction(), false],
      ['keydown', expect.anyFunction(), false]
    );
  });

  // Ska ha lagt till en länk på varje panel.
  panels.forEach((div, index) => {
    expect(div.appendChild).toHaveBeenCalled.with(links[index]);
  });

  // Ska ha skapat en länk till tabbfliken på varje panel.
  expect(links[0].getAttribute('href')).toBe('#first-tab');
  expect(links[1].getAttribute('href')).toBe('#second-tab');

  links.forEach((link) => {
    expect(link.textContent).toBe('Tabbflikar');
    expect(link.addEventListener)
      .toHaveBeenCalled.once()
      .with('click', expect.anyFunction(), false);
  });
});

it('städar bort kopplade händelselyssnare', () => {
  fixture.attach(tabs);
  fixture.detach();

  // Ska ha tagit bort alla registrerade händelselyssnare.
  expect(listeners.removeAll).toHaveBeenCalled.once();
});

it('gör vald tabbflik aktiv', () => {
  fixture.attach(tabs);
  fixture.selectPanel(panels[1]);

  expect(tabs[0].getAttribute('aria-selected')).toBe('false');
  expect(tabs[0].tabIndex).toBe(-1);
  expect(panels[0].dataset.visible).toBe('false');

  expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  expect(tabs[1].tabIndex).toBe(0);
  expect(panels[1].dataset.visible).toBe('true');

  expect(tabs[1].focus).toHaveBeenCalled.once();
});

it('skapar en länk till tabbfliken i varje panel', () => {
  fixture.attach(tabs);
  links[0].triggerEvent({ type: 'click' });
  expect(tabs[0].focus).toHaveBeenCalled.once();
});

// Importera beroenden.
import { TabList } from '../../js/view/TabList.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

/**
 * Enhetstestfall för rutnät.
 *
 * @see Grid
 */

let doc;
let fixture;
let listeners;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Händelselyssnarlistan.
  listeners = mock.eventListenerList();

  // Elementet som rutnätet ska kopplas till.
  const link = () => mock.link();
  const span = () => mock.element('span');
  const row = () => ({ children: [span(), link(), span()] });
  const grid = mock.eventTarget(
    'ul',
    {
      children: [row(), row()],
    },
    {
      querySelectorAll: () =>
        grid.children.reduce(
          (acc, row) =>
            row.children.reduce((acc, col) => (acc.push(col), acc), acc),
          []
        ),
    }
  );

  // DOM-dokumentet.
  doc = { grid };

  // Tangentmapparen.
  const key = (e) =>
    ['alt', 'ctrl', 'meta', 'shift']
      .filter((m) => e[`${m}Key`])
      .concat(e.key)
      .join('+');
  const mod = (k, m) => [m, k].filter((e) => !!e).join('+');
  const keyMap = {
    _map: {},
    action: (e) => keyMap._map[key(e)](e.key),
    map: (k, a, m) => (keyMap._map[mod(k, m)] = a),
  };

  // Skapa en instans av rutnätet.
  fixture = new Grid(listeners, keyMap, doc);
});

it('gör element icke fokuserbara med tabb', () => {
  fixture.attach(doc.grid);
  expect(doc.grid.children[0].children[1].tabIndex).toBe(-1);
  expect(doc.grid.children[1].children[1].tabIndex).toBe(-1);
  expect(listeners.add).toHaveBeenCalled.once();
  expect(doc.grid.children[0].children[0].tabIndex).toBe(0);
});

it('återställer tabbfokus', () => {
  fixture.attach(doc.grid);
  fixture.detach();
  expect(doc.grid.children[0].children[1].tabIndex).toBe(0);
  expect(doc.grid.children[1].children[1].tabIndex).toBe(0);
  expect(listeners.removeAll).toHaveBeenCalled.once();
});

describe('Navigering', () => {
  it('fokuserar samma kolumn i nästa rad vid nedåtpil', () => {
    fixture.attach(doc.grid);
    doc.grid.triggerEvent({ key: 'ArrowDown', type: 'keydown' });
    expect(doc.grid.children[0].children[0].tabIndex).toBe(-1);
    expect(doc.grid.children[1].children[0].tabIndex).toBe(0);
    expect(doc.grid.children[1].children[0].focus).toHaveBeenCalled.once();

    doc.grid.triggerEvent({ key: 'ArrowDown', type: 'keydown' });
    expect(doc.grid.children[1].children[0].tabIndex).toBe(0);
  });

  it('fokuserar samma kolumn i föregående rad vid uppåtpil', () => {
    fixture.attach(doc.grid);
    doc.grid.triggerEvent({ key: 'ArrowUp', type: 'keydown' });
    expect(doc.grid.children[0].children[0].tabIndex).toBe(0);
    expect(doc.grid.children[0].children[0].focus).toHaveBeenCalled.never();

    doc.grid.triggerEvent({ key: 'ArrowDown', type: 'keydown' });
    doc.grid.triggerEvent({ key: 'ArrowUp', type: 'keydown' });
    expect(doc.grid.children[0].children[0].tabIndex).toBe(0);
    expect(doc.grid.children[1].children[0].tabIndex).toBe(-1);
    expect(doc.grid.children[0].children[0].focus).toHaveBeenCalled.once();
  });

  it('fokuserar nästa kolumn i samma rad vid högerpil', () => {
    fixture.attach(doc.grid);
    doc.grid.triggerEvent({ key: 'ArrowRight', type: 'keydown' });
    expect(doc.grid.children[0].children[0].tabIndex).toBe(-1);
    expect(doc.grid.children[0].children[1].tabIndex).toBe(0);
    expect(doc.grid.children[0].children[1].focus).toHaveBeenCalled.once();

    doc.grid.triggerEvent({ key: 'ArrowRight', type: 'keydown' });
    expect(doc.grid.children[0].children[1].tabIndex).toBe(-1);
    expect(doc.grid.children[0].children[2].tabIndex).toBe(0);
    expect(doc.grid.children[0].children[2].focus).toHaveBeenCalled.once();

    doc.grid.triggerEvent({ key: 'ArrowRight', type: 'keydown' });
    expect(doc.grid.children[0].children[2].tabIndex).toBe(0);
  });

  it('fokuserar föregående kolumn i samma rad vid vänsterpil', () => {
    fixture.attach(doc.grid);
    doc.grid.triggerEvent({ key: 'ArrowLeft', type: 'keydown' });
    expect(doc.grid.children[0].children[0].tabIndex).toBe(0);

    doc.grid.triggerEvent({ key: 'ArrowRight', type: 'keydown' });
    doc.grid.triggerEvent({ key: 'ArrowLeft', type: 'keydown' });
    expect(doc.grid.children[0].children[0].tabIndex).toBe(0);
    expect(doc.grid.children[0].children[1].tabIndex).toBe(-1);
    expect(doc.grid.children[0].children[0].focus).toHaveBeenCalled.once();
  });

  it('fokuserar första kolumnen i samma rad vid Home', () => {
    fixture.attach(doc.grid);
    doc.grid.triggerEvent({ key: 'Home', type: 'keydown' });
    expect(doc.grid.children[0].children[0].tabIndex).toBe(0);

    doc.grid.triggerEvent({ key: 'ArrowRight', type: 'keydown' });
    doc.grid.triggerEvent({ key: 'Home', type: 'keydown' });
    expect(doc.grid.children[0].children[0].tabIndex).toBe(0);
    expect(doc.grid.children[0].children[1].tabIndex).toBe(-1);
    expect(doc.grid.children[0].children[0].focus).toHaveBeenCalled.once();

    doc.grid.triggerEvent({ key: 'Home', type: 'keydown' });
    expect(doc.grid.children[0].children[0].tabIndex).toBe(0);
  });

  it('fokuserar sista kolumnen i samma rad vid End', () => {
    fixture.attach(doc.grid);
    doc.grid.triggerEvent({ key: 'End', type: 'keydown' });
    expect(doc.grid.children[0].children[0].tabIndex).toBe(-1);
    expect(doc.grid.children[0].children[2].tabIndex).toBe(0);
    expect(doc.grid.children[0].children[2].focus).toHaveBeenCalled.once();

    doc.grid.triggerEvent({ key: 'End', type: 'keydown' });
    expect(doc.grid.children[0].children[2].tabIndex).toBe(0);
  });

  it('fokuserar första cellen i rutnätet vid Ctrl+Home', () => {
    fixture.attach(doc.grid);
    doc.grid.triggerEvent({ ctrlKey: true, key: 'Home', type: 'keydown' });
    expect(doc.grid.children[0].children[0].tabIndex).toBe(0);

    doc.grid.triggerEvent({ key: 'ArrowRight', type: 'keydown' });
    doc.grid.triggerEvent({ key: 'ArrowDown', type: 'keydown' });
    doc.grid.triggerEvent({ ctrlKey: true, key: 'Home', type: 'keydown' });
    expect(doc.grid.children[0].children[0].tabIndex).toBe(0);
    expect(doc.grid.children[1].children[1].tabIndex).toBe(-1);
    expect(doc.grid.children[0].children[0].focus).toHaveBeenCalled.once();
  });

  it('fokuserar sista cellen i rutnätet vid Ctrl+End', () => {
    fixture.attach(doc.grid);
    doc.grid.triggerEvent({ ctrlKey: true, key: 'End', type: 'keydown' });
    expect(doc.grid.children[0].children[0].tabIndex).toBe(-1);
    expect(doc.grid.children[1].children[2].tabIndex).toBe(0);
    expect(doc.grid.children[1].children[2].focus).toHaveBeenCalled.once();

    doc.grid.triggerEvent({ ctrlKey: true, key: 'End', type: 'keydown' });
    expect(doc.grid.children[1].children[2].tabIndex).toBe(0);
  });
});

// Importera beroenden.
import { Grid } from '../../js/view/Grid.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

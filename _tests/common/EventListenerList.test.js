/**
 * Enhetstestfall för händelselyssnarlistan.
 *
 * @license CC-BY 4.0
 * @see EventListenerList
 */

it('registrerar lyssnare på tillagda element', () => {
  const target = mock({ addEventListener: () => {} });
  const list = new EventListenerList();
  const listener = () => {};
  const type = 'click';
  list.add(target, type, listener, true); // capture=true
  list.add(target, type, listener); // capture=false (förval)
  expect(target.addEventListener)
    .toHaveBeenCalled.times(2)
    .with([type, listener, true], [type, listener, false]);
});

it('tar bort tillagda lyssnare från element', () => {
  const target = mock({
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  const list = new EventListenerList();
  const listener = () => {};
  const type = 'click';
  list.add(target, type, listener, true); // capture=true
  list.add(target, type, listener); // capture=false (förval)
  list.remove(target, type, listener, true); // capture=true
  list.remove(target, type, listener); // capture=false (förval)
  expect(target.removeEventListener)
    .toHaveBeenCalled.times(2)
    .with([type, listener, true], [type, listener, false]);
});

it('tar bort samtliga tillagda lyssnare från alla element', () => {
  // Mocka element att registrera lyssare för.
  const target1 = mock({
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  const target2 = mock({
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  const list = new EventListenerList();
  const listener = () => {};
  const type = 'click';
  list.add(target1, type, listener, true); // capture=true
  list.add(target2, type, listener); // capture=false (förval)
  list.removeAll();

  expect(target1.removeEventListener)
    .toHaveBeenCalled.once()
    .with(type, listener, true);

  expect(target2.removeEventListener)
    .toHaveBeenCalled.once()
    .with(type, listener, false);
});

// Importera beroenden.
import { EventListenerList } from '../../js/common/EventListenerList.js';
import { expect, it, mock } from '../functions.js';

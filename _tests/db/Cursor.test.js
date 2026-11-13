/**
 * Enhetstestfall för databascursor.
 *
 * @license CC-BY 4.0
 * @see Cursor
 */

let cursor;
let idbCursor;
let request;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Begäran om att skapa en cursor.
  request = {
    events: [],
    onerror: null,
    onsuccess: null,
    addEventListener(event, listener) {
      ({
        error: (l) => (request.onerror = l),
        success: (l) => (request.onsuccess = l),
      })[event]?.(listener);
      if (request.events.length && event === request.events[0].type) {
        listener(request.events.shift());
      }
    },
    triggerEvent(event) {
      request.events.push(event);
      ({
        error: (e) => request.onerror?.(e),
        success: (e) => request.onsuccess?.(e),
      })[event.type]?.(request.events.shift());
    },
  };

  // Simulera en IDBCursor.
  idbCursor = mock(
    {
      direction: 'next',
      key: 'key',
      primaryKey: 'primaryKey',
      request: {},
      source: {},
      _index: 0,
      _values: ['foo', 'bar', 'quux'],
    },
    {
      get value() {
        return idbCursor._values[idbCursor._index];
      },
      continue() {
        ++idbCursor._index;
        request.triggerEvent({
          target: {
            result:
              idbCursor._index < idbCursor._values.length
                ? idbCursor
                : undefined,
          },
          type: 'success',
        });
      },
      delete() {
        return {
          onerror: null,
          set onsuccess(listener) {
            setTimeout(listener({}), 0);
          },
        };
      },
      update() {
        return {
          onerror: null,
          set onsuccess(listener) {
            setTimeout(listener({}), 0);
          },
        };
      },
      advance: () => {},
      continuePrimaryKey: () => {},
    }
  );
  request.events.push({ target: { result: idbCursor }, type: 'success' });

  // Skapa en cursorinstans.
  cursor = new Cursor(request);
});

it('returnerar stegriktningen i cursorn', async () => {
  const iter = await cursor.next();
  expect(iter.value.direction).toBe(idbCursor.direction);
});

it('returnerar aktuell nyckel i cursorn', async () => {
  const iter = await cursor.next();
  expect(iter.value.key).toBe(idbCursor.key);
});

it('returnerar aktuell primärnyckel i cursorn', async () => {
  const iter = await cursor.next();
  expect(iter.value.primaryKey).toBe(idbCursor.primaryKey);
});

it('returnerar begäran som öppnade cursorn', async () => {
  const iter = await cursor.next();
  expect(iter.value.request).toBe(idbCursor.request);
});

it('returnerar cursorns källa', async () => {
  const iter = await cursor.next();
  expect(iter.value.source).toBe(idbCursor.source);
});

it('returnerar aktuellt värde i cursorn', async () => {
  const iter = await cursor.next();
  expect(iter.value.value).toBe(idbCursor.value);
});

it('avancerar cursorn angivet antal steg', async () => {
  const count = 13;
  await cursor.next();
  cursor.advance(count);
  expect(idbCursor.advance).toHaveBeenCalled.once().with(count);
});

it('positionerar cursorn vid angiven nyckel', async () => {
  const key = 13;
  const primaryKey = 42;
  await cursor.next();
  cursor.continuePrimaryKey(key, primaryKey);
  expect(idbCursor.continuePrimaryKey)
    .toHaveBeenCalled.once()
    .with(key, primaryKey);
});

it('itererar över posterna i cursorn', async () => {
  let i = 0;
  for await (const cur of cursor) {
    expect(cur.value).toBe(idbCursor._values[i++]);
  }
  expect(i).toBe(idbCursor._values.length);
});

it('raderar aktuell post', async () => {
  await cursor.next();
  await cursor.delete();
  expect(idbCursor.delete).toHaveBeenCalled.once();
});

it('uppdaterar aktuell post', async () => {
  const value = {};
  await cursor.next();
  await cursor.update(value);
  expect(idbCursor.update).toHaveBeenCalled.once().with(value);
});

// Importera beroenden.
import { Cursor } from '../../js/db/Cursor.js';
import { beforeEach, expect, it, mock } from '../functions.js';

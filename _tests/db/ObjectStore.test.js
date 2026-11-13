/**
 * Enhetstestfall för objektlager i databasen.
 *
 * @license CC-BY 4.0
 * @see ObjectStore
 */

// Skapa förutsättningarna för varje test.
function createRequest() {
  const request = mock({
    listeners: {},
    addEventListener(type, func) {
      request.listeners[type] = func;
    },
  });
  return request;
}

describe('Lägg till objekt', () => {
  it('lägger till objekt i objektlagret', async () => {
    const event = { target: { result: 'test' } };
    const idbObjectStore = mock({ add: (key, value) => request });
    const key = 'foo';
    const request = createRequest();
    const store = new ObjectStore(idbObjectStore);
    const value = { foo: 'bar' };

    setTimeout(() => request.listeners.success(event), 0);

    const result = await store.add(key, value);
    expect(result).toBe('test');
    expect(idbObjectStore.add).toHaveBeenCalled.once().with(key, value);
  });

  it('hanterar fel vid tillägg', async () => {
    const error = 'ERROR';
    const idbObjectStore = mock({ add: (key, value) => request });
    const key = 'foo';
    const request = createRequest();
    const store = new ObjectStore(idbObjectStore);
    const value = { foo: 'bar' };

    setTimeout(() => request.listeners.error({ target: { error } }), 0);

    await expect.failure(() => store.add(key, value));
    expect(idbObjectStore.add).toHaveBeenCalled.with(key, value);
  });
});

describe('Räkna objekt', () => {
  it('räknar objekt i objektlagret', async () => {
    const count = 42;
    const idbObjectStore = mock({ count: (query) => request });
    const query = 'foo';
    const request = createRequest();
    const store = new ObjectStore(idbObjectStore);

    setTimeout(
      () =>
        request.listeners.success({
          target: { result: count },
        }),
      0
    );

    const result = await store.count(query);
    expect(result).toBe(count);
    expect(idbObjectStore.count).toHaveBeenCalled.once().with(query);
  });

  it('hanterar fel vid räkning', async () => {
    const error = 'ERROR';
    const idbObjectStore = mock({ count: (query) => request });
    const query = 'foo';
    const request = createRequest();
    const store = new ObjectStore(idbObjectStore);

    setTimeout(() => request.listeners.error({ target: { error } }), 0);

    await expect.failure(() => store.count(query));
    expect(idbObjectStore.count).toHaveBeenCalled.once().with(query);
  });
});

describe('Radera objekt', () => {
  it('raderar objekt ur objektlagret', async () => {
    const idbObjectStore = mock({ delete: (key) => request });
    const key = 'foo';
    const request = createRequest();
    const store = new ObjectStore(idbObjectStore);

    setTimeout(() => request.listeners.success(), 0);

    await store.delete(key);
    expect(idbObjectStore.delete).toHaveBeenCalled.once().with(key);
  });

  it('hanterar fel vid radering', async () => {
    const error = 'ERROR';
    const idbObjectStore = mock({ delete: (key) => request });
    const key = 'foo';
    const request = createRequest();
    const store = new ObjectStore(idbObjectStore);

    setTimeout(() => request.listeners.error({ target: { error } }), 0);

    await expect.failure(() => store.delete(key));
    expect(idbObjectStore.delete).toHaveBeenCalled.with(key);
  });
});

describe('Hämta objekt', () => {
  it('hämtar ett objekt ur objektlagret', async () => {
    const data = 'bar';
    const idbObjectStore = mock({ get: (key) => request });
    const key = 'foo';
    const request = createRequest();
    const store = new ObjectStore(idbObjectStore);

    setTimeout(
      () =>
        request.listeners.success({
          target: { result: data },
        }),
      0
    );

    const result = await store.get(key);
    expect(result).toBe(data);
    expect(idbObjectStore.get).toHaveBeenCalled.with(key);
  });

  it('hanterar fel vid hämtning (1)', async () => {
    const error = 'ERROR';
    const idbObjectStore = mock({ get: (key) => request });
    const key = 'foo';
    const request = createRequest();
    const store = new ObjectStore(idbObjectStore);

    setTimeout(() => request.listeners.error({ target: { error } }), 0);

    await expect.failure(() => store.get(key));
    expect(idbObjectStore.get).toHaveBeenCalled.with(key);
  });

  it('hämtar alla objekt ur objektlagret', async () => {
    const count = 13;
    const data = ['foo', 'bar'];
    const idbObjectStore = mock({ getAll: (query, count) => request });
    const query = 'foo';
    const request = createRequest();
    const store = new ObjectStore(idbObjectStore);

    setTimeout(
      () =>
        request.listeners.success({
          target: { result: data },
        }),
      0
    );

    const result = await store.getAll(query, count);
    expect(result).toBe(data);
    expect(idbObjectStore.getAll).toHaveBeenCalled.with(query, count);
  });

  it('hanterar fel vid hämtning (alla)', async () => {
    const count = 13;
    const data = ['foo', 'bar'];
    const error = 'ERROR';
    const idbObjectStore = mock({ getAll: (query, count) => request });
    const query = 'foo';
    const request = createRequest();
    const store = new ObjectStore(idbObjectStore);

    setTimeout(() => request.listeners.error({ target: { error } }), 0);

    await expect.failure(() => store.getAll(query, count));
    expect(idbObjectStore.getAll).toHaveBeenCalled.with(query, count);
  });
});

describe('Öppna index', () => {
  it('öppnar ett index', () => {
    // Hjälpklass för att verifiera instansiering.
    class MockIndex {
      data;
      constructor(arg) {
        this.data = arg;
      }
    }

    const data = 'INDEX';
    const idbObjectStore = mock({ index: (name) => data });
    const name = 'foo';
    const store = new ObjectStore(idbObjectStore);

    const index = store.index(name, MockIndex);
    expect(data).toBe(index.data);
    expect(idbObjectStore.index).toHaveBeenCalled.with(name);
  });
});

describe('Cursorer', () => {
  it('öppnar en cursor', async () => {
    class MockCursor {
      #request;
      constructor(request) {
        this.#request = request;
      }
      get request() {
        return this.#request;
      }
    }

    const dir = 'next';
    const request = createRequest();
    const idbObjectStore = mock({ openCursor: (query, dir) => request });
    const query = 'foo';
    const store = new ObjectStore(idbObjectStore);

    const cursor = store.openCursor(query, dir, MockCursor);
    expect(cursor.request).toEqual(request);
  });

  it('öppnar en nyckelcursor', async () => {
    class MockCursor {
      #request;
      constructor(request) {
        this.#request = request;
      }
      get request() {
        return this.#request;
      }
    }

    const dir = 'next';
    const request = createRequest();
    const idbObjectStore = mock({ openKeyCursor: (query, dir) => request });
    const query = 'foo';
    const store = new ObjectStore(idbObjectStore);

    const cursor = store.openKeyCursor(query, dir, MockCursor);
    expect(cursor.request).toEqual(request);
  });
});

describe('Spara objekt', () => {
  it('sparar objekt i objektlagret', async () => {
    const idbObjectStore = mock({ put: (key, value) => request });
    const key = 'foo';
    const request = createRequest();
    const value = { foo: 'bar' };

    setTimeout(() => request.listeners.success(), 0);

    const store = new ObjectStore(idbObjectStore);
    await store.put(key, value);
    expect(idbObjectStore.put).toHaveBeenCalled.with(key, value);
  });

  it('hanterar fel vid spara', async () => {
    const error = 'ERROR';
    const idbObjectStore = mock({ put: (key, value) => request });
    const key = 'foo';
    const request = createRequest();
    const store = new ObjectStore(idbObjectStore);
    const value = { foo: 'bar' };

    setTimeout(() => request.listeners.error({ target: { error } }), 0);

    await expect.failure(() => store.put(key, value));
  });
});

// Importera beroenden.
import { ObjectStore } from '../../js/db/ObjectStore.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

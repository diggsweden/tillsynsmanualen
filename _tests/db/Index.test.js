/**
 * Enhetstestfall för databasindex.
 *
 * @license CC-BY 4.0
 * @see Index
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

describe('Räkna objekt', () => {
  it('räknar objekt i indexet', async () => {
    const count = 42;
    const idbIndex = mock({ count: (query) => request });
    const index = new Index(idbIndex);
    const query = 'foo';
    const request = createRequest();

    setTimeout(
      () =>
        request.listeners.success({
          target: { result: count },
        }),
      0
    );

    const result = await index.count(query);
    expect(result).toBe(count);
    expect(idbIndex.count).toHaveBeenCalled.with(query);
  });

  it('hanterar fel vid räkning', async () => {
    const error = 'ERROR';
    const idbIndex = mock({ count: (query) => request });
    const index = new Index(idbIndex);
    const query = 'foo';
    const request = createRequest();

    setTimeout(() => request.listeners.error({ target: { error } }), 0);

    await expect.failure(() => index.count(query));
  });
});

describe('Hämta objekt', () => {
  it('hämtar ett objekt ur indexet', async () => {
    const data = { foo: 'bar' };
    const idbIndex = mock({ get: (key) => request });
    const index = new Index(idbIndex);
    const key = 'foo';
    const request = createRequest();

    setTimeout(
      () =>
        request.listeners.success({
          target: { result: data },
        }),
      0
    );

    const result = await index.get(key);
    expect(result).toBe(data);
    expect(idbIndex.get).toHaveBeenCalled.with(key);
  });

  it('hanterar fel vid hämtning (1)', async () => {
    const error = 'ERROR';
    const idbIndex = mock({
      get: (key) => request,
    });
    const index = new Index(idbIndex);
    const request = createRequest();

    setTimeout(() => request.listeners.error({ target: { error } }), 0);

    await expect.failure(() => index.get());
    expect(idbIndex.get).toHaveBeenCalled.with(null);
  });

  it('hämtar alla nycklar ur indexet', async () => {
    const count = 13;
    const data = ['foo', 'bar'];
    const idbIndex = mock({ getAllKeys: (query, count) => request });
    const index = new Index(idbIndex);
    const query = 'foo';
    const request = createRequest();

    setTimeout(
      () =>
        request.listeners.success({
          target: { result: data },
        }),
      0
    );

    const result = await index.getAllKeys(query, count);
    expect(result).toEqual(data);
    expect(idbIndex.getAllKeys).toHaveBeenCalled.with(query, count);
  });

  it('hämtar alla objekt ur indexet', async () => {
    const count = 13;
    const data = ['foo', 'bar'];
    const idbIndex = mock({ getAll: (query, count) => request });
    const index = new Index(idbIndex);
    const query = 'foo';
    const request = createRequest();

    setTimeout(
      () =>
        request.listeners.success({
          target: { result: data },
        }),
      0
    );

    const result = await index.getAll(query, count);
    expect(result).toEqual(data);
    expect(idbIndex.getAll).toHaveBeenCalled.with(query, count);
  });

  it('hanterar fel vid hämtning (alla)', () => {
    const error = 'ERROR';
    const idbIndex = mock({ getAll: (query, count) => request });
    const request = createRequest();

    setTimeout(() => request.listeners.error({ target: { error } }), 0);

    const index = new Index(idbIndex);
    expect.failure(() => index.getAll());
    expect(idbIndex.getAll).toHaveBeenCalled.with(null, 0);
  });
});

describe('Cursorer', () => {
  it('öppnar en cursor', () => {
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
    const idbIndex = mock({
      openCursor: (query, dir) => request,
    });
    const index = new Index(idbIndex);
    const query = 'foo';
    const request = createRequest();
    const cursor = index.openCursor(query, dir, MockCursor);
    expect(cursor.request).toEqual(request);
  });

  it('öppnar en nyckelcursor', () => {
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
    const idbIndex = mock({
      openKeyCursor: (query, dir) => request,
    });
    const index = new Index(idbIndex);
    const query = 'foo';
    const request = createRequest();
    const cursor = index.openKeyCursor(query, dir, MockCursor);
    expect(cursor.request).toEqual(request);
  });
});

// Importera beroenden.
import { Index } from '../../js/db/Index.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

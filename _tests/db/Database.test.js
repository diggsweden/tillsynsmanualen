/**
 * Enhetstestfall för objektdatabasen.
 *
 * @license CC-BY 4.0
 * @see Database
 */

let request;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  request = mock(
    {
      listeners: {},
    },
    {
      addEventListener(type, func) {
        request.listeners[type] = func;
      },
    }
  );
});

describe('Öppning och stängning', () => {
  it('öppnar och stänger databasen', async () => {
    const database = new Database();
    const idb = mock({
      close: () => {},
      open: (name, version) => request,
    });
    const name = 'monitoringManual';
    const version = 1;

    setTimeout(
      () =>
        request.listeners.success({
          target: { result: idb },
        }),
      0
    );

    const db = await database.open(name, version, null, idb);
    expect(db).toBe(database);
    db.close();

    // Ska ha registrerat 3 händelselyssnare.
    expect(request.addEventListener).toHaveBeenCalled.with(
      ['error', expect.anyFunction()],
      ['upgradeneeded', expect.anyFunction()],
      ['success', expect.anyFunction()]
    );

    // Ska ha anropat IndexedDB-databasens metoder.
    expect(idb.open).toHaveBeenCalled.with(name, version);
    expect(idb.close).toHaveBeenCalled.once();
  });

  it('fångar fel vid öppning av databasen', async () => {
    const database = new Database();
    const error = 'ERROR';
    const idb = mock({ open: (name, version) => request });
    const name = 'invalid';
    const version = 1;

    setTimeout(
      () =>
        request.listeners.error({
          target: { error: error },
        }),
      0
    );

    await expect.failure(() => database.open(name, version, null, idb));
  });

  it('uppgraderar databasen', async () => {
    const database = new Database();
    const idb = mock({ open: (name, version) => request });
    const name = 'DiggManual';
    const upgrade = mock({
      run(event) {
        setTimeout(
          () =>
            request.listeners.success({
              target: { result: idb },
            }),
          0
        );
      },
    });
    const version = 99;

    setTimeout(
      () =>
        request.listeners.upgradeneeded({
          target: { result: idb },
        }),
      0
    );

    const db = await database.open(name, version, (e) => upgrade.run(e), idb);

    expect(db).toBe(database);
    expect(upgrade.run).toHaveBeenCalled.once();
  });
});

describe('Skapa transaktion', () => {
  it('skapar en transaktion', async () => {
    // Hjälpklass för att verifiera instansiering.
    class MockTrans {
      data;
      constructor(arg) {
        this.data = arg;
      }
    }

    const database = new Database();
    const idb = mock({
      open: (name, version) => request,
      transaction: (stores, mode, options) => txData,
    });
    const mode = 'readwrite';
    const name = 'DiggManual';
    const options = { foo: 'bar' };
    const stores = ['Foo', 'Bar'];
    const txData = 'TX';
    const version = 1;

    setTimeout(
      () =>
        request.listeners.success({
          target: { result: idb },
        }),
      0
    );

    const db = await database.open(name, version, null, idb);
    const tx = db.transaction(stores, mode, options, MockTrans);
    expect(tx.data).toBe(txData);
  });
});

describe('Radering', () => {
  it('raderar databasen', async () => {
    const database = new Database();
    const idb = mock({
      deleteDatabase: (name) => request,
    });
    const name = 'monitoringManual';

    setTimeout(
      () =>
        request.listeners.success({
          target: { result: undefined },
        }),
      0
    );

    await database.delete(name, idb);

    // Ska ha registrerat 2 händelselyssnare.
    expect(request.addEventListener).toHaveBeenCalled.with(
      ['error', expect.anyFunction()],
      ['success', expect.anyFunction()]
    );

    // Ska ha anropat IndexedDB-databasens metoder.
    expect(idb.deleteDatabase).toHaveBeenCalled.with(name);
  });

  it('fångar fel vid radering av databasen', async () => {
    const database = new Database();
    const error = 'ERROR';
    const idb = mock({ deleteDatabase: (name) => request });
    const name = 'monitoringManual';

    setTimeout(
      () =>
        request.listeners.error({
          target: { error: error },
        }),
      0
    );

    await expect.failure(() => database.delete(name, idb));
  });
});

// Importera beroenden.
import { Database } from '../../js/db/Database.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

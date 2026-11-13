/**
 * Enhetstestfall för fabriksklassen för databasanslutningar.
 *
 * @license CC-BY 4.0
 * @see ConnectionFactory
 */

describe('Normal anslutning', () => {
  it('öppnar och returnerar databasen', async () => {
    const db = mock({
      open: async (name, version) => {},
    });
    const storage = mock({
      persist: () => {},
      persisted: async () => true,
    });
    const nav = mock({ storage: storage });
    await ConnectionFactory.build(db, nav);
    expect(db.open)
      .toHaveBeenCalled.once()
      .with('monitoringManual', 1, expect.anyFunction());
    expect(storage.persist).toHaveBeenCalled.never();
  });

  it('begär persistens', async () => {
    const db = mock({
      open: async (name, version) => db,
    });
    const storage = mock({
      persist: async () => true,
      persisted: async () => false,
    });
    const nav = mock({ storage: storage });
    const result = await ConnectionFactory.build(db, nav);
    expect(result).toBe(db);
    expect(storage.persist).toHaveBeenCalled.once();
  });
});

describe('Uppgradering', () => {
  it('skapar alla objektlager i ny databas', async () => {
    const db = mock({
      objectStoreNames: { contains: () => false },
      createObjectStore: (name, obj) => objStore,
      async open(name, version, upgrade) {
        upgrade({ target: { result: db } });
        return db;
      },
    });
    const objStore = mock({ createIndex: () => {} });
    const storage = mock({
      persist: () => {},
      persisted: async () => true,
    });
    const nav = mock({ storage: storage });
    const result = await ConnectionFactory.build(db, nav);
    expect(result).toBe(db);

    // Ska ha skapat åtta objektlager och fem index.
    const ai = () => ({ keyPath: undefined, autoIncrement: true });
    expect(db.createObjectStore)
      .toHaveBeenCalled.times(7)
      .with(
        ['people', ai()],
        ['schedules', ai()],
        ['cases', ai()],
        ['entries', ai()],
        ['audits', ai()],
        ['samples', ai()],
        ['requirements', ai()]
      );
    expect(objStore.createIndex)
      .toHaveBeenCalled.times(4)
      .with(
        ['by_case', 'caseID', undefined],
        ['by_case', 'caseID', undefined],
        ['by_audit', 'auditID', undefined],
        ['by_sample', 'sampleID', undefined]
      );
  });

  it('skapar nytt objektlager i befintlig databas', async () => {
    const existing = ['people', 'schedules', 'cases', 'entries', 'audits'];
    const db = mock({
      objectStoreNames: {
        contains: (n) => existing.includes(n),
      },
      createObjectStore: (name, obj) => objStore,
      async open(name, version, upgrade) {
        upgrade({ target: { result: db } });
        return db;
      },
    });
    const objStore = mock({ createIndex: () => {} });
    const storage = mock({
      persist: () => {},
      persisted: async () => true,
    });
    const nav = mock({ storage: storage });
    const result = await ConnectionFactory.build(db, nav);
    expect(result).toBe(db);

    // Ska ha skapat tre nya objektlager och tre index.
    expect(db.createObjectStore)
      .toHaveBeenCalled.times(2)
      .with(
        ['samples', { keyPath: undefined, autoIncrement: true }],
        ['requirements', { keyPath: undefined, autoIncrement: true }]
      );
    expect(objStore.createIndex)
      .toHaveBeenCalled.times(2)
      .with(
        ['by_audit', 'auditID', undefined],
        ['by_sample', 'sampleID', undefined]
      );
  });
});

describe('Radering', () => {
  it('raderar databasen', async () => {
    const db = mock({ delete: async (name) => {} });
    await ConnectionFactory.destroy(db);
    expect(db.delete).toHaveBeenCalled.once().with('monitoringManual');
  });
});

// Importera beroenden.
import { ConnectionFactory } from '../../js/db/ConnectionFactory.js';
import { describe, expect, it, mock } from '../functions.js';

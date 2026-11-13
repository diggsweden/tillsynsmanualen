/**
 * Fabriksobjekt för databasanslutningar.
 *
 * - Begär beständig lagring i StorageManager.
 * - Skapar en Database-instans och öppnar en anslutning till den.
 * - Hanterar eventuella uppgraderinghändelser.
 *
 * @license CC-BY 4.0
 *
 * @example
 * db = await ConnectionFactory.build();
 */
export class ConnectionFactory {
  // Privata fält.
  static #Database = 'monitoringManual';
  static #Version = 1;

  /**
   * Skapa en databasanslutning.
   *
   * - Begär beständig lagring i StorageManager.
   * - Skapa en Database-instans coh öppna an anslutning till den.
   *
   * @param {object}    [database] Databas vid enhetstester.
   * @param {Navigator} [nav]      Webbläsarinformation vid enhetstester.
   * @return {Database}
   */
  static async build(database = null, nav = navigator) {
    await ConnectionFactory.#persist(nav);

    const db = database || new Database();
    await db.open(
      ConnectionFactory.#Database,
      ConnectionFactory.#Version,
      (event) => ConnectionFactory.#upgrade(event)
    );

    return db;
  }

  /**
   * Radera databasen och dess innehåll.
   *
   * @param {object} [database] Databas vid enhetstester.
   */
  static async destroy(database = null) {
    const db = database || new Database();
    await db.delete(ConnectionFactory.#Database);
  }

  /**
   * Skapa ett objektlager och eventuella index.
   *
   * Använd en automatiskt uppräknande extern primärnyckel om inget nyckelfält
   * anges.
   *
   * @param {IDBDatabase} db       Databas.
   * @param {string}      name     Objektlagrets namn.
   * @param {object}      [index]  Index (namn/nyckel).
   * @param {object}      [params] Ytterligare indexparametrar.
   */
  static #createStore(db, name, index = {}, params = undefined) {
    const stores = db.objectStoreNames;

    if (!stores.contains(name)) {
      const autoIncrement = true;
      const store = db.createObjectStore(name, {
        keyPath: undefined,
        autoIncrement,
      });

      for (const [name, key] of Object.entries(index)) {
        store.createIndex(name, key, params);
      }
    }
  }

  /**
   * Försök göra lagringen beständig.
   *
   * @private
   * @param {Navigator} [nav] Webbläsarinformation.
   */
  static async #persist(navigator) {
    if (
      navigator.storage &&
      navigator.storage.persist &&
      navigator.storage.persisted
    ) {
      // Kontrollera om lagringen är beständig.
      let isPersisted = await navigator.storage.persisted();
      if (isPersisted) return;

      // Nej: begär att lagringen blir beständig.
      isPersisted = await navigator.storage.persist();
      if (isPersisted) return;
      // Begäran avslogs.
    }
    console.warn('Informationslagringen är inte beständig.');
  }

  /**
   * Uppgradera databasen.
   *
   * @private
   * @param {IDBVersionChangeEvent} upgrade Uppgraderingsinformation.
   */
  static #upgrade(upgrade) {
    const db = upgrade.target.result;
    const make = (...args) => ConnectionFactory.#createStore(db, ...args);

    make('people');
    make('schedules');
    make('cases');
    make('entries', { by_case: 'caseID' });
    make('audits', { by_case: 'caseID' });
    make('samples', { by_audit: 'auditID' });
    make('requirements', { by_sample: 'sampleID' });
  }
}

// Importera beroenden.
import { Database } from './Database.js';

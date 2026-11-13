/**
 * Kapslar in en indexerad webbläsardatabas.
 *
 * Erbjuder ett gränssnitt med löften, som är lite lättare att arbeta med än de
 * händelselyssnare som IndexedDB använder.
 *
 * @license CC-BY 4.0
 * @see IDBDatabase
 */
export class Database {
  // Privata fält.
  #db = null;

  /**
   * Stäng databasen, om den är öppen.
   */
  close() {
    if (this.#db) {
      this.#db.close();
      this.#db = null;
    }
  }

  /**
   * Radera databasen.
   *
   * @param {string}    name  Databasnamn.
   * @param {IndexedDB} [idb] Objektdatabas.
   */
  delete(name, idb = indexedDB) {
    return new Promise((resolve, reject) => {
      const request = idb.deleteDatabase(name);

      request.addEventListener('error', (event) => {
        reject(event.target.error);
      });

      request.addEventListener('success', (event) => {
        resolve();
      });
    });
  }

  /**
   * Öppna databasen.
   *
   * @param {string}    name      Databasnamn.
   * @param {number}    [version] Versionsnummer.
   * @param {function}  [upgrade] Uppgraderingsfunktion.
   * @param {IndexedDB} [idb]     Objektdatabas.
   * @return {Promise}
   */
  open(name, version = 1, upgrade = null, idb = indexedDB) {
    return new Promise((resolve, reject) => {
      const request = idb.open(name, version);

      request.addEventListener('error', (event) => {
        reject(event.target.error);
      });

      request.addEventListener('upgradeneeded', (event) => {
        if (upgrade) {
          upgrade(event);
        } else {
          reject(null);
        }
      });

      request.addEventListener('success', (event) => {
        this.#db = event.target.result;
        resolve(this);
      });
    });
  }

  /**
   * Starta en transaktion.
   *
   * @see Transaction
   * @param {string|string[]} storeNames Namn på objektlager.
   * @param {string}          [mode]     Åtkomst: "readonly" / "readwrite".
   * @param {Object}          [options]  Parametrar.
   * @param {class}           [txClass]  Transaktionsklass.
   * @return {Transaction}
   * @throws {DOMException} Fel vid skapande av transaktion.
   */
  transaction(
    storeNames,
    mode = 'readonly',
    options = {},
    txClass = Transaction
  ) {
    return new txClass(this.#db.transaction(storeNames, mode, options));
  }
}

// Importera beroenden.
import { Transaction } from './Transaction.js';

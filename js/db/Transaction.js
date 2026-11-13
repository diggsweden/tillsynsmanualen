/**
 * Kapslar in en IndexedDB-transaktion.
 *
 * @license CC-BY 4.0
 * @see IDBTransaction
 */
export class Transaction {
  // Privata fält.
  #tx = null;

  /**
   * Konstruera en transaktionsinstans.
   *
   * @param {IDBTransaction} tx Transaktion att kapsla in.
   */
  constructor(tx) {
    this.#tx = tx;
  }

  /**
   * Meddela när transaktionen slutförs.
   *
   * @param {*} [payload] Last att infria löftet med.
   * @return {Promise} Infrias med angiven last när transaktionen slutförs.
   */
  complete(payload) {
    return new Promise((resolve, reject) => {
      const tx = this.#tx;
      tx.addEventListener('abort', (ev) => reject(null));
      tx.addEventListener('error', (ev) => reject(ev.target.error));
      tx.addEventListener('complete', (ev) => resolve(payload));
    });
  }

  /**
   * Returnera angivet objektlager i transaktionen.
   *
   * @param {string} name      Namn på objektlagret.
   * @param {class}  [osClass] Objektlagerklass.
   * @return {ObjectStore}
   * @throws {DOMException} Fel vid skapande av transaktion.
   */
  objectStore(name, osClass = ObjectStore) {
    return new osClass(this.#tx.objectStore(name));
  }
}

// Importera beroenden.
import { ObjectStore } from './ObjectStore.js';

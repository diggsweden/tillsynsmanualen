/**
 * Kapslar in ett IndexedDB-index.
 *
 * @license CC-BY 4.0
 * @see IDBIndex
 */
export class Index {
  // Privata fält.
  #index = null;

  /**
   * Konstruera en indexinstans.
   *
   * @param {IDBIndex} index Index att kapsla in.
   */
  constructor(index) {
    this.#index = index;
  }

  /**
   * Räkna antalet värden i indexet.
   *
   * @param {*} [key] Nyckelvärde eller intervall.
   * @return {Promise} Infrias med antalet när begäran slutförts.
   */
  count(key = null) {
    return new Promise((resolve, reject) => {
      const req = this.#index.count(key);

      req.addEventListener('error', (ev) => reject(ev.target.error));
      req.addEventListener('success', (ev) => resolve(ev.target.result));
    });
  }

  /**
   * Hämta angivet värde ur indexet.
   *
   * @param {*} [key] Nyckelvärde eller intervall.
   * @return {Promise} Infrias med resultatet när värdet hämtats ur indexet.
   */
  get(key = null) {
    return new Promise((resolve, reject) => {
      const req = this.#index.get(key);

      req.addEventListener('error', (ev) => reject(ev.target.error));
      req.addEventListener('success', (ev) => resolve(ev.target.result));
    });
  }

  /**
   * Hämta angivna värden ur indexet.
   *
   * @param {*}      [query] Nyckelvärde eller intervall.
   * @param {number} [count] Maximalt antal värden att hämta.
   * @return {Promise} Infrias med resultaten när värdena hämtats ur indexet.
   */
  getAll(query = null, count = 0) {
    return new Promise((resolve, reject) => {
      const req = this.#index.getAll(query, count);

      req.addEventListener('error', (ev) => reject(ev.target.error));
      req.addEventListener('success', (ev) => resolve(ev.target.result));
    });
  }

  /**
   * Hämta angivna nycklar ur indexet.
   *
   * @param {*}      [query] Nyckelvärde eller intervall.
   * @param {number} [count] Maximalt antal nycklar att hämta.
   * @return {Promise} Infrias med resultaten när nycklarna hämtats ur indexet.
   */
  getAllKeys(query = null, count = 0) {
    return new Promise((resolve, reject) => {
      const req = this.#index.getAllKeys(query, count);

      req.addEventListener('error', (ev) => reject(ev.target.error));
      req.addEventListener('success', (ev) => resolve(ev.target.result));
    });
  }

  /**
   * Öppna en cursor i indexet.
   *
   * @param {*}      [query]     Nyckelvärde eller intervall.
   * @param {string} [direction] Iterationsrikning.
   * @param {class}  [curClass]  Cursorklass vid enhetstester.
   * @return {Cursor}
   */
  openCursor(query = null, direction = 'next', curClass = Cursor) {
    return new curClass(this.#index.openCursor(query, direction));
  }

  /**
   * Öppna en nyckelcursor i indexet.
   *
   * @param {*}      [query]     Nyckelvärde eller intervall.
   * @param {string} [direction] Iterationsrikning.
   * @param {class}  [curClass]  Cursorklass vid enhetstester.
   * @return {Cursor}
   */
  openKeyCursor(query = null, direction = 'next', curClass = Cursor) {
    return new curClass(this.#index.openKeyCursor(query, direction));
  }
}

// Importera beroenden.
import { Cursor } from './Cursor.js';

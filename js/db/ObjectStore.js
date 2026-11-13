/**
 * Kapslar in ett IndexedDB-objektlager.
 *
 * @license CC-BY 4.0
 * @see IDBObjectStore
 */
export class ObjectStore {
  // Privata fält.
  #store = null;

  /**
   * Konstruera en objektlagerinstans.
   *
   * @param {IDBObjectStore} store Objektlager att kapsla in.
   */
  constructor(store) {
    this.#store = store;
  }

  /**
   * Lägg till ett värde i objektlagret.
   *
   * @param {*}      value Värde att lägga till.
   * @param {string} [key] Nyckel.
   * @return {Promise} Infrias när värdet lagts till i objektlagret.
   */
  add(value, key) {
    return new Promise((resolve, reject) => {
      const req = this.#store.add(value, key);

      req.addEventListener('error', (ev) => reject(ev.target.error));
      req.addEventListener('success', (ev) => resolve(ev.target.result));
    });
  }

  /**
   * Räkna antalet värden.
   *
   * @param {*} [query] Nyckelvärde eller intervall.
   * @return {Promise} Infrias med antalet när begäran slutförts.
   */
  count(query = null) {
    return new Promise((resolve, reject) => {
      const req = this.#store.count(query);

      req.addEventListener('error', (ev) => reject(ev.target.error));
      req.addEventListener('success', (ev) => resolve(ev.target.result));
    });
  }

  /**
   * Radera angivna värden ur objektlagret.
   *
   * @param {*} keys Nyckelvärde eller intervall.
   * @return {Promise} Infrias när värdena raderats ur objektlagret.
   */
  delete(keys) {
    return new Promise((resolve, reject) => {
      const req = this.#store.delete(keys);

      req.addEventListener('error', (ev) => reject(ev.target.error));
      req.addEventListener('success', (ev) => resolve());
    });
  }

  /**
   * Hämta angivet värde ur objektlagret.
   *
   * @param {*} key Nyckelvärde.
   * @return {Promise} Infrias med resultatet när värdet hämtats.
   */
  get(key) {
    return new Promise((resolve, reject) => {
      const req = this.#store.get(key);

      req.addEventListener('error', (ev) => reject(ev.target.error));
      req.addEventListener('success', (ev) => resolve(ev.target.result));
    });
  }

  /**
   * Hämta angivna (eller alla) värden ur objektlagret.
   *
   * @param {*}      [query] Nyckelvärde eller intervall.
   * @param {number} [count] Maximalt antal värden att hämta.
   * @return {Promise} Infrias med resultatvektorn när värdena hämtats.
   */
  getAll(query = null, count = 0) {
    return new Promise((resolve, reject) => {
      const req = this.#store.getAll(query, count);

      req.addEventListener('error', (ev) => reject(ev.target.error));
      req.addEventListener('success', (ev) => resolve(ev.target.result));
    });
  }

  /**
   * Öppna ett index.
   *
   * @param {string} name         Namn på indexet.
   * @param {class}  [indexClass] Indexklass.
   * @return {Index}
   * @throws {DOMException} Fel vid skapande av index.
   */
  index(name, indexClass = Index) {
    return new indexClass(this.#store.index(name));
  }

  /**
   * Öppna en cursor i objektlagret.
   *
   * @param {*}      [query]     Nyckelvärde eller intervall.
   * @param {string} [direction] Iterationsrikning.
   * @param {class}  [curClass]  Cursorklass vid enhetstester.
   * @return {Cursor}
   */
  openCursor(query = null, direction = 'next', curClass = Cursor) {
    return new curClass(this.#store.openCursor(query, direction));
  }

  /**
   * Öppna en nyckelcursor i objektlagret.
   *
   * @param {*}      [query]     Nyckelvärde eller intervall.
   * @param {string} [direction] Iterationsrikning.
   * @param {class}  [curClass]  Cursorklass vid enhetstester.
   * @return {Cursor}
   */
  openKeyCursor(query = null, direction = 'next', curClass = Cursor) {
    return new curClass(this.#store.openKeyCursor(query, direction));
  }

  /**
   * Uppdatera ett värde i objektlagret.
   *
   * @param {*}      value Värde att lägga till.
   * @param {string} [key] Nyckel.
   * @return {Promise} Infrias när värdet uppdaterats i objektlagret.
   */
  put(value, key) {
    return new Promise((resolve, reject) => {
      const req = this.#store.put(value, key);

      req.addEventListener('error', (ev) => reject(ev.target.error));
      req.addEventListener('success', (ev) => resolve());
    });
  }
}

// Importera beroenden.
import { Cursor } from './Cursor.js';
import { Index } from './Index.js';

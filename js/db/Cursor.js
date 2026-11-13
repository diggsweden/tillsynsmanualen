/**
 * Kapslar in en IndexedDB-cursor.
 *
 * Ett löftesbaserat gränssnitt förenklar användningen jämfört med den händelse-
 * baserade IDBCursor.
 *
 * Cursorn implementerar det asynkrona iteratorgränssnittet och kan alltså an-
 * vändas med `for await...of`.
 *
 * @license CC-BY 4.0
 * @see IDBCursor
 * @see IDBCursorWithValue
 * @property {string}                    direction  Stegriktning.
 * @property {*}                         key        Aktuell nyckel.
 * @property {*}                         primaryKey Aktuell primärnyckel.
 * @property {IDBRequest}                request    Begäran som öppnade cursorn.
 * @property {(IDBIndex|IDBObjectStore)} source     Cursorns källa.
 * @property {(*|undefined)}             value      Aktuellt värde.
 *
 * @example
 * const cursor = index.openCursor(...)
 * for await (const item of cursor) {
 *     console.log(cursor.value)
 * }
 */
export class Cursor {
  // Privata fält.
  #cursor;
  #listener;
  #request;
  #state;

  /**
   * Konstruera en cursorinstans.
   *
   * Argumentet är ett `IDBRequest` som typiskt kommer från ett anrop till
   * `Index.openCursor()` eller motsvarande.
   *
   * @param {IDBRequest} request Öppningsbegäran.
   */
  constructor(request) {
    this.#request = request;
    this.#state = 'created';
  }

  /**
   * @inheritDoc
   */
  [Symbol.asyncIterator]() {
    return this;
  }

  /**
   * Avancera cursorn angivet antal steg.
   *
   * @param {number} count Antal steg att avancera cursorn.
   */
  advance(count) {
    this.#cursor.advance(count);
  }

  /**
   * Avancera cursorn ett steg, eller till angiven nyckel.
   *
   * @param {*} [key] Nyckel att positionera cursorn vid.
   */
  continue(key) {
    this.#cursor.continue(key);
  }

  /**
   * Avancera cursorn till angivna nycklar.
   *
   * @param {*} key        Nyckel att positionera cursorn vid.
   * @param {*} primaryKey Primärnyckel att positionera cursorn vid.
   */
  continuePrimaryKey(key, primaryKey) {
    this.#cursor.continuePrimaryKey(key, primaryKey);
  }

  /**
   * Radera värdet vid cursorns position.
   *
   * Metoden är inte tillgänglig i en cursor som öppnats med
   * `openKeyCursor()`.
   *
   * @return {Promise} Infrias när värdet tagits bort.
   */
  delete() {
    return new Promise((resolve, reject) => {
      const request = this.#cursor.delete();
      request.onerror = (event) => reject(event.target.error);
      request.onsuccess = (event) => resolve();
    });
  }

  // Åtkomstmetod för stegriktning.
  get direction() {
    return this.#cursor?.direction;
  }

  // Åtkomstmetod för aktuell nyckel.
  get key() {
    return this.#cursor?.key;
  }

  /**
   * @inheritDoc
   */
  next() {
    return new Promise((resolve, reject) => {
      // Hantera cursorhändelser.
      this.#listener = (request) => {
        this.#listener = null;
        if (request.error) {
          reject(new Error(request.error));
        } else if (request.result) {
          this.#cursor = request.result;
          resolve({ value: request.result });
        } else {
          this.#cursor = null;
          this.#state = 'done';
          resolve({ done: true });
        }
      };

      ({
        active: () => this.#cursor?.continue(),
        created: () => this.#registerListeners(),
        done: () => resolve({ done: true }),
      })[this.#state]();
    });
  }

  // Åtkomstmetod för aktuell primärnyckel.
  get primaryKey() {
    return this.#cursor?.primaryKey;
  }

  // Åtkomstmetod för begäran.
  get request() {
    return this.#cursor?.request;
  }

  // Åtkomstmetod för källa.
  get source() {
    return this.#cursor?.source;
  }

  /**
   * Uppdatera värdet vid cursorns position.
   *
   * Metoden är inte tillgänglig i en cursor som öppnats med
   * `openKeyCursor()`.
   *
   * @param {object} value Nytt värde för posten.
   * @return {Promise} Infrias när värdet uppdaterats.
   */
  update(value) {
    return new Promise((resolve, reject) => {
      const request = this.#cursor.update(value);
      request.onerror = (event) => reject(event.target.error);
      request.onsuccess = (event) => resolve();
    });
  }

  // Åtkomstmetod för aktuellt värde.
  get value() {
    return this.#cursor?.value;
  }

  /**
   * Lägg till händelselyssnare i begäran.
   *
   * @private
   */
  #registerListeners() {
    const listener = (event) => this.#listener?.(event.target);
    this.#request.addEventListener('error', listener);
    this.#request.addEventListener('success', listener);
    this.#state = 'active';
  }
}

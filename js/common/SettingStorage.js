/**
 * Persistent lagring av inställningar.
 *
 * Använder `localStorage` för att lagra data i webbläsarens lokala utrymme.
 *
 * @license CC-BY 4.0
 */
export class SettingStorage {
  // Privata fält.
  static #Key = 'digg.manual';

  #storage;

  /**
   * Konstruera en lagringsinstans.
   *
   * @param {Storage} [storage] Lagringsutrymme vid enhetstester.
   */
  constructor(storage = localStorage) {
    this.#storage = storage;
  }

  /**
   * Raderar alla nycklar för Tillsynsmanualen i lagringsutrymmet.
   */
  clear() {
    const count = this.#storage.length;
    const prefix = `${SettingStorage.#Key}.`;
    const keys = [];
    for (let i = 0; i < count; ++i) {
      const key = this.#storage.key(i);
      key.startsWith(prefix) && keys.push(key);
    }
    keys.forEach((key) => this.#storage.removeItem(key));
  }

  /**
   * Kontrollera om angivna nycklar finns i lagringsutrymmet.
   *
   * @param {...string} key Nycklar att söka efter.
   * @return {boolean}
   */
  contains(...key) {
    return key.every((key) => null !== this.read(key));
  }

  /**
   * Läs data från lagringsutrymmet.
   *
   * @param {string} key Nyckel för data att läsa.
   * @return {string|null}
   */
  read(key) {
    return this.#storage.getItem(`${SettingStorage.#Key}.${key}`);
  }

  /**
   * Radera data från lagringsutrymmet.
   *
   * @param {string} key Nyckel för data att radera.
   */
  remove(key) {
    this.#storage.removeItem(`${SettingStorage.#Key}.${key}`);
  }

  /**
   * Skriv data till lagringsutrymmet.
   *
   * @param {string} key   Nyckel under vilken data ska lagras.
   * @param {string} value Data att skriva.
   * @throws {TypeError} Fel vid skrivning till `localStorage`.
   */
  write(key, value) {
    try {
      this.#storage.setItem(`${SettingStorage.#Key}.${key}`, value);
    } catch (err) {
      console.error('storage.setItem():', err);
      throw new TypeError(
        'Det gick inte att spara data.' +
          ' Kontrollera behörigheter och lagringsutrymme.'
      );
    }
  }
}

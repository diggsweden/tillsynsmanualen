/**
 * Ärendenummer i DIGG:s diarium.
 *
 * Ett ärendenummer består av ett årtal och ett löpnummer och formateras som
 * exempelvis "2020-1234". Det serialiseras som en numerisk identifierare, till
 * exempel 20201234.
 *
 * @license CC-BY 4.0
 * @property {number} id     Numerisk identifierare.
 * @property {number} serial Löpnummer.
 * @property {number} year   Årtal.
 */
export class CaseNumber {
  // Privata fält.
  #formatted;
  #serial;
  #year;

  /**
   * Konstruera en ärendenummerinstans.
   *
   * Tolka numret och identifiera årtal och löpnummer. Kasta ett undantag om
   * det misslyckas.
   *
   * Ignorera alla icke-numeriska tecken.
   *
   * @param {(number|string)}  num      ID eller nummersträng.
   * @throws {ValidationError} Ogiltigt ärendenummer.
   */
  constructor(num) {
    this.#parse(String(num));
  }

  // Åtkomstmetod för numerisk identifierare.
  get id() {
    const magnitude = this.#formatted.length - 5;
    return this.#year * 10 ** magnitude + this.#serial;
  }

  // Åtkomstmetod för löpnummer.
  get serial() {
    return this.#serial;
  }

  /**
   * @inheritDoc
   * @override
   */
  toString() {
    return this.#formatted;
  }

  // Åtkomstmetod för årtal.
  get year() {
    return this.#year;
  }

  /**
   * Tolka en nummersträng och identifiera årtal och löpnummer.
   *
   * Normalisera strängen genom att ignorera alla icke-numeriska tecken.
   * Returnera en vektor med årtal och löpnummer. Kasta ett undantag om
   * årtalet är tidigare än 2020 eller senare än innevarande år, eller om
   * löpnumret är mindre än 1.
   *
   * @param {string} numberString Nummersträng att tolka.
   * @throws {ValidationError} Ogiltigt ärendenummer.
   */
  #parse(numberString) {
    // Eliminera icke-numeriska tecken och validera.
    const str = numberString.replace(/\D/g, '');
    const matches = /^(?<year>\d{4})(?<serial>\d+)$/.exec(str);

    if (null === matches) {
      throw new ValidationError(
        'Ange ärendenummer som exempelvis "2020-1234".',
        numberString
      );
    }

    // Validera årtal och löpnummer.
    const year = Number(matches.groups.year);
    const serial = Number(matches.groups.serial);

    const now = new Date().getFullYear();
    if (year < 2020 || year > now) {
      throw new ValidationError(
        `Ange ärendenummer med årtal 2020–${now}.`,
        numberString
      );
    }
    if (serial < 1) {
      throw new ValidationError(
        `Ange ärendenummer med löpnummer ≥1.`,
        numberString
      );
    }

    this.#year = year;
    this.#serial = serial;
    this.#formatted = `${matches.groups.year}-${matches.groups.serial}`;
  }
}

// Importera beroenden.
import { ValidationError } from './ValidationError.js';

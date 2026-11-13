/**
 * Svenskt organisationsnummer.
 *
 * Representerar ett organisationsnummer, med validering vid inmatning och
 * formatering vid utmatning.
 *
 * @license CC-BY 4.0
 * @see {@link https://sv.wikipedia.org/wiki/Organisationsnummer|Organisationsnummer}
 */
export class RegistrationNumber {
  // Privata fält.
  #regNo;

  /**
   * Konstruera en organisationsnummerinstans.
   *
   * Validera numret och kontrollsiffran.
   *
   * @param {string} numberString Nummersträng.
   * @throws {ValidationError} Ogiltigt organisationsnummer.
   */
  constructor(numberString) {
    this.#regNo = this.#validate(numberString ?? '');
  }

  /**
   * @inheritDoc
   * @override
   */
  toString() {
    return this.#regNo;
  }

  /**
   * Validera en organisationsnummersträng.
   *
   * Normalisera strängen genom att ignorera alla icke-numeriska tecken.
   * Validera längden (10 siffror) och kontrollsiffran.
   *
   * @see #verifyLuhn
   * @param {string} numberString Nummersträng att validera.
   * @return {string}
   * @throws {ValidationError} Fel längd eller kontrollsiffra.
   */
  #validate(numberString) {
    // Eliminera icke-numeriska tecken och validera.
    const str = numberString.replace(/\D/g, '');
    if (!/^[1-9]\d{9}$/.test(str)) {
      throw new ValidationError(
        'Ange organisationsnummer med 10 siffror.',
        numberString
      );
    }

    // Validera kontrollsiffran.
    if (!this.#verifyLuhn(str)) {
      throw new ValidationError(
        'Kontrollera organisationsnumret. Checksiffran stämmer inte.',
        numberString
      );
    }

    return `${str.slice(0, 6)}-${str.slice(6)}`;
  }

  /**
   * Verifiera kontrollsiffran.
   *
   * @private
   * @see {@link https://en.wikipedia.org/wiki/Luhn_algorithm|Luhn-algoritmen}
   * @param {string} value Organisationsnummer (endast siffror).
   * @return {boolean}
   */
  #verifyLuhn(value) {
    let sum = 0;
    let shift = 1;

    for (let index = value.length - 2; index >= 0; --index) {
      let n = parseInt(value.charAt(index), 10) << shift;
      sum += Math.floor(n / 10) + (n % 10);
      shift ^= 1;
    }

    return (
      (10 - (sum % 10)) % 10 === parseInt(value.charAt(value.length - 1), 10)
    );
  }
}

// Importera beroenden.
import { ValidationError } from './ValidationError.js';

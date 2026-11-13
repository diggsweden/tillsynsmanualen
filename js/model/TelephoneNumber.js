/**
 * Svenskt telefonnummer.
 *
 * Representerar ett telefonnummer, med validering vid inmatning och formatering
 * vid utmatning.
 *
 * @license CC-BY 4.0
 * @see {@link https://sv.wikipedia.org/wiki/Telefonnummer|Telefonnummer}
 * @see {@link https://sv.wikipedia.org/wiki/Lista_%C3%B6ver_svenska_riktnummer|Lista över svenska riktnummer}
 */
export class TelephoneNumber {
  // Privata fält.
  static #NDC2 = [8];
  static #NDC3 = [
    10, 11, 13, 16, 18, 19, 20, 21, 23, 26, 31, 33, 35, 36, 40, 42, 44, 46, 54,
    60, 63, 70, 72, 73, 75, 76, 79, 90, 99,
  ];
  static #NDC4 = [771, 900];

  #ndc;
  #subscriber;

  /**
   * Konstruera en telefonnummerinstans.
   *
   * Tolka numret och identifiera riktnummer och abonnenetnummer. Kasta ett
   * undantag om det misslyckas.
   *
   * Ignorera alla icke-numeriska tecken.
   *
   * @param {string} numberString Nummersträng.
   * @throws {ValidationError} Ogiltigt telefonnummer.
   */
  constructor(numberString) {
    const [ndc, subscriber] = this.#parse(numberString);
    this.#ndc = ndc;
    this.#subscriber = subscriber;
  }

  /**
   * @inheritDoc
   * @override
   */
  toString() {
    const format = [];
    format[5] = (s) => `${s.slice(0, 3)} ${s.slice(3)}`;
    format[6] = (s) => `${s.slice(0, 2)} ${s.slice(2, 4)} ${s.slice(4)}`;
    format[7] = (s) => `${s.slice(0, 3)} ${s.slice(3, 5)} ${s.slice(5)}`;

    const len = this.#subscriber.length;
    return `${this.#ndc}-${format[len](this.#subscriber)}`;
  }

  /**
   * Tolka en nummersträng och identifiera riktnummer och abonnentnummer.
   *
   * Normalisera strängen genom att ignorera alla icke-numeriska tecken.
   * Returnera en vektor med riktnummer och abonnentnummer. Kasta ett
   * undantag om den normaliserade nummersträngen inte inleds med en nolla som
   * följs a 7-9 siffror.
   *
   * @param {string} numberString Nummersträng att tolka.
   * @return {string[]}
   * @throws {ValidationError} Ogiltigt telefonnummer.
   */
  #parse(numberString) {
    // Eliminera icke-numeriska tecken och validera.
    const str = numberString.replace(/\D/g, '');
    if (str.length < 8 || str.length > 10 || str[0] !== '0') {
      throw new ValidationError(
        'Fyll i ett giltigt telefonnummer, inklusive riktnummer.',
        numberString
      );
    }

    // Identifiera riktnummer och abonnentnummer;
    const ndc = this.#parseNDC(str.slice(0, 4));
    const subscriber = str.slice(ndc.length);

    return [ndc, subscriber];
  }

  /**
   * Extrahera riktnummer.
   *
   * Argumentet är en sträng med de 4 första siffrora i ett telefonnummer.
   * Jämför det med de kända 2- och 3-ställiga riktnumren och returnera
   * eventuellt matchande nummer. Om inget matchar, eller om strängen matchar
   * ett känt 4-ställigt riktnummer, returnera argumentet.
   *
   * @param {string} str Kandidatsträng.
   * @return {string}
   * @throws {ValidationError} Ogiltigt telefonnummer.
   */
  #parseNDC(str) {
    if (TelephoneNumber.#NDC2.includes(Number(str.slice(1, 2)))) {
      return str.slice(0, 2);
    } else if (
      TelephoneNumber.#NDC3.includes(Number(str.slice(1, 3))) &&
      !TelephoneNumber.#NDC4.includes(Number(str.slice(1)))
    ) {
      return str.slice(0, 3);
    } else if ('0' !== str[1]) {
      return str;
    }

    throw new ValidationError('Fyll i ett giltigt riktnummer.', str);
  }
}

// Importera beroenden.
import { ValidationError } from './ValidationError.js';

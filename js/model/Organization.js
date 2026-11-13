/**
 * Organisationsinformation.
 *
 * Representerar kontaktuppgifter för en aktör vars digitala service undergår
 * granskning eller tillsyn.
 *
 * @license CC-BY 4.0
 * @property {string} abbreviation       Förkortning av namnet.
 * @property {string} address            Postadress.
 * @property {string} email              E-postadrss.
 * @property {string} name               Namn.
 * @property {string} registrationNumber Organisationsnummer.
 * @property {string} telephone          Telefonnummer.
 */
export class Organization {
  // Privata fält.
  #abbreviation = '';
  #address = '';
  #email = '';
  #name = '';
  #registrationNumber = null;
  #telephone = null;

  /**
   * Konstruera en organisationsinstans.
   *
   * @param {object} [data] Dataobjekt att rekonstruera ifrån.
   */
  constructor(data = null) {
    data && this.#unserialize(data);
  }

  // Åtkomstmetoder för förkortning.
  get abbreviation() {
    return this.#abbreviation;
  }

  set abbreviation(abbr) {
    this.#abbreviation = abbr?.trim().toUpperCase() ?? '';
  }

  // Åtkomstmetoder för postadress.
  get address() {
    return this.#address;
  }

  set address(addr) {
    this.#address = (addr?.trim() ?? '')
      .replace(/^ +| +$/gm, '') // Inledande/avslutande blanka per rad.
      .replace(/[ \t]+/g, ' ') // multipla blank/tabb.
      .replace(/[\r\n]+/g, '\n'); // Multipla radbrytningar.
  }

  // Åtkomstmetoder för e-postadress.
  get email() {
    return this.#email;
  }

  set email(addr) {
    if (addr && !/^[^@]+@[^@]+$/.test(addr)) {
      throw new ValidationError(
        'Fyll i en e-postadress som innehåller ETT @-tecken.',
        addr
      );
    }
    this.#email = addr;
  }

  // Åtkomstmetoder för organisationens namn.
  get name() {
    return this.#name;
  }

  set name(name) {
    this.#name = name?.trim() ?? '';
  }

  // Åtkomstmetoder för organisationsnummer.
  get registrationNumber() {
    return this.#registrationNumber?.toString() ?? '';
  }

  set registrationNumber(regNo) {
    const r = regNo?.trim() ?? '';
    this.#registrationNumber = '' === r ? null : new RegistrationNumber(r);
  }

  /**
   * "Serialisera" instansen för lagring i databasen.
   *
   * Generera ett objekt med den information som behövs för att återskapa
   * instansen.
   *
   * @return {object}
   */
  serialize() {
    const obj = {};
    this.abbreviation && (obj.abbr = this.#abbreviation);
    this.address && (obj.addr = this.#address);
    this.email && (obj.email = this.#email);
    this.name && (obj.name = this.#name);
    this.#registrationNumber &&
      (obj.regNo = this.#registrationNumber.toString());
    this.telephone && (obj.tel = this.#telephone.toString());
    return obj;
  }

  // Åtkomstmetoder för telefonnummer.
  get telephone() {
    return this.#telephone?.toString() ?? '';
  }

  set telephone(tel) {
    const t = tel?.trim() ?? '';
    this.#telephone = '' === t ? null : new TelephoneNumber(t);
  }

  /**
   * @inheritDoc
   */
  toJSON() {
    return this.serialize();
  }

  /**
   * Rekonstruera en organisationsinstans från ett dataobjekt.
   *
   * Metoden använder accessormetoder för att populera instansen.
   *
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   */
  #unserialize(data) {
    this.abbreviation = data.abbr;
    this.address = data.addr;
    this.email = data.email;
    this.name = data.name;
    this.registrationNumber = data.regNo;
    this.telephone = data.tel;
  }
}

// Importera beroenden.
import { RegistrationNumber } from './RegistrationNumber.js';
import { TelephoneNumber } from './TelephoneNumber.js';
import { ValidationError } from './ValidationError.js';

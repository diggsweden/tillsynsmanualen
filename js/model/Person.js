/**
 * Personinformation.
 *
 * Namn och kontaktuppgifter för en person.
 * En person kan vara en granskare eller en tillsynsansvarig.
 *
 * @license CC-BY 4.0
 * @property {string}   email      E-postadress.
 * @property {string}   familyName Efternamn.
 * @property {string}   givenName  Förnamn.
 * @property {number}   id         Identitet i databasen.
 * @property {string}   name       Namn (Efternamn, Förnamn).
 * @property {string[]} roles      Roller.
 * @property {string}   telephone  Telefonnummer.
 */
export class Person {
  // Privata fält.
  #email = '';
  #familyName = '';
  #givenName = '';
  #id;
  #roles = new Set();
  #telephone = null;

  /**
   * Konstruera en personinstans.
   *
   * @param {object} [data] Dataobjekt att rekonstruera ifrån.
   */
  constructor(data = null) {
    data && this.#unserialize(data);
  }

  /**
   * Lägg till en roll, om personen inte redan har den.
   *
   * @param {string} role Roll att lägga till.
   */
  addRole(role) {
    this.#roles.add(role);
  }

  /**
   * Ta bort en roll, om personen har den.
   *
   * @param {string} role Roll att ta bort.
   */
  deleteRole(role) {
    this.#roles.delete(role);
  }

  // Åtkomstmetoder för e-postadress.
  get email() {
    return this.#email;
  }

  set email(addr) {
    if ('' !== addr && !/^[^@]+@[^@]+$/.test(addr)) {
      throw new ValidationError(
        'Fyll i en e-postadress som innehåller ETT @-tecken.',
        addr
      );
    }
    this.#email = addr;
  }

  // Åtkomstmetoder för förnamn.
  get familyName() {
    return this.#familyName;
  }

  set familyName(name) {
    name = String(name).trim();
    if (0 === name.length) {
      throw new ValidationError('Fyll i ett efternamn.', name);
    }
    this.#familyName = name;
  }

  // Åtkomstmetoder för efternamn.
  get givenName() {
    return this.#givenName;
  }

  set givenName(name) {
    name = String(name).trim();
    if (0 === name.length) {
      throw new ValidationError('Fyll i ett förnamn.', name);
    }
    this.#givenName = name;
  }

  /**
   * Har personen angiven roll?
   *
   * @param {string} role Sökt roll.
   * @return {boolean}
   */
  hasRole(role) {
    return this.#roles.has(role);
  }

  // Åtkomstmetoder för identitet i databasen.
  get id() {
    return this.#id;
  }

  set id(id) {
    this.#id ??= id;
  }

  // Åtkomstmetod för formaterat namn (Efternamn, Förnamn).
  get name() {
    return `${this.familyName}, ${this.givenName}`;
  }

  // Åtkomstmetod för roller.
  get roles() {
    return Array.from(this.#roles).sort();
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
    const obj = {
      email: this.#email,
      fName: this.#familyName,
      gName: this.#givenName,
    };
    this.#telephone && (obj.tel = this.#telephone.toString());
    this.#roles.size && (obj.roles = Array.from(this.#roles.values()));
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
   * @inheritDoc
   * @override
   */
  toString() {
    return `${this.givenName} ${this.familyName}`;
  }

  /**
   * Rekonstruera en personinstans från ett dataobjekt.
   *
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   * @return {Person}
   */
  #unserialize(data) {
    this.#email = data.email ?? '';
    this.#familyName = data.fName ?? '';
    this.#givenName = data.gName ?? '';
    this.telephone = data.tel;
    (data.roles ?? []).forEach((role) => this.addRole(role));
  }
}

// Importera beroenden.
import { TelephoneNumber } from './TelephoneNumber.js';
import { ValidationError } from './ValidationError.js';

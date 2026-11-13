/**
 * Tillsynsplan.
 *
 * Information om en beslutad periodplan för tillsyn enligt lagen (2018:1937) om
 * tillgänglighet till digital offentlig service.
 *
 * En tillsynsplan har ett beslutsdatum samt start- och slutdatum för tillsyns-
 * perioden. Den är beslutad av en tillsynsansvarig, vars personuppgifter ingår.
 *
 * @license CC-BY 4.0
 * @property {Date}       begins     Övervakningsperiodens startdatum.
 * @property {CaseNumber} caseNumber Ärendenummer.
 * @property {Date}       date       Beslutsdatum.
 * @property {Date}       ends       Övervakningsperiodens slutdatum.
 * @property {number}     id         Identitet i databasen.
 * @property {string}     period     Tillsynsperiod (år).
 * @property {Person}     supervisor Tillsynsansvarig.
 */
export class Schedule {
  // Privata fält.
  #begins = null;
  #caseNumber = null;
  #date = null;
  #ends = null;
  #id;
  #supervisor = null;

  /**
   * Konstruera en tillsynsplaninstans.
   *
   * @param {object} [data] Dataobjekt att rekonstruera ifrån.
   */
  constructor(data = null) {
    data && this.#unserialize(data);
  }

  // Åtkomstmetoder för övervakningsperiodens startdatum.
  get begins() {
    return this.#begins;
  }

  set begins(date) {
    this.#begins = date ? new Date(date) : null;
  }

  // Åtkomstmetoder för ärendenummer.
  get caseNumber() {
    return this.#caseNumber;
  }

  set caseNumber(num) {
    this.#caseNumber = num ? new CaseNumber(num) : null;
  }

  // Åtkomstmetoder för beslutsdatum.
  get date() {
    return this.#date;
  }

  set date(date) {
    if (date && date.getTime() > Date.now()) {
      const now = new Date().toLocaleDateString('sv');
      throw new ValidationError(
        `Fyll i ett beslutsdatum som är ${now} eller tidigare.`,
        date
      );
    }
    this.#date = date ? new Date(date) : null;
  }

  // Åtkomstmetoder för övervakningsperiodens slutdatum.
  get ends() {
    return this.#ends;
  }

  set ends(date) {
    this.#ends = date ? new Date(date) : null;
  }

  // Åtkomstmetod för identitet i databasen.
  get id() {
    return this.#id;
  }

  set id(id) {
    this.#id ??= id;
  }

  // Åtkomstmetod för övervakningsperiod.
  get period() {
    if (!this.#begins || !this.#ends) {
      return '????';
    }

    const begins = this.#begins.getFullYear();
    const ends = this.#ends.getFullYear();

    return begins === ends ? `${begins}` : `${begins}–${ends}`;
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
    const date = (d) => d?.getTime() ?? null;
    return {
      begins: date(this.#begins),
      case: this.#caseNumber?.id,
      date: date(this.#date),
      ends: date(this.#ends),
      supervisor: this.#supervisor?.serialize(),
    };
  }

  // Åtkomstmetoder för tillsynsansvarig.
  get supervisor() {
    return this.#supervisor;
  }

  set supervisor(person) {
    this.#supervisor = person;
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
    return this.#caseNumber?.toString() ?? 'namnlös';
  }

  /**
   * Rekonstruera en tillsynsplaninstans från ett dataobjekt.
   *
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   * @return {Schedule}
   */
  #unserialize(data) {
    const date = (d) => (d ? new Date(d) : d);
    this.begins = date(data.begins);
    this.date = date(data.date);
    this.ends = date(data.ends);
    this.caseNumber = data.case;
    data.supervisor && (this.supervisor = new Person(data.supervisor));
  }
}

// Importera beroenden.
import { CaseNumber } from './CaseNumber.js';
import { Person } from './Person.js';
import { ValidationError } from './ValidationError.js';

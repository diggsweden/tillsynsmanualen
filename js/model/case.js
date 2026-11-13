/**
 * Generiskt granskningsärende.
 *
 * Representerar ett granskningsärende i största allnmänhet. Detta är den enda
 * typ av ärenden som används i det externa gränssnittet.
 *
 * Klassen är också basklass för de tillsynsärenden som används i det interna
 * gränssnittet.
 *
 * @license CC-BY 4.0
 * @property {CaseNumber}   caseNumber   Ärendenummer.
 * @property {string}       filename     Namn under vilket ärendet sparats.
 * @property {number}       id           Identitet i databasen.
 * @property {number}       logSize      Antal noteringar i ärendeloggen.
 * @property {boolean}      monitoring   Tillsynsärende (`false`).
 * @property {date}         opened       Öppningsdatum.
 * @property {Organization} organization Ansvarig offentlig aktör.
 * @property {Service}      service      Digital service som granskas.
 * @property {string}       type         Ärendetyp.
 */
export class AuditCase {
  // Privata fält.
  #audits = new Map();
  #caseNumber;
  #entries = new Map();
  #filename = '';
  #id;
  #opened;
  #organization = new Organization();
  #service;

  /**
   * Konstruera en ärendeinstans.
   *
   * @param {object} [data] Dataobjekt att rekonstruera ifrån.
   */
  constructor(data = null) {
    if (data instanceof AuditCase) {
      this.#unserialize(data.serialize());
      this.#id = data.id;
    } else {
      data && this.#unserialize(data);
    }
  }

  /**
   * Returnera granskningen med angiven identitet.
   *
   * @param {number} id Granskningsindetitet.
   * @return {(Audit|undefined)}
   */
  audit(id) {
    return this.#audits.get(id);
  }

  /**
   * Generera alla tillagda granskningar.
   *
   * @yield {Audit}
   */
  *audits() {
    yield* this.#audits.values();
  }

  // Åtkomstmetoder för ärendenummer.
  get caseNumber() {
    return this.#caseNumber;
  }

  set caseNumber(num) {
    this.#caseNumber = num ? new CaseNumber(num) : null;
  }

  /**
   * Ta bort angiven granskning ur ärendet.
   *
   * @param {Audit} audit Granskning att ta bort.
   * @return {boolean} `true` om granskningen togs bort, annars `false`.
   * @throws {TypeError} Granskning eller gransknings-id är tomt.
   */
  deleteAudit(audit) {
    if (!audit?.id) throw new TypeError('Ogiltig granskning.');
    return this.#audits.delete(audit.id);
  }

  /**
   * Ta bort angiven loggnotering ur ärendet.
   *
   * @param {LogEntry} entry Loggnotering att ta bort.
   * @return {boolean} `true` om noteringen togs bort, annars `false`.
   * @throws {TypeError} Notering eller noterings-id är tomt.
   */
  deleteEntry(entry) {
    if (!entry?.id) throw new TypeError('Ogiltig loggnotering.');
    return this.#entries.delete(entry.id);
  }

  /**
   * Returnera loggnoteringen med angiven identitet.
   *
   * @param {number} id Noteringsindetitet.
   * @return {(LogEntry|undefined)}
   */
  entry(id) {
    return this.#entries.get(id);
  }

  // Åtkomstmetoder för filnamn.
  get filename() {
    if (this.#filename) {
      return this.#filename;
    } else if (this.caseNumber) {
      let escape = (s) => s.replace(/[:?*]/g, '').replace(/\s+/g, '-');
      let name = '';
      if (this.service) {
        name = ' ' + escape(this.service.name.toLowerCase());
      }
      return `${this.#caseNumber}${name}.json`;
    }

    return 'namnlös.json';
  }

  set filename(name) {
    this.#filename = String(name);
  }

  // Åtkomstmetoder för identitet i databasen.
  get id() {
    return this.#id;
  }

  set id(id) {
    this.#id ??= id;
  }

  /**
   * Generera alla tillagda loggnoteringar.
   *
   * @yield {LogEntry}
   */
  *log() {
    yield* this.#entries.values();
  }

  // Åtkomstmetod för antal notering i ärendeloggen.
  get logSize() {
    return this.#entries.size;
  }

  // Åtkomstmetod för tillsynsflagga.
  get monitoring() {
    return false;
  }

  /**
   * Öppna ärendet.
   *
   * Sätt öppningsdatum till aktuellt (eller angivet) datum och klockslag.
   *
   * @param {date} [timestamp] Tidsstämpel.
   * @throws {TypeError} Ärendet är redan öppnat.
   */
  open(timestamp = null) {
    if (this.#opened) {
      throw new TypeError(`Ärende ${this.caseNumber} är redan öppet.`);
    }

    this.#opened = timestamp ? new Date(timestamp) : new Date();
  }

  // Åtkomstmetod för öppningsdatum.
  get opened() {
    return this.#opened ? new Date(this.#opened) : undefined;
  }

  // Åtkomstmetoder för offentlig aktör.
  get organization() {
    return this.#organization;
  }

  set organization(org) {
    this.#organization = org;
  }

  /**
   * "Serialisera" instansen för lagring i databasen.
   *
   * Generera ett objekt med den information som behövs för att återskapa
   * instansen.
   *
   * Granskningar och loggnoteringar ingår inte i serialiseringen, eftersom de
   * lagras i separata objektlager.
   *
   * @return {object}
   */
  serialize() {
    const obj = {
      class: this.constructor.name,
      cn: this.#caseNumber?.id,
      org: this.#organization?.serialize(),
      service: this.#service?.serialize(),
    };
    this.#filename && (obj.file = this.#filename);
    this.#opened && (obj.opened = this.#opened.getTime());
    return obj;
  }

  // Åtkomstmetoder för digital service.
  get service() {
    return this.#service;
  }

  set service(service) {
    this.#service = service;
  }

  /**
   * Lägg till en granskning i ärendet.
   *
   * @param {Audit} audit Granskning att lägga till.
   * @throws {TypeError} Gransknings-id saknas eller är tomt.
   */
  setAudit(audit) {
    if (!audit.id) {
      throw new TypeError('Kan inte lägga till granskning utan id.');
    }
    this.#audits.set(audit.id, audit);
  }

  /**
   * Lägg till en notering i ärendeloggen.
   *
   * @param {LogEntry} entry Notering att lägga till.
   * @throws {TypeError} Noterings-id saknas eller är tomt.
   */
  setEntry(entry) {
    if (!entry.id) {
      throw new TypeError('Kan inte lägga till loggnotering utan id.');
    }
    this.#entries.set(entry.id, entry);
  }

  /**
   * @inheritDoc
   * @override
   */
  toJSON() {
    const obj = this.serialize();
    if (this.#entries.size > 0) {
      obj.entries = [];
      for (const entry of this.#entries.values()) {
        obj.entries.push(entry.toJSON());
      }
    }
    if (this.#audits.size > 0) {
      obj.audits = [];
      for (const audit of this.#audits.values()) {
        obj.audits.push(audit.toJSON());
      }
    }
    return obj;
  }

  /**
   * @inheritDoc
   * @override
   */
  toString() {
    return this.#caseNumber?.toString() ?? 'namnlöst ärende';
  }

  // Åtkomstmetod för ärendetyp.
  get type() {
    return 'audit';
  }

  /**
   * Rekonstruera en ärendeinstans från ett dataobjekt.
   *
   * Används när ett ärende hämtats från databasen och ska omvandlas till ett
   * riktigt ärendeobjekt, samt vid omvandling från en annan ärendetyp.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   */
  #unserialize(data) {
    data.file && (this.#filename = data.file);
    data.cn && (this.#caseNumber = new CaseNumber(data.cn));
    data.id && (this.#id = data.id);
    data.opened && (this.#opened = new Date(data.opened));
    data.org && (this.#organization = new Organization(data.org));
    data.service && (this.#service = ServiceFactory.build(data.service));
  }
}

/**
 * Anmälningsärende.
 *
 * Ett tillsynsärende med grund i en anmälan. Har ett beslutsdatum och en till-
 * synsansvarig.
 *
 * @license CC-BY 4.0
 * @see AuditCase
 * @property {date}       date       Datum för tillsynsbeslut.
 * @property {boolean}    monitoring Tillsynsärende (`true`).
 * @property {number[][]} sections   Rättslig grund (paragrafnummer);
 * @property {Person}     supervisor Tillsynsansvarig.
 */
export class ComplaintCase extends AuditCase {
  // Privata fält.
  #date = null;
  #supervisor = null;

  /**
   * Konstruera en anmälningsrendeinstans.
   *
   * @param {object} [data] Dataobjekt att rekonstruera ifrån.
   */
  constructor(data = null) {
    super(data);
    data && this.#unserialize(data);
  }

  // Åtkomstmetoder för beslutsdatum.
  get date() {
    return this.#date;
  }

  set date(date) {
    const d = date ? new Date(date) : null;
    if (d && 'Invalid Date' === d.toString()) {
      throw new TypeError('Ogiltigt datumvärde.');
    } else if (d && d.getTime() > Date.now()) {
      throw new ValidationError('Beslutsdatum får inte vara i framtiden.', d);
    }
    this.#date = d;
  }

  // Åtkomstmetod för tillsynsflagga.
  get monitoring() {
    return true;
  }

  /**
   * @inheritDoc
   */
  serialize() {
    const obj = super.serialize();
    obj.date = this.#date?.getTime();
    obj.supervisor = this.#supervisor?.serialize();
    return obj;
  }

  // Åtkomstmetod för rättslig grund.
  get sections() {
    return [[16], [18]];
  }

  // Åtkomstmetoder för tillsynsansvarig.
  get supervisor() {
    return this.#supervisor;
  }

  set supervisor(supervisor) {
    this.#supervisor = supervisor;
  }

  // Åtkomstmetod för ärendetyp.
  get type() {
    return 'complaint';
  }

  /**
   * Rekonstruera en ärendeinstans från ett dataobjekt.
   *
   * Används när ett ärende hämtats från databasen och ska omvandlas till ett
   * riktigt ärendeobjekt.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   */
  #unserialize(data) {
    data.date && (this.#date = new Date(data.date));
    data.supervisor && (this.#supervisor = new Person(data.supervisor));
  }
}

/**
 * Övervakningsärende.
 *
 * Ett tillsynsärende för övervakning. Refererar till en tillsynsplan.
 *
 * @license CC-BY 4.0
 * @see AuditCase
 * @property {boolean}    monitoring Tillsynsärende (`true`).
 * @property {Schedule}   schedule  Tillsynsplan.
 * @property {number[][]} sections  Rättslig grund (paragrafnummer);
 */
export class MonitoringCase extends AuditCase {
  // Privata fält.
  #schedule = null;

  /**
   * Konstruera en övervakningsärendeinstans.
   *
   * @param {object} [data] Dataobjekt att rekonstruera ifrån.
   */
  constructor(data = null) {
    super(data);
    data && this.#unserialize(data);
  }

  // Åtkomstmetod för tillsynsflagga.
  get monitoring() {
    return true;
  }

  // Åtkomstmetoder för tillsynsplan.
  get schedule() {
    return this.#schedule;
  }

  set schedule(schedule) {
    this.#schedule = schedule;
  }

  // Åtkomstmetod för rättslig grund.
  get sections() {
    return [[16, 17]];
  }

  /**
   * @inheritDoc
   */
  serialize() {
    const obj = super.serialize();
    obj.schedule = this.#schedule?.serialize();
    return obj;
  }

  // Åtkomstmetod för ärendetyp.
  get type() {
    return 'monitoring';
  }

  /**
   * Rekonstruera en ärendeinstans från ett dataobjekt.
   *
   * Används när ett ärende hämtats från databasen och ska omvandlas till ett
   * riktigt ärendeobjekt.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   */
  #unserialize(data) {
    data.schedule && (this.#schedule = new Schedule(data.schedule));
  }
}

/**
 * Fabriksklass för att bygga ärendeinformation.
 *
 * Bygger en ärendeinstans från ett dataobjekt hämtat från en JSON-fil.
 * Rekonstruerar en ärendeinstans från ett dataobjekt hämtat från databasen.
 *
 * Dataobjektet måste innehålla fältet `class` med ett värde som motsvarar
 * någon av ärendeklassernas namn.
 *
 * @license CC-BY 4.0
 */
export class CaseFactory {
  /**
   * Bygg en instans av en ärendeklass baserad på dataobjektets typ.
   *
   * @param {object} data Dataobjekt att populera ifrån.
   * @return {(AuditCase|ComplaintCase|MonitoringCase)}
   * @throws {TypeError} Ärendetyp saknas eller är ogiltig.
   */
  static build(data) {
    const map = {
      AuditCase: (data) => new AuditCase(data),
      ComplaintCase: (data) => new ComplaintCase(data),
      MonitoringCase: (data) => new MonitoringCase(data),
    };

    const type = data?.class;
    if (!type) {
      throw new TypeError('Ärendetyp saknas.');
    } else if (!(type in map)) {
      throw new TypeError(`Ogiltig ärendetyp '${type}'.`);
    }

    return map[type](data);
  }
}

// Importera beroenden.
import { Audit } from './Audit.js';
import { CaseNumber } from './CaseNumber.js';
import { LogEntry } from './LogEntry.js';
import { Organization } from './Organization.js';
import { Person } from './Person.js';
import { Schedule } from './Schedule.js';
import { MobileApp, ServiceFactory, Website } from './service.js';
import { ValidationError } from './ValidationError.js';

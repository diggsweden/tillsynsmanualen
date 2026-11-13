/**
 * En dagboksnotering i en ärendelogg.
 *
 * @license CC-BY 4.0
 * @property {number} caseID    Ärendeidentitet.
 * @property {*}      data      Händelsespecifika data.
 * @property {string} direction Inkommande/utgående/intern.
 * @property {number} id        Identitet i databasen.
 * @property {string} summary   Sammanfattning.
 * @property {string} text      Textinnehåll.
 * @property {date}   timestamp Datum och klockslag.
 * @property {string} type      Posttyp.
 */
export class LogEntry {
  // Publika fält.
  static Direction = Object.freeze({
    None: 'internal', // Intern anteckning.
    Received: 'received', // Inkommet till myndigheten.
    Sent: 'sent', // Skickat från myndigheten.
  });

  static EntryType = Object.freeze({
    ActionPlan: 'action plan', // Åtgärdsplan från aktör.
    Appeal: 'appeal', // Överklagande.
    AuditFinish: 'audit finish', // Granskning avslutad.
    AuditStart: 'audit start', // Granskning påbörjad.
    CaseOpen: 'open case', // Ärende öppnat.
    Deferment: 'deferment', // Anståndsansökan.
    Email: 'email', // E-brev.
    Injunction: 'injunction', // Föreläggande,
    Letter: 'letter', // Brev.
    Minutes: 'minutes', // Mötesanteckningar.
    Note: 'note', // Tjänsteanteckning.
    Notification: 'notification', // Avisering om granskning.
    Other: 'other', // Övrigt.
    Remarks: 'remarks', // Påpekande.
    Telephone: 'telephone', // Telefonsamtal.
  });

  // Privata fält.
  #caseID;
  #data;
  #direction = '';
  #id;
  #summary = '';
  #text = '';
  #timestamp = new Date();
  #type = '';

  /**
   * Konstruera en noteringsinstans.
   *
   * @param {number} caseID Ärendeidentitet.
   * @param {object} [data] Dataobjekt att rekonstruera ifrån.
   */
  constructor(caseID, data = null) {
    this.#caseID = caseID;
    data && this.#unserialize(data);
  }

  // Åtkomstmetod för ärendeidentitet.
  get caseID() {
    return this.#caseID;
  }

  // Åtkomstmetoder för händelsespecifika data.
  get data() {
    return this.#data;
  }

  set data(value) {
    this.#data = value;
  }

  // Åtkomstmetoder för kommunikationsriktning.
  get direction() {
    return this.#direction;
  }

  set direction(dir) {
    if (Array.from(Object.values(LogEntry.Direction)).includes(dir)) {
      this.#direction = dir;
    }
  }

  // Åtkomstmetoder för identitet i databasen.
  get id() {
    return this.#id;
  }

  set id(id) {
    this.#id = id;
  }

  /**
   * "Serialisera" instansen för lagring i databasen.
   *
   * Generera ett objekt med den information som behövs för att återskapa
   * instansen.
   *
   * Ärendeidentiteten ingår i ett index för att identifiera loggnoteringar
   * som hör till ett givet ärende.
   *
   * @return {object}
   */
  serialize() {
    const obj = {
      caseID: this.#caseID,
      time: this.#timestamp.getTime(),
      type: this.#type || LogEntry.EntryType.Other,
    };
    this.#data && (obj.data = this.#data);
    this.#direction && (obj.dir = this.#direction);
    this.#summary && (obj.summary = this.#summary);
    this.#text && (obj.text = this.#text);
    return obj;
  }

  // Åtkomstmetoder för sammanfattning.
  get summary() {
    return this.#summary;
  }

  set summary(str) {
    this.#summary = str?.trim() ?? '';
  }

  // Åtkomstmetoder för textinnehåll.
  get text() {
    return this.#text;
  }

  set text(str) {
    this.#text = str?.trim() ?? '';
  }

  // Åtkomstmetoder för tidsstämpel.
  get timestamp() {
    return this.#timestamp;
  }

  set timestamp(date) {
    this.#timestamp = new Date(date);
  }

  /**
   * @inheritDoc
   */
  toJSON() {
    const obj = this.serialize();
    delete obj.caseID;
    return obj;
  }

  /**
   * @inheritDoc
   * @override
   */
  toString() {
    return this.timestamp.toLocaleString('sv');
  }

  // Åtkomstmetoder för typ.
  get type() {
    return this.#type;
  }

  set type(type) {
    if (Array.from(Object.values(LogEntry.EntryType)).includes(type)) {
      this.#type = type;
    }
  }

  /**
   * Rekonstruera en ärendeinstans från ett dataobjekt.
   *
   * Används när ett ärende hämtats från databasen och ska omvandlas till ett
   * riktigt ärendeobjekt.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   * @throws {TypeError} Ärendeidentiteten stämmer inte.
   */
  #unserialize(data) {
    if (data.caseID && data.caseID !== this.#caseID) {
      throw new TypeError(
        `Kan inte använda data från ärende '${data.caseID}' för att ` +
          `återskapa en loggnotering i ärende '${this.#caseID}'.`
      );
    }

    this.#data = data.data;
    this.#direction = data.dir ?? '';
    this.#summary = data.summary ?? '';
    this.#text = data.text ?? '';
    this.#type = data.type ?? '';
    data.time && (this.#timestamp = new Date(data.time));
  }
}

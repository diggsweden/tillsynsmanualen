/**
 * Ett krav som ingår i en granskning av ett stickprov.
 *
 * Ett krav är kopplat till ett kravavsnitt i EN 301 549, DOS-lagen eller DIGG:s
 * föreskrifter för DOS. Det innehåller en eller flera kontroller. Om någon av
 * kontrollerna är underkänd är hela kravet underkänt.
 *
 * Krav kan vara villkorsstyrda via konfiguration. Villkoren kan avse plattform
 * (t.ex. operativsystem), urvalskategori, innehållstyper samt formattyper för
 * dokument.
 *
 * Ett krav kan också vara automatiskt godkänt, dvs godkänt utan granskning.
 *
 * @license CC-BY 4.0
 * @see Check
 * @property {boolean}  approvable   Kan godkännas automatiskt?
 * @property {boolean}  approved     Automatiskt godkänt?
 * @property {string[]} categories   Villkor för urvalskategorier.
 * @property {string}   clause       Kravavsnittsnummer.
 * @property {string[]} contentTypes Villkor för innehållstyper.
 * @property {callback} dependencies Funktion för att hämta krav.
 * @property {boolean}  done         Färdiggranskat?
 * @property {string}   externalNote Kommentar till den granskade aktören.
 * @property {boolean}  failed       Underkänt?
 * @property {string[]} formats      Villkor för dokumentformat.
 * @property {boolean}  hasChecks    Populerat med kontroller?
 * @property {string}   id           Kravidentitet i konfigurationen.
 * @property {string}   internalNote Intern anteckning.
 * @property {number}   key          Primärnyckel i databasen.
 * @property {string[]} modes        Villkor för visningslägen.
 * @property {string[]} platforms    Villkor för applikationsplattformar.
 * @property {number}   sampleID     Stickprovsidentitet.
 * @property {boolean}  state        Tillstånd.
 * @property {string}   title        Kravets titel.
 */
export class Requirement {
  // Privata fält.
  #approvable = true;
  #approved = false;
  #categories = new Set();
  #checks = new Map();
  #clause = '';
  #contentTypes = new Set();
  #dependencies;
  #externalNote = '';
  #formats = new Set();
  #id = '';
  #key;
  #internalNote = '';
  #modes = new Set();
  #platforms = new Set();
  #sampleID;
  #title = '';

  /**
   * Konstruera en kravinstans.
   *
   * @param {number} sampleID Stickprovsidentitet.
   * @param {object} [data]   Dataobjekt att rekonstruera ifrån.
   * @throws {TypeError} Granskningsidentitet saknas.
   */
  constructor(sampleID, data = null) {
    if (!sampleID) {
      throw new TypeError('Stickprovsidentitet saknas.');
    }
    this.#sampleID = sampleID;
    data && this.#unserialize(data);
  }

  // Åtkomstmetoder för möjlighet till automatiskt godkännande.
  get approvable() {
    return this.#approvable;
  }

  set approvable(flag) {
    this.#approvable = Boolean(flag);
  }

  // Åtkomstmetoder för automatiskt godkänt.
  get approved() {
    return this.#approvable && this.#approved;
  }

  set approved(flag) {
    this.#approved = Boolean(flag);
  }

  // Åtkomstmetoder för villkor för urvalskategorier.
  get categories() {
    return Array.from(this.#categories);
  }

  set categories(categories) {
    this.#categories = new Set(categories);
  }

  /**
   * Returnera angiven kontroll.
   *
   * @param {string} id Kontrollidentitet.
   * @return {(Check|undefined)}
   */
  check(id) {
    return this.#checks.get(id);
  }

  /**
   * Iterator för kontroller.
   *
   * @yield {Check}
   */
  *checks() {
    yield* this.#checks.values();
  }

  // Åtkomstmetoder för kravavsnittsnummer.
  get clause() {
    return this.#clause;
  }

  set clause(id) {
    this.#clause = id?.trim() ?? '';
  }

  // Åtkomstmetoder för villkor för innehållstyper.
  get contentTypes() {
    return Array.from(this.#contentTypes);
  }

  set contentTypes(types) {
    this.#contentTypes = new Set(types);
  }

  // Åtkomstmetoder för kravhämtningsfunktion.
  get dependencies() {
    return this.#dependencies;
  }

  set dependencies(callback) {
    this.#dependencies = callback;
    for (const check of this.checks()) {
      check.derived && (check.dependencies = this.#dependencies);
    }
  }

  // Åtkomstmetod för klarflagga.
  get done() {
    return this.approved || (this.hasChecks && null != this.state);
  }

  // Åtkomstmetoder för extern anteckning.
  get externalNote() {
    return this.#externalNote;
  }

  set externalNote(text) {
    this.#externalNote = text?.trim() ?? '';
  }

  // Åtkomstmetod för underkännandeflagga.
  get failed() {
    return false === this.state;
  }

  // Åtkomstmetoder för villkor för dokumentformat.
  get formats() {
    return Array.from(this.#formats);
  }

  set formats(formats) {
    this.#formats = new Set(formats);
  }

  // Åtgärdsmetod för kontroll av kontrollpopulering.
  get hasChecks() {
    return this.#checks.size > 0;
  }

  // Åtkomstmetoder för kravidentitet.
  get id() {
    return this.#id;
  }

  set id(id) {
    this.#id = id;
  }

  // Åtkomstmetoder för intern anteckning.
  get internalNote() {
    return this.#internalNote;
  }

  set internalNote(text) {
    this.#internalNote = text?.trim() ?? '';
  }

  // Åtkomst för primärnyckel i databasen.
  get key() {
    return this.#key;
  }

  set key(key) {
    this.#key = key;
  }

  /**
   * Returnera om kravet uppfyller eventuellt villkor för urvalskategori.
   *
   * Jämför det angivna kategorinamnet med eventuella kategorinamn angivna i
   * villkorsstyrningsobjektet.
   *
   * @param {string} category Urvalskategori att testa mot.
   * @return {boolean}
   */
  matchCategory(category) {
    return 0 === this.#categories.size || this.#categories.has(category);
  }

  /**
   * Returnera om kravet uppfyller eventuellt villkor för innehållstyper.
   *
   * Jämför de angivna innehålstyperna med eventuella typer angivna i vill-
   * korsstyrningsobjektet. Om någon typ matchar är villkoret uppfyllt.
   *
   * @param {string[]} types Innehållstyper att testa mot.
   * @return {boolean}
   */
  matchContentType(types) {
    return (
      0 === this.#contentTypes.size ||
      types.some((type) => this.#contentTypes.has(type))
    );
  }

  /**
   * Returnera om kravet uppfyller eventuellt villkor för dokumentformat.
   *
   * Jämför det angivna formatet med eventuella format angivna i villkors-
   * styrningsobjektet.
   *
   * @param {string} format Dokumentformat att testa mot.
   * @return {boolean}
   */
  matchFormat(format) {
    return 0 === this.#formats.size || this.#formats.has(format);
  }

  /**
   * Returnera om kravet uppfyller eventuellt villkor för visningsläge.
   *
   * Jämför det angivna visningsläget med eventuella visningslägen angivna i
   * villkorsstyrningsobjektet.
   *
   * @param {string} mode Visningsläge att testa mot.
   * @return {boolean}
   */
  matchMode(mode) {
    return 0 === this.#modes.size || this.#modes.has(mode);
  }

  /**
   * Returnera om kravet uppfyller eventuellt villkor för plattform.
   *
   * Jämför den angivna plattformen med eventuella applikationsplattformar
   * angivna i villkorsstyrningsobjektet.
   *
   * @param {string} platform Plattform att testa mot.
   * @return {boolean}
   */
  matchPlatform(platform) {
    return 0 === this.#platforms.size || this.#platforms.has(platform);
  }

  // Åtkomstmetoder för villkor för visningslägen.
  get modes() {
    return Array.from(this.#modes);
  }

  set modes(modes) {
    this.#modes = new Set(modes);
  }

  // Åtkomstmetoder för villkor för applikationsplattform.
  get platforms() {
    return Array.from(this.#platforms);
  }

  set platforms(platforms) {
    this.#platforms = new Set(platforms);
  }

  // Åtkomstmetod för stickprovsidentitet.
  get sampleID() {
    return this.#sampleID;
  }

  /**
   * "Serialisera" instansen för lagring i databasen.
   *
   * Generera ett objekt med den information som behövs för att återskapa
   * instansen.
   *
   * Stickprovsidentiteten ingår i ett index för att identifiera krav som hör
   * till ett givet stickprov.
   *
   * Kontrollerna ingår inte i serialiseringen, eftersom de lagras i ett
   * separat objektlager.
   *
   * @return {object}
   */
  serialize() {
    const $A = (a) => Array.from(a);
    const obj = {
      clause: this.#clause,
      id: this.#id,
      sampleID: this.#sampleID,
      title: this.#title,
    };
    this.#approvable || (obj.approvable = false);
    this.#approved && (obj.approved = true);
    this.#categories.size && (obj.cat = $A(this.#categories));
    this.#contentTypes.size && (obj.content = $A(this.#contentTypes));
    this.#externalNote && (obj.extNote = this.#externalNote);
    this.#formats.size && (obj.fmt = $A(this.#formats));
    this.#internalNote && (obj.intNote = this.#internalNote);
    this.#modes.size && (obj.mod = $A(this.#modes));
    this.#platforms.size && (obj.platf = $A(this.#platforms));
    this.#checks.size &&
      (obj.checks = Array.from(this.#checks.values()).map((check) =>
        check.serialize()
      ));
    return obj;
  }

  /**
   * Lägger till en kontroll för kravet.
   *
   * @param {Check} check Kontroll att lägga till.
   * @throws {TypeError} Kontrollidentitet saknas.
   */
  setCheck(check) {
    if (!check.id) throw new TypeError('Kontrollidentitet saknas.');
    this.#checks.set(check.id, check);
    if (check.derived && this.#dependencies) {
      check.dependencies = this.#dependencies;
    }
  }

  // Åtkomstmetod för kravtillstånd.
  get state() {
    if (this.approved) return true;
    if (!this.hasChecks) return;
    let state = true;
    for (const check of this.#checks.values()) {
      if (!check.applicable) continue; // Ignore non-applicable checks.
      if (check.control) continue; // Ignore control checks.
      const s = check.state;
      if (null == s) return;
      state &&= s;
    }
    return state;
  }

  // Åtkomstmetoder för titel.
  get title() {
    return this.#title;
  }

  set title(text) {
    this.#title = text?.trim() ?? '';
  }

  /**
   * @inheritDoc
   */
  toJSON() {
    const obj = this.serialize();
    delete obj.sampleID;
    return obj;
  }

  /**
   * @inheritDoc
   * @override
   */
  toString() {
    return this.#id || 'namnlös';
  }

  /**
   * Rekonstruera en granskningsinstans från ett dataobjekt.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   * @throws {TypeError} Ärendeidentiteten stämmer inte.
   */
  #unserialize(data) {
    this.#validateSource(data);

    this.#clause = data.clause ?? '';
    this.#id = data.id;
    this.#title = data.title ?? '';
    false === data.approvable && (this.#approvable = false);
    data.approved && (this.#approved = true);
    data.cat?.length && (this.#categories = new Set(data.cat));
    data.content?.length && (this.#contentTypes = new Set(data.content));
    data.extNote && (this.#externalNote = data.extNote);
    data.fmt?.length && (this.#formats = new Set(data.fmt));
    data.intNote && (this.#internalNote = data.intNote);
    data.mod?.length && (this.#modes = new Set(data.mod));
    data.platf?.length && (this.#platforms = new Set(data.platf));

    for (const obj of data.checks ?? []) {
      const check = CheckFactory.build(obj);
      this.setCheck(check);
    }
  }

  /**
   * Verifiera att ett dataobjekt avser samma stickprov.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   * @throws {TypeError} Stickprovsidentiteten stämmer inte.
   */
  #validateSource(data) {
    if (data.sampleID && data.sampleID !== this.#sampleID) {
      throw new TypeError(
        `Kan inte använda data från stickprov '${data.sampleID}' för ` +
          `att skapa ett krav i stickprov '${this.#sampleID}'.`
      );
    }
  }
}

// Importera beroenden.
import { CheckFactory } from './check.js';

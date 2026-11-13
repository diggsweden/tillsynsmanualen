/**
 * Granskning med stickprovsurval.
 *
 * En granskning består av ett urval av stickprov (vyer i appar, dokument och
 * webbsidor samt komponenter i appar och webbsidor). Urvalet sker enligt
 * kommissionens genomförandebeslut (EU) 2018/1524 i ett antal kategorier, som
 * är hårdkodade i denna klass av prestandaskäl.
 *
 * Granskaren kan spara färger i granskningen. Varje sparad färg består av ett
 * av granskaren valt namn samt en färgkod på något av de format som stöds av
 * verktygsmodulen för kontrastanalys. Sparade färger ges som inmatningsförslag
 * i verktyget, vilket underlättar vid granskning då de flesta appar och webb-
 * platser använder ett begränsat antal färger.
 *
 * När granskningen skapas räknas den som påbörjad. När alla stickprov är
 * färdiggranskade kan granskaren manuellt avsluta (slutföra) granskningen. Den
 * blir då låst för förändringar och interna granskare kan generera påpekanden
 * och förelägganden från den.
 *
 * Vid omgranskning kan granskaren välja att kopiera en tidigare granskning. Det
 * innebär att stickprovsurvalet kopieras, liksom sparade färger. Dokumenten
 * kopieras förstås inte.
 *
 * Dokumenten (påpekande, föreläggande) består av två datum: det datum då
 * användaren "skapade" dokumentet och det färdigdatum som dokumentet anger för
 * aktörens rättningsåtgärder. (Själva innehållet i dokumenten, inklusive
 * granskningsprotokollt, genereras dynamiskt utifrån granskningen av andra
 * klasser.)
 *
 * @license CC-BY 4.0
 * @property {number}  caseID      Ärendeidentitet.
 * @property {boolean} failed      Slutförd granskning underkänd?
 * @property {date}    finished    Slutdatum.
 * @property {string}  firstSample Första komponent/stickprov.
 * @property {number}  id          Identitet i databasen.
 * @property {date[]}  injunctions Datum för förelägganden.
 * @property {Person}  officer     Granskare.
 * @property {date[]}  remarks     Datum för påpekanden.
 * @property {date}    started     Startdatum.
 * @property {string}  version     Version av mobil applikation.
 */
export class Audit {
  // Publika fält.
  static AuditCategories = Object.freeze([
    'start',
    'relevant',
    'contact',
    'sitemap',
    'legal',
    'help',
    'special',
    'random',
    'login',
    'service',
    'doc',
    'support',
    'feedback',
    'statement',
  ]);

  static SampleCategories = Object.freeze([
    'start',
    'login',
    'sitemap',
    'contact',
    'help',
    'legal',
    'statement',
    'feedback',
    'special',
    'service',
    'relevant',
    'doc',
    'support',
    'random',
  ]);

  // Privata fält.
  #caseID;
  #colours = new Map();
  #failed;
  #finished = null;
  #id;
  #injunctions = [];
  #officer = null;
  #remarks = [];
  #samples = new Map();
  #started = new Date();
  #version;

  /**
   * Konstruera en granskningsinstans.
   *
   * @param {number} caseID Ärendeidentitet.
   * @param {object} [data] Dataobjekt att rekonstruera ifrån.
   * @throws {TypeError} Ärendeidentitet saknas.
   */
  constructor(caseID, data = null) {
    if (!caseID) {
      throw new TypeError('Ärendeidentitet saknas.');
    }
    this.#caseID = caseID;

    data && this.#unserialize(data);
  }

  /**
   * Lägg till datum för föreläggande.
   *
   * Ett föreläggande utgörs av två datum. Det första anger när granskaren
   * skapade föreläggandet, det andra är det åtgärdsdatum då den berörda aktö-
   * ren ska ha åtgärdat bristerna.
   *
   * @param {date} created  Skapandedatum.
   * @param {date} deadline Åtgärdsdatum.
   * @throws {TypeError} Granskningen är inte avslutad.
   */
  addInjunction(created, deadline) {
    if (!this.#finished) {
      throw new TypeError(
        'Kan inte lägga till föreläggande i en ej slutförd granskning.'
      );
    }
    this.#injunctions.push([created, deadline]);
  }

  /**
   * Lägg till datum för påpekande.
   *
   * Ett påpekande utgörs av två datum. Det första anger när granskaren ska-
   * pade påpekandet, det andra är det åtgärdsdatum då den berörda aktören ska
   * ha åtgärdat bristerna.
   *
   * @param {date} created  Skapandedatum.
   * @param {date} deadline Åtgärdsdatum.
   * @throws {TypeError} Granskningen är inte avslutad.
   */
  addRemarks(created, deadline) {
    if (!this.#finished) {
      throw new TypeError(
        'Kan inte lägga till påpekande i en ej slutförd granskning.'
      );
    }
    this.#remarks.push([created, deadline]);
  }

  /**
   * Itererar över samtliga stickprov i granskningen.
   *
   * @see samples
   * @yield {Sample}
   */
  *allSamples() {
    yield* this.#samples.values();
  }

  /**
   * Returnera antalet färdiggranskade stickprov och totalt antal stickprov.
   *
   * @param {boolean} [components] Inkludera komponenter?
   * @return {number[]} Antal klara och totalt antal stickprov.
   */
  auditProgress(components = true) {
    const total = Array.from(this.#samples.values()).filter(
      (sample) => components || 'component' !== sample.category
    );
    const done = total.filter((sample) => sample.done);
    return [done.length, total.length];
  }

  // Åtkomstmetod för ärendeidentitet.
  get caseID() {
    return this.#caseID;
  }

  /**
   * Iterator för sparade färger.
   *
   * @yield {string[]} Vektor med två element: färgvärde och namn.
   */
  *colours() {
    for (const colour of this.#colours) {
      yield colour;
    }
  }

  /**
   * Iterator för komponenter.
   *
   * @yield {Component}
   */
  *components() {
    for (const sample of this.#samples.values()) {
      if (sample instanceof Component) yield sample;
    }
  }

  /**
   * Returnera om granskningen innehåller ett stickprov med angivet namn.
   *
   * @param {string} name Namn att söka efter.
   * @return {boolean}
   */
  contains(name) {
    return undefined !== this.#findByName(name);
  }

  /**
   * Returnera antalet tillagda stickprov i angiven kategori.
   *
   * @param {string} category Kategorinamn.
   * @return {number}
   */
  count(category) {
    let count = 0;
    for (const sample of this.#samples.values()) {
      category === sample.category && ++count;
    }
    return count;
  }

  /**
   * Returnera antalet färdiggranskade stickprov av angivna typer.
   *
   * @param {class} ...classes Stickprovsklasser att räkna.
   * @return {number}
   */
  countDone(...classes) {
    let count = 0;
    const match = (sample) => classes.some((c) => sample instanceof c);
    for (const sample of this.#samples.values()) {
      match(sample) && sample.done && ++count;
    }
    return count;
  }

  /**
   * Returnera antalet ingående stickprov av angiven typ.
   *
   * @param {class} cls       Stickprovsklass att räkna.
   * @param {string} [parent] Stickprovstyp (för komponenter).
   * @return {number}
   */
  countType(cls, parent = null) {
    let count = 0;
    const match = (s) => !parent || parent === s.parentType;
    for (const sample of this.#samples.values()) {
      sample instanceof cls && match(sample) && ++count;
    }
    return count;
  }

  /**
   * Radera den sparade färgen med angivet värde.
   *
   * @param {string} value Färgvärde.
   * @return {booelan} `true` om en färg raderades, annars `false`.
   */
  deleteColour(value) {
    return this.#colours.delete(value);
  }

  /**
   * Radera ett föreläggande.
   *
   * Radera föreläggandet med angivet skapandedatum, om det finns.
   *
   * @param {date} created Skapandedatum.
   */
  deleteInjunction(created) {
    const match = ([d]) => d.getTime() === time;
    const time = created.getTime();
    const index = this.#injunctions.findIndex(match);
    index >= 0 && this.#injunctions.splice(index, 1);
  }

  /**
   * Radera ett påpekande.
   *
   * Radera påkpekandet med angivet skapandedatum, om det finns.
   *
   * @param {date} created Skapandedatum.
   */
  deleteRemarks(created) {
    const match = ([d]) => d.getTime() === time;
    const time = created.getTime();
    const index = this.#remarks.findIndex(match);
    index >= 0 && this.#remarks.splice(index, 1);
  }

  /**
   * Ta bort stickprovet med angiven identitet.
   *
   * Om stickprovet är en komponent, ta bort referenser till den från andra
   * stickprov i granskningen.
   *
   * @param {number} id Stickprovets identitet i databasen.
   * @return {booelan} `true` om ett stickprov raderades, annars `false`.
   */
  deleteSample(id) {
    const sample = this.#samples.get(id);
    if (sample instanceof Component) {
      this.#deleteComponentFromSamples(sample);
    }
    return this.#samples.delete(id);
  }

  /**
   * Iterator för färdiggranskade stickprovsurval av angiven typ.
   *
   * Genererar stickprov i kategoriordning.
   *
   * @param {class} sammpleClass Stickprovsklass.
   * @yield {Sample}
   */
  *doneSamples(sampleClass) {
    const comp = (c) => ('statementApp' === c ? 'statement' : c);
    for (const category of Audit.AuditCategories) {
      for (const sample of this.#samples.values()) {
        if (category !== comp(sample.category)) continue;
        if (sample instanceof sampleClass && sample.done) {
          yield sample;
        }
      }
    }
  }

  // Åtkomstmetod för underkännandeflaggan.
  get failed() {
    return this.#failed;
  }

  /**
   * Returnera antalet underkända stickprov per krav.
   *
   * Hämta information om underkända krav från varje färdiggranskat stickprov
   * och sammanställ den.
   *
   * Inkludera ingående komponenteri de mnatchande stickproven.
   *
   * Returnera ett objekt där nycklarna är de underkända kravavsnittsnumren
   * och värdena är antalet underkända stickprov för varje krav.
   *
   * @param {class} ...classes Stickprovsklasser att inkludera.
   * @return {object} Antal underkända stickprov per kravavsnitt.
   */
  failures(...classes) {
    const hits = {};
    const match = (sample) => classes.some((c) => sample instanceof c);

    for (const sample of this.#samples.values()) {
      if (!match(sample) || !sample.done) continue;

      // Ingående komponenter.
      const components = sample.components ?? [];
      if (!components.every((c) => c.done)) continue;
      const fails = new Set();
      components.forEach((c) => c.failures(fails));

      sample.failures(fails);

      for (const id of fails) {
        hits[id] ??= 0;
        ++hits[id];
      }
    }
    return hits;
  }

  /**
   * Slutför granskningen.
   *
   * Sätt sluttidpunkt till aktuellt datum och klockslag.
   * Radera tomma kategorier.
   * Sätt underkännandeflaggan.
   *
   * @throws {TypeError} Granskningen är redan slutförd.
   */
  finish() {
    if (this.#finished) {
      throw new TypeError(
        'Kan inte avsluta en granskning som redan är avslutad.'
      );
    }

    this.#finished = new Date();

    this.#failed = false;
    for (const sample of this.#samples.values()) {
      this.#failed ||= sample.failed;
      if (this.#failed) break;
    }
  }

  // Åtkomstmetod för sluttidpunkt.
  get finished() {
    return this.#finished;
  }

  // Åtkomstmetod för första komponent/stickprov.
  get firstSample() {
    const comp = (c) => ('statementApp' === c ? 'statement' : c);
    for (const category of ['component'].concat(Audit.AuditCategories)) {
      for (const sample of this.#samples.values()) {
        if (category === comp(sample.category)) return sample;
      }
    }
  }

  /**
   * Returnera stickprovet med angivet namn.
   *
   * @see #findByName()
   * @param {string} name Stickprovsnamn.
   * @return {(Sample|undefined)}
   */
  getSampleByName(name) {
    return this.#findByName(name);
  }

  /**
   * Returnera om granskningen innehåller en sparad färgkod.
   *
   * @param {string} value Färgvärde.
   * @return {boolean}
   */
  hasColour(value) {
    return this.#colours.has(value);
  }

  // Åtkomstmetoder för identitet i databasen.
  get id() {
    return this.#id;
  }

  set id(id) {
    this.#id = id;
  }

  // Åtkomstmetod för föreläggandedatum.
  get injunctions() {
    const copy = (date) => new Date(date);
    const map = ([created, deadline]) => [copy(created), copy(deadline)];
    return this.#injunctions.map(map);
  }

  /**
   * Returnera nästa kategori.
   *
   * Om en referenskategori är angiven, returnera nästföljande kategori.
   * Om ingen referenskategori är angiven, returnera kategorin efter den sista
   * kategorin som innehåller ett urval.
   * Om sista kategorin innehåller ett urval, returnera den första kategorin
   * som  är tom.
   *
   * @param {string} [ref] Referenskategori.
   * @return {(string|undefined)}
   */
  nextCategory(ref) {
    const categories = Audit.SampleCategories;
    if (ref) {
      const index = categories.indexOf(ref);
      return categories[index + 1];
    }

    let first;
    let last = -1;
    const samples = Array.from(this.#samples.values());
    for (const [index, category] of categories.entries()) {
      if (samples.find((sample) => category === sample.category)) {
        last = index;
      } else {
        first ??= index;
      }
    }
    return categories[last + 1 in categories ? last + 1 : first];
  }

  /**
   * Returnera nästa stickprov att granska.
   *
   * Sök det första stickprovet som inte är färdiggranskat.
   *
   * @return {(Sample|undefined)}
   */
  nextSample() {
    const categories = ['component'].concat(Audit.AuditCategories);
    for (const category of categories) {
      for (const sample of this.samples(category)) {
        if (!sample.done) return sample;
      }
    }
  }

  /**
   * Returnera återanvändbara observationer.
   *
   * Hämta alla observationer från samma underkända kontroll i stickprov av
   * samma typ.
   *
   * @param {Sample} current Aktuellt stickprov.
   * @param {string} reqID   Kravidentitet.
   * @param {string} chkID   Kontrollidentitet.
   */
  observations(current, reqID, chkID) {
    if ('component' === current.type) return [];
    const result = new Set();
    for (const sample of this.#samples.values()) {
      if (sample.id === current.id) continue;
      if (sample.type !== current.type) continue;
      const req = sample.requirement(reqID);
      const chk = req?.check(chkID);
      chk?.failed && result.add(chk.observation);
    }
    return [...result.values()];
  }

  // Åtkomstmetoder för granskare.
  get officer() {
    return this.#officer;
  }

  set officer(person) {
    this.#officer = person;
  }

  /**
   * Returnera föregående kategori.
   *
   * @param {string} ref Referenskategori.
   * @return {(string|undefined)}
   */
  previousCategory(ref) {
    const categories = Audit.SampleCategories;
    const index = categories.indexOf(ref);
    return categories[index - 1];
  }

  /**
   * Returnera återstående slumpurvalsstorlek.
   *
   * Det slumpmässiga urvalet ska uppgå till minst 10 procent av det övriga
   * urvalet. Komponenter ska inte räknas som egna stickprov.
   *
   * @return {number}
   */
  randomCount() {
    const samples = Array.from(this.#samples.values());
    const comp = samples.filter((s) => 'component' === s.category);
    const random = samples.filter((s) => 'random' === s.category).length;
    const other = samples.length - comp.length - random;
    return Math.max(0, Math.ceil(other * 0.1) - random);
  }

  // Åtkomstmetod för påpekandedatum.
  get remarks() {
    const copy = (date) => new Date(date);
    const map = ([created, deadline]) => [copy(created), copy(deadline)];
    return this.#remarks.map(map);
  }

  /**
   * Lås upp en slutförd granskning.
   *
   * @throws {TypeError} Granskningen är inte slutförd.
   */
  reopen() {
    if (!this.#finished) {
      throw new TypeError('Granskningen är inte slutförd.');
    }
    this.#finished = null;
  }

  /**
   * Returnera stickprovet med angiven identitet.
   *
   * @param {number} id Stickprovsindetitet.
   * @return {(Sample|undefined)}
   */
  sample(id) {
    return this.#samples.get(id);
  }

  /**
   * Returnera antalet kategorier med urval och totalt antal kategorier.
   *
   * Komponenter ska inte räknas in i urvalet, eftersom de inte ingår i
   * (EU) 2018/1524.
   *
   * @return {number[]} Antal kategorier med urval och totalt antal kategorier.
   */
  sampleProgress() {
    const categories = new Set();
    for (const sample of this.#samples.values()) {
      if (sample instanceof Component) continue;
      categories.add(sample.category);
    }
    return [categories.size, Audit.SampleCategories.length];
  }

  /**
   * Iterator för stickprov i angiven urvalskategori.
   *
   * Ordna stickproven i alfabetisk ordning. Ta även hänsyn till angiven
   * ordningsföljd för steg i en process.
   *
   * @see allSamples
   * @param {string} category Urvalskategori.
   * @yield {Sample}
   * @throws {TypeError} Ingen kategori angiven.
   */
  *samples(category) {
    if (!category) throw new TypeError('Ange urvalskategori.');
    const comp = (c) => ('statementApp' === c ? 'statement' : c);
    const next = (p) => samples.find((s) => p.name === s.follows);
    const options = { sensitivity: 'accent' };
    const samples = Array.from(this.#samples.values()) ?? [];
    const ordered = samples
      .filter((s) => category === comp(s.category) && !s.follows)
      .sort(({ name: a }, { name: b }) => a.localeCompare(b, 'sv', options));

    for (const sample of ordered) {
      yield sample;
      for (let n = next(sample); n; n = next(n)) {
        yield n;
      }
    }
  }

  /**
   * "Serialisera" instansen för lagring i databasen.
   *
   * Generera ett objekt med den information som behövs för att återskapa
   * instansen.
   *
   * Ärendeidentiteten ingår i ett index för att identifiera granskningar som
   * hör till ett givet ärende.
   *
   * Stickproven ingår inte i serialiseringen, eftersom de lagras i ett
   * separat objektlager.
   *
   * @return {object}
   */
  serialize() {
    const dates = ([c, d]) => [c.getTime(), d.getTime()];
    const obj = {
      caseID: this.#caseID,
      officer: this.officer.serialize(),
      started: this.#started.getTime(),
    };
    this.#colours.size > 0 && (obj.colours = Array.from(this.#colours));
    undefined !== this.#failed && (obj.failed = this.#failed);
    this.#finished && (obj.finished = this.#finished.getTime());
    this.#version && (obj.version = this.#version);
    this.#injunctions.length &&
      (obj.injunctions = this.#injunctions.map(dates));
    this.#remarks.length && (obj.remarks = this.#remarks.map(dates));
    return obj;
  }

  /**
   * Spara ett färgvärde.
   *
   * @param {string} name  Namn.
   * @param {string} value Färgvärde.
   */
  setColour(name, value) {
    this.#colours.set(value, name);
  }

  /**
   * Lägg till ett stickprov.
   *
   * Realisera eventuella ingående komponenter i stickprovet.
   *
   * @param {Sample} sample Urval att lägga till.
   * @throws {TypeError} Argumentet saknar id eller kategori.
   * @throws {DuplicateNameError} Ett stickprov med samma namn finns redan.
   */
  setSample(sample) {
    if (!sample.id) {
      throw new TypeError('Kan inte lägga till stickprov utan id.');
    } else if (!sample.category) {
      throw new TypeError('Kan inte lägga till stickprov utan kategori.');
    }
    const namesake = this.#findByName(sample.name);
    if (namesake && namesake.id !== sample.id) {
      throw new DuplicateNameError(sample.name);
    }
    this.#samples.set(sample.id, sample);

    for (const { id } of sample.pending ?? []) {
      const component = this.sample(id);
      if (!component) {
        throw new TypeError(`Komponent '${id}' finns inte i granskningen.`);
      }
      sample.addComponent(component);
    }
  }

  // Åtkomstmetoder för starttidpunkt.
  get started() {
    return this.#started;
  }

  set started(date) {
    this.#started = date ? new Date(date) : null;
  }

  /**
   * @inheritDoc
   */
  toJSON() {
    const obj = this.serialize();
    delete obj.caseID;
    this.#samples.size &&
      (obj.samples = Array.from(this.#samples.values()).map((sample) =>
        sample.toJSON()
      ));
    return obj;
  }

  /**
   * @inheritDoc
   * @override
   */
  toString() {
    const date = (d) => d.toLocaleDateString('sv');
    let str = date(this.#started);
    this.#finished && (str += `–${date(this.#finished)}`);
    return str;
  }

  /**
   * Returnera antalet stickprov som innehåller angiven komponent.
   *
   * @param {number} component Komponentidentitet.
   * @return {number}
   */
  useCount(component) {
    let count = 0;
    for (const sample of this.#samples.values()) {
      sample.hasComponent?.(component) && ++count;
    }
    return count;
  }

  // Åtkomstmetoder för version av mobil applikation.
  get version() {
    return this.#version;
  }

  set version(label) {
    this.#version = label?.trim() ?? '';
  }

  /**
   * Ta bort en komponent ur alla stickprov den ingår i.
   *
   * @private
   * @param {Component} component Komponent att tar bort.
   */
  #deleteComponentFromSamples(component) {
    for (const sample of this.#samples.values()) {
      if (sample instanceof Component) continue;
      sample.deleteComponent?.(component.id);
    }
  }

  /**
   * Sök ett stickprov med angivet namn.
   *
   * @param {string} name Namn att söka efter.
   * @return {(Sample|undefined)}
   */
  #findByName(name) {
    for (const sample of this.#samples.values()) {
      if (name === sample.name) return sample;
    }
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

    const date = (d) => (d ? new Date(d) : d);
    const dates = (a) => (a ?? []).map(([c, d]) => [date(c), date(d)]);

    this.#colours = new Map(data.colours ?? []);
    this.#failed = data.failed;
    this.#finished = date(data.finished ?? null);
    this.#injunctions = dates(data.injunctions);
    this.#remarks = dates(data.remarks);
    this.#version = data.version;
    data.officer && (this.#officer = new Person(data.officer));
    data.started && (this.#started = new Date(data.started));
  }

  /**
   * Verifiera att ett dataobjekt avser samma ärende.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   * @throws {TypeError} Ärendeidentiteten stämmer inte.
   */
  #validateSource(data) {
    if (data.caseID && data.caseID !== this.#caseID) {
      throw new TypeError(
        `Kan inte använda data från ärende '${data.caseID}' för att ` +
          `skapa en granskning i ärende '${this.#caseID}'.`
      );
    }
  }
}

/**
 * Undantagsklass för dubblettnamn.
 *
 * Kastas vid försök att lägga till flera komponenter eller stickprov med samma
 * namn.
 *
 * @license CC-BY 4.0
 * @see Error
 */
export class DuplicateNameError extends Error {
  /**
   * Konstruera en undantagsinstans.
   *
   * @param {string} name Dubblettnamn.
   */
  constructor(name) {
    super(`Granskningen innehåller redan ett stickprov med namnet "${name}".`);
    this.name = this.constructor.name;
    this.stack = new Error(this.message).stack;
  }
}

// Importera beroenden.
import { Component } from './sample.js';
import { Person } from './Person.js';

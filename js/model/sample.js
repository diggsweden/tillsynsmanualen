/**
 * Basklass för stickprovsurval.
 *
 * Ett stickprov utgör en sammanhållen enhet vid granskning. Det kan vara en
 * skrämbild i en mobil applikation, ett dokument eller en webbsida. Det kan
 * också vara en avgränsad komponent som ingår i flera vyer eller webbsidor och
 * granskas separat.
 *
 * Till ett stickprov kopplas ett antal krav. Varje krav motsvarar ett krav-
 * avsnitt i EN 301 549 eller i DOS-lagen eller DIGG:s föreskrifter om DOS.
 *
 * Vid urvalet av stickprov som ska ingå i en granskning anger granskaren vilka
 * typer av innehåll som finns i stickprovet. Vilka krav som ska ingå i en
 * granskning kan villkorsstyras på urvalskategori, dokumentformat och ingående
 * innehållstyper. Dessutom skiljer hela kravuppsättningen beroende på typ av
 * stickprov.
 *
 * Fältet `follows` används för att ange en bestämd granskningsordning mellan
 * två eller flera stickprov; vanligen sådana som utgör steg i en process.
 *
 * Fältet `done` beräknas normalt utifrån status på de ingående kraven, men kan
 * också sättas manuellt för att möjliggöra partiell granskning.
 *
 * @license CC-BY 4.0
 * @property {nunmber}  auditID          Granskningsidentitet.
 * @property {string}   category         Urvalskategori.
 * @property {string[]} contentTypes     Identiteter för innehållstyper.
 * @property {boolean}  done             Färdiggranskat?
 * @property {boolean}  failed           Underkänt?
 * @property {string}   follows          Föregående stickprovsnamn i en process.
 * @property {boolean}  hasExternalNotes Har krav med externa anteckningar?
 * @property {boolean}  hasRequirements  Populerad med krav?
 * @property {number}   id               Identitet i databasen.
 * @property {string}   mode             Applikationens visningsläge.
 * @property {string}   name             Namn eller titel.
 * @property {string}   note             Anteckning vid urvalet.
 * @property {boolean}  partial          Partiell granskning?
 * @property {string}   service          Typ av tjänst som erbjuds.
 * @property {boolean}  started          Påbörjat?
 * @property {string}   type             Identifierare för stickprovstyp.
 */
class Sample {
  // Privata fält.
  #auditID;
  #category;
  #contentTypes = new Set();
  #follows;
  #id;
  #mode = 'simplified';
  #name = '';
  #note = '';
  #partial = false;
  #requirements = new Map();
  #service = '';

  /**
   * Konstruera en stickprovsinstans.
   *
   * @param {number}          auditID Granskningsidentitet.
   * @param {(string|object)} arg     Urvalskategori eller dataobjekt.
   * @throws {TypeError} Granskningsidentitet eller urvalskategori saknas.
   */
  constructor(auditID, arg) {
    if (!auditID) {
      throw new TypeError('Granskningsidentitet saknas.');
    }
    this.#auditID = auditID;

    if ('string' === typeof arg) {
      this.#category = arg;
    } else if (arg instanceof Sample) {
      this.#copy(arg);
    } else if (arg) {
      this.#unserialize(arg);
    } else {
      throw new TypeError('Urvalskategori saknas.');
    }
  }

  /**
   * Lägg till en innehållstyp.
   *
   * @param {string} type Innehålstypsidentitet att lägga till.
   * @throws {TypeError} Innehållstypsidentitet saknas.
   */
  addContentType(type) {
    if (!type) {
      throw new TypeError('Innehållstypsidentitet saknas.');
    }
    this.#contentTypes.add(type);
  }

  // Åtkomstmetod för granskningsidentitet.
  get auditID() {
    return this.#auditID;
  }

  // Åtkomstmetoder för urvalskategori.
  get category() {
    return this.#category;
  }

  set category(name) {
    this.#category = name;
  }

  /**
   * Returnera om stickprovet innehåller någon av de angivna innehållstyperna.
   *
   * @param {string} ...types Innehållstyper att leta efter.
   * @return {boolean}
   */
  contains(...types) {
    return types.some((type) => this.#contentTypes.has(type));
  }

  // Åtkomstmetod för innehållstyper.
  get contentTypes() {
    return Array.from(this.#contentTypes).sort();
  }

  /**
   * Ta bort angiven innehållstyp.
   *
   * @param {string} type Innehållstypsidentitet att ta bort.
   * @return {boolean} `true` om en innehållstyp togs bort, annars `false`.
   */
  deleteContentType(type) {
    return this.#contentTypes.delete(type);
  }

  // åtkomstmetod för klarflagga.
  get done() {
    if (this.#partial) return true;
    let done = this.#requirements.size > 0;
    for (const requirement of this.#requirements.values()) {
      if (!this._includes(requirement)) continue;
      done &&= requirement.done;
    }
    return done;
  }

  // åtkomstmetod för underkännandeflagga.
  get failed() {
    let failed = false;
    for (const requirement of this.#requirements.values()) {
      failed ||= requirement.failed;
    }
    return failed;
  }

  /**
   * Returnera underkända kravavsnittsnummer.
   *
   * @param {Set} fails Mängden av underkända kriterienummer att populera.
   * @return {Set}
   */
  failures(fails) {
    for (const req of this.#requirements.values()) {
      if (this._includes(req) && req.failed) {
        fails.add(req.clause);
      }
    }
  }

  // Åtkomstmetoder för föregående stickprovsnamn i en process.
  get follows() {
    return this.#follows;
  }

  set follows(name) {
    this.#follows = name;
  }

  // Åtkomstmetod för kontroll av krav med externa anteckningar.
  get hasExternalNotes() {
    for (const req of this.#requirements.values()) {
      if (req.externalNote) return true;
    }
    return false;
  }

  // Åtkomstmetod för kontroll av kravpopulering.
  get hasRequirements() {
    return this.#requirements.size > 0;
  }

  // Åtkomstmetoder för identitet i databasen.
  get id() {
    return this.#id;
  }

  set id(id) {
    this.#id = id;
  }

  // Åtkomstmetoder för visningsläge.
  get mode() {
    return this.#mode;
  }

  set mode(mode) {
    this.#mode = mode;
  }

  // Åtkomstmetoder för namn/titel.
  get name() {
    return this.#name;
  }

  set name(text) {
    this.#name = text?.trim() ?? '';
  }

  /**
   * Returnera nästa krav att granska.
   *
   * @return {(Requirement|undefined)}
   */
  nextRequirement() {
    for (const req of this.#requirements.values()) {
      if (this._includes(req) && !req.done) return req;
    }
  }

  // Åtkomstmetod för anteckning.
  get note() {
    return this.#note;
  }

  set note(text) {
    this.#note = text?.trim() ?? '';
  }

  // Åtkomstmetoder för partialgranskningsflagga.
  get partial() {
    return this.#partial;
  }

  set partial(flag) {
    this.#partial = Boolean(flag);
  }

  /**
   * Returnera antalet granskade krav och totalt antal krav.
   *
   * @return {number[]} Antal granskade krav och totalt antal krav.
   */
  progress() {
    let done = 0;
    let total = 0;
    for (const req of this.#requirements.values()) {
      const inc = this._includes(req);
      inc && ++total;
      inc && req.done && ++done;
    }
    return [done, total];
  }

  /**
   * Returnera kravet med angiven identitet, om det ska ingå i granskningen.
   *
   * @param {string} id Kravidentitet.
   * @return {(Requirement|null)}
   */
  requirement(id) {
    const req = this.#requirements.get(id);
    return req && this._includes(req) ? req : null;
  }

  /**
   * Iterator för krav.
   *
   * @param {boolean} [all] Utan filter?
   * @yield {Requirement}
   */
  *requirements(all = false) {
    for (const req of this.#requirements.values()) {
      if (all || this._includes(req)) yield req;
    }
  }

  /**
   * "Serialisera" instansen för lagring i databasen.
   *
   * Generera ett objekt med den information som behövs för att återskapa
   * instansen.
   *
   * Granskningsidentiteten ingår i ett index för att identifiera stickprov
   * som hör till en given granskning.
   *
   * Kraven ingår inte i serialiseringen, eftersom de lagras i ett separat
   * objektlager.
   *
   * @return {object}
   */
  serialize() {
    const obj = {
      auditID: this.#auditID,
      category: this.#category,
      class: this.constructor.name,
      name: this.name,
    };
    this.#contentTypes.size && (obj.content = Array.from(this.#contentTypes));
    this.#follows && (obj.follows = this.#follows);
    this.#note && (obj.note = this.#note);
    this.#partial && (obj.partial = true);
    this.#service && (obj.service = this.#service);
    return obj;
  }

  // Åtkomstmetoder för typ av tjänst som erbjuds.
  get service() {
    return this.#service;
  }

  set service(type) {
    this.#service = type?.trim() ?? '';
  }

  /**
   * Lägger till ett krav till stickprovet.
   *
   * @param {Requirement} requirement Krav att lägga till.
   * @throws {TypeError} Kravidentitet saknas.
   */
  setRequirement(requirement) {
    requirement.dependencies = (id, c) => this._dependencies(id, c);
    if (!requirement.id) {
      throw new TypeError('Kravidentitet saknas.');
    }
    this.#requirements.set(requirement.id, requirement);
  }

  // åtkomstmetod för påbörjatflagga.
  get started() {
    if (this.#partial) return true;
    for (const req of this.#requirements.values()) {
      if (this._includes(req) && req.hasChecks) return true;
    }
    return false;
  }

  /**
   * @inheritDoc
   * @override
   */
  toJSON() {
    const obj = this.serialize();
    delete obj.auditID;
    this.#requirements.size &&
      (obj.req = Array.from(this.#requirements.values()).map((req) =>
        req.toJSON()
      ));
    return obj;
  }

  /**
   * @inheritDoc
   * @override
   */
  toString() {
    return this.#name || 'namnlös';
  }

  /**
   * Hämta kravet med angiven identitet.
   *
   * Returnerar en vektor med ett element, för att kunna utökas till att ge
   * fler svar i härledda klasser.
   *
   * @private
   * @param {string} id Kravidentitet.
   * @return {Requirement[]}
   */
  _dependencies(id) {
    const results = [];
    const req = this.requirement(id);
    req && results.push(req);
    return results;
  }

  /**
   * Avgör om ett krav ska ingå i granskningen av stickprovet.
   *
   * Ett stickprov populeras med alla krav i den stickprovstypsspecifika
   * konfigurationen. Den här metoden används för att filtrera vilkea krav som
   * är tillämpliga just nu, beroende på eventuella villkor.
   *
   * @protected
   * @param {Requirement} requirement Krav att bedöma.
   * @return {boolean}
   */
  _includes(requirement) {
    return (
      requirement.matchCategory(this.#category) &&
      requirement.matchContentType(Array.from(this.#contentTypes)) &&
      requirement.matchMode(this.#mode)
    );
  }

  /**
   * Kopiera en befintlig stickprovsinstans.
   *
   * Använd rekonstruktionsmetoden för att kopiera det mesta.
   * Kopiera innehållstyper, som har ett kortare fältnamn i dataobjekt.
   * Lägg sedan till stickprovets identitet i databsen.
   *
   * @private
   * @param {Sample} source Stickprov att kopiera.
   * @throws {TypeError} Granskningsidentiteten stämmer inte.
   */
  #copy(source) {
    this.#unserialize(source);
    this.#contentTypes = new Set(source.#contentTypes);
    this.#id = source.#id;
  }

  /**
   * Rekonstruera en stickprovsinstans från ett dataobjekt.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   * @throws {TypeError} Granskningsidentiteten stämmer inte.
   */
  #unserialize(data) {
    this.#validateSource(data);

    this.#category = data.category;
    this.#name = data.name;
    data.content && (this.#contentTypes = new Set(data.content));
    data.follows && (this.#follows = data.follows);
    data.note && (this.#note = data.note);
    data.partial && (this.#partial = true);
    data.service && (this.#service = data.service);
  }

  /**
   * Verifiera att ett dataobjekt avser samma granskning..
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   * @throws {TypeError} Granskningsidentiteten stämmer inte.
   */
  #validateSource(data) {
    if (data.auditID && data.auditID !== this.#auditID) {
      throw new TypeError(
        `Kan inte använda data från granskning ${data.auditID} för att ` +
          `skapa ett stickprov i granskning ${this.#auditID}.`
      );
    }
  }
}

/**
 * Basklass för sammansatta stickprov som kan innehålla komponenter.
 *
 * En ny instans kan innehålla antingen identiteter (vid hämtning från databas)
 * eller namn (vid inläsning från fil) på ingående komponenter. Dessa returneras
 * av fältet `pending` i form av en vektor med objekt med nyckeln `id` eller
 * `name`. När en komponent "realiseras" (läggs till med `addComponent()`) tas
 * identiteten eller namnet bort från väntelistan.
 *
 * @license CC-BY 4.0
 * @property {Component[]} components    Tillagda komponenter.
 * @property {boolean}     isComposite   Alltid `true`.
 * @property {number}      numComponents Antal komponenter.
 * @property {object[]}    pending       Lista med orealiserade komponenter.
 */
class CompositeSample extends Sample {
  // Privata fält.
  #components = new Map();
  #pending = new Set();

  /**
   * Konstruera en stickprovsinstans.
   *
   * @param {number}          auditID Granskningsidentitet.
   * @param {(string|object)} arg     Urvalskategori eller dataobjekt.
   * @throws {TypeError} Granskningsidentitet eller urvalskategori saknas.
   */
  constructor(auditID, arg) {
    super(auditID, arg);
    arg && 'string' !== typeof arg && this.#unserialize(arg);
  }

  /**
   * Lägger till en komponent.
   *
   * Ta bort identiteten eller namnet från väntelistan.
   *
   * Väntelistan kan innehålla komponenter av fel typ om stickprovet skapats
   * som en kopia av ett annat sammansatt stickprov av en annan klass. Kopiera
   * bara komponenter av rätt typ.
   *
   * @param {string} component Komponent att lägga till.
   * @throws {TypeError} Komponenten saknar identitet.
   */
  addComponent(component) {
    if (!component.id) {
      throw new TypeError('Komponentidentitet saknas');
    }
    if (component.parentType === this.type) {
      this.#components.set(component.id, component);
    }
    const remove = (k) => this.#pending.has(k) && this.#pending.delete(k);
    remove(component.id) || remove(component.name);
  }

  /**
   * Ta bort alla ej realiserade komponenter.
   */
  clearPending() {
    this.#pending.clear();
  }

  // Åtkomstmetod för tillagda komponenter.
  get components() {
    return Array.from(this.#components.values());
  }

  /**
   * Ta bort angiven komponent.
   *
   * @param {number} id Komponentidentitet att ta bort.
   * @return {boolean} `true` om en komponent tagits bort, annars `false`.
   */
  deleteComponent(id) {
    return this.#components.delete(id) || this.#pending.delete(id);
  }

  /**
   * Ingår angiven komponent?
   *
   * @param {number} id Sökt komponentidentitet.
   * @return {boolean}
   */
  hasComponent(id) {
    return this.#components.has(id) || this.#pending.has(id);
  }

  // Åtkomstmetod för flagga för sammansatt stickprov.
  get isComposite() {
    return true;
  }

  // Åtkomstmetod för antal komponenter.
  get numComponents() {
    return this.#components.size + this.#pending.size;
  }

  // Åtkomstmetod för ej realiserade komponenter.
  get pending() {
    const map = (c) => ({ ['number' === typeof c ? 'id' : 'name']: c });
    return Array.from(this.#pending.values()).map(map);
  }

  /**
   * @inheritDoc
   */
  serialize() {
    const obj = super.serialize();
    const comp = [...this.#components.keys()].concat([
      ...this.#pending.values(),
    ]);
    comp.length && (obj.components = comp);
    return obj;
  }

  /**
   * @inheritDoc
   */
  toJSON() {
    const pending = Array.from(this.#pending.values());
    if ('number' === typeof pending[0]) {
      throw new TypeError(
        'Kan inte spara stickprov med orealiserade komponenter.'
      );
    }
    const obj = super.toJSON();
    this.#components.size &&
      (obj.components = Array.from(this.#components.values()));
    const comp = Array.from(this.#components.values())
      .map((c) => c.name)
      .concat(pending);
    comp.length && (obj.components = comp);
    return obj;
  }

  /**
   * @inheritDoc
   */
  _dependencies(id, includeComponents) {
    if (this.#pending.size) {
      throw new TypeError('Stickprovet har orealiserade komponenter.');
    }
    const results = [];
    if (includeComponents) {
      for (const component of this.#components.values()) {
        const req = component.requirement(id);
        req && results.push(req);
      }
    }
    return results.concat(super._dependencies(id));
  }

  /**
   * Rekonstruera en sammansatt stickprovsinstans från ett dataobjekt.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   */
  #unserialize(data) {
    if (this.type === (data.type ?? this.type)) {
      this.#pending = new Set(data.components ?? []);
    }
  }
}

/**
 * En vy i en mobil applikation.
 *
 * @license CC-BY 4.0
 * @see CompositeSample
 * @property {boolean} closed   Stängd funktionalitet för skärmläsare?
 * @property {string}  platform Plattform (t.ex. operativsystem).
 * @property {string}  type     Identifierare för stickprovstyp.
 */
export class AppScreen extends CompositeSample {
  // Privata fält.
  #closed = false;
  #platform;

  /**
   * Konstruera en komponentinstans.
   *
   * @param {number}          auditID Granskningsidentitet.
   * @param {(string|object)} arg     Urvalskategori eller dataobjekt.
   * @throws {TypeError} Granskningsidentitet eller urvalskategori saknas.
   */
  constructor(auditID, arg) {
    super(auditID, arg);
    arg && 'string' !== typeof arg && this.#unserialize(arg);
  }

  // Åtkomstmetoder för stängd funktionalitet.
  get closed() {
    return this.#closed;
  }

  set closed(flag) {
    this.#closed = Boolean(flag);
  }

  // Åtkomstmetoder för plattform.
  get platform() {
    return this.#platform;
  }

  set platform(value) {
    this.#platform = String(value).toLowerCase();
  }

  /**
   * @inheritDoc
   */
  serialize() {
    const obj = super.serialize();
    this.#closed && (obj.closed = true);
    this.#platform && (obj.platform = this.#platform);
    return obj;
  }

  // Åtkomstmetod för typidentifierare.
  get type() {
    return 'screen';
  }

  /**
   * @inheritDoc
   */
  _includes(requirement) {
    return (
      super._includes(requirement) && requirement.matchPlatform(this.#platform)
    );
  }

  /**
   * Rekonstruera en stickprovsinstans från ett dataobjekt.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   */
  #unserialize(data) {
    data.closed && (this.#closed = true);
    data.platform && (this.#platform = data.platform);
  }
}

/**
 * En komponent som utgör en del av en webbsida eller en app.
 *
 * @license CC-BY 4.0
 * @see Sample
 * @property {boolean} closed     Stängd funktionalitet för skärmläsare?
 * @property {boolean} default    Förvald?
 * @property {string}  parentType Stickprovstyp som komponenten ingår i.
 * @property {string}  platform   Plattform (t.ex. operativsystem).
 * @property {string}  type       Identifierare för stickprovstyp.
 */
export class Component extends Sample {
  // Privata fält.
  #closed = false;
  #default = false;
  #parentType;
  #platform;

  /**
   * Konstruera en komponentinstans.
   *
   * @param {number}          auditID Granskningsidentitet.
   * @param {(string|object)} arg     Föräldratyp eller dataobjekt.
   * @throws {TypeError} Granskningsidentitet saknas.
   */
  constructor(auditID, arg) {
    if ('string' === typeof arg) {
      super(auditID, 'component');
      this.#parentType = arg;
    } else {
      arg.category ??= 'component';
      if (arg instanceof Component) {
        super(auditID, arg);
        this.#copy(arg);
      } else {
        super(auditID, arg);
        this.#unserialize(arg);
      }
    }
  }

  // Åtkomstmetoder för stängd funktionalitet.
  get closed() {
    return this.#closed;
  }

  set closed(flag) {
    if ('screen' === this.#parentType) {
      this.#closed = Boolean(flag);
    }
  }

  // Åtkomstmetoder för förval.
  get default() {
    return this.#default;
  }

  set default(flag) {
    this.#default = Boolean(flag);
  }

  // Åtkomstmetod för stickprovstypen som komponenten ingår i.
  get parentType() {
    return this.#parentType;
  }

  // Åtkomstmetoder för plattform.
  get platform() {
    return this.#platform;
  }

  set platform(value) {
    this.#platform = String(value).toLowerCase();
  }

  /**
   * @inheritDoc
   */
  serialize() {
    const obj = super.serialize();
    obj.parent = this.#parentType;
    this.#closed && (obj.closed = true);
    this.#default && (obj.default = this.#default);
    this.#platform && (obj.platform = this.#platform);
    return obj;
  }

  // Åtkomstmetod för typidentifierare.
  get type() {
    return 'component';
  }

  /**
   * @inheritDoc
   */
  _includes(requirement) {
    return (
      super._includes(requirement) &&
      ('screen' !== this.#parentType ||
        requirement.matchPlatform(this.#platform))
    );
  }

  /**
   * Kopiera en befintlig komponentinstans.
   *
   * Kopiera föräldratypen och förvalsflaggan.
   *
   * @private
   * @param {Component} source Komponent att kopiera.
   */
  #copy(source) {
    this.#default = source.#default;
    this.#parentType = source.#parentType;
    this.#platform = source.#platform;
    this.closed = source.#closed;
  }

  /**
   * Rekonstruera en stickprovsinstans från ett dataobjekt.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   */
  #unserialize(data) {
    const compat = {
      AppScreen: 'screen',
      Webpage: 'webpage',
    };
    this.#parentType = compat[data.parent] ?? data.parent;
    data.closed && (this.closed = data.closed);
    data.default && (this.#default = data.default);
    data.platform && (this.#platform = data.platform);
  }
}

/**
 * Ett dokument i ett filformat som inte är HTML.
 *
 * @license CC-BY 4.0
 * @see Sample
 * @property {string} format Dokumentformat (filtyp).
 * @property {string} type   Identifierare för stickprovstyp.
 * @property {string} url    Sökväg.
 */
export class NonWebDocument extends Sample {
  // Privata fält.
  #format;
  #url;

  /**
   * Konstruera en dokumnentinstans.
   *
   * @param {number}          auditID Granskningsidentitet.
   * @param {(string|object)} arg     Urvalskategori eller dataobjekt.
   * @throws {TypeError} Granskningsidentitet eller urvalskategori saknas.
   */
  constructor(auditID, arg) {
    super(auditID, arg);
    arg && 'string' !== typeof arg && this.#unserialize(arg);
  }

  // Åtkomstmetoder för dokumentformat.
  get format() {
    return this.#format;
  }

  set format(fmt) {
    this.#format = fmt?.trim().replace(/^\./, '').toLowerCase();
  }

  /**
   * @inheritDoc
   */
  serialize() {
    const obj = super.serialize();
    this.#format && (obj.format = this.#format);
    this.#url && (obj.url = this.#url);
    return obj;
  }

  // Åtkomstmetod för typidentifierare.
  get type() {
    return 'document';
  }

  // Åtkomstmetoder för sökväg.
  get url() {
    return this.#url;
  }

  set url(url) {
    try {
      url || (this.#url = undefined);
      url && (this.#url = new URL(url).toString());
    } catch (err) {
      throw new ValidationError('Fyll i en giltig absolut webbadress.', url);
    }
  }

  /**
   * @inheritDoc
   */
  _includes(requirement) {
    return (
      super._includes(requirement) && requirement.matchFormat(this.#format)
    );
  }

  /**
   * Rekonstruera en stickprovsinstans från ett dataobjekt.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   */
  #unserialize(data) {
    data.format && (this.#format = data.format);
    data.url && (this.#url = data.url);
  }
}

/**
 * En webbsida.
 *
 * @license CC-BY 4.0
 * @see CompositeSample
 * @property {string} type Identifierare för stickprovstyp.
 * @property {string} url  Sökväg.
 */
export class Webpage extends CompositeSample {
  // Privata fält.
  #url;

  /**
   * Konstruera en webbsidesinstans.
   *
   * @param {number}          auditID Granskningsidentitet.
   * @param {(string|object)} arg     Urvalskategori eller dataobjekt.
   * @throws {TypeError} Granskningsidentitet eller urvalskategori saknas.
   */
  constructor(auditID, arg) {
    super(auditID, arg);
    arg && 'string' !== typeof arg && this.#unserialize(arg);
  }

  /**
   * @inheritDoc
   */
  serialize() {
    const obj = super.serialize();
    this.#url && (obj.url = this.#url);
    return obj;
  }

  // Åtkomstmetod för typidentifierare.
  get type() {
    return 'webpage';
  }

  // Åtkomstmetoder för sökväg.
  get url() {
    return this.#url;
  }

  set url(url) {
    try {
      url || (this.#url = undefined);
      url && (this.#url = new URL(url).toString());
    } catch (err) {
      throw new ValidationError('Fyll i en giltig absolut webbadress.', url);
    }
  }

  /**
   * Rekonstruera en stickprovsinstans från ett dataobjekt.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   */
  #unserialize(data) {
    data.url && (this.#url = data.url);
  }
}

/**
 * Fabriksklass för att bygga stickprov.
 *
 * Bygger en stickprovsinstans från ett dataobjekt hämtat från en JSON-fil.
 * Rekonstruerar en stickprovsinstans från ett dataobjekt hämtat från databasen.
 *
 * Dataobjektet måste innehålla fältet `class` med ett värde som motsvarar
 * någon av stickprovsklassernas namn.
 *
 * @license CC-BY 4.0
 */
export class SampleFactory {
  /**
   * Bygg en instans av en stickprovsklass baserad på dataobjektets typ.
   *
   * @param {number} auditID Granskningsidentitet.
   * @param {object} data    Dataobjekt att populera ifrån.
   * @return {(AppScreen|Component|NonWebDocument|Webpage)}
   * @throws {TypeError} Granskningsidentitet eller urvalskategori saknas;
   *                     stickprovstyp i dataobjektet saknas eller är ogiltig.
   */
  static build(auditID, data) {
    const map = {
      AppScreen: (a, d) => new AppScreen(a, d),
      Component: (a, d) => new Component(a, d),
      NonWebDocument: (a, d) => new NonWebDocument(a, d),
      Webpage: (a, d) => new Webpage(a, d),
    };

    const type = data?.class;
    if (!type) {
      throw new TypeError('Stickprovstyp saknas.');
    } else if (!(type in map)) {
      throw new TypeError(`Ogiltig stickprovstyp '${type}'.`);
    }

    return map[type](auditID, data);
  }
}

// Importera beroenden.
import { ValidationError } from './ValidationError.js';

/**
 * Modellklasser för information om en digital service.
 *
 * @license CC-BY 4.0
 * @see MobileApp
 * @see Website
 */

/**
 * Basklass för information om en digital service.
 *
 * @license CC-BY 4.0
 * @property {boolean} authentication Krävs inloggning?
 * @property {string}  name           Tjänstens namn.
 * @property {string}  type           Typ av stickprov.
 */
class Service {
  // Privata fält.
  #authentication = false;
  #name = '';

  /**
   * Konstruera en serviceinstans.
   *
   * @param {object} [data] Dataobjekt att rekonstruera ifrån.
   */
  constructor(data = null) {
    data && this.#unserialize(data);
  }

  // Åtkomstmetoder för autentisering.
  get authentication() {
    return this.#authentication;
  }

  set authentication(flag) {
    this.#authentication = Boolean(flag);
  }

  // Åtkomstmetoder för tjänstens namn.
  get name() {
    return this.#name;
  }

  set name(name) {
    this.#name = name?.trim() ?? '';
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
      class: this.constructor.name,
      name: this.#name,
    };
    this.#authentication && (obj.auth = this.#authentication);
    return obj;
  }

  /**
   * @inheritDoc
   * @override
   */
  toJSON() {
    return this.serialize();
  }

  /**
   * Rekonstruera en serviceinstans från ett dataobjekt.
   *
   * Används när information hämtats från databasen och ska omvandlas till
   * riktiga objekt.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   */
  #unserialize(data) {
    this.#authentication = data.auth ?? false;
    this.#name = data.name ?? '';
  }
}

/**
 * Information om en mobil applikation.
 *
 * Utökar basklassen `Service` med information om operativsystem.
 *
 * Notera att versionsnumret inte är en egenskap för servicen, utan är kopplat
 * till en granskning. Detta då granskning och omgranskning av nödvändighet sker
 * med olika versioner av den mobila applikationen.
 *
 * @license CC-BY 4.0
 * @see Service
 * @property {string} operatingSystem Operativsystem.
 * @property {string} type            Typ av stickprov.
 */
export class MobileApp extends Service {
  // Privata fält.
  #operatingSystem = '';

  /**
   * Konstruera en applikationsinstans.
   *
   * @param {object} [data] Dataobjekt att rekonstruera ifrån.
   */
  constructor(data = null) {
    super(data);
    data && this.#unserialize(data);
  }

  // Åtkomstmetoder för operativsystem.
  get operatingSystem() {
    return this.#operatingSystem;
  }

  set operatingSystem(os) {
    this.#operatingSystem = String(os);
  }

  /**
   * @inheritDoc
   * @return {MobileApp}
   */
  serialize() {
    const obj = super.serialize();
    obj.os = this.#operatingSystem;
    return obj;
  }

  // Åtkomstmetod för typidentifierare.
  get type() {
    return 'app';
  }

  /**
   * Rekonstruera en serviceinstans från ett dataobjekt.
   *
   * Används när information hämtats från databasen och ska omvandlas till
   * riktiga objekt.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   */
  #unserialize(data) {
    this.operatingSystem = data.os ?? '';
  }
}

/**
 * Information om en webbplats.
 *
 * Utökar basklassen `Service` med information om åtkomst. En webbsida kan vara
 * publik eller ett extranät eller intranät.
 *
 * @license CC-BY 4.0
 * @see Service
 * @property {string} access Åtkomst.
 * @property {string} type   Typ av stickprov.
 */
export class Website extends Service {
  // Publika fält.
  static Access = Object.freeze({
    Extranet: 'extranet',
    Intranet: 'intranet',
    Public: 'public',
  });

  // Privata fält.
  #access = Website.Access.Public;

  /**
   * Konstruera en webbplatsinstans.
   *
   * @param {object} [data] Dataobjekt att rekonstruera ifrån.
   */
  constructor(data = null) {
    super(data);
    data && this.#unserialize(data);
  }

  // Åtkomstmetoder för åtkomst.
  get access() {
    return this.#access;
  }

  set access(value) {
    if (!Array.from(Object.values(Website.Access)).includes(value)) {
      throw new TypeError(`Ogiltigt åtkomstvärde "${value}" för webbplats.`);
    }
    this.#access = value;
  }

  /**
   * @inheritDoc
   * @return {MobileApp}
   */
  serialize() {
    const obj = super.serialize();
    this.#access !== Website.Access.Public && (obj.access = this.#access);
    return obj;
  }

  // Åtkomstmetod för typidentifierare.
  get type() {
    return 'website';
  }

  /**
   * Rekonstruera en serviceinstans från ett dataobjekt.
   *
   * Används när information hämtats från databasen och ska omvandlas till
   * riktiga objekt.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   */
  #unserialize(data) {
    this.access = data.access ?? Website.Access.Public;
  }
}

/**
 * Fabriksklass för att bygga information om digitala tjänster.
 *
 * @license CC-BY 4.0
 */
export class ServiceFactory {
  /**
   * Bygger en instans av en informationsklass baserad på dataobjektets
   * innehåll.
   *
   * @param {object} data Dataobjekt att populera ifrån.
   * @return {Service}
   * @throws {TypeError} Typ av service saknas eller är ogiltig.
   */
  static build(data) {
    const map = {
      MobileApp: (data) => new MobileApp(data),
      Website: (data) => new Website(data),
    };

    if (!('class' in data) || !(data.class in map)) {
      throw new TypeError(
        `Typ av service saknas eller är ogiltig: "${data.class}".`
      );
    }

    return map[data.class](data);
  }
}

/**
 * Applikationskontext.
 *
 * Kapslar in de tillståndsparametrar applikationen behöver.
 *
 * @license CC-BY 4.0
 * @property {boolean} advanced    Avancerat visningsläge?
 * @property {number}  audit       Granskningsidentitet.
 * @property {string}  case        Ärendeidentitet.
 * @property {string}  error       Åtgärdsfelmeddelande.
 * @property {boolean} history     Historiknavigering?
 * @property {boolean} modified    Sökvägen förändrad?
 * @property {string}  page        Sidnamn.
 * @property {string}  path        Begäran ("sökväg").
 * @property {string}  requirement Kravidentitet.
 * @property {string}  sample      Stickprovsidentitet.
 * @property {string}  status      Åtgärdsstatusmeddelande.
 * @property {string}  target      Fragmentidentifierare.
 */
export class AppContext {
  // Privata fält.
  #doc;
  #error = '';
  #history = false;
  #modified = false;
  #params = new URLSearchParams('');
  #path = '';
  #status = '';
  #target = '';

  /**
   * Konstruera en kontextinstans.
   *
   * @param {Document} [doc] DOM-dokument vid enhetstester.
   */
  constructor(doc = document) {
    this.#doc = doc;
  }

  // Åtkomstmetod för flagga för avancerat visningsläge.
  get advanced() {
    const values = { '': false, advanced: true, simplified: false };

    if (this.#params.has('mode')) {
      // Angivet som begäransparameter.
      return values[this.#params.get('mode')];
    }

    const mode = this.#doc.cookie
      .split(';')
      .find((spec) => spec.trim().startsWith('mode='))
      ?.split('=')[1];
    if (undefined !== mode) {
      // Angivet i sessionskaka.
      return values[mode];
    }

    // Tillfällig fix pga felaktig installation i DIGG:s miljö.
    return true;
  }

  // Åtkomstmetod för granskningsidentitet.
  get audit() {
    return Number(this.param('audit'));
  }

  // Åtkomstmetod för ärendeidentitet.
  get case() {
    return Number(this.param('case'));
  }

  // Åtkomstmetoder för felmeddelande.
  get error() {
    return this.#error;
  }

  set error(msg) {
    this.#error = msg;
    this.#status = '';
  }

  /**
   * Finns angiven parameter i begäran?
   *
   * @param {string} name Parameternamn.
   * @return {boolean}
   */
  hasParam(name) {
    return this.#params.has(name);
  }

  // Åtkomstmedoer för historiknavigeringsflaggan.
  get history() {
    return this.#history;
  }

  set history(flag) {
    this.#history = Boolean(flag);
  }

  // Åtkomstmetod för ändringsflagga.
  get modified() {
    return this.#modified;
  }

  // Åtkomstmetod för sidnamn.
  get page() {
    return this.param('page');
  }

  /**
   * Returnera angiven begäransparameter.
   *
   * @param {string} name Parameternamn.
   * @return {string}
   */
  param(name) {
    return this.#params.get(name) || '';
  }

  // Åtkomstmetoder för begäran (sökväg).
  get path() {
    return this.#path;
  }

  set path(path) {
    if (null !== path) {
      const p = String(path);
      this.#modified ||= p !== this.#path && '' !== this.#path;
      this.#path = p.replace(/#.*/, '');
      this.#params = new URLSearchParams(this.#path.slice(1));
      const fragment = p.replace(/^.*?#/, '');
      const target = this.#params.get('target') ?? '';
      this.#target = fragment !== p ? fragment : target;
    }
  }

  // Åtkomstmetod för kravidentitet.
  get requirement() {
    return this.param('requirement');
  }

  /**
   * Återställ ändringsflaggan.
   */
  reset() {
    this.#modified = false;
  }

  // Åtkomstmetod för stickprovsnamn.
  get sample() {
    return Number(this.param('sample'));
  }

  /**
   * Serialisera applikationskontextinstansen.
   *
   * Returnera ett objekt med information som kan vara meningsfull att
   * återställa vid ett senare tillfälle.
   *
   * @return {object}
   */
  serialize() {
    return {
      error: this.#error,
      path: this.#path,
      status: this.#status,
    };
  }

  // Åtkomstmetoder för åtgärdsstatusmeddelande.
  get status() {
    return this.#status;
  }

  set status(msg) {
    this.#status = msg;
    this.#error = '';
  }

  // Åtkomstmetod för fragmentidentifierare.
  get target() {
    return this.#target;
  }

  /**
   * Återställ applikationskontextinstansen från ett tidigare serialiserat
   * objekt.
   *
   * @param {object} obj Serialiserat applikationskontextobjekt.
   */
  unserialize(obj) {
    if (obj) {
      this.#error = obj.error ?? '';
      this.#history = false;
      this.path = obj.path ?? '';
      this.#modified = false;
      this.#status = obj.status ?? '';
    }
  }
}

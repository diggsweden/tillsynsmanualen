/**
 * Representerar en länkstig ("brödsmulor") för granskningssidor.
 *
 * @license CC-BY 4.0
 * @property {string}   current Titel på aktuell sida.
 * @property {object[]} links   Länkar (title, url).
 */
export class BreadcrumbTrail {
  // Privata fält.
  #audit;
  #case;
  #completed;
  #current;
  #list;
  #log;
  #requirement;
  #root = [null, null, 'Granska'];
  #sample;

  /**
   * Specificera aktuell granskning.
   *
   * @param {number} id   Granskningsidentitet.
   * @param {date}   date Startdatum.
   */
  audit(id, date) {
    this.#audit = [
      'audit',
      String(id),
      `Granskning ${date.toLocaleDateString('sv')}`,
    ];
  }

  /**
   * Specificera aktuellt ärende.
   *
   * @param {number}              id         Ärendeidentitet.
   * @param {(CaseNumber|string)} caseNumber Ärendenummer.
   * @param {string}              org        Aktörens namn.
   * @param {string}              service    Tjänstens namn.
   */
  case(id, caseNumber, org, service) {
    this.#case = ['case', String(id), `${caseNumber} ${org} ${service}`];
    this.#list = ['type', 'case', 'Ärenden'];
  }

  /**
   * Returnera ett löfte som infrias när länkstigen är klar att visa.
   *
   * Löftet infrias när fältet `current` satts.
   *
   * @return {Promise}
   */
  completed() {
    if (undefined !== this.#current) {
      return Promise.resolve(this);
    }

    return new Promise((resolve) => {
      this.#completed = () => resolve(this);
    });
  }

  // Åtkomstmetoder för titeln på aktuell sida.
  get current() {
    return this.#current;
  }

  set current(title) {
    this.#current = title;
    if (undefined !== this.#completed) {
      this.#completed();
      this.#completed = undefined;
    }
  }

  /**
   * Ta bort granskningsstartsidan.
   *
   * Används för själva granskningsstartsidan som ju då ska vara den aktuella
   * sidan (`current`).
   */
  deleteRoot() {
    this.#root = undefined;
  }

  // Åtkomstmetod för länkvektor.
  get links() {
    const title = (arr) => (arr ?? [])[2];
    const pages = [['Start', '../']]
      .concat(this.#page(title(this.#root), 'start', this.#root))
      .concat(this.#page(title(this.#list), 'list', this.#list))
      .concat(this.#page(title(this.#case), 'case', this.#case))
      .concat(this.#page(title(this.#log), 'log', this.#log))
      .concat(this.#page(title(this.#audit), 'audit', this.#audit))
      .concat(this.#page(title(this.#sample), 'sample', this.#sample))
      .concat(
        this.#page(
          title(this.#requirement),
          'requirement',
          this.#sample,
          this.#requirement
        )
      );
    return pages.map(([title, url]) => ({ title, url }));
  }

  /**
   * Specificera listningssida.
   *
   * @param {string} type  Entitetstyp.
   * @param {string} title Länktitel.
   */
  list(type, title) {
    this.#list = ['type', type, title];
  }

  /**
   * Specificera aktuell ärendelogg.
   *
   * @param {number} caseID Ärendeidentitet.
   */
  log(caseID) {
    this.#log = ['case', String(caseID), 'Ärendelogg'];
  }

  /**
   * Specificera aktuellt krav.
   *
   * @param {string} reqID Kravidentitet.
   * @param {string} title Kravtitel.
   */
  requirement(reqID, title) {
    this.#requirement = ['requirement', reqID, title];
  }

  /**
   * Specificera aktuellt stickprov.
   *
   * @param {number} id   Stickprovsidentitet.
   * @param {string} name Stickprovets namn eller titel.
   */
  sample(id, name) {
    this.#sample = ['sample', String(id), name];
  }

  /**
   * Skapa ett titel/URL-par.
   *
   * Bygg ihop en URL av de ingående delarna och returnera titel och URL.
   *
   * @private
   * @param {string}      title Länktext.
   * @param {string}      page  Sidnamn.
   * @param {...string[]} parts Parameternamn/-värdepar.
   * @return {string[]}
   */
  #page(title, page, ...parts) {
    if (parts.indexOf(undefined) >= 0) {
      return [];
    }
    const enc = (v) => encodeURIComponent(v);
    const params = [`page=${enc(page)}`];
    for (const [name, value] of parts) {
      if (null !== name) {
        params.push(`${enc(name)}=${enc(value)}`);
      }
    }
    return [[title, `?${params.join('&')}`]];
  }
}

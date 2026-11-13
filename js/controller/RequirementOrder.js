/**
 * Hjälpmedel för hantering av kravordningen i ett stickprov.
 *
 * Vilka krav som ingår i ett stickprov styrs av konfigurationsfiler. Dessa har
 * villkorsstyrning på flera nivåer och villkorens utfall kan förändras genom
 * redigering av stickprovet (till exempel tillägg eller borttag av innehålls-
 * typer).
 *
 * Ett befintligt stickprov kan vara populerat med en tidigare konfiguration än
 * den nu aktuella.
 *
 * Den inbördes ordningen mellan kraven behöver vara konsekevent i flera olika
 * situationer – därav behovet av denna hjälpklass.
 *
 * @license CC-BY 4.0
 */
export class RequirementOrder {
  // Privata fält.
  #config;
  #loader;
  #order = [];
  #sample;
  #sectionless = [];

  /**
   * Konstruera en kravordningsinstans.
   *
   * @param {ResourceLoader} loader Resursladdare.
   */
  constructor(loader) {
    this.#loader = loader;
  }

  /**
   * Iterera över alla kravidentiteter som ingår i granskninggen.
   *
   * @yield {string}
   */
  *[Symbol.iterator]() {
    for (const id of this.#order) {
      const req = this.#sample.requirement(id);
      if (req) yield req.id;
    }
  }

  /**
   * Bygg en kravordning för ett stickprov.
   *
   * Om stickprovet inte är populerat med krav, populera det.
   *
   * @param {Sample}  sample  Stickprov.
   * @return {object} Kravkonfigurations för stickprovet.
   * @throws {TypeError} Fel vid läsning av konfigurationsfilen.
   */
  async build(sample) {
    const type = 'component' === sample.type ? sample.parentType : sample.type;
    let url =
      'component' === sample.type
        ? `requirements/${type}-component`
        : `requirements/${type}`;
    if ('screen' === type) {
      url += sample.closed ? '-closed' : '-open';
    }
    this.#config = await this.#loader.configuration(url);
    this.#sample = sample;
    if (!this.#config) {
      throw new TypeError(`Kan inte läsa "${url}.json".`);
    }

    this.#order = [];
    if (!sample.hasRequirements) {
      this.#buildFromConfiguration();
      this.#populate(sample);
    } else {
      this.#buildFromSample();
    }
    return this.#config;
  }

  /**
   * Returnera nästa ingående kravidentitet efter referensen.
   *
   * @param {string} reference Referenskravidentitet.
   * @param {(string|null})
   */
  next(reference) {
    let index = this.#order.indexOf(reference);
    while (++index in this.#order) {
      const req = this.#sample.requirement(this.#order[index]);
      if (req) return req.id;
    }
    return null;
  }

  /**
   * Returnera föregående ingående kravidentitet före referensen.
   *
   * @param {string} reference Referenskravidentitet.
   * @param {(string|null})
   */
  previous(reference) {
    let index = this.#order.indexOf(reference);
    while (--index in this.#order) {
      const req = this.#sample.requirement(this.#order[index]);
      if (req) return req.id;
    }
    return null;
  }

  /**
   * Iterera över kravidentiteter i angivet avsnitt som ingår i stickprovet.
   *
   * Underavsnitt ska inte tas med i resultatet.
   *
   * @param {object} secCfg Avsnittskonfiguration.
   * @yield {string}
   */
  *section(secCfg) {
    for (const id of secCfg?.requirements ?? []) {
      const req = this.#sample?.requirement(id);
      if (req) yield req.id;
    }
  }

  /**
   * Iterera över avsnittslösa kravidentiteter som ingår i stickprovet.
   *
   * Om ett stickprov innehåller ett krav som inte längre tillhör något
   * avsnitt i konfigurationen blr dessa krav avsnittslösa. De presenteras i
   * pseudo-avsnittet "Övrigt", efter de normala avsnitten.
   *
   * @param {object} secCfg Avsnittskonfiguration.
   * @yield {string}
   */
  *sectionless() {
    for (const id of this.#sectionless) {
      yield id;
    }
  }

  /**
   * Returnera nästa ogranskade ingående kravidentitet efter referensen.
   *
   * @param {string} reference Referenskravidentitet.
   * @return {(string|null)}
   */
  skip(reference) {
    let index = this.#order.indexOf(reference);
    while (++index in this.#order) {
      const req = this.#sample.requirement(this.#order[index]);
      if (req && !req.done) return req.id;
    }
    return null;
  }

  /**
   * Iterera över alla kravidentiteter i ett konfigurationsavsnitt.
   *
   * Iterera rekursivt över underavsnitt.
   *
   * @private
   * @param {object} secCfg Avsnittskonfiguration.
   * @yield {string}
   */
  *#allFromSection(secCfg) {
    for (const id of secCfg?.requirements ?? []) {
      yield id;
    }
    for (const subCfg of secCfg?.sections ?? []) {
      yield* this.#allFromSection(subCfg);
    }
  }

  /**
   * Bygg kravordningen från konfigurationen.
   *
   * Om stickprovet inte är populerat med krav, bygg kravordningen utifrån
   * strukturen i konfigurationsfilen.
   *
   * @private
   */
  #buildFromConfiguration() {
    for (const secCfg of this.#config?.sections ?? []) {
      for (const id of this.#allFromSection(secCfg)) {
        this.#order.push(id);
      }
    }
  }

  /**
   * Bygg kravordningen från konfigurationen och stickprovet.
   *
   * Utgå från konfigurationen, men exkludera krav som inte ingår i stick-
   * provet. Notera också krav i stickprovet som inte tillhör något avsnitt i
   * konfigurationen ("avsnittslösa" krav).
   *
   * @private
   */
  #buildFromSample() {
    for (const secCfg of this.#config?.sections ?? []) {
      for (const id of this.#allFromSection(secCfg)) {
        this.#sample.requirement(id) && this.#order.push(id);
      }
    }

    for (const req of this.#sample.requirements()) {
      if (!this.#order.includes(req.id)) {
        this.#order.push(req.id);
        this.#sectionless.push(req.id);
      }
    }
  }

  /**
   * Populera ett tomt stickprov med krav.
   *
   * @private
   * @param {Sample} sample Stickprov att populera.
   * @throws {TypeError} Ogiltig referens i konfigurationen.
   */
  #populate(sample) {
    const filters = {
      categories: [],
      contentTypes: [],
      formats: [],
      modes: [],
      platforms: [],
    };
    for (const secCfg of this.#config?.sections ?? []) {
      this.#populateFromSection(secCfg, sample, filters);
    }
  }

  /**
   * Populera stickprovet med krav från ett avsnitt.
   *
   * Använd filter från avsnittskonfigurationen om kravet inte har egna
   * filter.
   *
   * Fortsätt populera rekursivt med eventuella underavsnitt.
   *
   * @private
   * @param {object}      secCfg  Avsnittskonfiguration.
   * @param {Sample}      sample  Stickprov att populera.
   * @param {{string[][]} filters Ackumulerade filter.
   * @throws {TypeError} Ogiltig referens i konfigurationen.
   */
  #populateFromSection(secCfg, sample, filters) {
    secCfg.categories && filters.categories.push(secCfg.categories);
    secCfg.contentTypes && filters.contentTypes.push(secCfg.contentTypes);
    secCfg.formats && filters.formats.push(secCfg.formats);
    secCfg.modes && filters.modes.push(secCfg.modes);
    secCfg.platforms && filters.platforms.push(secCfg.platforms);

    const last = (a) => a[a.length - 1];
    for (const id of secCfg.requirements ?? []) {
      const reqCfg = this.#config.requirements[id];
      if (!reqCfg) {
        throw new TypeError(`Krav '${id}' saknas i konfigurationen.`);
      }

      const apply = (f) => reqCfg[f] ?? last(filters[f]) ?? [];

      const requirement = new Requirement(sample.id);
      requirement.approvable = reqCfg.approvable ?? true;
      requirement.clause = reqCfg.reference ?? '';
      requirement.id = id;
      requirement.title = reqCfg.title ?? '';
      requirement.categories = apply('categories');
      requirement.contentTypes = apply('contentTypes');
      requirement.formats = apply('formats');
      requirement.modes = apply('modes');
      requirement.platforms = apply('platforms');
      sample.setRequirement(requirement);
    }

    for (const subCfg of secCfg?.sections ?? []) {
      this.#populateFromSection(subCfg, sample, filters);
    }

    secCfg.categories && filters.categories.pop();
    secCfg.contentTypes && filters.contentTypes.pop();
    secCfg.formats && filters.formats.pop();
    secCfg.modes && filters.modes.pop();
    secCfg.platforms && filters.platforms.pop();
  }
}

// Importera beroenden.
import { Requirement } from '../model/Requirement.js';

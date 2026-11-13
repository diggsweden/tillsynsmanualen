/**
 * Ordnad lista med underkända krav.
 *
 * Granskningsprotokollen behöver ordnade listor med underkända krav, där varje
 * underkänt krav har en bestämd identitet. Den här klassen skapar en sådan
 * lista där identiteterna utgörs av löpnummer. Stickproven ordnas efter klass:
 * först komponenter, sedan appvyer och webbsidor, och sist dokument. Inom varje
 * stickprov ordnas de underkända kraven efter kravavsnittsnummer i EN 301 594.
 * Stickproven inom en klass är i den ordning de lagts till i urvalet.
 *
 * Klassen har fem iteratormetoder:
 * - allClauses()   itererar över alla underkända kravavsnittsnummer.
 * - clauses()      itererar över underkända kravavsnittsnummer i ett stickprov.
 * - components()   itererar över granskade ingående komponenter med brister.
 * - fails()        itererar över underkända krav i ett givet kravavsnitt.
 * - samples()      itererar över underkända stickprov av angiven klass.
 *
 * @license CC-BY 4.0
 */
export class FailureList {
  // Privata fält.
  #byClause = new Map();
  #byID = new Map();
  #components = new Set();
  #id = 0;
  #samples = new Set();
  #sampleIDs = new Set();

  /**
   * Konstruera en listinstans.
   *
   * @param {Audit} audit Granskning.
   */
  constructor(audit) {
    this.#build(audit);
  }

  /**
   * Iterera över underkända kravavsnittsnummer.
   *
   * @yield {string}
   */
  *allClauses() {
    yield* this.#byClause.keys();
  }

  /**
   * Iterera över underkända kravavsnitt i angivet stickprov eller komponent.
   *
   * Även avsnitt som inte är underkända, men har en extern notering, ingår i
   * iterationen.
   *
   * @param {Sample} sample Stickprov eller komponent.
   * @yield {array} En vektor med 4 element: id, kravavsnitt, kravvektor och
   *                stickprovs-/komponent-id.
   */
  *clauses(sample) {
    // Iterera först över krav i eventuella ingående komponenter.
    if (sample.isComposite) {
      for (const component of sample.components) {
        yield* this.clauses(component);
      }
    }

    for (const [id, { clause, sample: s, requirements }] of this.#byID) {
      if (s === sample) {
        yield [id, clause, requirements, s.id];
      }
    }
  }

  /**
   * Iterera över granskade ingående komponenter med brister.
   *
   * @yield {Component}
   */
  *components() {
    yield* this.#components.values();
  }

  /**
   * Kontrollera om angivet stickprov ingår i listan.
   *
   * @param {Sample} search Stickprov att leta efter.
   * @param {boolean}
   */
  contains(search) {
    return this.#sampleIDs.has(search?.id);
  }

  /**
   * Iterera över underkäNda krav för angivet avsnitt.
   *
   * Krav som inte är underkända, utan bara har en extern notering, ingår inte
   * i iterationen.
   *
   * @param {string} clause Kravavsnittsnummer.
   * @yield {array} En vektor med tre element: stickprov, kravvektor och
   *                bristidentitet.
   */
  *fails(clause) {
    for (const id of this.#byClause.get(clause) ?? []) {
      const { sample, requirements } = this.#byID.get(id);
      const req = requirements.filter((r) => r.failed);
      if (req.length > 0) {
        yield [sample, req, id];
      }
    }
  }

  /**
   * Iterera över granskade stickprov, av angiven klass, med brister.
   *
   * @param {class} sampleClass Stickprovsklass.
   * @yield {(AppScreen|NonWebDocument|Webpage)}
   */
  *samples(sampleClass) {
    for (const sample of this.#samples.values()) {
      if (sample instanceof sampleClass) {
        yield sample;
      }
    }
  }

  /**
   * Registrera underkända krav i ett stickprov eller en komponent.
   *
   * Spara avsnitt, stickprov och krav i fältet `#byID` under ett genererat
   * id.
   * Spara identiteterna per avsnitt i fältet `#byClause`.
   *
   * @private
   * @param {Sample}   sample  Stickprov eller komponent.
   * @param {string[]} clauses Underkända kravavsnittsnummer.
   */
  #addRequirements(sample, clauses) {
    const inc = (r) => r.failed || '' !== (r.externalNote ?? '');
    const reqs = {};

    // Plocka ut de krav som ska registreras.
    for (const req of sample.requirements()) {
      if (inc(req)) {
        reqs[req.clause] ??= [];
        reqs[req.clause].push(req);
      }
    }

    // Registrera kraven i rätt sorteringsordning.
    for (const clause of clauses) {
      if (!reqs[clause]) continue;

      const id = ++this.#id;
      const requirements = [];
      for (const req of reqs[clause]) {
        requirements.push(req);
      }

      this.#byID.set(id, { clause, sample, requirements });
      this.#byClause.get(clause).push(id);
    }
  }

  /**
   * Bygg de datastrukturer som listan behöver.
   *
   * Spara:
   * - underkända krav per kravavsnitt
   * - granskade komponenter med brister
   * - granskade stickprov med brister
   *
   * @private
   * @param {Audit} audit Granskning.
   */
  #build(audit) {
    // Kravavsnitt.
    const all = [AppScreen, Component, NonWebDocument, Webpage];
    const keys = new Set(Object.keys(audit.failures(...all)));
    const clauses = this.#sortClauses(Array.from(keys));

    for (const clause of clauses) {
      this.#byClause.set(clause, []);
    }

    const inc = (s) => s.failed || s.hasExternalNotes;

    // Komponenter.
    for (const component of audit.components()) {
      if (component.done && inc(component)) {
        this.#components.add(component);
        this.#sampleIDs.add(component.id);
        this.#addRequirements(component, clauses);
      }
    }

    // Övriga stickprov.
    for (const cls of [AppScreen, NonWebDocument, Webpage]) {
      for (const sample of audit.doneSamples(cls)) {
        if (inc(sample)) {
          this.#samples.add(sample);
          this.#sampleIDs.add(sample.id);
          this.#addRequirements(sample, clauses);
        }
      }
    }
  }

  /**
   * Sortera kravavsnittsnummer i nummerordning.
   *
   * Se till att t ex "1.4.12" sorteras efter "1.4.2".
   * Paragrafhänvisningar sorteras in före avsnittsnummer i EN 301 549.
   *
   * @private
   * @param {string[]} clauses Vektor med kravavsnittsnummer.
   * @return {string[]}
   */
  #sortClauses(clauses) {
    const c2n = (c) => pad(cn(c)).reduce((n, d) => 100 * n + m(d), 0);
    const cn = (c) => (-1 === c.indexOf('§') ? c : `0.${s2c(c)}`);
    const m = (d) => Number(d) % 100;
    const pad = (c) => c.split('.').concat(0, 0, 0, 0).slice(0, 6);
    const s2c = (s) => s.replace(/\D+/g, '.').replace(/^\.|\.$/g, '');
    return clauses.sort((a, b) => c2n(a) - c2n(b));
  }
}

// Importera beroenden.
import { AppScreen, Component, NonWebDocument, Webpage } from './sample.js';

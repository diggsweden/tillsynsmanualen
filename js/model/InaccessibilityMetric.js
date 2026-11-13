/**
 * Mätetal för otillgänglighet hos webbsidor.
 *
 * Det totala mätetalet för ett stickprovsurval beräknas med formeln
 *
 *                   δ = cδ·rT·Σ(fρ·ω(ρ)) / (rE·σ·Σ(ω(ρ)),
 *                         ω(ρ) = λρ·νρ·√(φ′ρ+m·φ″ρ)
 *
 * Parametrar
 * ----------
 * δ    Otillgänglighetstal.
 * cδ   Maximal poäng (godtycklig skalfaktor).
 * rT   Totalt antal krav i den använda granskningsmetodiken.
 * rE   Antal granskade krav (0 < Re ≤ Rt).
 * σ    Antal granskade webbsidor.
 * ω(ρ) Viktningsfunktion för kravet ρ.
 * fρ   Antalet underkända sidor för krav ρ (0 ≤ fρ ≤ σ).
 * λρ   Nivåvikt (A/AA) för krav ρ (0 ≤ λρ ≤ 1).
 * νρ   Icke-störningsvikt för krav ρ (0 ≤ νρ ≤ 1).
 * φ′ρ  Antalet primärt mappade funktionsprestanda (FPS) för krav ρ.
 * m    Viktfaktor för sekundära FPS (0 ≤ m ≤ 1).
 * φ″ρ  Antalet sekundärt mappade FPS för krav ρ.
 *
 * Parametern λρ gör det möjligt att vikta krav olika beroende på om de är på
 * nivå A eller AA i WCAG 2.1 (eller motsvarande krav i kapitel 9 i EN 301 549).
 *
 * Parametern νρ gör det möjligt att vikta de fyra "störande" kriterierna i WCAG
 * 2.1 (1.4.2, 2.1.2, 2.2.2, and 2.3.1) högre än andra krav.
 *
 * Användningssituationer anges med nedanstående förkortningar:
 *
 * WV  användning utan synförmåga
 * LV  användning med nedsatt synförmåga
 * WPC användning utan förmåga att uppfatta färger
 * WH  användning utan hörsel
 * LH  användning med nedsatt hörsel
 * WVC användning utan talförmåga
 * LMS användning med nedsatt rörlighet eller muskelstyrka
 * LR  användning med begränsad räckvidd
 * PST minimera det som kan utlösa fotosensitiva anfall
 * LC  användning med nedsatt kognitiv förmåga.
 *
 * @license CC-BY 4.0
 */
export class InaccessibilityMetric {
  // Privata fält.
  static #NON_INTERFERENCE_WEIGHT = 0.9;
  static #LEVEL_WEIGHT = { A: 1, AA: 0.75 };
  static #MAX_SCORE = 500;
  static #REQUIREMENTS_EVALUATED = 50;
  static #REQUIREMENTS_TOTAL = 50;
  static #SECONDARY_FPS_WEIGHT = 0.5;

  #methodology;

  /**
   * Konstruera en mätetalsinstans.
   */
  constructor() {
    this.#methodology = new Methodology(wcag);
  }

  /**
   * Returnera överensstämmelsenivå för angivet mätetal.
   *
   * Mätetal Överensstämmelse
   * ------- ----------------
   * 0-9     helt förenlig ("full")
   * 10-79   delvis förenlig ("partial")
   * 80-500  inte förenlig ("none")
   *
   * @param {number} score Mätetal.
   * @return {string}
   */
  compliance(score) {
    if (score < 10) {
      return 'full';
    } else if (score < 80) {
      return 'partial';
    }
    return 'none';
  }

  /**
   * Beräkna inverkan per krav.
   *
   * Ett kravs inverkan representerar hur mycket det bidrar till det totala
   * otillgänglighetsvärdet och beräknas som Iρ = Fρ·ω(ρ), där Fρ är antalet
   * sidor som underkänts för kravet och ω(ρ) är kravets vikt:
   *
   *                     ω(ρ) = λρ·νρ·√(φ′ρ+m·φ″ρ)
   *
   * Om en användningssituation anges, beräkna inverkan per krav för bara den
   * angivna användningssituationen.
   *
   * @param {number} pages Totalt antal granskade sidor.
   * @param {object} data  Antal underkända sidor per WCAG-kriteritum.
   * @param {string} [fps] Eventuell användningssituation.
   * @return {object} Inverkan per krav i dataobjektet.
   */
  impact(pages, data, fps = null) {
    const imp = (r) => (s * data[r.clause] * w(r)) / wT;
    const s = this.#scale(pages);
    const w = fps ? (r) => this.#fpsWeight(r, fps) : this.#weight;
    const wT = this.#methodology.requirements
      .filter((r) => r.maps(fps))
      .reduce((sum, r) => sum + w(r), 0);

    return this.#methodology.requirements
      .filter((r) => data[r.clause] > 0 && r.maps(fps))
      .reduce((o, r) => ((o[r.clause] = imp(r)), o), {});
  }

  /**
   * Beräkna otillgänglighet för en datamängd.
   *
   * Data är ett objekt med WCAG-kriterienummer som nycklar och antalet under-
   * kända sidor per kriterium som värden.
   *
   * Det tredje argumentet kan vara en användningssituation. Om det anges
   * beräknas otillgängligheten bara för den angivna användningssituationen.
   *
   * @param {number} pages Totalt antal granskade sidor.
   * @param {object} data  Antal underkända sidor per WCAG-kriteritum.
   * @param {string} [fps] Eventuell användningssituation.
   * @return {number}
   */
  score(pages, data, fps = null) {
    const s = this.#scale(pages);
    const w = fps ? (r) => this.#fpsWeight(r, fps) : this.#weight;
    const wT = this.#methodology.requirements
      .filter((r) => r.maps(fps))
      .reduce((sum, r) => sum + w(r), 0);

    return (
      (s / wT) *
      this.#methodology.requirements
        .filter((r) => r.clause in data && r.maps(fps))
        .reduce((sum, r) => sum + data[r.clause] * w(r), 0)
    );
  }

  /**
   * Beräkna vikten för ett enskilt krav i en specifik användningssituation.
   *
   * @private
   * @param {RequirementMapping} req Kravmappning.
   * @param {string}             fps Användningssituation.
   * @return {number}
   */
  #fpsWeight(req, fps) {
    const l = InaccessibilityMetric.#LEVEL_WEIGHT[req.level];
    const m = InaccessibilityMetric.#SECONDARY_FPS_WEIGHT;
    const n = InaccessibilityMetric.#NON_INTERFERENCE_WEIGHT;

    return l * (req.interference ? 1 : n) * req.mapping(fps, m);
  }

  /**
   * Beräkna skalfaktorn som används i ekvationerna.
   *
   * @private
   * @param {number} pages Totalt antal granskade sidor.
   * @return {number}
   */
  #scale(pages) {
    const cD = InaccessibilityMetric.#MAX_SCORE;
    const rE = InaccessibilityMetric.#REQUIREMENTS_EVALUATED;
    const rT = InaccessibilityMetric.#REQUIREMENTS_TOTAL;
    const s = Math.max(1, pages);
    return (rT * cD) / rE / s;
  }

  /**
   * Beräkna vikten för ett enskilt krav.
   *
   * @private
   * @param {RequirementMapping} req Kravmappning.
   * @return {number}
   */
  #weight(req) {
    const l = InaccessibilityMetric.#LEVEL_WEIGHT[req.level];
    const m = InaccessibilityMetric.#SECONDARY_FPS_WEIGHT;
    const m1 = req.primaryFPS.length;
    const m2 = req.secondaryFPS.length;
    const n = InaccessibilityMetric.#NON_INTERFERENCE_WEIGHT;

    return l * (req.interference ? 1 : n) * Math.sqrt(m1 + m * m2);
  }
}

/**
 * Granskningsmetodik.
 *
 * Tillhandahåller information om den använda granskningsmetodiken.
 *
 * @see Requirement
 * @property {Requirement[]} requirements De krav som ingår i metodiken.
 */
class Methodology {
  // Privata fält.
  #requirements = [];

  /**
   * Konstruera en metodikinstans.
   *
   * Skapa `Requirement`-instanser av initieringsinformationen.
   *
   * @param {Object[][]} clauses Kravavsnitt i metodiken.
   */
  constructor(...clauses) {
    clauses.reduce(
      (arr, c) => c.reduce((a, r) => (a.push(new Requirement(r)), a), arr),
      this.#requirements
    );
  }

  // Åtkomstmetod för kraven.
  get requirements() {
    return this.#requirements;
  }
}

/**
 * Ett tillgänglighetskrav.
 *
 * Representerar ett krav i EN 301 549.
 *
 * @property {string}  clause       Kravavsnittsnummer.
 * @property {boolean} interference Är det ett "störande" WCAG-krav?
 * @property {string}  level        Överensstämmelsenivå (A/AA).
 * @property {number}  primaryFPS   Primära FPS-mappningar.
 * @property {number}  secondaryFPS Sekundära FPS-mappningar.
 */
class Requirement {
  // Privata fält.
  #clause;
  #interference;
  #level;
  #primaryFPS;
  #secondaryFPS;

  /**
   * Konstruera en kravinstans.
   *
   * @param {object}  info    Initieringsinformation.
   * @param {string}  info.c  Kravavsnittsnummer.
   * @param {string}  info.f1 Primära FPS-mappningar (kommaseparerad sträng).
   * @param {string}  info.l  Överensstämmelsenivå (A/AA).
   * @param {string}  info.f2 Primära FPS-mappningar (kommaseparerad sträng).
   * @param {boolean} info.i  "Störande" WCAG-kriterium?
   */
  constructor({ c, f1, l, f2 = '', i = false }) {
    this.#clause = c;
    this.#interference = i;
    this.#level = l;
    this.#primaryFPS = f1.split(',');
    this.#secondaryFPS = '' === f2 ? [] : f2.split(',');
  }

  // Åtkomstmetod för kravavsnittsnummer.
  get clause() {
    return this.#clause;
  }

  // Åtkomstmetod för "störande"-flagga.
  get interference() {
    return this.#interference;
  }

  // Åtkomstmetod för överensstämmelsenivå.
  get level() {
    return this.#level;
  }

  /**
   * Returnera mappningsvikten för angiven användningssituation.
   *
   * @param {string} fps             Användningssituation.
   * @param {number} secondaryWeight Viktfaktor för sekundära FPS.
   */
  mapping(fps, secondaryWeight) {
    return this.#primaryFPS.includes(fps)
      ? 1
      : this.#secondaryFPS.includes(fps)
        ? secondaryWeight
        : 0;
  }

  /**
   * Returnera användningssituationsmappning.
   *
   * @param {string} [fps] Användningssituation, t ex "WV".
   * @return {boolean}
   */
  maps(fps = null) {
    return (
      null === fps ||
      this.#primaryFPS.includes(fps) ||
      this.#secondaryFPS.includes(fps)
    );
  }

  // Åtkomstmetod för primära FPS-mappningar
  get primaryFPS() {
    return this.#primaryFPS;
  }

  // Åtkomstmetod för sekundära FPS-mappningar
  get secondaryFPS() {
    return this.#secondaryFPS;
  }
}

// Kravavsnitt från WCAG 2.1 A/AA.
const wcag = [
  { c: '1.1.1', l: 'A', f1: 'WV,LV,WH', f2: 'LH,LC' },
  { c: '1.2.1', l: 'A', f1: 'WV,LV,WH,LH', f2: 'LC' },
  { c: '1.2.2', l: 'A', f1: 'WH,LH', f2: 'LC' },
  { c: '1.2.3', l: 'A', f1: 'WV', f2: 'LV,LC' },
  { c: '1.2.4', l: 'AA', f1: 'WH,LH', f2: 'LC' },
  { c: '1.2.5', l: 'AA', f1: 'WV', f2: 'LV,LC' },
  { c: '1.3.1', l: 'A', f1: 'WV', f2: 'LV,LC' },
  { c: '1.3.2', l: 'A', f1: 'WV', f2: 'LV,LC' },
  { c: '1.3.3', l: 'A', f1: 'WV,LV,WPC,WH,LH', f2: 'LC' },
  { c: '1.3.4', l: 'AA', f1: 'LMS,LR', f2: 'LC' },
  { c: '1.3.5', l: 'AA', f1: 'LV' },
  { c: '1.4.1', l: 'A', f1: 'WV,LV,WPC', f2: 'LC' },
  { c: '1.4.2', l: 'A', f1: 'WV,LH', f2: 'LC', i: true },
  { c: '1.4.3', l: 'AA', f1: 'LV,WPC', f2: 'LC' },
  { c: '1.4.4', l: 'AA', f1: 'LV', f2: 'LMS' },
  { c: '1.4.5', l: 'AA', f1: 'LV,WPC', f2: 'LC' },
  { c: '1.4.10', l: 'AA', f1: 'LV' },
  { c: '1.4.11', l: 'AA', f1: 'LV,WPC', f2: 'LC' },
  { c: '1.4.12', l: 'AA', f1: 'LV,LC' },
  { c: '1.4.13', l: 'AA', f1: 'LV,LC' },
  { c: '2.1.1', l: 'A', f1: 'WV,LV,LMS', f2: 'WVC' },
  { c: '2.1.2', l: 'A', f1: 'WV,LV,LMS', f2: 'WVC', i: true },
  { c: '2.1.4', l: 'A', f1: 'LMS,LR', f2: 'LC' },
  { c: '2.2.1', l: 'A', f1: 'WV,LV,WH,LH,LMS,LC' },
  { c: '2.2.2', l: 'A', f1: 'WV,LV,WH,LH,LMS,LC', i: true },
  { c: '2.3.1', l: 'A', f1: 'PST', i: true },
  { c: '2.4.1', l: 'A', f1: 'WV,LV,LMS,LC', f2: 'WVC' },
  { c: '2.4.2', l: 'A', f1: 'WV,LV,LMS,LC' },
  { c: '2.4.3', l: 'A', f1: 'WV,LV,LMS,LC', f2: 'WH' },
  { c: '2.4.4', l: 'A', f1: 'WV,LV,LMS,LC', f2: 'WVC' },
  { c: '2.4.5', l: 'AA', f1: 'WV,LV,LMS,LC', f2: 'WVC' },
  { c: '2.4.6', l: 'AA', f1: 'WV,LV,LMS,LC', f2: 'WH,WVC' },
  { c: '2.4.7', l: 'AA', f1: 'WV,LV,LMS,LC', f2: 'WVC' },
  { c: '2.5.1', l: 'A', f1: 'LMS,LR,LC' },
  { c: '2.5.2', l: 'A', f1: 'LV,LMS,LR,LC' },
  { c: '2.5.3', l: 'A', f1: 'LMS,LR', f2: 'LC' },
  { c: '2.5.4', l: 'A', f1: 'LMS,LR', f2: 'WV,LV,LC' },
  { c: '3.1.1', l: 'A', f1: 'WV', f2: 'LV,WH,LH,LC' },
  { c: '3.1.2', l: 'AA', f1: 'WV', f2: 'LV,WH,LH,LC' },
  { c: '3.2.1', l: 'A', f1: 'WV,LV,LMS,LC' },
  { c: '3.2.2', l: 'A', f1: 'WV,LV,LMS,LC' },
  { c: '3.2.3', l: 'AA', f1: 'WV,LV,LC' },
  { c: '3.2.4', l: 'AA', f1: 'LV,LC', f2: 'WV' },
  { c: '3.3.1', l: 'A', f1: 'WV,LV,WPC,LC' },
  { c: '3.3.2', l: 'A', f1: 'WV,LV,LC', f2: 'WVC,LMS' },
  { c: '3.3.3', l: 'AA', f1: 'WV,LV,LC', f2: 'WVC,LMS' },
  { c: '3.3.4', l: 'AA', f1: 'WV,LV,LC', f2: 'LMS' },
  { c: '4.1.1', l: 'A', f1: 'WV', f2: 'LV' },
  { c: '4.1.2', l: 'A', f1: 'WV,LV', f2: 'LMS' },
  { c: '4.1.3', l: 'AA', f1: 'WV,LV,WPC,WH,LH,LMS,LR,PST,LC', f2: 'WVC' },
];

/**
 * Villkorshierarki för granskning av kontroller.
 *
 * Representerar den konkreta hierarkin av villkor och kontroller som
 * implementerar strukturen i en stickprovskonfigurationsfil.
 *
 * Villkor kan vara manuella (utvärderas av granskaren) eller härledda
 * (utvärderas automatiskt från tillståndet hos en eller flera styrande
 * kontroller i samma krav).
 *
 * Villkor kan dessutom vara nästlade i godtyckligt antal nivåer.
 *
 * @license CC-BY 4.0
 * @see Condition
 * @see DerivedCondition
 * @see ManualCondition
 * @property {object}      configuration Stickprovskonfiguration.
 * @property {Requirement} requirement   Krav.
 */
export class ConditionTree {
  // Privata fält.
  #conditions = {};
  #config;
  #dependencies = {};
  #requirement;

  /**
   * Initiera villkorstillstånd.
   *
   * Uppdatera innehållets synlighet för alla toppnivåvillkor. Beräkna
   * manuella villkors initiala tillstånd utifrån de ingående kontrollernas
   * tillämplighet (aktiv gren innehåller tillämpliga kontroller).
   */
  apply() {
    // Uppdatera villkor på toppnivå.
    for (const condition of Object.values(this.#conditions)) {
      if (condition.parent) continue;
      condition.disabled = false;
    }
  }

  /**
   * Bygg struktur för hantering av villkor.
   *
   * Villkor medför två problem: manuella villkors tillstånd måste initialt
   * härledas från de ingående kontrollernas tillstånd och både manuella och
   * härledda villkor ska ändra tillståndet för de ingående kontrollerna när
   * villkoret (eller dess källa) ändrar tillstånd.
   *
   * För att hålla ordning på dessa beroenden bygger den här metoden en
   * struktur med information om vad som påverkar vad.
   *
   * Den registrerar också beroendena mellan härledda villkor och de
   * kontroller som styr dem, så att villkoren kan uppdateras när kontrollerna
   * ändrar tillstånd.
   *
   * @throws {TypeError} Konfiguration eller krav ej angivet.
   */
  build() {
    if (!this.#config) throw new TypeError('Ingen konfiguration angiven.');
    if (!this.#requirement) throw new TypeError('Inget krav angivet.');

    const req = this.#requirement;
    const reqCfg = this.#config.requirements[req.id];
    reqCfg || console.warn(`Kravdefinition "${req.id}" saknas.`);

    (reqCfg?.checks ?? [])
      .filter((c) => 'condition' in c)
      .forEach((c) => this.#addCondition(c.condition));
  }

  // Åtkomstmetod för stickprovskonfiguration.
  set configuration(config) {
    this.#config = config;
  }

  /**
   * Returnera villkoret med angiven identitet.
   *
   * @param {string} id Villkorsidentitet.
   * @return {(Condition|undefined)}
   */
  get(id) {
    return this.#conditions[id];
  }

  // Åtkomstmetod för krav.
  set requirement(req) {
    this.#requirement = req;
  }

  /**
   * Uppdatera eventuella villkor som har beroenden till angiven kontroll.
   *
   * @param {string} checkID Identitet för kontrollen vars tillstånd ändrats.
   * @yield {DerivedCondition}
   */
  *update(checkID) {
    for (const condition of this.#dependencies[checkID] ?? []) {
      condition.update();
      yield condition;
    }
  }

  /**
   * Skapa och lägg till ett villkor i strukturen.
   *
   * Skapar ett manuellt eller härlett villkor baserat på definitionen i
   * konfigurationen och lägger till eventuella underordnade villkor.
   *
   * @private
   * @param {string} condID Villkorsidentitet i konfigurationen.
   * @return {Condition}
   * @throws {TypeError} Villkors- eller kontrolldefinition saknas.
   */
  #addCondition(condID) {
    const condCfg = this.#config.conditions[condID];
    let condition;
    if (!condCfg) {
      throw new TypeError(`Villkorsdefinition "${condID}" saknas.`);
    }
    condCfg ??= {};
    if ('sources' in condCfg) {
      condition = this.#addDerivedCondition(condID, condCfg);
    } else {
      condition = new ManualCondition(condID);
    }
    this.#conditions[condID] = condition;

    this.#addConditionContent(condition, condCfg);
    return condition;
  }

  /**
   * Registrerar vilka kontroller som ingår i ett villkor.
   *
   * Ett villkor har en eller två grenar ("ja" och/eller "nej"). Varje gren
   * kan innehålla kontroller och/eller undervillkor. När villkorets tillstånd
   * ändras (manuellt eller automatiskt) ska kontrollerna i den valda grenen
   * markeras som tillämpliga och kontrollerna i den andra grenen som icke
   * tillämpliga. Vi behöver alltså hålla reda på denna struktur.
   *
   * @private
   * @param {Condition} condition Villkor.
   * @param {object}    condCfg   Villkorskonfiguration.
   */
  #addConditionContent(condition, condCfg) {
    for (const branch of ['yes', 'no']) {
      for (const chkCfg of condCfg[branch] ?? []) {
        if ('condition' in chkCfg) {
          const id = chkCfg.condition;
          condition.addCondition(branch, this.#addCondition(id));
        } else if ('check' in chkCfg) {
          const id = chkCfg.check;
          condition.addCheck(branch, this.#requirement.check(id));
        }
      }
    }
  }

  /**
   * Registrera ett härlett villkor.
   *
   * Ett härlett villkor utvärderas automatiskt baserat på tillstånden hos en
   * eller flera kontroller i samma krav. Vi behöver hålla reda på vilka
   * villkor som har beroenden till vilka kontroller, så att villkoren kan
   * uppdateras automatiskt när granskaren ändrar någon av kontrollernas
   * tillstånd.
   *
   * @private
   * @param {string} condID  Villkorsidentitet.
   * @param {object} condCfg Villkorskonfiguration.
   * @return {DerivedCondition}
   * @throws {TypeError} En kontrolldefinition saknas.
   */
  #addDerivedCondition(condID, condCfg) {
    const condition = new DerivedCondition(condID);
    for (const chkID of condCfg.sources) {
      const check = this.#requirement.check(chkID);
      if (!check) {
        throw new TypeError(`Kontrolldefinition "${chkID}" saknas.`);
      }
      condition.dependsOn(check);
      this.#dependencies[check.id] ??= [];
      this.#dependencies[check.id].push(condition);
    }
    return condition;
  }
}

/**
 * Basklass för villkor.
 *
 * Fälten `applicable` och `disabled` kan ha tre olika värden: sant, falskt
 * eller obestämt (initialtillstånd).
 *
 * `disabled` är `true` om villkoret finns i den valda grenen av överordnat
 * villkor, `false` om det finns i den icke valda grenen eller `unsdefined` om
 * det överordnade villkorets tillstånd är obestämt.
 *
 * Ett villkor med `disabled` satt till ett bestämt värde (`true` eller `false`)
 * har `applicable` satt till inversen av den flaggan. Om `disabled` är obestämt
 * är `applicable` `false` om det överordnade villkoret är avaktiverat, `true`
 * om det är tillämpligt eller `undefined` om det är otillämpligt.
 *
 * Härledda klasser måste implementera:
 * - _initialize()
 *
 * @license CC-BY 4.0
 * @property {boolean}   applicable Sant om villkoret är tillämpligt.
 * @property {boolean}   disabled   Sant om villkoret är avaktiverat.
 * @property {string}    id         Villkorsidentitet.
 * @property {Condition} parent     Eventuellt överordnat villkor.
 */
class Condition {
  // Privata fält.
  #applicable;
  #branches = {
    yes: { checks: [], conditions: [] },
    no: { checks: [], conditions: [] },
  };
  #children = [];
  #disabled;
  #id;
  #parent;

  /**
   * Konstruera en villkorsinstans.
   *
   * @param {string} id Villkorsidentitet.
   */
  constructor(id) {
    this.#id = id;
  }

  /**
   * Lägg till en kontroll i angiven gren.
   *
   * @param {string} branch Gren ("yes"/"no").
   * @param {Check}  check  Kontroll att lägga till.
   */
  addCheck(branch, check) {
    this.#branches[branch].checks.push(check);
    this.#children.push([branch, check]);
  }

  /**
   * Lägg till ett underordnat villkor i angiven gren.
   *
   * @param {string}    branch    Gren ("yes"/"no").
   * @param {Condition} condition Villkor att lägga till.
   */
  addCondition(branch, condition) {
    this.#branches[branch].conditions.push(condition);
    this.#children.push([branch, condition]);
    condition.#parent = this.id;
  }

  // Åtkomstmetoder för tillämplig-flaggan.
  get applicable() {
    return this.#applicable;
  }

  set applicable(flag) {
    this.#applicable = flag;
    const value = flag ? flag : undefined;
    for (const [, child] of this.#children) {
      child.applicable = value;
    }
  }

  /**
   * Iterera över kontrollerna i angiven gren.
   *
   * @param {string} branch Gren ("yes"/"no").
   * @yield {Check}
   */
  *checks(branch) {
    for (const check of this.#branches[branch]?.checks ?? []) {
      yield check;
    }
  }

  /**
   * Iterera över underordnade villkor i angiven gren.
   *
   * @param {string} branch Gren ("yes"/"no").
   * @yield {Condition}
   */
  *conditions(branch) {
    for (const conditions of this.#branches[branch]?.conditions ?? []) {
      yield conditions;
    }
  }

  // Åtkomstmetoder för inaktiv-flaggan.
  get disabled() {
    return this.#disabled;
  }

  set disabled(flag) {
    this.#disabled = flag;
    if (flag) {
      for (const [, child] of this.#children) {
        child.applicable = false;
      }
    } else if (false === flag) {
      this._initialize();
    }
  }

  /**
   * Returnera om villkoret har innehåll i angiven gren.
   *
   * @param {string} branchName Gren ("yes"/"no");
   * @return {boolean}
   */
  hasBranch(branchName) {
    const branch = this.#branches[branchName];
    const checks = branch?.checks.length ?? 0;
    const conditions = branch?.conditions.length ?? 0;
    return checks + conditions > 0;
  }

  /**
   * Returnera om villkoret har kontroller i angiven gren.
   *
   * @param {string} branchName Gren ("yes"/"no");
   * @return {boolean}
   */
  hasChecks(branchName) {
    const branch = this.#branches[branchName];
    const checks = branch?.checks.length ?? 0;
    return checks > 0;
  }

  // Åtkomstmetod för villkorsidentitet.
  get id() {
    return this.#id;
  }

  // Åtkomstmetod för överordnat villkor.
  get parent() {
    return this.#parent;
  }

  /**
   * Iterera över underordnade element.
   *
   * @protected
   * @yield {array} En vektor med två element: grennamn och kontroll/villkor.
   */
  *_children() {
    for (const child of this.#children) {
      yield child;
    }
  }

  /**
   * Initiera villkoret vid aktivering.
   *
   * @protected
   */
  _initialize() {
    // Ska implementeras i härledda klassser.
  }
}

/**
 * Härlett villkor.
 *
 * Ett villkor vars tillstånd beräknas utifrån en härledd kontroll.
 *
 * @license CC-BY 4.0
 * @see Condition
 * @property {boolean} state Tillstånd (uppfyllt/inte uppfyllt).
 */
class DerivedCondition extends Condition {
  // Privata fält.
  #sources = [];

  /**
   * Lägg till en kontroll som villkoret ska härledas från.
   *
   * @param {Check} check Kontroll att lägga till som källa.
   */
  dependsOn(check) {
    this.#sources.push(check);
  }

  // Åtkomstmetod för tillstånd.
  get state() {
    let state;
    for (const check of this.#sources) {
      if (false !== check.applicable) {
        const s = check.state;
        if (null == s) return;
        state ??= s;
        state &&= s;
      }
    }
    return state;
  }

  /**
   * Uppdatera innehållet i enlighet med aktuellt tillstånd.
   */
  update() {
    const state = this.state; // Beräknar tillståndet.
    const selected = state ? 'yes' : false === state ? 'no' : undefined;
    if (!this.disabled && false !== this.applicable) {
      for (const [branch, child] of this._children()) {
        child.disabled = selected && branch !== selected;
      }
    }
  }

  /**
   * {@inheritDoc}
   * @override
   *
   * Initiera underordnade villkor, rekursivt.
   * Uppdatera sedan tillståndet.
   *
   * @protected
   */
  _initialize() {
    for (const branch of ['yes', 'no']) {
      for (const condition of this.conditions(branch)) {
        condition._initialize();
      }
    }
    this.update();
  }
}

/**
 * Manuellt villkor.
 *
 * Ett villkor vars tillstånd sätts manuellt av granskaren.
 *
 * Vid initiering i ett helt eller delvis granskat krav använder klassen fälten
 * `disabled` och `applicable` i underordnade kontroller och villkor:
 * - en gren som har aktiva (`disabled=false`) barn måste vara vald;
 * - en gren som har inaktiva (`disabled=true`) barn måste vara ej vald;
 * - en gren som har tillämpliga barn måste vara tillämplig;
 * - en gren som har otillämpliga barn måste vara otillämplig;
 * - annars är villkorets tillstånd obestämt.
 *
 * Fältet `state` indikerar villkorets tillstånd:
 * - `true` om ja-grenen är vald
 * - `false` om nej-grenen är vald
 * - `undefined` om ingen gren är vald.
 *
 * @license CC-BY 4.0
 * @see Condition
 * @property {boolean} state Tillstånd (vald gren).
 */
class ManualCondition extends Condition {
  // Privata fält.
  #initializing = false;
  #state;

  // Åtkomstmetoder för tillstånd.
  get state() {
    return this.#state;
  }

  set state(state) {
    this.#state = state;
    const selected = state ? 'yes' : false === state ? 'no' : undefined;
    if (!this.disabled && false !== this.applicable) {
      for (const [branch, child] of this._children()) {
        child.disabled = selected && branch !== selected;
      }
    }
  }

  /**
   * Uppdatera tillståndet utifrån innehållet.
   *
   * Om en gren innehåller ett aktiverat element (kontroll eller villkor),
   * sätt den grenen som vald.
   * Om en gren innehåller ett inaktiverat element, sätt den andra grenen som
   * vald.
   *
   * Om villkoret innehåller ett tillämpligt element, gör villkoret
   * tillämpligt. Om det har 1 gren med bara villkor, sätt grenen som vald.
   *
   * Om villkoret innehåller ett otillämpligt element men inga tillämpliga,
   * gör villkoret otillämpligt. Om det har 1 gren med bara villkor, sätt
   * grenen som icke vald.
   */
  update() {
    if (this.disabled) return;

    let applicable = false;
    let inapplicable = false;
    for (const [branch, child] of this._children()) {
      let flag = child.disabled;
      if (null != flag) {
        this.state = (flag ? 'no' : 'yes') === branch;
        this.disabled = false;
        this.applicable = true;
        return;
      }
      flag = child.applicable;
      applicable ||= true === flag;
      inapplicable ||= false === flag;
    }

    const no = this.hasBranch('no');
    const yes = this.hasBranch('yes');
    const single = yes ^ no;
    const branch = single ? (yes ? 'yes' : 'no') : '';
    if (applicable) {
      this.disabled = false;
      this.applicable = true;
      if (single && !this.hasChecks(branch)) this.state = yes;
    } else if (inapplicable) {
      this.applicable = false;
      if (single && !this.hasChecks(branch)) {
        this.disabled = false;
        this.applicable = true;
        this.state = no;
      }
    }
  }

  /**
   * {@inheritDoc}
   * @override
   *
   * Initiera underordnade villkor, rekursivt.
   * Beräkna tillståndet från innehållet om det är obestämt.
   *
   * @protected
   */
  _initialize() {
    if (this.#initializing) return;
    if (null != this.#state) return;
    this.#initializing = true;

    for (const branch of ['yes', 'no']) {
      for (const condition of this.conditions(branch)) {
        condition._initialize();
      }
    }
    this.update();

    this.#initializing = false;
  }
}

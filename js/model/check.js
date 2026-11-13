/**
 * En kontroll i ett krav i ett stickprov i en granskning.
 *
 * En kontroll har tre huvudsakliga egenskaper: tillämplig, aktiv och tillstånd.
 *
 * Att en kontroll inte är tillämplig innebär att den är villkorsstyrd och att
 * villkoret antingen inte är utvärderat eller gör kontrollen ej tillämplig.
 *
 * Att en kontroll är aktiv eller inaktiv innebär också att den är villkorsstyrd
 * och att kontrollen finns i den valda eller icke valda grenen. Om flaggan är
 * odefinierad har granskaren ännu inte utvärderat villkoret.
 *
 * Att en kontroll är underkänd innebär förstås att granskaren tagit ställning
 * och funnit att kontrollen inte är uppfylld. Endast i detta läge är kontrol-
 * lens observation relevant.
 *
 * En komplikation är att en kontroll kan styras av ett härlett villkor och
 * därmed vara beroende av andra kontroller vid beräkning av tillämplighet.
 * Riktigt komplext blir det om villkoret är härlett från en härledd kontroll…
 *
 * Tillståndet är `true` om kontrollen är tillämplig och godkänd, `false` om den
 * är tillämplig och underkänd, eller `undefined` om den inte är tillämplig
 * eller inte är utvärderad.
 *
 * @license CC-BY 4.0
 * @property {boolean}  applicable  Kontrollen tillämplig?
 * @property {number}   cardinality Antalet alternativ i kontrollen.
 * @property {boolean}  disabled    Kontrollen inaktiverad?
 * @property {boolean}  done        Kontrollen granskad?
 * @property {boolean}  failed      Kontrollen underkänd?
 * @property {string}   id          Kontrollidentitet i konfigurationen.
 * @property {string}   observation Observation (felbeskrivning).
 * @property {object}   screenshot  Information om skärmavbildning.
 * @property {boolean}  state       Tillstånd.
 */
class Check {
  // Privata fält.
  #applicable;
  #controllers = [];
  #disabled;
  #id;
  #observation;
  #screenshot = { alt: '', path: '' };

  /**
   * Konstruera en kontrollinstans.
   *
   * @param {object} [data] Dataobjekt att rekonstruera ifrån.
   */
  constructor(data = null) {
    data && this.#unserialize(data);
  }

  // Åtkomstmetoder för tillämplighet.
  get applicable() {
    const applicable = this._controllersApplicable();
    return applicable && this.#applicable;
  }

  set applicable(flag) {
    this.#applicable = null == flag ? undefined : Boolean(flag);
  }

  // Åtkomstmetod för antal alternativ.
  get cardinality() {
    return 1;
  }

  /**
   * Registrera en styrande kontroll.
   *
   * Registrera en kontroll (i samma krav) som styr ett villkor som den
   * aktuella kontrollen ingår i, och vilket tillstånd den styrande kontrollen
   * ska ha för att den aktuella kontrollen ska vara tillämplig.
   *
   * @param {Check}   check Styrande kontroll.
   * @param {boolean} state Tillstånd för tillämplighet.
   */
  controlledBy(check, state) {
    this.#controllers.push({ check, state });
  }

  // Åtkomstmetoder för inaktiveringsflagga.
  get disabled() {
    return this.#disabled;
  }

  set disabled(flag) {
    this.#disabled = null == flag ? undefined : Boolean(flag);
    null != flag && (this.#applicable = !flag);
  }

  // Åtkomstmetod för klarmarkering.
  get done() {
    return false === this.applicable || null != this.state;
  }

  // Åtkomstmetod för underkännande.
  get failed() {
    return false === this.state;
  }

  // Åtkomstmetoder för kontrollidentitet.
  get id() {
    return this.#id;
  }

  set id(id) {
    this.#id = id;
  }

  // Åtkomstmetoder för observation.
  get observation() {
    return this.#observation;
  }

  set observation(text) {
    this.#observation = text?.trim() ?? '';
  }

  // Åtkomstmetod för information om skärmavbildning.
  get screenshot() {
    return Object.assign({}, this.#screenshot);
  }

  /**
   * "Serialisera" instansen för lagring i databasen.
   *
   * Generera ett objekt med den information som behövs för att återskapa
   * instansen. (Styrande kontroller serialiseras inte, eftersom de bara kan
   * återskapas med hjälp av kravinstansen.)
   *
   * Eftersom en typisk granskning innehåller många kontroller är det önskvärt
   * att serialiseringen är så utrymmessnål som möjligt. Därför sparas inte
   * varje fält för sig, utan bara minimal information som räcker för att
   * kunna återskapa instansen.
   *
   * Om kontrollen är underkänd, spara bara observationen.
   * Om kontrollen är inaktiverad eller inte är tillämplig, spara bara den
   * uppgiften.
   *
   * @return {object}
   */
  serialize() {
    const obj = {
      class: this.constructor.name,
      id: this.#id,
    };
    if (this.#disabled) {
      obj.dis = true;
    } else if (false === this.#applicable) {
      obj.na = true;
    } else if (this.failed && this.#observation) {
      obj.obs = this.#observation;
      if (this.#screenshot.path) {
        obj.path = this.#screenshot.path;
        obj.alt = this.#screenshot.alt;
      }
    } else if (false === this.#disabled) {
      obj.dis = false;
    } else if (true === this.#applicable) {
      obj.na = false;
    }
    return obj;
  }

  /**
   * Spara information om skärmavbildning.
   *
   * @param {string} path Filnamn eller sökväg till avbildningen.
   * @param {string} alt  Textalternativ.
   */
  setScreenshot(path, alt) {
    this.#screenshot.path = path?.trim() ?? '';
    this.#screenshot.alt = alt?.trim() ?? '';
  }

  // Åtkomstmetod för kontrolltillstånd.
  get state() {
    // Måste implementeras av härledda klasser.
  }

  /**
   * @inheritDoc
   */
  toJSON() {
    return this.serialize();
  }

  /**
   * @inheritDoc
   * @override
   */
  toString() {
    return this.#id ?? 'namnlös';
  }

  /**
   * Returnerar om alla styrande kontroller är positiva.
   *
   * @protected
   * @return {(boolean|undefined)}
   */
  _controllersApplicable() {
    let applicable = true;
    const checkState = (c, s) => (null == c ? c : s === c);
    for (const { check, state } of this.#controllers) {
      applicable &&= checkState(check.state, state);
    }
    return applicable;
  }

  /**
   * Rekonstruera en kontrollinstans från ett dataobjekt.
   *
   * Om flaggan `dis` (disabled) finns i dataobjektet, sätt inaktiverings-
   * flaggan och sätt tillämpligheten till `false`. Annars, sätt
   * tillämpligheten till inversen av flaggan `na` (not applicable) i
   * dataobjektet, om den finns. Om inte, sätt den till `true` om dataobjektet
   * innehåller en observation.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   * @throws {TypeError} Kravidentiteten stämmer inte.
   */
  #unserialize(data) {
    data.id && (this.#id = data.id);
    if ('dis' in data) {
      this.#disabled = data.dis;
      this.#applicable = !data.dis;
    }
    if ('na' in data) {
      this.#applicable = !data.na;
    } else if ('obs' in data) {
      this.#applicable = true;
      this.#disabled = false;
      this.#observation = data.obs;
      this.#screenshot.path = data.path ?? '';
      this.#screenshot.alt = data.alt ?? '';
    }
  }
}

/**
 * En kontroll vars värde är härlett från andra krav.
 *
 * En härledd kontroll utvärderas inte direkt av användaren, utan dess värde
 * beror på värdet hos ett eller flera krav i samma stickprov. Om kontrollen är
 * "global" ska dess beroenden även omfatta eventuella komponenter som ingår i
 * stickprovet. Normalfallet är att beroendena bara omfattar kraven i själva
 * stickprovet.
 *
 * Om något av de ingående kraven är underkänt är också den härledda kontrollen
 * underkänd.
 *
 * Klassen behöver hämta beroenden för att kunna utvärdera dem. Fältet
 * `dependencies` ska sättas till en funktion som anropas med ett krav-ID och
 * returnerar en vektor av "underkännbara" objekt (i praktiken krav). Detta för
 * att undvika hårda beroenden mellan klasser.
 *
 * En härledd kontroll kan ha som enda syfte att utgöra basen för ett härlett
 * villkor i kravkonfigurationen. En sådan kontroll kallas "villkorsstyrande"
 * och har en tom observation. Den ska inte bidra till utvärderingen
 * av kravet.
 *
 * @license CC-BY 4.0
 * @see Check
 * @property {boolean}  control      Flagga för villkorsstyrning.
 * @property {callback} dependencies Funktion som hämtar beroenden.
 * @property {boolean}  derived      Alltid `true`.
 * @property {boolean}  global       Flagga för globala beroenden.
 * @property {string[]} sources      Källkravsidentiteter.
 */
export class DerivedCheck extends Check {
  // Privata fält.
  #dependencies;
  #dependencyIDs = [];
  #global = false;

  /**
   * Konstruera en härledd kontrollinstans.
   *
   * @param {object} [data] Dataobjekt att rekonstruera ifrån.
   */
  constructor(data = null) {
    super(data);
    data && this.#unserialize(data);
  }

  // Åtkomstmetoder för tillämplighet.
  get applicable() {
    if (!this.#dependencies) {
      throw new TypeError(
        'Kan inte beräkna tillämplighet: kravfunktion saknas.'
      );
    }
    // Tillämplig om något ingående krav är tillämpligt (och alla styrande
    // kontroller).
    const applicable = this._controllersApplicable();
    const dep = (id) => this.#dependencies(id, this.#global).length > 0;
    return applicable && !this.disabled && this.#dependencyIDs.some(dep);
  }

  set applicable(flag) {
    // Ignorera försök att ändra tillämplighet.
  }

  // Åtkomstmetod för villkorsstyrningsflagga.
  get control() {
    return !this.observation;
  }

  // Åtkomstmetod för funktion som hämtar beroenden.
  set dependencies(callback) {
    this.#dependencies = (id, components) => callback(id, components);
  }

  /**
   * Lägg till ett beroende till angivet krav.
   *
   * @param {string} id Kravidentitet i konfigurationen.
   */
  dependsOn(id) {
    this.#dependencyIDs.push(id);
  }

  // Åtkomstmetod för härleddflagga.
  get derived() {
    return true;
  }

  // Åtkomstmetoder för flagga för globala beroenden.
  get global() {
    return this.#global;
  }

  set global(flag) {
    this.#global = Boolean(flag);
  }

  /**
   * @inheritDoc
   * @override
   */
  serialize() {
    const obj = super.serialize();
    obj.dep = this.#dependencyIDs;
    this.#global && (obj.global = true);
    return obj;
  }

  // Åtkomstmetod för kontrolltillstånd.
  get state() {
    if (!this.#dependencies) {
      throw new TypeError(
        'Kan inte beräkna kontrolltillstånd: kravfunktion saknas.'
      );
    }
    if (!this.applicable) return;
    let state;
    for (const id of this.#dependencyIDs) {
      for (const dependency of this.#dependencies(id, this.#global)) {
        const s = dependency.state;
        if (null == s) return;
        state ??= s;
        state &&= s;
      }
    }
    return state;
  }

  // Åtkomstmetod för källkravsidentiteter.
  get sources() {
    return Array.from(this.#dependencyIDs);
  }

  /**
   * Rekonstruera en härledd kontrollinstans från ett dataobjekt.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   */
  #unserialize(data) {
    data.dep?.length && (this.#dependencyIDs = data.dep ?? []);
    this.#global = data.global ?? false;
  }
}

/**
 * En kontroll som består av två eller fler alternativ.
 *
 * En multipel kontroll innehåller minst två alternativa kontroller som var och
 * en kan vara godkänd eller underkänd. Om något alternativ är godkänt är kon-
 * trollen som helhet godkänd; endast om samtliga alternativ är underkända blir
 * kontrollen underkänd.
 *
 * En multipel kontroll serialiseras med alternativen representerade av en bit-
 * mask. Därför är antalet alternativ begränsat till 32, vilket räcker till med
 * god marginal för de kontroller som finns i WCAG och EN 301 549.
 *
 * @license CC-BY 4.0
 * @see Check
 * @see SingleCheck
 */
export class MultipleCheck extends Check {
  // Privata fält.
  #fails;

  /**
   * Konstruera en multipel kontrollinstans.
   *
   * @param {(number|object}} arg Antal alternativ, eller dataobjekt.
   * @throws {TypeError} Antal alternativ inte i intervallet [2,32].
   */
  constructor(arg) {
    if ('number' === typeof arg) {
      if (arg < 2 || arg > 32) {
        throw new TypeError(
          `Ogiltigt antal alternativ (${arg}); ska vara 2–32.`
        );
      }
      super();
      this.#fails = new Array(arg).fill(undefined);
    } else {
      super(arg);
      arg && this.#unserialize(arg);
    }
  }

  // Åtkomstmetod för antal alternativ.
  get cardinality() {
    return this.#fails.length;
  }

  /**
   * Underkänner eller godkänner ett alternativ.
   *
   * @param {number}  index Alternativ att underkänna (0-baserat).
   * @param {boolean} flag  Underkänn (`true`) eller godkänn (`false`).
   * @throws {TypeError} Angivet index finns inte i kontrollen.
   */
  fail(index, flag) {
    this.#checkIndex(index);
    this.#fails[index] = Boolean(flag);
  }

  /**
   * Returnerar om det angivna alternativet är underkänt.
   *
   * @param {number} index Index för alternativ (0-baserat).
   * @return {(boolean|undefined)}
   * @throws {TypeError} Angivet index finns inte i kontrollen.
   */
  fails(index) {
    this.#checkIndex(index);
    if (!this.applicable) return undefined;
    return this.#fails[index];
  }

  /**
   * @inheritDoc
   */
  serialize() {
    const bit = (acc, bit, i) => (acc |= bit << i);
    const fail = (acc, flag, i) => bit(acc, flag ? 1 : 0, i);
    const mask = (acc, flag, i) => bit(acc, undefined !== flag, i);
    const obj = super.serialize();
    obj.n = this.cardinality;
    if (false !== this.applicable) {
      if (this.#fails.every((f) => false === f)) {
        delete obj.obs;
        delete obj.dis;
        delete obj.na;
        obj.ok = true;
      } else if (this.#fails.some((f) => true !== f)) {
        const m = this.#fails.reduce(mask, 0);
        if (0 !== m) {
          delete obj.obs;
          delete obj.dis;
          delete obj.na;
          obj.m = m;
          obj.f = this.#fails.reduce(fail, 0);
        }
      }
    }
    return obj;
  }

  // Åtkomstmetod för kontrolltillstånd.
  get state() {
    if (!this.applicable) return;
    if (this.#fails.some((f) => false === f)) return true;
    if (this.#fails.every((f) => true === f)) return false;
  }

  /**
   * Validera index för kontrollalternativ.
   *
   * @private
   * @param {number} index Index för alternativ (0-baserat).
   * @throws {TypeError} Angivet index finns inte i kontrollen.
   */
  #checkIndex(index) {
    if (!(index in this.#fails)) {
      const max = this.#fails.length - 1;
      throw new TypeError(
        `Ogiltigt alternativindex: ${index}; ska vara 0–${max}.`
      );
    }
  }

  /**
   * Rekonstruera en multipel kontrollinstans från ett dataobjekt.
   *
   * Sätt kardinaliteten från fältet `n` i dataobjektet och populera vektorn
   * med underkännandeflaggor från bitmasken i fältet `mask`.
   *
   * Om `mask` saknas, men `obs` finns i dataobjektet, måste alla alternativ
   * vara underkända.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   * @throws {TypeError} Antal alternativ saknas eller ogiltigt.
   */
  #unserialize(data) {
    if (undefined === data.n) {
      throw new TypeError('Antal kontrollalternativ saknas.');
    } else if (data.n < 2 || data.n > 32) {
      throw new TypeError(`Ogiltigt antal alternativ: ${data.n}.`);
    }

    this.#fails = new Array(data.n).fill(undefined);
    if (false === this.applicable) return;

    if (data.ok) {
      super.applicable = true;
      super.disabled = false;
      this.#fails.fill(false);
    } else if (undefined !== data.m) {
      super.applicable = true;
      super.disabled = false;
      const fail = data.f ?? 0;
      const mask = data.m;
      for (let n = 0; n < data.n; ++n) {
        if (0 === (mask & (1 << n))) continue;
        this.#fails[n] = 0 !== (fail & (1 << n));
      }
    } else if (data.obs) {
      this.#fails.fill(true);
    }
  }
}

/**
 * En kontroll som saknar alternativ.
 *
 * En singulär kontroll utgör ett enda påstående som kan vara sant (godkänt)
 * eller falskt (underkänt). Majoriteten av kontrollerna i WCAG och EN 301 549
 * är singulära kontroller.
 *
 * @license CC-BY 4.0
 * @see Check
 * @see DerivedCheck
 * @see MultipleCheck
 */
export class SingleCheck extends Check {
  // Privata fält.
  #failed;

  /**
   * Konstruera en singulär kontrollinstans.
   *
   * @param {object} [data] Dataobjekt att rekonstruera ifrån.
   * @throws {TypeError} Kravidentitet saknas.
   */
  constructor(data = null) {
    super(data);
    data && this.#unserialize(data);
  }

  // Åtkomstmetoder för underkännande.
  get failed() {
    return super.failed;
  }

  set failed(flag) {
    this.#failed = null == flag ? undefined : Boolean(flag);
  }

  /**
   * @inheritDoc
   */
  serialize() {
    const obj = super.serialize();
    if (false !== this.applicable && false === this.#failed) {
      delete obj.obs;
      delete obj.dis;
      delete obj.na;
      obj.ok = true;
    }
    return obj;
  }

  // Åtkomstmetoder för kontrolltillstånd.
  get state() {
    if (!this.applicable) return;
    const inv = (f) => (null == f ? f : !f);
    return inv(this.#failed);
  }

  /**
   * Rekonstruera en singulär kontrollinstans från ett dataobjekt.
   *
   * Om dataobjektet innehåller fältet `ok`, sätt underkännandeflaggan till
   * dess invers. Om inte, sätt flaggan till `true` om dataobjektet innehåller
   * en observation, annars till `undefined`.
   *
   * @private
   * @param {object} data Dataobjekt att rekonstruera ifrån.
   */
  #unserialize(data) {
    this.#failed = data.ok ? !data.ok : data.obs ? true : undefined;
    if (null != this.#failed) {
      super.applicable = true;
      super.disabled = false;
    }
  }
}

/**
 * Fabriksklass för att bygga kontroller.
 *
 * Bygger en kontrollinstans från ett dataobjekt hämtat från en JSON-fil.
 * Rekonstruerar en kontrollinstans från ett dataobjekt hämtat från databasen.
 *
 * Dataobjektet måste innehålla fältet `class` med ett värde som motsvarar
 * någon av kontrollklassernas namn.
 *
 * @license CC-BY 4.0
 */
export class CheckFactory {
  /**
   * Bygg en kontrollinstans baserad på dataobjektets innehåll.
   *
   * @param {object} data   Dataobjekt att populera ifrån.
   * @return {(DerivedCheck|MultipleCheck|SingleCheck)}
   * @throws {TypeError} Kontrolltyp saknas eller är ogiltig.
   */
  static build(data) {
    const map = {
      DerivedCheck: (d) => new DerivedCheck(d),
      MultipleCheck: (d) => new MultipleCheck(d),
      SingleCheck: (d) => new SingleCheck(d),
    };

    const type = data?.class;
    if (!type) {
      throw new TypeError('Kontrolltyp saknas.');
    } else if (!(type in map)) {
      throw new TypeError(`Ogiltig kontrolltyp '${type}'.`);
    }

    return map[type](data);
  }
}

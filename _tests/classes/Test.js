/**
 * Ett test i ett enhetstestfall.
 *
 * Test är de minsta beståndsdelarna i ett testfall och grupperas i sviter.
 *
 * Ett test skapas med funktionen `it()` med en beskrivning och en implementa-
 * tion. Beskrivningen ska återge något som testobjektet ska eller bör göra. (På
 * engelska blir det hela en komplett mening.
 *
 * @example
 * it("adds two arguments", () => {
 *     expect(foo(2, 3)).toBe(5)
 * })
 *
 * @example
 * it("should set and get the status", () => {
 *     expect(foo.status).toBe(undefined)
 *     const status = "ok"
 *     foo.status = status
 *     expect(foo.status).toBe(status)
 * })
 *
 * Test kan skapas med en uppsättning data som testet ska köras med.
 *
 * @example
 * it.with(-1, 0, 1, 1024)(
 *     "should handle value {0}",
 *     (fixture) => {
 *         expect(foo.bar(fixture)).toBe(true)
 *     }
 * )
 *
 * Test kan tillfälligt undantas från körningen, exempelvis ett inkomplett test
 * som skulle ge ett fel eller avbryta testkörningen.
 *
 * @example
 * it.skip("should be skipped", () => {...})
 *
 * Omvänt kan ett test tillfälligt markeras som det enda testet som ska köras.
 * Det kan vara användbart när man bygger och testar en ny komponent och inte
 * vill behöva köra samtliga testfall för samtliga komponenter varje gång.
 *
 * @example
 * it.only("should be the only one", () => {...})
 *
 * @license CC-BY 4.0
 * @property {boolean} only   Anger om testet är märkt med "only".
 * @property {object}  status Ett objekt med fälten `pass`, `fail` och `skipped`
 *                            som anger antalet godkända, underkända respektive
 *                            överhoppade körningar.
 */
export class Test {
  // Privata fält.
  #args;
  #descr;
  #impl;
  #iterations = [];
  #only;
  #setUp;
  #skip;

  /**
   * Konstruera en testinstans.
   *
   * Parametrar kan anges i `options`-argumentet:
   * - `args`  Argument att anropa testet med.
   * - `only`  Flagga för att testet ska köras isolerat.
   * - `setUp` Förberedelsefunktioner att köra före varje iteration.
   * - `skip`  Flagga fÖr att testet ska ignoreras.
   *
   * Körningsargument anges som vektorer. Det gör det möjligt att köra testet
   * flera gånger med flera argument åt gängen. Argumenten kan refereras i
   * beskrivningen med `{0}` för första argumentet, `{1}` för andra osv.
   *
   * @example
   * it.with(["foo", 42], ["bar", 13])(
   *     "should set name to {0} and status to {1}",
   *     (name, value) => {...}
   * )
   * new Test(
   *
   * Testet i exemplet kommer att köras två gånger: första gången med
   * `name="foo"` och `value=42`, andra gången med `name="bar"` och
   * `value=13`.
   *
   * Parametrarna `only` och `skip` sätts via hjälpfunktionerna>
   *
   * @example
   * it.only("descr",  () => {...})
   * new Test("descr", () => {...}, {only: true})
   *
   * @example
   * it.skip("descr",  () => {...})
   * new Test("descr", () => {...}, {skip: true})
   *
   * En utelämnad eller odefinierad implementation skapar ett avvaktande
   * ("pending") test.
   *
   * @param {string}   description Beskrivning av testet.
   * @param {function} [impl]      Implementation.
   * @param {object}   [options]   Parametrar.
   * @throws {TypeError} Ogiltig parameter.
   */
  constructor(description, impl, options = {}) {
    if (undefined !== impl && 'function' !== typeof impl) {
      throw new TypeError(
        'Argument #2 till Test.constructor() ska vara en funktion.'
      );
    }

    if ('object' !== typeof options) {
      throw new TypeError(
        'Argumnent #3 till Test.constructor() ska vara ett objekt.'
      );
    }

    this.#args = options.args || [[]];
    this.#descr = String(description);
    this.#impl = impl;
    this.#only = options.only || false;
    this.#setUp = options.setUp || [];
    this.#skip = options.skip || false;
  }

  /**
   * Iterator över körningsstatusar.
   *
   * Genererar ett statusobjekt för varje körning. Om testet inte skapats med
   * `it.with()` finns bara en körning att iterera över.
   *
   * För varje körning avger generatorn ett objekt med fälten `description`
   * och `status` ("pass", "fail", "pending" eller "skipped"). Om status är
   * "fail" finns även fältet `reason` som innehåller felet.
   *
   * Metoden {@link run} måste ha körts för att det ska finnas några status-
   * objekt att iterera över.
   *
   * @yield {object}
   */
  *iterations() {
    for (const iter of this.#iterations) {
      yield iter;
    }
  }

  // Åtkomstmetod för flaggan för solokörning.
  get only() {
    return this.#only;
  }

  /**
   * Kör testimplementationen.
   *
   * Om testet är markerat med `skip`, sätt körningsstatus till "skipped".
   * Om testet är avvaktande, sätt körningsstatus till "pending".
   *
   * I annat fall, kör testimplemenationen (som kan vara asynkron) med
   * eventuellt angivna argument och invänta att körningarna slutförs. Skapa
   * sedan ett statusobjekt för varje körning, som iteratorn kan returnera.
   *
   * @return {this}
   */
  async run() {
    if (this.#skip) {
      return this.#skippedTest();
    } else if (undefined === this.#impl) {
      return this.#pendingTest();
    }

    this.#iterations = [];
    for (const [index, args] of this.#args.entries()) {
      try {
        this.#setUp.forEach((f) => f());
        await this.#impl(...args);
        this.#iterations.push({
          description: this.#formatDescr(index),
          status: 'pass',
        });
      } catch (err) {
        if (!(err instanceof ExpectationFailure)) {
          console.error(err);
        }
        this.#iterations.push({
          description: this.#formatDescr(index),
          status: 'fail',
          reason: err,
        });
      }
    }

    return this;
  }

  /**
   * Åtkomstmetod för aggregerad status.
   *
   * Returnera ett objekt med antalet underkända, godkända, avvaktande och
   * övehoppade körningar (fälten `fail`, `pass`, `pending` respektive
   * `skipped`).
   *
   * För test utan argument kommer ett fält att ha värdet 1 och de övriga 0.
   *
   * @return {object} Antal körningar per kategori.
   */
  get status() {
    return this.#iterations.reduce(
      (acc, cur) => {
        ++acc[cur.status];
        return acc;
      },
      { fail: 0, pass: 0, pending: 0, skipped: 0 }
    );
  }

  /**
   * Formatera testbeskrivning med argument.
   *
   * Ersätter referenser av typen `{n}` i testbeskrivningen med värdet på
   * motsvarande argument vid angiven körning av testimplementationen.
   *
   * Referenserna är 0-baserade, så `{0}` ersätts med värdet på första
   * argumentet och så vidare.
   *
   * @param {number} index Körningsnummer (0-baserat).
   * @return {string}
   */
  #formatDescr(index) {
    return this.#descr.replaceAll(
      /\{(\d+)\}/g,
      (match, digits) => this.#args[index][Number(digits)]
    );
  }

  /**
   * Skapa och lagra ett statusobjekt för ett avvaktande test.
   *
   * @private
   * @return {this}
   */
  async #pendingTest() {
    this.#iterations.push({
      description: this.#descr,
      status: 'pending',
    });
    return this;
  }

  /**
   * Skapa och lagra ett statusobjekt för en överhoppad körning.
   *
   * @private
   * @return {this}
   */
  async #skippedTest() {
    this.#iterations.push({
      description: this.#descr,
      status: 'skipped',
    });
    return this;
  }
}

// Importera beroendend
import { ExpectationFailure } from './Expectation.js';

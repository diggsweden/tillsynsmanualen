/**
 * Statisk klass för att köra enhetstestfall.
 *
 * Klassen har bara statiska metoder och ska inte instansieras.
 *
 * Metoderna anropas av funktionerna `describe()` och `it()` för att skapa test-
 * sviter respektive tester i testfallsmoduler.
 *
 * Såväl laddning av testfall som körning av tester sker asynkront.
 *
 * @example
 * for (const script of listOfTestCaseModules) {
 *     TestRunner.addCase(script)
 * }
 * ...
 * TestRunner.run().then(() => ...)
 *
 * @license CC-BY 4.0
 * @see TestCase
 * @see TsetSuite
 * @see Test
 */
export class TestRunner {
  // Privata fält.
  static #cases = [];
  static #only;
  static #loadStarted;

  /**
   * Lägg till en förberendelsefunktion för varje test till aktuell samling.
   *
   * @param {function} impl Implementation.
   */
  static addBeforeEach(impl) {
    const cases = TestRunner.#cases;
    cases[cases.length - 1].addBeforeEach(impl);
  }

  /**
   * Lägg till ett testfall och ladda dess modul.
   *
   * Returnea ett löfte som infrias när modulen laddats.
   *
   * @param {string} script Sökväg till testfallets modul.
   */
  static async addCase(script) {
    if (!this.#loadStarted) {
      // Första skriptet: starta tidtagningen.
      this.#loadStarted = Date.now();
    }

    const testCase = new TestCase(script);
    TestRunner.#cases.push(testCase);
    try {
      await testCase.load();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  /**
   * Delegera tillägg av testsamling.
   *
   * Delegera funktionen till det senast tillagda testfallet.
   *
   * @param {string}   name Samlingens namn.
   * @param {function} impl Implementation.
   */
  static addCollection(name, impl) {
    const cases = TestRunner.#cases;
    cases[cases.length - 1].addSuite(name, impl);
  }

  /**
   * Delegera tillägg av test.
   *
   * Delegera funktionen till det senast tillagda testfallet.
   *
   * @param {string}   description Beskrivning av testet.
   * @param {function} impl        Implementation.
   * @param {object}   options     Parametrar.
   */
  static addTest(description, impl, options) {
    const cases = TestRunner.#cases;
    cases[cases.length - 1].addTest(description, impl, options);
  }

  /**
   * Iterator över testfall.
   *
   * Genererar varje tillagt testfall.
   *
   * @yield {TestCase}
   */
  static *cases() {
    for (const testCase of TestRunner.#cases) {
      yield testCase;
    }
  }

  /**
   * Åtkomstmetod för eventuellt solotest.
   *
   * Fältet populeras av metoden `run()` om något test är märkt med `only`.
   *
   * @return {(array|undefined)} Testfall och test, om solotest finns.
   */
  static get only() {
    return TestRunner.#only;
  }

  /**
   * Kör alla testfall (eller ett solotest).
   *
   * Om något test är märkt med `only´, kör enbart det testet. I annat fall,
   * kör samtliga tillagda testfall.
   *
   * @return {number} Körningstiden i millisekunder.
   */
  static async run() {
    const runStarted = Date.now();
    const timers = {
      load: runStarted - this.#loadStarted,
      run: 0,
    };

    const only = TestRunner.#findOnly();
    if (only) {
      // Hittade ett solotest.
      TestRunner.#only = only;

      try {
        const [, test] = only;
        await test.run();
      } catch (err) {
        console.error(err);
      }
    } else {
      // Inget solotest; kör alla testfall.
      try {
        await Promise.all(this.#cases.map((c) => c.run()));
      } catch (err) {
        console.error(err);
      }
    }

    timers.run = Date.now() - runStarted;
    return timers;
  }

  /**
   * Sök efter solotest.
   *
   * Letar rekursivt i tillagda testfall efter ett test markerat med flaggan
   * `only`. Om ett sådant test finns ska enbart det testet köras.
   *
   * Om inget testfall innehåller något solotest ska metoden returnera `null`.
   *
   * @private
   * @return {(array|null)} Testfall och test om solotest hittats.
   */
  static #findOnly() {
    for (const testCase of TestRunner.#cases) {
      const test = testCase.findOnly();
      if (test) {
        return [testCase, test];
      }
    }

    return null;
  }
}

// Importera beroenden.
import { TestCase } from './TestCase.js';

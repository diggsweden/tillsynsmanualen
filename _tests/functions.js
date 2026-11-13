/**
 * Lägg till en förberendelsefunktion för varje test till aktuell svit.
 *
 * Den angivna funktionen kommer att anropas före varje test i sviten.
 *
 * @example
 * beforeEach(() => {...})
 *
 * @param {function} impl Implementation.
 */
export function beforeEach(impl) {
  TestRunner.addBeforeEach(impl);
}

/**
 * Skapa och lägg till en testsvit.
 *
 * @example
 * describe("My test suite", () => {...})
 *
 * @param {string}   name Svitens namn.
 * @param {function} impl Impelemntation.
 */
export function describe(name, impl) {
  TestRunner.addCollection(name, impl);
}

/**
 * Skapa en förväntning som kan infrias eller avvisas.
 *
 * Skapa en instans av klassen `Expectation` och returnera den.
 *
 * Klassen har ett "fluid"-gränssnitt som gör det möjligt att skapa förvänt-
 * ningar med god läsbarhet för människor.
 *
 * @example
 * expect(obj.prop).toBe(42)
 *
 * @example
 * expect(mock.func).toHaveBeenCalled.atLeastOnce()
 *
 * @license CC-BY 4.0
 * @see Expectation
 *
 * @param {*} arg Värde att jämföra med eller funktion att validera.
 * @return {Expectation}
 */
export function expect(arg) {
  return new Expectation(arg);
}

/**
 * Matcha en förväntning om ett funktionsargument.
 *
 * @example
 * foo.bar(42, () => {...})
 * expect(foo.bar).toHaveBeenCalled.with(42, expect.anyFunction())
 *
 * @return {function}
 */
expect.anyFunction = () => {
  return () => {};
};

/**
 * Skapa en förväntning om att ett undantag ska genereras (synkront).
 *
 * @example
 * expect.exception(() => divideBy(0))
 *
 * @param {function} func Funktion som förväntas orsaka ett undantag.
 * @return {Expectation}
 * @throws {ExpectationFailure}
 */
expect.exception = (func) => {
  try {
    func();
  } catch (err) {
    return new Expectation(err);
  }
  throw new ExpectationFailure('Borde ha orsakat ett undantag.');
};

/**
 * Skapa en förväntning om att en asynkron funktion ska misslyckas.
 *
 * @example
 * await expect.failure(() => asyncFunction())
 *
 * @param {function} func Asynkron funktion som förväntas misslyckas.
 * @return {Expectation}
 * @throws {ExpectationFailure}
 */
expect.failure = async (func) => {
  try {
    await func();
  } catch (err) {
    return new Expectation(err);
  }
  throw new ExpectationFailure('Borde ha orsakat ett undantag.');
};

/**
 * Skapa och lägg till ett test.
 *
 * @example
 * it("should return today's date", () => {...})
 *
 * @param {string}   description Beskrivning av testet.
 * @param {function} [impl]      Implementation.
 */
export function it(description, impl) {
  TestRunner.addTest(description, impl);
}

/**
 * Skapa och lägg till ett solotest.
 *
 * @example
 * it.only("should be run alone", () => {...})
 *
 * @see it.with
 * @param {string}   description Beskrivning av testet.
 * @param {function} [impl]      Implementation.
 */
it.only = (description, impl) => {
  TestRunner.addTest(description, impl, { only: true });
};

/**
 * Skapa och lägg till ett test som tillfälligt ska hoppas över.
 *
 * @example
 * it.skip("should be skipped", () => {...})
 *
 * @param {string}   description Beskrivning av testet.
 * @param {function} [impl]      Implementation.
 */
it.skip = (description, impl) => {
  TestRunner.addTest(description, impl, { skip: true });
};

/**
 * Skapa och lägg till ett test som ska köras med olika argument.
 *
 * Argumenten ska anges som vektorer, för att göra det möjligt att anropa ett
 * test flera gånger med flera argument åt gången.
 *
 * @example
 * it.with(["foo", 13], ["bar", 42])(
 *     "should set name to {0} and id to {1}",
 *     (name, id) => {...}
 * )
 *
 * @param {...*}  args Argument att anropa testet med.
 */
it.with =
  (...args) =>
  (description, impl) => {
    TestRunner.addTest(description, impl, { args: args });
  };

it.only.with =
  (...args) =>
  (description, impl) => {
    TestRunner.addTest(description, impl, { args: args, only: true });
  };

it.skip.with =
  (...args) =>
  (description, impl) => {
    TestRunner.addTest(description, impl, { skip: true });
  };

/**
 * Bekvämlighetsfunktion som skapar en instans för visning av testresultat.
 *
 * Returnerar en instans av {@link TestHTMLView} till vilken det går att foga
 * en kedja av metodanrop i ett "fluid"-gränssnitt.
 *
 * @example
 * show().tests(...).detailsIn(...).totalsIn(...).controlledBy(...)
 *
 * @license CC-BY 4.0
 * @see TestHTMLView
 */
export function show() {
  return new TestHTMLView();
}

/**
 * Vänta angivet antal millisekunder.
 *
 * Kan användas för att vänta in händelser som använder `setTimeout()` för att
 * exekvera i nästa varv i händelseslingan.
 *
 * @example
 * await wait(500)
 *
 * @license CC-BY 4.0
 * @param {number} ms Antal millisekunder att vänta.
 * @return {Promise} Ett löfte som infrias efter den angivna tiden.
 */
export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Importera beroenden.
import { Expectation, ExpectationFailure } from './classes/Expectation.js';
import { TestHTMLView } from './classes/TestHTMLView.js';
import { TestRunner } from './classes/TestRunner.js';

// Exportera funktionen för att ersätta objekt i enhetstester.
export { mock } from './mock.js';

/**
 * Ett enhetstestfall.
 *
 * Testfall innehåller de tester, grupperade i samlingar, som testar en specifik
 * komponent.
 *
 * Ett testfall är en JavaScript-modul där samlingarna och testerna skapas med
 * funktionerna `describe()` och `it()`.
 *
 * @license CC-BY 4.0
 * @see Test
 * @see TestCollection
 *
 * @property {string} script Sökvägen till testfallets modul.
 */
export class TestCase extends TestCollection {
  // Privata fält.
  #script;

  /**
   * Konstruera en testfallsinstans.
   *
   * @example
   * const testCase = new TestCase("./MyClass.test.js")
   * testCase.load().then(() => ...)
   *
   * @param {string} script Sökvägen till testfallets modul.
   */
  constructor(script) {
    super(script.replace(/^.*\/|(\.test)?\.js$/g, ''));
    this.#script = script;
  }

  /**
   * Ladda testfallets modul.
   *
   * Skapa innehållet i testfallet genom att ladda dess modul, som förväntas
   * innehålla anrop till funktionen `describe()` för att skapa sviter och
   * till funktionen `it()` för att skapa tester i sviterna.
   */
  async load() {
    await import(this.#script);
  }

  // Åtkomstmetod för sökvägen till testfallets modul.
  get script() {
    return this.#script;
  }
}

// Importera beroenden.
import { Test } from './Test.js';
import { TestCollection } from './TestCollection.js';

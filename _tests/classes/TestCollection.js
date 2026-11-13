/**
 * En samling (svit) av tester i ett enhetstesfall.
 *
 * Samlingar grupperar ett antal tester under en gemensam beskrivning och utgör
 * beståndsdelarna i ett testfall. Samlingar kan vara nästlade: en samling kan
 * innehålla andra samlingar såväl som enstaka tester.
 *
 * @license CC-BY 4.0
 * @see Test
 *
 * @property {string} name   Samlingens namn.
 * @property {object} status Ett objekt med fälten `pass`, `fail`, `pending`
 *                           och `skipped` som anger antalet godkända, under-
 *                           kända, avvaktande respektive överhoppade tester.
 */
export class TestCollection {
  // Privata fält.
  #beforeEach;
  #current;
  #entries = [];
  #name;
  #status = {};

  /**
   * Konstruera en samlingsinstans.
   *
   * Konstruktorn tar bara namnet på samlingen; implementationen skapas genom
   * att exekvera fuktionen när samlingen är skapad.
   *
   * @example
   * describe("My suite", func)
   *
   * new TestCollection("My suite")
   * func()
   *
   * @param {string}     name    Samlingens namn.
   * @param {function[]} [setUp] Ärvda förberedelsefunktioner.
   */
  constructor(name, setUp = []) {
    this.#name = String(name);
    this.#beforeEach = {};
    if (setUp.length > 0) {
      this.#beforeEach.parent = setUp;
    }
  }

  /**
   * Lägg till en förberendelsefunktion för varje test.
   *
   * En förberedelsefunktion körs omedelbart före varje testiteration, och
   * används vanligen för att skapa en "fixtur", alltså en instans av den
   * klass som testfallet testar, eller andra resurser som är gemensamma för
   * flera tester i samlingen.
   *
   * Om instansen har en underordnad samling som är "aktuell", det vill säga
   * dess implementation håller på att köras, delegera anropet till den.
   *
   * I annat fall, lägg till förberedelsefunktionen i instansen.
   *
   * @param {function} impl Förberedelsefunktion.
   */
  addBeforeEach(impl) {
    if (this.#current) {
      // Delegera till aktuell underordnad samling.
      this.#current.addBeforeEach(impl);
    } else {
      this.#beforeEach.me = impl;
    }
  }

  /**
   * Lägg till en underordnad samling.
   *
   * Skapa en samlingsinstans och lägg till den i innehållet. Kör sedan den
   * tillhörande implementationsfunktionen för att skapa innehållet i den
   * underordnade samlingen.
   *
   * Om instansen har en underordnad samling som är "aktuell", det vill säga
   * dess implementation håller på att köras, delegera anropet till den.
   *
   * I annat fall, lägg till samlingen som "aktuell" underordnad samling i
   * instansen.
   *
   * @param {string}   name Samlingens namn.
   * @param {function} impl Implementation.
   */
  addSuite(name, impl) {
    if (this.#current) {
      // Delegera till aktuell underordnad samling.
      this.#current.addSuite(name, impl);
    } else {
      // Skapa en underornad samling och sätt den som aktuell.
      this.#current = new TestCollection(name, this.#chainSetUp());
      this.#entries.push({ type: 'collection', entry: this.#current });

      // Skapa innehållet i den underordnade samlingen.
      impl();
      this.#current = undefined;
    }
  }

  /**
   * Lägg till ett test till samlingen.
   *
   * Skapa en testinstans och lägg till den i innehållet.
   *
   * Om instansen har en underordnad samling som är "aktuell", det vill säga
   * dess implementation håller på att köras, delegera anropet till den.
   *
   * I annat fall, lägg till testet i instansen.
   *
   * @see Test
   * @param {string}   description Beskrivning av testet.
   * @param {function} impl        Implementation.
   * @param {object}   options     Parametrar.
   */
  addTest(description, impl, options) {
    if (this.#current) {
      // Delegera till aktuell underordnad samling.
      this.#current.addTest(description, impl, options);
    } else {
      // Lägg till en ny testinstans i innehållet.
      if (Object.values(this.#beforeEach).length > 0) {
        options = options || {};
        options.setUp = this.#chainSetUp();
      }

      this.#entries.push({
        type: 'test',
        entry: new Test(description, impl, options),
      });
    }
  }

  /**
   * Iterator över innehåll.
   *
   * Genererar ett objekt för varje ingående test och underordnad samling.
   * Objektet har fälten `type` ("test" eller "collection") och `entry`
   * (själva testet eller samlingen).
   *
   * @yield {object}
   */
  *entries() {
    for (const entry of this.#entries) {
      yield entry;
    }
  }

  /**
   * Sök efter underordnat solotest.
   *
   * Letar rekursivt i innehållet efter ett test markerat med flaggan `only`.
   * Om ett sådant test finns ska enbart det testet köras.
   *
   * Om varken instansen eller någon av dess underordnade samlingar inte
   * innehåller något solotest ska metoden returnera `null`.
   *
   * @return {(Test|null)}
   */
  findOnly() {
    for (const entry of this.#entries) {
      if ('collection' === entry.type) {
        // Sök i underordnad samling.
        const test = entry.entry.findOnly();
        if (test) {
          return test;
        }
      } else if (entry.entry.only) {
        return entry.entry;
      }
    }

    return null;
  }

  // Åtkomstmetod för samlingens namn.
  get name() {
    return this.#name;
  }

  /**
   * Kör alla tester i samlingen och dess underordnade samlingar.
   *
   * Eftersom testkörningar kan vara asynkrona returnerar metoden ett löfte
   * som infrias med samlingsinstansen när alla körningar är slutförda. Då
   * aggregeras även körningsstatusarna till ett objekt som kan returneras av
   * åtkomstmetoden `status()`.
   *
   * @return {this}
   */
  async run() {
    this.#status = {
      pass: 0,
      fail: 0,
      pending: 0,
      skipped: 0,
    };

    // Invänta alla testkörningar.
    const entries = await this.#runAll();

    // Aggregera körningsstatusar.
    entries.forEach((entry) => {
      ['pass', 'fail', 'pending', 'skipped'].forEach((prop) => {
        this.#status[prop] += entry.status[prop] || 0;
      });
    });

    return this;
  }

  /**
   * Åtkomstmetod för aggregerad körningsstatus.
   *
   * Retrurnera ett objekt med de sammanlagda antalen underkända, godkända,
   * avvaktande och överhoppade tester (fälten `fail`, `pass`, `pending`
   * resoektive `skipped`).
   *
   * Om testerna i samlingen inte körts (metoden `run()`), returnera ett tomt
   * objekt.
   *
   * @return {object}
   */
  get status() {
    return this.#status;
  }

  /**
   * Sätt ihop förberedelsefunktioner till en kedja.
   *
   * Konkatenera ärvda förberedelsefunktioner med samlingens egen.
   *
   * @private
   * @return {array}
   */
  #chainSetUp() {
    return [].concat(...Object.values(this.#beforeEach));
  }

  /**
   * Kör alla tester.
   *
   * Om förberedelsefunktioner är angivna i instansen eller i någon överordnad
   * samling måste testerna köras synkront för att garantera exekverings-
   * ordningen. Annars körs de asynkront för bästa möjliga prestanda.
   *
   * @return {array}
   */
  async #runAll() {
    if (0 == Object.values(this.#beforeEach).length) {
      // Inga förberedelsefunktioner: kör asynkront.
      return await Promise.all(this.#entries.map((e) => e.entry.run()));
    }

    const entries = [];
    for (const entry of this.#entries) {
      entries.push(await entry.entry.run());
    }

    return entries;
  }
}

// Importera beroenden.
import { Test } from './Test.js';

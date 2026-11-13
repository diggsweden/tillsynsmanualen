/**
 * Kör enhetstester och visar resultaten på en webbsida.
 *
 * Klassen kan visa resultaten på tre olika detaljnivåer: testfall, sviter eller
 * tester.
 *
 * Klassen stödjer ett "fluid"-gränssnitt så att metodanropen går att koppla
 * ihop i en kedja.
 *
 * @example
 * new TestHTMLView().tests(...).detailsIn(...).totalsIn(...).controlledBy(...)
 *
 * @license CC-BY 4.0
 * @see TestRunner
 */
export class TestHTMLView {
  // Privata fält.
  #controls;
  #counts;
  #details;
  #level = 'cases';
  #path = './';
  #scripts;
  #totals;

  /**
   * Ange en radiogrupp som styr detaljnivån.
   *
   * Lägg till händelselyssnare för radioknapparna.
   *
   * Om alla nödvändiga komponenter är på plats, kör testerna och visa
   * resultatet.
   *
   * @param {RadioNodeList} radioGroup Radiogrupp.
   * @return {this}
   * @throws {TypeError} Ogiltig parameter.
   */
  controlledBy(radioGroup) {
    if (!(radioGroup instanceof RadioNodeList)) {
      throw new TypeError(
        'Argument #1 till controlledBy() ska vara en RadioNodeList.'
      );
    }

    this.#controls = radioGroup;
    for (const btn of radioGroup) {
      btn.addEventListener('click', (event) => this.#setDetailLevel());
    }
    this.#setDetailLevel();

    return this;
  }

  /**
   * Ange behållaren där detaljresultaten ska redovisas
   *
   * Om alla nödvändiga komponenter är på plats, kör testerna och visa
   * resultatet.
   *
   * @param {HTMLUListElement} container Behållare (UL).
   * @return {this}
   * @throws {TypeError} Ogiltig parameter.
   */
  detailsIn(container) {
    if (!(container instanceof HTMLUListElement)) {
      throw new TypeError('Argument #1 till detailsIn() ska vara en <ul>.');
    }

    this.#details = container;
    return this;
  }

  /**
   * Ange en relativ sökväg från klassen till testskripten.
   *
   * @param {string} path Relativ sökväg>
   * @return {this}
   * @throws {TypeError} Ogiltig sökväg.
   */
  fromPath(path) {
    if (!/^\..*\/$/.test(path)) {
      throw new TypeError(
        "Sökvägen måste inledas med '.' eller '..' och avslutas med " + "'/'."
      );
    }

    this.#path = path;
    return this;
  }

  /**
   * Starta körningen.
   */
  run() {
    document.getElementById('results').classList.add('waiting');
    this.#run();
  }

  /**
   * Lägg till de testfallsmoduler som ska köras.
   *
   * Om alla nödvändiga komponenter är på plats, kör testerna och visa
   * resultatet.
   *
   * @param {...string} scripts Sökvägar till testfallsmoduler.
   * @return {this}
   */
  tests(...scripts) {
    this.#scripts = scripts;
    return this;
  }

  /**
   * Ange behållaren där sammafattning ska visas
   *
   * Om alla nödvändiga komponenter är på plats, kör testerna och visa
   * resultatet.
   *
   * @param {HTMLElement} container Behållare.
   * @return {this}
   * @throws {TypeError} Ogiltig parameter.
   */
  totalsIn(container) {
    if (!(container instanceof HTMLElement)) {
      throw new TypeError(
        'Argument #1 till detailsIn() ska vara ett HTML-element.'
      );
    }

    this.#totals = container;
    return this;
  }

  /**
   * Returnera en CSS-klass utifrÅn ett aggregerat statusobjekt.
   *
   * Om statusobjektet innehåller minst ett underkänt test returnerar metoden
   * "fail".
   * Om statusobjektet innehåller minst ett överhoppat test returnerar metoden
   * "skipped".
   * Om statusobjektet innehåller minst ett avvaktande test returnerar metoden
   * "pending":
   * Om statusobjektet innehåller misnt ett godkänt test returnerar metoden
   * "pass".
   * I annat fall returnerar metoden en tom sträng.
   *
   * @private
   * @param {object} status Aggregerad statusinformation.
   * @return {string} "fail", "skipped", "pending" eller "pass".
   */
  #classFromStatus(status) {
    return (
      ['fail', 'skipped', 'pending', 'pass'].find((prop) => status[prop] > 0) ||
      ''
    );
  }

  /**
   * Kör alla testfalloch presentera resultatet.
   *
   * Laddning av testfallsmoduler, liksom körning av tester, sker asynkront.
   * Metoden är därför asynkron.
   *
   * @private
   */
  async #run() {
    // Lägg till testfallen till TestRunner.
    for (const script of this.#scripts) {
      try {
        await TestRunner.addCase(`${this.#path}${script}`);
      } catch (err) {
        console.error(script, err);
      }
    }

    // Initiera ett aggregeringsobjekt.
    this.#counts = {
      cases: 0,
      collections: 0,
      fail: 0,
      pass: 0,
      pending: 0,
      skipped: 0,
      tests: 0,
    };

    // Kör testfallen.
    TestRunner.run()

      .then((elapsed) => {
        if (TestRunner.only) {
          // Endast ett solotest har körts; visa dess resultat.
          const [testCase, test] = TestRunner.only;
          this.#showCaseName(testCase);
          this.#showTest(test, this.#details);
          this.#details.classList.add('only');
        } else {
          // Visa resultaten från varje testfall.
          for (const testCase of TestRunner.cases()) {
            this.#showCase(testCase);
          }
        }

        this.#showTotals(elapsed);
      });
  }

  /**
   * Händeleslyssnare för radiogruppen för styrning av detaljnivå.
   *
   * Metoden anropas när användaren väljer en radioknapp. Sätt klassen på
   * detaljbehållaren till radiogruppens värde för att via CSS-regler styra
   * vad som ska vara synligt.
   *
   * @private
   */
  #setDetailLevel() {
    if (this.#details) {
      this.#level = this.#controls.value;
      this.#details.className = this.#level;

      this.#details
        .querySelectorAll('li')
        .forEach((li) => this.#setExpanded(li, true));
    }
  }

  /**
   * Sätt ARIA-attribut som anger om en samling är ufälld eller hopfälld.
   *
   * Samlingen är utfällt om dess nivå är högre än den valda detaljnivån,
   * eller om dess status är "fail".
   *
   * @param {HTMLElement} element   Elementnod.
   * @param {boolean}     recursive Sätt för underordnade element?
   */
  #setExpanded(element, recursive = false) {
    const min = ['tests', 'suites', 'cases'].indexOf(this.#level);
    const level = ['test', 'suite', 'case'].findIndex((c) =>
      element.classList.contains(c)
    );
    const ps = (e) => {
      return (
        e.classList.contains('fail') ||
        (this.#details !== e && ps(e.parentNode))
      );
    };
    element.setAttribute(
      'aria-expanded',
      level > min || ps(element) ? 'true' : 'false'
    );

    if (recursive) {
      element
        .querySelectorAll('ul > li')
        .forEach((li) => this.#setExpanded(li, true));
    }
  }

  /**
   * Visa resultaten från körningen av ett helt testfall.
   *
   * @private
   * @param {TestCase} testCase Testfall.
   */
  #showCase(testCase) {
    this.#showCollection(testCase, this.#details, 'case');

    --this.#counts.collections;
    ++this.#counts.cases;
  }

  /**
   * Visa testfallsnamn vid körning av solotest.
   *
   * @private
   * @param {TestCase} testCase Testfall.
   */
  #showCaseName(testCase) {
    const li = $E(this.#details, 'li');
    const span = $E(li, 'span');
    span.innerText = testCase.name;
  }

  /**
   * Visa resultaten från körningen av en testsvit.
   *
   * @private
   * @param {TestCollection}   collection Testsamling.
   * @param {HTMLUListElement} list       Listelement att lägga till i.
   * @param {string}           [liClass]  Klassnamn för listelement.
   */
  #showCollection(collection, list, liClass = 'suite') {
    // Lägg till ett LI-element i listan och sätt klass utifrån status.
    const li = $E(list, 'li');
    const status = this.#classFromStatus(collection.status);
    li.className = `${liClass} ${status}`;
    li.role = 'button';
    this.#setExpanded(li, status);

    // Visa samlingsnamnet.
    const span = $E(li, 'span');
    span.tabIndex = 0;
    span.innerText = collection.name;

    // Händelselyssnare för att växla utfällt/hopfällt läge.
    const onToggle = (event) => {
      if ('keypress' === event.type && 'Enter' !== event.key) {
        return;
      }
      const expanded = li.getAttribute('aria-expanded');
      li.setAttribute('aria-expanded', 'true' === expanded ? 'false' : 'true');
    };
    span.addEventListener('click', onToggle);
    span.addEventListener('keypress', onToggle);

    // Lägg till en lista i LI-elementet och populera den med resultaten
    // från de tester och underordnade sviter som ingår i sviten.
    const ul = $E(li, 'ul');

    for (const entry of collection.entries()) {
      ({
        collection: (s, l) => this.#showCollection(s, l),
        test: (t, l) => this.#showTest(t, l),
      })[entry.type](entry.entry, ul);
    }

    ++this.#counts.collections;
  }

  /**
   * Visa resultaten från körningen av ett test.
   *
   * @private
   * @param {Test}             test Test.
   * @param {HTMLUListElement} list Listelement att lägga till i.
   */
  #showTest(test, list) {
    for (const iter of test.iterations()) {
      // Lägg till ett LI-element i listan och sätt klass utifrån status.
      const li = $E(list, 'li');
      li.className = `test ${iter.status}`;

      // Visa testbeskrivningen i LI-elemntet.
      li.innerText = iter.description;

      // Om testet är underkänt, visa orsaken.
      if ('fail' === iter.status) {
        const p = $E(li, 'p');
        const err = iter.reason;
        const m = /Test\.<anonymous> \((.*?)\)/.exec(err.stack);
        p.className = 'error';
        p.innerText = `${(m ?? [])[1] ?? ''}:\n${err}`;
      }

      ++this.#counts[iter.status];
      ++this.#counts.tests;
    }
  }

  /**
   * Visa en sammanfattning av körningen.
   *
   * @private
   * @param {object} elapsed      Laddnings- och körtider.
   * @param {number} elasped.load Laddningstid (millisekunder).
   * @param {number} elasped.run  Körtid (millisekunder).
   */
  #showTotals(elapsed) {
    const cases = { one: 'testfall', other: 'testfall' };
    const collections = { one: 'samling', other: 'samlingar' };
    const fail = { one: 'underkänt', other: 'underkända' };
    const pass = { one: 'godkänt', other: 'godkända' };
    const pending = { one: 'avvaktande', other: 'avvaktande' };
    const skipped = { one: 'överhoppat', other: 'överhoppade' };
    const tests = { one: 'test', other: 'tester' };

    const nf = new Intl.NumberFormat('sv');
    const pr = new Intl.PluralRules('sv');

    const cnt = (p) => this.#counts[p];
    const num = (p) => nf.format(cnt(p));
    const txt = (p, t) => t[pr.select(cnt(p))];
    const tag = (p, t) =>
      `<strong class="${p}">${num(p)}</strong> ` + `${txt(p, t)}`;

    let p = $E(this.#totals, 'p');
    p.innerHTML =
      `Tester: ${tag('pass', pass)}, ${tag('fail', fail)}, ` +
      `${tag('pending', pending)}, ${tag('skipped', skipped)}`;

    p = $E(this.#totals, 'p');
    p.innerHTML =
      `${tag('cases', cases)}, ` +
      `${tag('collections', collections)}, ` +
      `${tag('tests', tests)} ` +
      `laddades på ${nf.format(elapsed.load / 1000)}\u00a0s ` +
      `och kördes på ${nf.format(elapsed.run / 1000)}\u00a0s`;
  }
}

// Hjälpfunktioner.
const $E = (p, t) => p.appendChild(document.createElement(t));

// Importera beroenden.
import { TestRunner } from './TestRunner.js';

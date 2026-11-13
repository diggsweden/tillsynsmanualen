/**
 * Tidur för verifiering av WCAG-krav med tidsgränser.
 *
 * @license CC-BY 4.0
 */

/**
 * Skapa och infoga tiduret.
 *
 * @param {HTMLElement} parent  Element att infoga formuläret i.
 * @param {object}      options Parametrar.
 */
export default function initTimer(parent, options) {
  let p = parent.appendChild(document.createElement('p'));
  p.textContent =
    'Tryck en gång på tiduret för att starta det. Tryck en ' +
    'gång till för att stoppa det innan tidsgränsen går ut.';
  p = parent.appendChild(document.createElement('p'));
  p.className = 'timer';
  const display = new TimerDisplay(document);
  const timer = new Timer(options.duration);
  const control = new TimerButton(document, timer, display);
  control.appendTo(p);
  display.appendTo(p);
}

/**
 * Tidur.
 *
 * @property {number}  elasped Förfluten tid sedan start.
 * @property {boolean} expired Har tidsgränsen löpt ut?
 */
class Timer {
  // Privata fält.
  #duration;
  #expired = false;
  #resolve;
  #started = 0;
  #stopped = 0;
  #timer;

  /**
   * Konstruera en tidursinstans.
   *
   * @param {number} duration Löptid i millisekunder.
   */
  constructor(duration) {
    this.#duration = duration;
  }

  // Åtkomstmetod för förfluten tid.
  get elapsed() {
    return this.#stopped - this.#started;
  }

  // Åtkomstmetod för passerad tidsgräns.
  get expired() {
    return this.#expired;
  }

  /**
   * Starta tiduret.
   *
   * @return {Promise} Ett löfte som infrias när tiduret stoppas eller när
   *                   tidsgränsen passerats.
   * @throws {Error}
   */
  start() {
    if (this.#started > 0 && 0 === this.#stopped) {
      throw new Error('Tiduret är redan startat.');
    }
    this.#expired = false;
    this.#stopped = 0;
    this.#started = Date.now();
    return new Promise((resolve) => {
      this.#resolve = () => resolve();
      this.#timer = setTimeout(() => {
        this.#stopped = Date.now();
        this.#expired = true;
        this.#timer = undefined;
        resolve();
      }, this.#duration);
    });
  }

  /**
   * Stoppa tiduret om det är startat.
   *
   * @return {boolean} `true` om tiduret stoppats, `false` om ej startat.
   */
  stop() {
    if (undefined === this.#timer) {
      return false;
    }
    clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#stopped = Date.now();
    this.#expired = false;
    this.#resolve();
    return true;
  }
}

/**
 * Knapp för att starta och stoppa ett tidur.
 *
 * @see Timer
 * @see TimerDisplay
 */
class TimerButton {
  // Privata fält.
  #button;
  #text;

  /**
   * Konstruera en knappinstans.
   *
   * @param {Document}     doc     DOM-dokument.
   * @param {Timer}        timer   Tidur.
   * @param {TimerDisplay} display Resultatdisplay.
   */
  constructor(doc, timer, display) {
    this.#createButton(doc, timer, display);
  }

  /**
   * Lägg till knappen i ett föräldraelement.
   *
   * @param {HTMLElement} parent Föräldraelement att infoga i.
   */
  appendTo(parent) {
    parent.appendChild(this.#button);
  }

  /**
   * Skapa knappelementet.
   *
   * @private
   * @param {Document}     doc     DOM-dokument.
   * @param {Timer}        timer   Tidur.
   * @param {TimerDisplay} display Resultatdisplay.
   */
  #createButton(doc, timer, display) {
    const $A = (p, c) => p.appendChild(c);
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const XLINK_NS = 'http://www.w3.org/1999/xlink';
    this.#button = doc.createElement('button');
    const svg = $A(this.#button, doc.createElementNS(SVG_NS, 'svg'));
    this.#text = $A(this.#button, doc.createElement('span'));
    const use = $A(svg, doc.createElementNS(SVG_NS, 'use'));
    this.#button.type = 'button';
    this.#text.textContent = 'Starta tidtagning';
    this.#button.setAttribute('aria-pressed', 'false');
    this.#text.setAttribute('aria-live', 'assertive');
    svg.setAttribute('aria-hidden', 'true');
    use.setAttributeNS(XLINK_NS, 'xlink:href', '../img/ikoner.svg#ico-timer');
    this.#button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      timer.stop() || this.#start(timer, display);
    });
  }

  /**
   * Starta tiduret.
   *
   * Uppdatera ARIA-attribut och knapptext, rensa displayen och starta
   * tiduret.
   * När tiduret stoppas eller tiden löpt ut, återställ ARIA-attribut och
   * knapptext och uppdatera displayen med resultatet.
   *
   * @private
   * @param {Timer}        timer   Tidur.
   * @param {TimerDisplay} display Resultatdisplay.
   */
  async #start(timer, display) {
    this.#button.setAttribute('aria-pressed', 'true');
    display.clear();
    this.#text.textContent = 'Stoppa tidtagning';
    await timer.start();
    display.update(timer);
    this.#text.textContent = 'Starta tidtagning';
    this.#button.setAttribute('aria-pressed', 'false');
  }
}

/**
 * Resultatdisplay för tiduret.
 *
 * @see Timer
 * @see TimerButton
 */
class TimerDisplay {
  // Privata fält.
  #output;

  /**
   * Konstruera en displayinstans.
   *
   * @param {Document} doc DOM-dokument.
   */
  constructor(doc) {
    this.#output = doc.createElement('output');
    this.#output.role = 'status';
    this.#output.setAttribute('aria-atomic', 'true');
  }

  /**
   * Lägg till knappen i ett föräldraelement.
   *
   * @param {HTMLElement} parent Föräldraelement att infoga i.
   */
  appendTo(parent) {
    parent.appendChild(this.#output);
  }

  /**
   * Ta bort innehållet i displayen.
   */
  clear() {
    this.#output.value = '…';
    this.#output.setAttribute('aria-label', 'väntar');
  }

  /**
   * Uppdatera displayen med resultatet från ett tidur.
   *
   * @param {Timer} timer Tidur.
   */
  update(timer) {
    this.#output.classList[timer.expired ? 'add' : 'remove']('expired');
    this.#output.value = `${timer.elapsed} ms`;
    this.#output.setAttribute('aria-label', `${timer.elapsed} millisekunder`);
  }
}

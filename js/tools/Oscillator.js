/**
 * Oscillator för att generera en sinusvåg med angiven frekvens.
 *
 * @license CC-BY 4.0
 */

/**
 * Skapa och infoga oscillatorn.
 *
 * @param {HTMLElement} parent  Element att infoga formuläret i.
 * @param {object}      options Parametrar.
 */
export default function initOscillator(parent, options) {
  let p = parent.appendChild(document.createElement('p'));
  p.textContent =
    'Tryck en gång på knappen för att starta ljudet. ' +
    'Tryck en gång till för att pausa det.';
  p = parent.appendChild(document.createElement('p'));
  p.className = 'oscillator';
  const oscillator = new SineOscillator(options.frequency);
  const control = new OscillatorButton(document, oscillator);
  control.appendTo(p);
}

/**
 * Knapp för att starta och stoppa oscillatortonen.
 *
 */
class OscillatorButton {
  // Privata fält.
  #button;
  #icon;
  #oscillator;
  #text;

  /**
   * Konstruera en knappinstans.
   *
   * @param {Document}       doc        DOM-dokument.
   * @param {SineOscillator} oscillator Sinusvåggenerator.
   */
  constructor(doc, oscillator) {
    this.#oscillator = oscillator;
    this.#createButton(doc);
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
   * @param {Document} doc DOM-dokument.
   */
  #createButton(doc) {
    const $A = (p, c) => p.appendChild(c);
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const XLINK_NS = 'http://www.w3.org/1999/xlink';
    this.#button = doc.createElement('button');
    const svg = $A(this.#button, doc.createElementNS(SVG_NS, 'svg'));
    this.#text = $A(this.#button, doc.createElement('span'));
    this.#icon = $A(svg, doc.createElementNS(SVG_NS, 'use'));
    this.#button.type = 'button';
    this.#text.textgContent = 'Starta';
    this.#button.setAttribute('aria-pressed', 'false');
    this.#text.setAttribute('aria-live', 'polite');
    svg.setAttribute('aria-hidden', 'true');
    this.#icon.setAttributeNS(
      XLINK_NS,
      'xlink:href',
      '../img/ikoner.svg#ico-status-ready'
    );
    this.#button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.#stop() || this.#start();
    });
  }

  /**
   * Starta sinusvåggeneratorn.
   *
   * Uppdatera ARIA-attribut, ikon och knapptext. Starta sedan våggeneratorn.
   *
   * @private
   */
  #start() {
    this.#button.setAttribute('aria-pressed', 'true');
    this.#icon.setAttribute(
      'xlink:href',
      '../img/ikoner.svg#ico-status-started'
    );
    this.#text.textContent = 'Pausa';
    this.#oscillator.start();
  }

  /**
   * Stoppa sinusvåggeneratorn.
   *
   * Uppdatera ARIA-attribut, ikon och knapptext. Stoppa sedan våggeneratorn
   * och returnera `true`.
   *
   * Om våggeneratorn inte är startad, returnera `false`.
   *
   * @private
   * @return {boolean}
   */
  #stop() {
    if ('true' === this.#button.getAttribute('aria-pressed')) {
      this.#button.setAttribute('aria-pressed', 'false');
      this.#icon.setAttribute(
        'xlink:href',
        '../img/ikoner.svg#ico-status-ready'
      );
      this.#text.textContent = 'Starta';
      this.#oscillator.stop();
      return true;
    }
    return false;
  }
}

/**
 * Sinusvåggenereator.
 *
 * Genererar en sinusvåg med angiven frekvens.
 */
class SineOscillator {
  // Privata fält.
  #frequency;
  #oscillator;

  /**
   * Konstruera en våggeneratorinstans.
   *
   * @param {number} frequency Frekvens (Hz).
   */
  constructor(frequency) {
    this.#frequency = frequency;
  }

  /**
   * Spela upp tonen.
   */
  start() {
    const context = new AudioContext();
    this.#oscillator = context.createOscillator();
    this.#oscillator.frequency.setValueAtTime(
      this.#frequency,
      context.currentTime
    );
    this.#oscillator.connect(context.destination);
    this.#oscillator.start();
  }

  /**
   * Stoppa uppspelningen.
   */
  stop() {
    this.#oscillator?.stop();
    this.#oscillator = undefined;
  }
}

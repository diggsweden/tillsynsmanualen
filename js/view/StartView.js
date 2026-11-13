/**
 * Vy för granskningsstartsidan.
 *
 * Vyn är förvalet om ärendelistan är tom och inga uppgifter om granskare finns
 * i databasen.
 *
 * @license CC-BY 4.0
 */
export class StartView extends ViewBase {
  /**
   * Konstruera en vyinstans.
   *
   * @param {BreadcrumbTrail}   breadcrumbs Länkstig.
   * @param {EventListenerList} listeners   Händelselyssnarlista.
   * @param {ResourceLoader}    loader      Resursladdare.
   * @param {Document}          [doc]       DOM-dokument vid enhetstester.
   */
  constructor(breadcrumbs, listeners, loader, doc = document) {
    super('start', 'Välkommen', breadcrumbs, listeners, loader, doc);
    this._autoMenu = true;
  }

  /**
   * Markera ett nästa steg som klart/inte klart.
   *
   * Uppdatera även frågeparametrarna i länken (eller deaktivera länken, om
   * värdet är `null`).
   *
   * @param {string}        step    Steg att markera (namn).
   * @param {boolean}       checked Klart?
   * @param {(string|null)} link    Länkens frågeparametrar.
   */
  checkStep(step, checked, link) {
    const li = this._doc.querySelector(`ol.check li[data-step="${step}"]`);
    if (li) {
      const [svg, a] = li.children;
      if (checked) {
        li.classList.add('checked');
        li.classList.remove('unchecked');
      } else {
        li.classList.remove('checked');
        li.classList.add('unchecked');
      }

      svg.setAttribute('aria-label', checked ? 'klart' : 'inte klart');

      if (link) {
        a.setAttribute('href', link);
      } else {
        a.removeAttribute('href');
      }
    }
  }
}

// Importera beroenden.
import { ViewBase } from './ViewBase.js';

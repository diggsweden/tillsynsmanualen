/**
 * Vy för listning av loggnoteringar.
 *
 * Vyn används för att visa en översikt över händelser i ett ärende. Den är
 * sorterad i fallande datumordning.
 *
 * @license CC-BY 4.0
 * @property {string} create  Sökväg för att skapa ny loggnotering.
 * @property {string} heading Sidrubrik.
 */
export class LogListView extends ViewBase {
  // Privata fält.
  #list;

  /**
   * Konstruera en vyinstans.
   *
   * @param {BreadcrumbTrail}   breadcrumbs Länkstig.
   * @param {EventListenerList} listeners   Händelselyssnarlista.
   * @param {ResourceLoader}    loader      Resursladdare.
   * @param {Document}          [doc]       DOM-dokument vid enhetstester.
   */
  constructor(breadcrumbs, listeners, loader, doc = document) {
    super('log-list', 'Ärendelogg', breadcrumbs, listeners, loader, doc);
  }

  /**
   * Lägg till en loggnotering i listan.
   *
   * Klona en mall och lägg till eett element i noteringslistan.
   *
   * @param {string} url       Länkadress för redigering av noteringen.
   * @param {string} type      Noteringstyp (symbol).
   * @param {string} direction Informationsriktning (symbol).
   * @param {date}   timestamp Tidsstämpel.
   * @param {string} summary   Noteringens sammanfattning.
   */
  addEntry(url, type, direction, timestamp, summary) {
    const template = this._doc.getElementById('listing-template');
    const fragment = template.content.cloneNode(true);
    const [li] = fragment.children;
    const [typeCol, dirCol, link, date, time, summaryCol] = li.children;

    typeCol.textContent = type;
    dirCol.textContent = direction;
    link.href = url;
    date.datetime = timestamp.toISOString();
    date.textContent = timestamp.toLocaleDateString('sv');
    time.datetime = timestamp.toISOString();
    time.textContent = timestamp.toLocaleTimeString('sv').slice(0, 5);
    summaryCol.textContent = summary;

    this.#list.appendChild(fragment);
  }

  // Åtkomstmetod för skapa-sökväg.
  set create(url) {
    this._doc.getElementById('create').href = String(url);
  }

  // Åtkomstmetod för sidrubrik.
  set heading(text) {
    this._article.querySelector('h1').textContent = String(text);
  }

  /**
   * @inheritDoc
   */
  async open() {
    await super.open();
    this.#list = this._article.querySelector('ul.listing');
  }
}

// Importera beroenden.
import { ViewBase } from './ViewBase.js';

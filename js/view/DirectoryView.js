/**
 * Vy för redigering av tillsynkatalog.
 *
 * Vyn används för att redigera sökvägen till filkatalogen för tillsynsärenden.
 *
 * @license CC-BY 4.0
 * @property {string} dir Sökväg till tillsynskatalog.
 */
export class DirectoryView extends ViewBase {
  /**
   * Konstruera en vyinstans.
   *
   * @param {BreadcrumbTrail}   breadcrumbs Länkstig.
   * @param {EventListenerList} listeners   Händelselyssnarlista.
   * @param {ResourceLoader}    loader      Resursladdare.
   * @param {Document}          [doc]       DOM-dokument vid enhetstester.
   */
  constructor(breadcrumbs, listeners, loader, doc = document) {
    super('directory', 'Ärendekatalog', breadcrumbs, listeners, loader, doc);
  }

  // Åtkomstmetoder för katalogsökväg.
  get dir() {
    return this._form.dir.value;
  }

  set dir(path) {
    this._form.dir.value = String(path).trim();
  }
}

// Importera beroenden.
import { ViewBase } from './ViewBase.js';

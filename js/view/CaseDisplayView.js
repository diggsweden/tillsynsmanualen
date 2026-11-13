/**
 * Vy för presentation av ärendeinformation.
 *
 * Vyn används för att visa uppgifter om granskings- och tillsynsärenden.
 *
 * @license CC-BY 4.0
 * @property {string} addr       Aktörens postadress.
 * @property {string} create     Länkadress för ny granskning.
 * @property {string} edit       Länkadress för redigering.
 * @property {string} email      Aktörens e-postadress.
 * @property {string} heading    Sidrubrik.
 * @property {string} log        Länkadress för ärendelogg.
 * @property {number} logSize    Antal noteringar i ärendeloggen.
 * @property {string} org        Aktörens namn.
 * @property {string} regNo      Aktörens organisationsnummer.
 * @property {string} supervisor Tillsynsansvarig.
 * @property {string} tel        Aktörens telefonnummer.
 */
export class CaseDisplayView extends ViewBase {
  // Privata fält.
  #audits;
  #count = 0;

  /**
   * Konstruera en vyinstans.
   *
   * @param {BreadcrumbTrail}   breadcrumbs Länkstig.
   * @param {EventListenerList} listeners   Händelselyssnarlista.
   * @param {ResourceLoader}    loader      Resursladdare.
   * @param {Document}          [doc]       DOM-dokument vid enhetstester.
   */
  constructor(breadcrumbs, listeners, loader, doc = document) {
    super('case-display', 'Ärende', breadcrumbs, listeners, loader, doc);
    this._addStyles('case');
  }

  /**
   * @inheritDoc
   */
  activate() {
    super.activate();
    const notify = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget;
      this._notifyObservers({
        action: target.value || 'open',
        id: target.dataset.id,
        type: target.dataset.type,
      });
    };
    this._article
      .querySelectorAll('.doc ul a:not([target])')
      .forEach((link) => {
        this._listeners.add(link, 'click', notify);
      });
  }

  /**
   * Lägg till en länk till en granskning.
   *
   * Klona en mall och lägg till ett element i granskningslistan.
   *
   * @param {string}   editURL   Länkadress för redigering av granskningen.
   * @param {string}   sampleURL Länkadress för stickprovsurval.
   * @param {string[]} columns   Innehållskolumner.
   */
  addAudit(editURL, sampleURL, columns) {
    if (!this.#audits) {
      this.#audits = this.#find('.audit.listing');
    }

    const template = this._doc.getElementById('audit-listing-template');
    const fragment = template.content.cloneNode(true);
    const li = fragment.children[0];
    const [edit, show] = li.querySelectorAll('a');

    const id = ++this.#count;
    if (editURL) {
      edit.href = editURL;
      edit.id = `edit-${id}`;
      edit.setAttribute('aria-labelledby', `edit-${id} audit-${id}`);
    } else {
      edit.removeAttribute('href');
    }

    show.href = sampleURL;
    show.id = `audit-${id}`;
    show.textContent = columns.shift();

    for (const text of columns) {
      this._element(li, 'span', {}, text);
    }

    this.#audits.appendChild(fragment);
  }

  /**
   * Lägg till en länk till ett genererat ärendedokument.
   *
   * Klona en mall och lägg till ett element i dokumentlistan.
   *
   * @param {string}   type    Dokumenttyp, t ex "csv".
   * @param {string}   id      Dokumentidentitet.
   * @param {string[]} columns Innehållskolumner.
   */
  addDocument(type, id, columns) {
    const template = this._doc.getElementById('doc-listing-template');
    const fragment = template.content.cloneNode(true);
    const li = fragment.children[0];
    const list = this.#find('.doc ul');
    const [svg, link, button] = li.children;
    const [icon] = svg.children;

    const href = icon.getAttribute('xlink:href').replace(/#.*/, '');
    const types = {
      csv: 'document',
      csvAudit: 'document',
    };
    const url = (t) => `${href}#ico-${types[t] ?? t}`;
    icon.setAttribute('xlink:href', url(type));

    if (['csv', 'csvAudit'].includes(type)) {
      const span = this._element(null, 'span', {}, columns.shift());
      li.replaceChild(span, link);
    } else {
      link.dataset.type = type;
      link.dataset.id = String(id);
      link.textContent = columns.shift();
    }

    button.dataset.type = type;
    button.dataset.id = String(id);

    for (const text of columns) {
      const span = this._element(null, 'span', {}, text);
      li.insertBefore(span, button);
    }

    list.appendChild(fragment);
  }

  /**
   * Lägg till en länk till ett genererat granskningsprotokoll.
   *
   * Klona en mall och lägg till ett element i dokumentlistan.
   *
   * @param {string} id   Granskningsidentitet.
   * @param {string} date Granskningsdatum.
   */
  addProtocol(id, date) {
    const template = this._doc.getElementById('doc-listing-template');
    const fragment = template.content.cloneNode(true);
    const li = fragment.children[0];
    const list = this.#find('.doc ul');
    const [svg, link, button] = li.children;
    const [icon] = svg.children;

    const href = icon.getAttribute('xlink:href').replace(/#.*/, '');
    icon.setAttribute('xlink:href', `${href}#ico-document`);

    link.href = `protokoll.html?audit=${id}`;
    link.target = '_blank';
    link.textContent = 'Granskningsprotokoll';

    button.dataset.type = 'protocol';
    button.dataset.id = String(id);

    const span = this._element(null, 'span', {}, date);
    li.insertBefore(span, button);

    list.appendChild(fragment);
  }

  // Åtkomstmetod för aktörens postadress.
  set addr(addr) {
    this.#setOrg(this.#find('#addr'), addr);
  }

  // Åtkomstmetod för Ny granskning-länkens sökväg.
  set create(url) {
    this.#find('#create').href = url;
  }

  // Åtkomstmetod för Ändra-länkens sökväg.
  set edit(url) {
    this.#find('#edit').href = url;
  }

  // Åtkomstmetod för aktörens e-postadress.
  set email(addr) {
    this.#setOrg(this.#find('#email'), addr);
  }

  // Åtkomstmetod för sidrubrik.
  set heading(text) {
    this.#find('h1').textContent = String(text);
  }

  // Åtkomstmetod för Logg-länkens sökväg.
  set log(url) {
    this.#find('#log').href = url;
  }

  // Åtkomstmetod för antal noteringar i ärendeloggen.
  set logSize(count) {
    this.#find('#log-count').textContent = String(count);
  }

  // Åtkomstmetod för aktörens namn.
  set org(name) {
    this.#setOrg(this.#find('#org'), name);
  }

  // Åtkomstmetod för aktörens organisationsnummer.
  set regNo(num) {
    this.#find('#reg-no').textContent = num;
  }

  // Åtkomstmetod för tillsynsansvarigs namn.
  set supervisor(name) {
    this.#find('#supervisor').textContent = name;
  }

  // Åtkomstmetod för aktörens telefonnummer.
  set tel(num) {
    this.#setOrg(this.#find('#tel'), num);
  }

  /**
   * Returnera första elementet i DOM-trädet som motsvarar selektorn.
   *
   * @private
   * @param {string} selector CSS-selektor.
   * @return {(HTMLElement|null)}
   */
  #find(selector) {
    return this._article.querySelector(selector);
  }

  /**
   * Sätt innehåll i ett organisationselement.
   *
   * Satt/ta bort motsvarande klass på behållaren, beroende på om värdet är
   * tomt eller inte.
   *
   * @private
   * @param {HTMLElement} element Element.
   * @param {string}      value   Värde att sätta.
   */
  #setOrg(element, value) {
    const method = '' !== value ? 'add' : 'remove';
    element.textContent = value;
    this.#find('.org').classList[method](element.id);
  }
}

// Importera beroenden.
import { ViewBase } from './ViewBase.js';

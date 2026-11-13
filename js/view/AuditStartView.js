/**
 * Vy för att påbörja en granskning.
 *
 * Vyn används för att ange vem som utför granskningen och för att påbörja
 * själva granskningen.
 *
 * @license CC-BY 4.0
 * @property {string}   officer  Granskare (e-postadress).
 * @property {object[]} officers Alla registrerade granskare.
 * @property {string}   service  Typ av digital service.
 * @property {number}   source   ID för granskning att kopiera.
 * @property {string}   version  Version av mobil applikation.
 */
export class AuditStartView extends ViewBase {
  // Privata fält.
  #conditions;
  #service;

  /**
   * Konstruera en vyinstans.
   *
   * @param {BreadcrumbTrail}   breadcrumbs Länkstig.
   * @param {EventListenerList} listeners   Händelselyssnarlista.
   * @param {ResourceLoader}    loader      Resursladdare.
   * @param {ViewCondition}     conditions  Villkorsstyrning.
   * @param {Document}          [doc]       DOM-dokument vid enhetstester.
   */
  constructor(breadcrumbs, listeners, loader, conditions, doc = document) {
    super('audit-start', 'Ny granskning', breadcrumbs, listeners, loader, doc);
    this.#conditions = conditions;
  }

  /**
   * Lägg till en granskning i listan över tidigare granskningar.
   *
   * @param {number} id    Granskningsidentitet.
   * @param {string} label Visningsnamn i listan.
   */
  addAudit(id, label) {
    const select = this._form.source;
    select.appendChild(new Option(label, String(id)));
  }

  /**
   * @inheritDoc
   */
  close() {
    this.#conditions.disconnect();
    super.close();
  }

  /**
   * Dölj listan med granskningar att kopiera.
   *
   * Används när det inte finns någon tidigare granskning i ärendet.
   */
  hideSource() {
    this._form.source.parentNode.hidden = true;
  }

  // Åtkomstmetoder för granskare.
  get officer() {
    return this._form.officer.value;
  }

  set officer(email) {
    this._form.officer.value = email;
  }

  // Populera listan med granskare.
  set officers(names) {
    const add = (l, v) => select.appendChild(new Option(l, v));
    const select = this._form.officer;
    while (select.length > 1) {
      select.remove(1);
    }
    names.forEach(({ label, value }) => add(label, value));
  }

  /**
   * @inheritDoc
   */
  async open() {
    await super.open();
    this.#conditions.observe(this._form, this._form);
  }

  // Åtkomstmetoder för typ av digital service.
  get service() {
    return this.#service;
  }

  set service(type) {
    const visible = 'app' === type;
    this.#service = type;
    this._form.classList.add(type);
    this.#conditions.apply();
  }

  /**
   * Visa en modal dialogruta med förberedelser.
   *
   * Dialogrutan visar den katalogstruktur som granskaren bör skapa i fil-
   * systemet för den nyskapade granskningen.
   *
   * @param {string} rootDir  Sökväg för ärendekatalogen.
   * @param {string} yearDir  Namn på årtalskatalogen.
   * @param {string} caseDir  Namn på katalogen för ärendet.
   * @param {string} auditDir Namn på granskningskatalogen.
   * @return {Promise} Infrias när användare stänger dialogrutan.
   */
  showPreparations(rootDir, yearDir, caseDir, auditDir) {
    const dialog = this._doc.getElementById('prepare-dialog');
    if (!dialog) return;

    const btn = dialog.querySelector('button');
    this._listeners.add(btn, 'click', () => dialog.close());

    const value = (s, v) => (dialog.querySelector(s).textContent = v);
    value('.dir', rootDir);
    value('.year', yearDir);
    value('.case', caseDir);
    value('.audit', auditDir);

    return new Promise((resolve) => {
      const onClose = () => {
        dialog.removeEventListener('cancel', onClose);
        dialog.removeEventListener('close', onClose);
        resolve();
      };

      dialog.addEventListener('cancel', onClose);
      dialog.addEventListener('close', onClose);
      dialog.showModal();
    });
  }

  // Åtkomstmetod för granskning att kopiera.
  get source() {
    return Number(this._form.source.value) || null;
  }

  // Åtkomstmetoder för version av mobil applikation.
  get version() {
    return this._form.version.value;
  }

  set version(label) {
    this._form.version.value = label;
  }
}

// Importera beroenden.
import { ViewBase } from './ViewBase.js';

/**
 * Vy för att redigera eller ta bort en granskning.
 *
 * @license CC-BY 4.0
 * @property {string}   officer  Granskare (e-postadress).
 * @property {object[]} officers Alla registrerade granskare.
 * @property {string}   service  Typ av digital service.
 * @property {string}   version  Version av mobil applikation.
 */
export class AuditEditView extends ViewBase {
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
    super(
      'audit-edit',
      'Redigera granskning',
      breadcrumbs,
      listeners,
      loader,
      doc
    );
    this._confirmID = 'confirm-dialog';
    this.#conditions = conditions;
  }

  /**
   * @inheritDoc
   */
  close() {
    this.#conditions.disconnect();
    super.close();
  }

  /**
   * Dölj formuläret.
   *
   * Används om användaren lyckas öppna redigeringsformuläret för em slutförd
   * granskning.
   */
  hide() {
    this._form.hidden = true;
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
    const select = this._form.officer;
    while (select.length > 1) {
      select.remove(1);
    }
    names.forEach(({ label, value }) =>
      select.appendChild(new Option(label, value))
    );
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
    this.#service = type;
    this._form.classList.add(type);
    this.#conditions.apply();
    /*
        const visible = "app" === type;
        this.#service = type;
        this._form.classList.add(type);
        this._form.querySelectorAll(".app input").forEach((input) => {
            input.disabled = !visible;
            input.required = visible;
        });
*/
  }

  // Åtkomstmetoder för version av mobil applikation.
  get version() {
    return this._form.version.value;
  }

  set version(label) {
    this._form.version.value = String(label);
  }
}

// Importera beroenden.
import { ViewBase } from './ViewBase.js';

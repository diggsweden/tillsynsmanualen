/**
 * Vy för redigering av personinformation.
 *
 * Vyn används för att redigera uppgifter om granskare och tillsynsansvariga.
 *
 * @license CC-BY 4.0
 * @property {date}     begins      Startdatum.
 * @property {string}   caseNumber  Ärendenummer.
 * @property {date}     date        Beslutsdatum.
 * @property {date}     ends        Slutdatum.
 * @property {date}     maxDate     Maxvärde för beslutsdatum.
 * @property {string}   supervisor  Tillsynsansvarig.
 * @property {object[]} supervisors Tillsynsansvariga.
 */
export class ScheduleView extends ViewBase {
  /**
   * Konstruera en vyinstans.
   *
   * @param {BreadcrumbTrail}   breadcrumbs Länkstig.
   * @param {EventListenerList} listeners   Händelselyssnarlista.
   * @param {ResourceLoader}    loader      Resursladdare.
   * @param {Document}          [doc]       DOM-dokument vid enhetstester.
   */
  constructor(breadcrumbs, listeners, loader, doc = document) {
    super('schedule', 'Tillsynsplan', breadcrumbs, listeners, loader, doc);
    this._confirmID = 'confirm-dialog';
  }

  // Åtkomstmetoder för tillsynsperiodens startdatum.
  get begins() {
    return this._form.begins.valueAsDate;
  }

  set begins(date) {
    this._form.begins.value = this.#iso8601(date);
  }

  // Åtkomstmetoder för ärendenummer.
  get caseNumber() {
    return this._form.caseNumber.value;
  }

  set caseNumber(num) {
    if (num instanceof ValidationError) {
      this._form.caseNumber.value = num.value;
      this._form.caseNumber.setCustomValidity(num.message);
    } else {
      this._form.caseNumber.value = num;
    }
  }

  // Åtkomstmetoder för tillsynsplanens beslutsdatum.
  get date() {
    return this._form.date.valueAsDate;
  }

  set date(date) {
    if (date instanceof ValidationError) {
      this._form.date.value = this.#iso8601(date.value);
      this._form.date.setCustomValidity(date.message);
    } else {
      this._form.date.value = this.#iso8601(date);
    }
  }

  /**
   * Avaktivera Ta bort-knappen.
   */
  disableRemove() {
    this._form.querySelector('button[value="delete"]').disabled = true;
  }

  // Åtkomstmetoder för tillsynsperiodens slutdatum.
  get ends() {
    return this._form.ends.valueAsDate;
  }

  set ends(date) {
    this._form.ends.value = this.#iso8601(date);
  }

  // Sätt maxvärde för beslutsdatum.
  set maxDate(date) {
    this._form.date.max = this.#iso8601(date);
  }

  // Åtkomstmetoder för tillsynsansvarig (e-postadress).
  get supervisor() {
    return this._form.supervisor.value;
  }

  set supervisor(email) {
    this._form.supervisor.value = email;
  }

  // Populera listan med tillsynsansvariga.
  set supervisors(supervisors) {
    const select = this._form.supervisor;
    while (select.children.length > 1) {
      select.removeChild(select.children[1]);
    }
    supervisors.forEach(({ label, value }) => {
      select.appendChild(new Option(label, value));
    });
  }

  /**
   * Omvandla ett datumobjekt till en sträng på ISO 8601-format.
   *
   * @param {date} date Datumobjekt.
   * @return {string}
   */
  #iso8601(date) {
    return date?.toLocaleDateString('sv') ?? '';
  }
}

// Importera beroenden.
import { ValidationError } from '../model/ValidationError.js';
import { ViewBase } from './ViewBase.js';

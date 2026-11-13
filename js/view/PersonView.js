/**
 * Vy för redigering av personinformation.
 *
 * Vyn används för att redigera uppgifter om granskare och tillsynsansvariga.
 *
 * @license CC-BY 4.0
 * @property {string}   email      E-postadress.
 * @property {string}   familyName Efternamn.
 * @property {string}   givenName  Förnamn.
 * @property {string[]} roles      Roller.
 * @property {string}   telephone  Telefonnummer.
 */
export class PersonView extends ViewBase {
  /**
   * Konstruera en vyinstans.
   *
   * @param {BreadcrumbTrail}   breadcrumbs Länkstig.
   * @param {EventListenerList} listeners   Händelselyssnarlista.
   * @param {ResourceLoader}    loader      Resursladdare.
   * @param {Document}          [doc]       DOM-dokument (för enhetstester).
   */
  constructor(breadcrumbs, listeners, loader, doc = document) {
    super('person', 'Personinfo', breadcrumbs, listeners, loader, doc);
    this._confirmID = 'confirm-dialog';
  }

  /**
   * Avaktivera Ta bort-knappen.
   */
  disableRemove() {
    this._form.querySelector('button[value="delete"]').disabled = true;
  }

  // Åtkomstmetoder för e-postadress.
  get email() {
    return this._form.email.value;
  }

  set email(addr) {
    if (addr instanceof ValidationError) {
      this._form.email.value = addr.value;
      this._form.email.setCustomValidity(addr.message);
    } else {
      this._form.email.value = addr;
    }
  }

  // Åtkomstmetoder för efternamn.
  get familyName() {
    return this._form.familyName.value;
  }

  set familyName(name) {
    this._form.familyName.value = name;
  }

  // Åtkomstmetoder för förnamn.
  get givenName() {
    return this._form.givenName.value;
  }

  set givenName(name) {
    this._form.givenName.value = name;
  }

  // Åtkomstmetoder för roller.
  get roles() {
    return Array.from(this._form.querySelectorAll('input[type="checkbox"]'))
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);
  }

  set roles(roles) {
    this._form.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = roles.includes(cb.value);
    });
  }

  // Åtkomstmetoder för telefonnummer.
  get telephone() {
    return this._form.telephone.value;
  }

  set telephone(num) {
    if (num instanceof ValidationError) {
      this._form.telephone.value = num.value;
      this._form.telephone.setCustomValidity(num.message);
    } else {
      this._form.telephone.value = num;
    }
  }
}

// Importera beroenden.
import { ValidationError } from '../model/ValidationError.js';
import { ViewBase } from './ViewBase.js';

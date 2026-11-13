/**
 * Controller för redigering av personinformation.
 *
 * @license CC-BY 4.0
 */
export class PersonController extends ControllerBase {
  // Privata fält.
  #person;

  /**
   * Konstruera en controllerinstans.
   *
   * @param {Model}    model     Modellobjekt.
   * @param {ViewBase} view      Vyinstans.
   * @param {object}   [globals] Mockade globala objekt vid enhetstester.
   */
  constructor(model, view, globals = {}) {
    super(model, view, globals);
    this._persistPath = false;
  }

  /**
   * @inheritDoc
   * @override
   */
  async prepare(context) {
    const model = this._model;
    const view = this._view;
    const breadcrumbs = view.breadcrumbs;
    const advanced = model.advancedMode;

    breadcrumbs.list('person', 'Personer');

    // Registrera en observatör på vyn.
    view.subscribe((e) => this.#onViewEvent(e));

    // Registrera åtgärder för Ta bort och Spara.
    this._action('delete', (ev) => this.#onDelete(ev));
    this._action('save', (ev) => this.#onSave(ev));

    if (context.hasParam('id')) {
      // Angiven person: hämta från databasen och populera vyn.
      const id = Number(context.param('id'));
      this.#person = await model.getPerson(id);
      if (this.#person) {
        view.title = this.#person.toString();
        breadcrumbs.current = this.#person.toString();
        this.#populateView(this.#person);
      }
    }

    if (!this.#person) {
      // Ny person eller okänd e-postadress.
      this.#person = new Person();
      if (context.hasParam('id')) {
        view.showError(`ID ${context.param('id')} finns inte i databasen.`);
      }

      // Sätt roll i formuläret om angiven som parameter.
      let title = 'Ny person';
      if (!advanced || context.hasParam('role')) {
        const role = context.param('role') || 'officer';
        title = {
          officer: 'Ny granskare',
          supervisor: 'Ny tillsynsansvarig',
        }[role];

        view.roles = [role];
        this.#person.addRole(role);
      }

      breadcrumbs.current = title;
      view.title = title;
      view.disableRemove();
    }
  }

  /**
   * Ta bort personen ur objektdatabasen.
   *
   * Begär bekräftelse från användaren före borttag.
   *
   * @private
   * @param {object}      event         Händelseinformation.
   * @param {HTMLElement} event.trigger Ta bort-knappen i formuläret.
   */
  async #onDelete({ trigger }) {
    const message =
      `${this.#person} kommer att tas bort ur databasen.\n` +
      'Åtgärden går inte att ångra.';
    const ok = await this._view.confirm(message, trigger);
    if (!ok) throw null;
    try {
      await this._model.deletePerson(this.#person.id);
      /* borttaget på begäran 2022-11-10
            this._context.status =
                `${this.#person} har tagits bort ur databasen.`;
            */
    } catch (err) {
      this._context.error = `Kan inte ta bort ${this.#person} ur databasen: ${err}.`;
      throw err;
    }
  }

  /**
   * Sparar personen i objektdatabasen.
   *
   * @private
   * @param {object}      event         Händelseinformation.
   * @param {HTMLElement} event.trigger Ta bort-knappen i formuläret.
   */
  async #onSave({ trigger }) {
    try {
      await this._model.setPerson(this.#person);
      /* borttaget på begäran 2022-11-10
            this._context.status = `${this.#person} har sparats i databasen.`;
            */
    } catch (err) {
      this._context.error = `Kan inte spara ${this.#person}: ${err}.`;
      throw err;
    }
  }

  /**
   * Observatör som anropas vid händelser i vyn.
   *
   * Uppdatera aktuell entitet i modellen. Vid valideringsfel, återför fel-
   * meddelandet till vyn.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  #onViewEvent(event) {
    if ('change' !== event.type) return;

    try {
      const { state, target, value } = event;

      if (undefined !== state) {
        // Kryssruta.
        this.#person[state ? 'addRole' : 'deleteRole'](value);
      } else {
        // Annat inmatningsfält.
        this.#person[target] = value;
        if (this.#person[target] !== value) {
          this._view[target] = this.#person[target];
        }
      }
    } catch (err) {
      if (err instanceof ValidationError) {
        this._view[event.target] = err;
      } else {
        throw err;
      }
    }
  }

  /**
   * Populera vyn med modelldata.
   *
   * @private
   * @param {Person} person Personinformation.
   */
  #populateView(person) {
    ['email', 'familyName', 'givenName', 'roles', 'telephone'].forEach(
      (field) => {
        this._view[field] = person[field];
      }
    );
  }
}

// Importera beroenden.
import { ControllerBase } from './ControllerBase.js';
import { Person } from '../model/Person.js';
import { ValidationError } from '../model/ValidationError.js';

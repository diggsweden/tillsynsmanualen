/**
 * Controller för redigering av tillsynsplaninformation.
 *
 * @license CC-BY 4.0
 */
export class ScheduleController extends ControllerBase {
  // Privata fält.
  #schedule;
  #supervisors;

  /**
   * Konstruera en controllerinstans
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
    const { breadcrumbs } = view;
    breadcrumbs.list('schedule', 'Tillsynsplaner');

    // Registrera en observatör på vyn.
    view.subscribe((e) => this.#onViewEvent(e));

    // Registrera åtgärder för Ta bort och Spara.
    this._action('delete', (ev) => this.#onDelete(ev));
    this._action('save', (ev) => this.#onSave(ev));

    if (context.hasParam('id')) {
      // Hämta information ur modellen.
      const id = Number(context.param('id'));
      const tasks = [model.peopleByRole('supervisor'), model.getSchedule(id)];

      [this.#supervisors, this.#schedule] = await Promise.all(tasks);

      if (this.#schedule) {
        view.title = this.#schedule.period;
        breadcrumbs.current = this.#schedule.period;

        this.#populateSupervisors();
        this.#populateView(this.#schedule);
      }
    }

    if (!this.#schedule) {
      // Ny tillsynsplan.
      this.#supervisors ??= await model.peopleByRole('supervisor');

      if (context.hasParam('id')) {
        view.showError(`ID ${context.param('id')} finns inte i databasen.`);
      }

      this.#schedule = new Schedule();
      breadcrumbs.current = 'Ny tillsynsplan';
      view.disableRemove();

      this.#populateSupervisors();
    }
  }

  /**
   * Ta bort tillsynsplanen ur objektdatabasen.
   *
   * Begär bekräftelse från användaren före borttag.
   *
   * @private
   * @param {object}      event         Händelseinformation.
   * @param {HTMLElement} event.trigger Ta bort-knappen i formuläret.
   */
  async #onDelete({ trigger }) {
    const message =
      `${this.#schedule} kommer att tas bort ur databasen.\n` +
      'Åtgärden går inte att ångra.';
    const ok = await this._view.confirm(message, trigger);
    if (!ok) throw null;
    try {
      await this._model.deleteSchedule(this.#schedule.id);
      /* borttaget på begäran 2022-11-10
            this._context.status =
                `${this.#schedule} har tagits bort ur databasen.`;
            */
    } catch (err) {
      this._context.error = `Kan inte ta bort ${this.#schedule} ur databasen: ${err}.`;
      throw err;
    }
  }

  /**
   * Sparar tillsynsplanen i objektdatabasen.
   *
   * @private
   * @param {object}      event         Händelseinformation.
   * @param {HTMLElement} event.trigger Ta bort-knappen i formuläret.
   */
  async #onSave({ trigger }) {
    try {
      await this._model.setSchedule(this.#schedule);
      /* borttaget på begäran 2022-11-10
            this._context.status = `${this.#schedule} har sparats i databasen.`;
            */
    } catch (err) {
      this._context.error = `Kan inte spara ${this.#schedule}: ${err}.`;
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
  async #onViewEvent(event) {
    if ('form' === event.type || event.action) return;

    try {
      const { target, value } = event;
      const schedule = this.#schedule;

      if ('supervisor' === target) {
        const list = this.#supervisors;
        schedule[target] = list.find((p) => p.email === value);
      } else {
        schedule[target] = value;
        if (schedule[target] !== value) {
          this._view[target] = schedule[target];
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
   * Populera listan med tillsynsansvariga i vyn.
   *
   * @private
   */
  #populateSupervisors() {
    this._view.supervisors = this.#supervisors.map((p) => ({
      label: p.toString(),
      value: p.email,
    }));
  }

  /**
   * Populera vyn med modelldata.
   *
   * @private
   * @param {Schedule} schedule Tillsynsplan.
   */
  #populateView(schedule) {
    ['begins', 'caseNumber', 'date', 'ends'].forEach((field) => {
      this._view[field] = schedule[field];
    });

    this._view.supervisor = schedule.supervisor?.email;
  }
}

// Importera beroenden.
import { ControllerBase } from './ControllerBase.js';
import { Schedule } from '../model/Schedule.js';
import { ValidationError } from '../model/ValidationError.js';

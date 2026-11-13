/**
 * Controller för redigering av granskning.
 *
 * @license CC-BY 4.0
 */
export class AuditEditController extends ControllerBase {
  // Privata fält.
  #audit;
  #case;
  #officers;

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
   * @throws {TypeError} Gransknings-id saknas eller granskningen avslutad.
   */
  async prepare(context) {
    if (!context.audit) {
      throw new TypeError('Ange granskningidentitet.');
    }

    const id = context.audit;
    const model = this._model;
    this.#audit = await model.getAudit(id);
    if (!this.#audit) {
      throw new TypeError(`Granskning #${id} finns inte.`);
    } else if (this.#audit.finished) {
      this._view.hide();
      throw new TypeError(`Granskning ${this.#audit} är avslutad.`);
    }

    // Hämta handläggare och ärende.
    const tasks = [
      model.peopleByRole('officer'),
      model.getCase(this.#audit.caseID),
    ];
    [this.#officers, this.#case] = await Promise.all(tasks);

    this.#addOfficersFromPreviousAudits(this.#case, this.#officers);

    this._view.service = this.#case.service.type;

    // Registrera åtgärder för Spara och Ta bort.
    this._action('delete', (ev) => this.#onDelete(ev));
    this._action('save', (ev) => this.#onSave(ev));

    // Registrera en observatör på vyhändelser.
    this._view.subscribe((e) => this.#onViewEvent(e));

    // Populera vyn.
    this.#setBreadcrumbs();
    this.#populateOfficers(this.#officers);
    this.#setFormAction(context);
    this.#populateView(this.#audit);
    return context;
  }

  /**
   * Lägg till granskare från tidigare granskningar i ärendet.
   *
   * Om ärendet är skapat av en annan granskare finns personuppgifterna tro-
   * ligen inte i den aktuella användarens objektdatabas. Lägg därför till
   * tidigare handläggare i listan med granskare.
   *
   * @private
   * @param {AuditCase} aCase    Aktuellt ärende.
   * @param {Person[]}  officers Lista med granskare.
   */
  #addOfficersFromPreviousAudits(aCase, officers) {
    for (const audit of aCase.audits()) {
      const { officer } = audit;
      if (!officers.find((o) => officer.email === o.email)) {
        officers.push(officer);
      }
    }
  }

  /**
   * Hantera åtgärdsavisering för borttag från vyn.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  async #onDelete(event) {
    const ok = await this._view.confirm(
      `Granskning ${this.#audit} kommer att tas bort ur databasen.\n` +
        `Åtgärden går inte att ångra.`,
      event.trigger
    );
    if (!ok) throw null;

    await this._model.deleteAudit(this.#audit.id);
    /* borttaget på begäran 2022-11-10
        this._context.status = `Granskning ${this.#audit} raderad.`;
        */

    // La bort loggnotering om startad granskning.
    const data = (e) => this.#audit.started.getTime() === e.data;
    const type = (e) => LogEntry.EntryType.AuditStart === e.type;
    for (const entry of this.#case.log()) {
      if (type(entry) && data(entry)) {
        this._model.deleteLogEntry(entry.id);
        break;
      }
    }
  }

  /**
   * Hantera åtgärdsavisering för spara från vyn.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  async #onSave(event) {
    await this._model.setAudit(this.#audit);
    /* borttaget på begäran 2022-11-10
        this._context.status = `Granskning ${this.#audit} sparad.`;
        */
  }

  /**
   * Hantera händelseaviseringar från vyn.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  async #onViewEvent(event) {
    if ('change' !== event.type) return;

    const { target, value } = event;
    if ('officer' === target) {
      const officers = await this._model.peopleByRole('officer');
      this.#audit.officer = officers.find((p) => p.email === value);
    } else {
      this.#audit[target] = value;
    }
  }

  /**
   * Populera listan med granskare.
   *
   * @private
   * @param {Person[]} officers Vektor med granskare.
   */
  #populateOfficers(officers) {
    this._view.officers = officers.map((p) => ({
      label: p.toString(),
      value: p.email,
    }));
  }

  /**
   * Populera vynfälten.
   *
   * @private
   * @param {Audit} audit Granskning.
   */
  #populateView(audit) {
    const view = this._view;
    view.officer = audit.officer?.email ?? '';
    this.#case.service instanceof MobileApp && (view.version = audit.version);
  }

  /**
   * Populerar länkstigen och lägger till den i vyn.
   *
   * @private
   */
  #setBreadcrumbs() {
    const { breadcrumbs } = this._view;
    breadcrumbs.case(
      this.#case.id,
      this.#case.toString(),
      this.#case.organization.name,
      this.#case.service.name
    );
    breadcrumbs.current = `Granskning ${this.#audit.toString()}`;
  }

  /**
   * Sätt åtgärdssökvägen för formuläret.
   *
   * @private
   */
  #setFormAction(context) {
    if (context.hasParam('return')) {
      const path = decodeURIComponent(context.param('return'));
      this._view.action = `?page=${path}`;
    } else {
      const params = new URLParameters();
      params.add('case', this.#case.id);
      this._view.action = `?page=case&${params}`;
    }
  }
}

// Importera beroenden.
import { ControllerBase } from './ControllerBase.js';
import { LogEntry } from '../model/LogEntry.js';
import { MobileApp } from '../model/service.js';
import { URLParameters } from './URLParameters.js';

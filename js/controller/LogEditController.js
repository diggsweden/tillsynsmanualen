/**
 * Controller för redigering av loggnoteringar.
 *
 * @license CC-BY 4.0
 */
export class LogEditController extends ControllerBase {
  // Privata fält.
  #case;
  #entry;
  #isNew = false;

  /**
   * @inheritDoc
   * @override
   * @throws {TypeError} Notering eller ärende finns inte.
   */
  async prepare(context) {
    const model = this._model;
    const view = this._view;
    const { breadcrumbs } = view;
    let caseID = context.case;
    const entryID = Number(context.param('entry'));

    if (entryID) {
      this.#entry = await model.getLogEntry(entryID);
      if (!this.#entry) {
        throw new TypeError('Loggnotering #${entryID} finns inte.');
      }
      caseID = this.#entry.caseID;
    }

    this.#case = await model.getCase(caseID);
    if (!this.#case) {
      throw new TypeError(`Ärende #${caseID} finns inte.`);
    }

    const params = new URLParameters();
    params.add('case', caseID);
    view.action = `?page=log&${params}`;

    breadcrumbs.case(
      caseID,
      this.#case.toString(),
      this.#case.organization.name,
      this.#case.service.name
    );
    breadcrumbs.log(caseID);

    view.subscribe((event) => this.#onViewEvent(event));

    this._action('delete', (ev) => this.#onDelete(ev));
    this._action('save', (ev) => this.#onSave(ev));

    this.#populateData(this.#case);

    if (this.#entry) {
      view.breadcrumbs.current = this.#entry.summary;
      this.#populateView(this.#entry);
      this.#enableData(this.#entry.type);
      this.#enableRemove(this.#entry);
      this.#readOnlyMode(this.#entry);
    } else {
      view.breadcrumbs.current = 'Ny notering';
      this.#newEntry();
    }
  }

  /**
   * Aktivera eller avaktivera granskningslistan beroende på noteringstyp.
   *
   * Gör listan obligatorisk eller friviilig beroende på noteringstyp.
   *
   * @private
   * @param {string} type Noteringstyp.
   */
  #enableData(type) {
    const disable = [
      LogEntry.EntryType.CaseOpen,
      LogEntry.EntryType.Notification,
    ];
    const require = [
      LogEntry.EntryType.ActionPlan,
      LogEntry.EntryType.Appeal,
      LogEntry.EntryType.AuditFinish,
      LogEntry.EntryType.AuditStart,
      LogEntry.EntryType.Deferment,
      LogEntry.EntryType.Injunction,
      LogEntry.EntryType.Remarks,
    ];
    const view = this._view;
    view.requireData(require.includes(type));
    view.disableData(disable.includes(type));
  }

  /**
   * Aktivera eller avaktivera riktningslistan beroende på noteringstyp.
   *
   * @private
   * @param {string} type Noteringstyp.
   */
  #enableDirection(type) {
    const directions = {
      [LogEntry.EntryType.ActionPlan]: LogEntry.Direction.Received,
      [LogEntry.EntryType.Appeal]: LogEntry.Direction.Received,
      [LogEntry.EntryType.Deferment]: LogEntry.Direction.Received,
      [LogEntry.EntryType.Injunction]: LogEntry.Direction.Sent,
      [LogEntry.EntryType.Minutes]: LogEntry.Direction.None,
      [LogEntry.EntryType.Note]: LogEntry.Direction.None,
      [LogEntry.EntryType.Notification]: LogEntry.Direction.Sent,
      [LogEntry.EntryType.Remarks]: LogEntry.Direction.Sent,
    };
    const view = this._view;
    if (type in directions) {
      this.#entry.direction = directions[type];
      view.direction = directions[type];
      view.disableDirection(true);
    } else {
      view.disableDirection(false);
    }
  }

  /**
   * Aktivera eller avaktivera Ta bort-knappen i vyn.
   *
   * Vid ny notering, eller om noteringstypen inte medger borttag, avaktivera
   * Ta bort-knappen.
   *
   * @private
   * @param {LogEntry} [entry] Loggnotering.
   */
  #enableRemove(entry) {
    const undeletable = [LogEntry.EntryType.CaseOpen];
    if (undefined === entry || undeletable.includes(entry.type)) {
      this._view.disableRemove();
    }
  }

  /**
   * Förbered modell och vy för redigering av ny loggnotering.
   *
   * @private
   */
  #newEntry() {
    this.#isNew = true;
    this.#entry = new LogEntry(this.#case.id);
    const view = this._view;
    view.disableRemove();
    view.disableTypes([
      LogEntry.EntryType.AuditFinish,
      LogEntry.EntryType.AuditStart,
      LogEntry.EntryType.CaseOpen,
    ]);
    view.timestamp = this.#entry.timestamp;
  }

  /**
   * Ta bort loggnoteringen ur objektdatabasen.
   *
   * Begär bekräftelse från användaren före borttag.
   *
   * @private
   * @param {object}      event         Händelseinformation.
   * @param {HTMLElement} event.trigger Ta bort-knappen i formuläret.
   */
  async #onDelete({ trigger }) {
    const ok = await this._view.confirm(
      'Noteringen kommer att tas bort ur ärendeloggen.\n' +
        'Åtgärden går inte att ångra.',
      trigger
    );
    if (!ok) throw null;
    try {
      await this._model.deleteLogEntry(this.#entry.id);
      /* borttaget på begäran 2022-11-10
            this._context.status = `Noteringen har tagits bort ur databasen.`;
            */
    } catch (err) {
      this._context.error = `Kan inte ta bort noteringen ur databasen: ${err}.`;
      throw err;
    }
  }

  /**
   * Sparar loggnoteringen i objektdatabasen.
   *
   * @private
   * @param {object}      event         Händelseinformation.
   * @param {HTMLElement} event.trigger Ta bort-knappen i formuläret.
   */
  async #onSave({ trigger }) {
    try {
      await this._model.setLogEntry(this.#entry);
      /* borttaget på begäran 2022-11-10
            this._context.status = "Noteringen har sparats i databasen.";
            */
    } catch (err) {
      this._context.error = `Kan inte spara noteringen: ${err}.`;
      throw err;
    }
  }

  /**
   * Observatör för vyhändelser.
   *
   * Uppdatera modellen när användaren förändrar värden i vyn.
   *
   * @private
   * @param {object} event Händelseinformation
   */
  #onViewEvent(event) {
    if ('change' !== event.type) return;

    const { target, value } = event;

    this.#entry[target] = value;
    if ('timestamp' !== target && this.#entry[target] !== value) {
      this._view[target] = this.#entry[target];
    }
    if ('type' === target) {
      this.#enableData(value);
      this.#enableDirection(value);
      this.#suggestSummary(value);
    }
  }

  /**
   * Populera listan med granskningar.
   *
   * @private
   * @param {case} aCase Ärende.
   */
  #populateData(aCase) {
    const data = [];
    for (const audit of aCase.audits()) {
      data.push([audit.started.getTime(), audit.toString()]);
    }
    data.length && this._view.setData(data);
  }

  /**
   * Populera vyn med data från loggnoteringen.
   *
   * @private
   * @param {LogEntry} entry Loggnotering.
   */
  #populateView(entry) {
    ['data', 'direction', 'summary', 'text', 'timestamp', 'type'].forEach(
      (field) => (this._view[field] = entry[field])
    );
  }

  /**
   * Sätt vyn i skrivskyddat läge om noteringstypen inte medger ändringar.
   *
   * @private
   * @param {LogEntry} entry Loggnotering.
   */
  #readOnlyMode(entry) {
    if (
      [
        LogEntry.EntryType.AuditFinish,
        LogEntry.EntryType.AuditStart,
        LogEntry.EntryType.CaseOpen,
      ].includes(entry.type)
    ) {
      this._view.readOnly = true;
    }
  }

  /**
   * Föreslå lämplig text för sammanfattningen när användaren valt typ.
   *
   * @private
   * @param {string} type Vald noteringstyp.
   */
  #suggestSummary(type) {
    const summaries = {
      [LogEntry.EntryType.ActionPlan]: 'Åtgärdsplan inkommen',
      [LogEntry.EntryType.Appeal]: 'Överklagande inkommet',
      [LogEntry.EntryType.Deferment]: 'Ansökan om anstånd inkommen',
      [LogEntry.EntryType.Injunction]: 'Föreläggande skickat',
      [LogEntry.EntryType.Minutes]: 'Mötesanteckningar',
      [LogEntry.EntryType.Notification]: 'Avisering om granskning',
      [LogEntry.EntryType.Remarks]: 'Påpekande skickat',
    };
    if (type in summaries) {
      this.#entry.summary = this._view.suggestSummary(summaries[type]);
    }
  }
}

// Importera beroenden.
import { ControllerBase } from './ControllerBase.js';
import { LogEntry } from '../model/LogEntry.js';
import { URLParameters } from './URLParameters.js';

/**
 * Controller för presentation av ärendeinformation.
 *
 * @license CC-BY 4.0
 */
export class CaseDisplayController extends ControllerBase {
  // Privata fält.
  #case;
  #csvAuditView;
  #csvView;
  #file;
  #populated = false;
  #protocolView;
  #remarksView;

  /**
   * Konstruera en controllerinstans.
   *
   * @param {Model}           model        Modellobjekt.
   * @param {ViewBase}        view         Vyinstans.
   * @param {FileStorage}     filesystem   Fillagring.
   * @param {ProtocolView}    protocolView Protkollvy.
   * @param {CSVAuditView}    csvAuditView CSV-granskningsmetadatavy.
   * @param {CSVProtocolView} csvView      CSV-protkollvy.
   * @param {RemarksView}     remarksView  Påpekande-/föreläggandevy.
   * @param {object}          [globals]    Globala objekt vid enhetstester.
   */
  constructor(
    model,
    view,
    filesystem,
    protocolView,
    csvAuditView,
    csvView,
    remarksView,
    globals = {}
  ) {
    super(model, view, globals);
    this.#csvAuditView = csvAuditView;
    this.#csvView = csvView;
    this.#file = filesystem;
    this.#protocolView = protocolView;
    this.#remarksView = remarksView;
  }

  /**
   * @inheritDoc
   * @override
   */
  async prepare(context) {
    const model = this._model;
    const view = this._view;
    const { breadcrumbs } = view;

    // Registrera en spara-hanterare och en dokumentobservatör.
    this._action('save', (e) => this.#onSave(e));
    view.subscribe((e) => this.#onDocument(e));

    const caseID = context.case;
    this.#case = await model.getCase(caseID);
    if (!this.#case) {
      throw new TypeError(`Ärende #${context.case} finns inte.`);
    }

    this.#case.monitoring || (view.advancedMode = false);

    breadcrumbs.list('case', 'Ärenden');
    breadcrumbs.current = this.#case.caseNumber.toString();
    this.#initLinks(caseID, this.#case.logSize);
    this.#populateView(this.#case);
  }

  /**
   * Lägg till påpekanden och förelägganden i dokumentlistan.
   *
   * Sortera dokumenten i stigande datumordning.
   *
   * @private
   * @param {Audit} audit Granskning.
   */
  #addDocuments(audit) {
    const date = (d) => new Date(d).toLocaleDateString('sv');
    const docs = [];
    const id = (d) => `${audit.id},${d.getTime()}`;
    const types = { injunction: 'Föreläggande', remarks: 'Påpekande' };
    for (const [created] of audit.remarks) {
      docs.push({ created, type: 'remarks' });
    }
    for (const [created] of audit.injunctions) {
      docs.push({ created, type: 'injunction' });
    }
    docs.sort((a, b) => a.created.getTime() - b.created.getTime());

    for (const { created, type } of docs) {
      this._view.addDocument(type, id(created), [types[type], date(created)]);
    }
  }

  /**
   * Sätt länkadresser.
   *
   * Sätt länkadresserna för Ändra, Ny granskning och Logg.
   *
   * @private
   * @param {string} caseID  Ärendeidentitet.
   * @param {number} logSize Antal noteringar i ärendeloggen.
   */
  #initLinks(caseID, logSize) {
    const base = new URLParameters();
    base.add('case', caseID);

    const edit = new URLParameters(base);
    edit.add('return', `case&${base}`);
    edit.add('edit');

    const view = this._view;
    view.create = `?page=audit&${base}`;
    view.edit = `?page=case&${edit}`;
    view.log = `?page=log&${base}`;
    view.logSize = logSize;
  }

  /**
   * Hantera klick på dokumentlänkar i vyn.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  #onDocument(event) {
    const id = (s) => s.split(',').map((i) => Number(i));
    const action = {
      injunction: (id) => this.#showDocument(...id, 'injunction'),
      protocol: (id) => this.#showProtocol(...id),
      remarks: (id) => this.#showDocument(...id, 'remarks'),
    }[event.type];

    if (action) {
      action(id(event.id));
    }
  }

  /**
   * Hantera knapphändelseaviseringar från vyn.
   *
   * @private
   * @param {object}            event         Händelseinformation.
   * @param {HTMLButtonElement} event.trigger Utlösare (klickad knapp).
   */
  async #onSave({ trigger }) {
    const id = (s) => s.split(',').map((i) => Number(i));
    const action = {
      case: () => this.#saveCaseToFile(),
      csv: (id) => this.#saveProtocolAsCSV(id),
      csvAudit: (id) => this.#saveAuditAsCSV(id),
      injunction: (...id) => this.#saveDocument(...id),
      protocol: (id) => this.#saveProtocol(id),
      remarks: (...id) => this.#saveDocument(...id),
    }[trigger.dataset.type];

    if (action) {
      await action(...id(trigger.dataset.id ?? ''), trigger.dataset.type);
    }
  }

  /**
   * Populera vyn med modelldata.
   *
   * @private
   * @param {CaseInfo} aCase Ärendeinformation.
   */
  #populateView(aCase) {
    const org = aCase.organization;
    const s = (o) => o?.supervisor;
    const view = this._view;
    view.title = aCase.caseNumber.toString();
    view.heading = `${aCase.caseNumber} ${aCase.service.name}`;
    view.supervisor = (s(aCase) ?? s(aCase.schedule))?.toString() ?? '';
    view.org = org.name;
    view.regNo = org.registrationNumber;
    view.email = org.email ?? '';
    view.tel = org.telephone;
    view.addr = org.address;

    const page = '?page=audit';
    for (const audit of aCase.audits()) {
      const ap = new URLParameters();
      ap.add('audit', String(audit.id));
      const s = `${page}&${ap}`;
      const e = audit.finished ? null : `${s}&edit`;
      view.addAudit(e, s, [audit.toString(), audit.officer]);

      if (audit.finished) {
        view.addProtocol(audit.id, audit.toString().slice(0, 10));
        if (view.advancedMode) {
          view.addDocument('csvAudit', String(audit.id), [
            'Översikt, CSV',
            audit.toString().slice(0, 10),
          ]);
          view.addDocument('csv', String(audit.id), [
            'Granskningsprotokoll, CSV',
            audit.toString().slice(0, 10),
          ]);
          this.#addDocuments(audit);
        }
      }
    }
  }

  /**
   * Spara översikt för angiven granskning som CSV.
   *
   * @private
   * @param {number} id Granskningsidentitet.
   */
  async #saveAuditAsCSV(id) {
    const audit = await this._model.getAudit(id, true);
    if (audit) {
      try {
        await this.#csvAuditView.save(this.#case, audit);
      } catch (err) {
        this._view.showError('Kan inte skapa översikten.');
      }
    }
  }

  /**
   * Spara aktuellt ärende i JSON-format till filsystemet.
   *
   * Populera alla granskningar och spara ärendet som fil.
   *
   * @private
   */
  async #saveCaseToFile() {
    const aCase = this.#case;
    this.#populated || (await this._model.populate(aCase));
    this.#populated = true;
    await this.#file.saveToJSONFile(aCase.filename, aCase);
  }

  /**
   * Spara angivet påpekande eller föreläggande.
   *
   * @private
   * @param {number} id   Granskningsidentitet.
   * @param {number} time Tidsstämpel för dokumentet.
   * @param {string} type Dokumenttyp (remarks/injuntion).
   */
  async #saveDocument(id, time, type) {
    const audit = await this._model.getAudit(id, true);
    if (audit) {
      try {
        const aCase = this.#case;
        const timestamp = new Date(time);
        await this.#remarksView.save(aCase, audit, timestamp, type);
      } catch (err) {
        const doc = {
          injunction: 'föreläggandet',
          remarks: 'påpekandet',
        }[type];
        this._view.showError(`Kan inte skapa ${doc}.`);
      }
    }
  }

  /**
   * Spara tillsynsprotokollet för angiven granskning.
   *
   * @private
   * @param {number} id Granskningsidentitet.
   */
  async #saveProtocol(id) {
    const audit = await this._model.getAudit(id, true);
    if (audit) {
      try {
        await this.#protocolView.save(this.#case, audit);
      } catch (err) {
        this._view.showError('Kan inte skapa protokollet.');
      }
    }
  }

  /**
   * Spara tillsynsprotokollet för angiven granskning som CSV.
   *
   * @private
   * @param {number} id Granskningsidentitet.
   */
  async #saveProtocolAsCSV(id) {
    const audit = await this._model.getAudit(id, true);
    if (audit) {
      try {
        await this.#csvView.save(this.#case, audit);
      } catch (err) {
        this._view.showError('Kan inte skapa protokollet.');
      }
    }
  }

  /**
   * Visa angivet påpekande eller föreläggande.
   *
   * @private
   * @param {number} id   Granskningsidentitet.
   * @param {number} time Tidsstämpel för dokumentet.
   * @param {string} type Dokumenttyp (remarks/injuntion).
   */
  async #showDocument(id, time, type) {
    const audit = await this._model.getAudit(id, true);
    if (audit) {
      try {
        const aCase = this.#case;
        const timestamp = new Date(time);
        await this.#remarksView.open(aCase, audit, timestamp, type);
      } catch (err) {
        const doc = {
          injunction: 'föreläggandet',
          remarks: 'påpekandet',
        }[type];
        this._view.showError(`Kan inte skapa ${doc}.`);
      }
    }
  }

  /**
   * Visa tillsynsprotokollet för angiven granskning.
   *
   * @private
   * @param {number} id Granskningsidentitet.
   */
  async #showProtocol(id) {
    const audit = await this._model.getAudit(id, true);
    if (audit) {
      try {
        await this.#protocolView.open(this.#case, audit);
      } catch (err) {
        this._view.showError('Kan inte skapa protokollet.');
      }
    }
  }
}

// Importera beroenden.
import { ControllerBase } from './ControllerBase.js';
import { URLParameters } from './URLParameters.js';

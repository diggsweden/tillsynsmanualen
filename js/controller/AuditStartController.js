/**
 * Controller för start av granskning.
 *
 * @license CC-BY 4.0
 */
export class AuditStartController extends ControllerBase {
  // Privata fält.
  #advanced;
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
   * @throws {TypeError} Ärendenummer saknas eller ogiltigt, eller ingen
   *                     handläggare eller ärendekatalog definierad.
   */
  async prepare(context) {
    const model = this._model;

    if (!context.case) {
      throw new TypeError('Ange ärendeidentitet.');
    }
    if (model.advancedMode && !model.caseDirectory) {
      throw new TypeError(
        'Ange en ärendekatalog innan du startar en granskning.'
      );
    }

    // Registrera åtgärd för Starta.
    this._action('start', (ev) => this.#startAudit(ev));

    // Hämta information ur modellen.
    const tasks = [model.peopleByRole('officer'), model.getCase(context.case)];

    [this.#officers, this.#case] = await Promise.all(tasks);
    if (!this.#case) {
      throw new TypeError(`Ärende #${context.case} finns inte.`);
    }
    this.#addOfficersFromPreviousAudits(this.#case, this.#officers);
    if (0 === this.#officers.length) {
      throw new TypeError(
        'Lägg till en granskare innan du startar en granskning.'
      );
    }

    this._view.service = this.#case.service.type;
    this.#advanced = model.advancedMode && this.#case.monitoring;
    this.#setBreadcrumbs();
    this.#addPreviousAudits();
    this.#populateOfficers(this.#officers);
  }

  /**
   * Lägg till en loggnotering om skapad granskning.
   *
   * @private
   * @param {Audit} audit Granskning.
   */
  #addLogEntry(audit) {
    const entry = new LogEntry(this.#case.id);
    entry.data = audit.started.getTime();
    entry.direction = LogEntry.Direction.None;
    entry.type = LogEntry.EntryType.AuditStart;
    entry.summary = 'Granskning påbörjad';
    this._model.setLogEntry(entry);
  }

  /**
   * Lägg till granskare från tidigare granskningar i ärendet.
   *
   * Om ärendet är skapat av en annan granskare finns personuppgifterna tro-
   * ligen inte i den aktuella användarens objektdatabas. Lägg därför till
   * tidigare granskare i listan med granskare.
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
   * Lägg till befintliga granskningar i vyn.
   *
   * Användaren kan välja att kopiera en tidigare granskning, till exempel vid
   * en omgranskning, för att få med samma urval.
   *
   * Om ärendet inte innehåller någon tidigare granskning, dölj listan i vyn.
   *
   */
  #addPreviousAudits() {
    let count = 0;
    const view = this._view;
    for (const audit of this.#case.audits()) {
      view.addAudit(String(audit.id), audit.toString());
      ++count;
    }
    if (0 === count) {
      view.hideSource();
    }
  }

  /**
   * Kopiera en tidigare granskning.
   *
   * Kopiera sparade färger och spara granskningen i objektdatabasen.
   * Kopiera sedan stickprovsurvalet (utan ingående krav).
   *
   * @private
   * @param {number} sourceID Identitet för källa att kopiera från.
   * @param {Audit}  target   Granskning att kopiera tilll.
   */
  async #copyAudit(sourceID, target) {
    // Hämta källgranskningen.
    const model = this._model;
    const source = await model.getAudit(sourceID);

    // Kopiera sparade färger.
    for (const [value, name] of source.colours()) {
      target.setColour(name, value);
    }

    // Spara den nya granskningen i objektdatabasen.
    await model.setAudit(target);

    // Kopiera stickprovsurvalet.
    for (const srcSample of source.allSamples()) {
      const data = srcSample.serialize();
      data.auditID = target.id;
      const sample = SampleFactory.build(target.id, data);
      await model.setSample(sample);
    }
  }

  /**
   * Öppna ärendet och skapa en loggnotering om det.
   *
   * @private
   */
  #openCase() {
    this.#case.open();
    this._model.setCase(this.#case);

    const entry = new LogEntry(this.#case.id);
    entry.direction = LogEntry.Direction.None;
    entry.type = LogEntry.EntryType.CaseOpen;
    entry.summary = 'Ärendet öppnat';
    this._model.setLogEntry(entry);
  }

  /**
   * Populera rullgardinslistan med granskare.
   *
   * Om listan består av en enda granskare, sätt den granskaren som vald.
   *
   * @private
   * @param {Person[]} officers Lista med granskare.
   */
  #populateOfficers(officers) {
    const view = this._view;
    view.officers = officers.map((p) => ({
      label: p.toString(),
      value: p.email,
    }));

    if (1 === officers.length) {
      view.officer = officers[0].email;
    }
  }

  /**
   * Populera länkstigen och lägg till den i vyn.
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
    breadcrumbs.current = 'Ny granskning';
  }

  /**
   * Sätt åtgärdssökvägen för formuläret.
   *
   * @private
   * @param {Audit} audit Granskning.
   * @return {string}
   */
  #setFormAction(audit) {
    let page = 'audit';
    const params = new URLParameters();
    const view = this._view;
    params.add('audit', String(audit.id));
    if (!view.source) {
      page = 'sample';
      params.add('new');
    }
    return (view.action = `?page=${page}&${params}`);
  }

  /**
   * Visa förberedelser i vyn.
   *
   * @private
   * @param {Audit} audit Den skapade granskningen.
   */
  async #showPreparations(audit) {
    const model = this._model;
    const aCase = this.#case;
    const date = audit.toString();
    const dir = model.caseDirectory;
    const name = `${aCase} ${aCase.service.name}`;
    const year = String(aCase.caseNumber.year);
    return this._view.showPreparations(dir, year, name, date);
  }

  /**
   * Starta granskningen när användaren aktiverat Starta-knappen.
   *
   * Spara granskningen i objektdatabasen. Kopiera stickprov och sparade
   * färger från eventuell angiven källgranskning. Lägg till en loggnotering
   * om påbörjad granskning. (Öppna ärendet om det inte är öpppet.)
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  async #startAudit(event) {
    const audit = new Audit(this.#case.id);
    const model = this._model;
    const officers = this.#officers;
    const source = this._view.source;
    const view = this._view;
    audit.officer = officers.find((p) => p.email === view.officer);
    'app' === view.service && (audit.version = view.version);
    if (source) {
      await this.#copyAudit(Number(source), audit);
    } else {
      await model.setAudit(audit);
    }

    this.#case.opened ?? this.#openCase();
    this.#addLogEntry(audit);
    event.path = this.#setFormAction(audit);
    this.#advanced && (await this.#showPreparations(audit));
    /* borttaget på begäran 2022-11-10
        this._context.status = `Granskning ${audit} skapad.`;
        */
  }
}

// Importera beroenden.
import { Audit } from '../model/Audit.js';
import { ControllerBase } from './ControllerBase.js';
import { LogEntry } from '../model/LogEntry.js';
import { MobileApp } from '../model/service.js';
import { SampleFactory } from '../model/sample.js';
import { URLParameters } from './URLParameters.js';

/**
 * Controller för listning av krav i ett stickprov.
 *
 * @license CC-BY 4.0
 */
export class SampleDisplayController extends ControllerBase {
  // Privata fält.
  #advanced;
  #audit;
  #case;
  #config;
  #order;
  #sample;

  /**
   * Konstruera en controllerinstans.
   *
   * @param {Model}            model     Modellobjekt.
   * @param {ViewBase}         view      Vyinstans.
   * @param {RequirementOrder} order     Kravordning.
   * @param {object}           [globals] Globala objekt vid enhetstester.
   */
  constructor(model, view, order, globals = {}) {
    super(model, view, globals);
    this.#order = order;
  }

  /**
   * @inheritDoc
   * @override
   * @throws {TypeError} Stickprovs-id saknas eller ogiltig.
   */
  async prepare(context) {
    if (!context.sample) {
      throw new TypeError('Ange stickprovsidentitet.');
    }
    this.#config = await this.#setSample(context);
    this._view.subscribe((e) => this.#onViewEvent(e));
    this._action('approve', async () => await this.#autoApprove());
    this._action('copy', async () => await this.#onCopyRequirements());
    this._action('partial', () => this.#onPartialToggle());
    this._action('undo-approve', async () => await this.#autoApprove(true));
    this.#populateView();
    return context;
  }

  /**
   * Lägg till länkstigen i vyn.
   *
   * @private
   */
  #addBreadcrumbs() {
    const { breadcrumbs } = this._view;
    breadcrumbs.case(
      this.#case.id,
      this.#case.toString(),
      this.#case.organization.name,
      this.#case.service.name
    );
    breadcrumbs.audit(this.#audit.id, this.#audit.started);
    breadcrumbs.current = this.#sample.name;
  }

  /**
   * Godkänn ogranskade krav, eller ångra godkännande.
   *
   * Spara sedan de påverkade kraven i databasen och populera om vyn.
   *
   * @private
   * @param {boolean} [undo] Ångra godkännande?
   */
  async #autoApprove(undo = false) {
    const match = (req) => req.approved === undo && unchecked(req);
    const unchecked = (req) => req.approved || undefined === req.state;
    const reqs = [...this.#sample.requirements(true)].filter(match);

    for (const req of reqs) {
      req.approved = !undo;
      await this._model.setRequirement(req);
    }

    this._view.clear();
    this.#populateView(false);
  }

  /**
   * Bygg strukturen för ett avsnitt.
   *
   * @private
   * @param {object}   config    Kravkonfiguration.
   * @param {object}   secCfg    Avsnittskonfiguration.
   * @param {object[]} sections  Avsnittsstruktur.
   */
  #buildSection(config, secCfg, sections) {
    const section = {
      title: secCfg.title ?? '#avsnittsrubrik saknas',
      requirements: Array.from(this.#order.section(secCfg)),
      sections: [],
    };
    for (const subCfg of secCfg.sections ?? []) {
      this.#buildSection(config, subCfg, section.sections);
    }
    sections.push(section);
  }

  /**
   * Bygg avsnittsstrukturen som ska visas.
   *
   * Utgå från konfigurationen och kravordningen och konstruera hierarkin med
   * avsnitt och krav.
   *
   * @private
   * @param {object} config Kravkonfiguration.
   * @return {object[]} Vektor med avsnitt och krav.
   */
  #buildSections(config) {
    const sections = [];
    for (const secCfg of config.sections ?? []) {
      this.#buildSection(config, secCfg, sections);
    }
    return sections;
  }

  /**
   * Kopiera en kontroll från ett krav till samma krav i aktuellt stickprov.
   *
   * Endast tillämplighetsflaggorna kopieras. Tillämpliga kontroller sätts
   * till godkända.
   *
   * @private
   * @param {Check}       source Kontroll att kopiera ifrån.
   * @param {Requirement} target Krav i aktuellt stickprov att kopiera till.
   */
  #copyCheck(source, target) {
    const check = CheckFactory.build(source.serialize());
    check.observation = '';
    check.setScreenshot('', '');
    target.setCheck(check);
  }

  /**
   * Kopiera ett godkänt krav från ett annat stickprov.
   *
   * @private
   * @param {Requirement} source Godkänt krav att kopiera ifrån.
   * @param {Requirement} target Krav i aktuellt stickprov att kopiera till.
   * @param {boolean}     notes  Kopiera även noteringar?
   */
  #copyRequirement(source, target, notes) {
    for (const check of source.checks()) {
      if (check.derived) continue;
      this.#copyCheck(check, target);
    }
    if (notes) {
      target.externalNote ||= source.externalNote;
      target.internalNote ||= source.internalNote;
    }
    this.#sample.setRequirement(target);
  }

  /**
   * Kopiera godkända krav från ett annat stickprov.
   *
   * Spara sedan de kopierade kraven i databasen och populera om vyn.
   *
   * @private
   */
  async #onCopyRequirements() {
    const view = this._view;
    const notes = view.copyNotes;
    const reqs = view.sourceRequirements;
    const source = this.#audit.sample(view.sourceSample);

    if (source && reqs.length) {
      for (const id of reqs) {
        const src = source.requirement(id);
        const req = this.#sample.requirement(id);
        this.#copyRequirement(src, req, notes);
        await this._model.setRequirement(req);
      }
      view.clear();
      this.#populateView(false);
    }
  }

  /**
   * Sätt eller ta bort markering för partialgranskning.
   *
   * Spara sedan aktuellt stickprov i databasen.
   *
   * @private
   */
  async #onPartialToggle() {
    const view = this._view;
    this.#sample.partial = view.partial = !view.partial;
    await this._model.setSample(this.#sample);
  }

  /**
   * Observatör som anropas vid händelser i vyn.
   *
   * Uppdatera listan med kopierbara krav när användaren väljer ett stickprov
   * att kopiera ifrån. Notera också om något av kraven har en extern eller
   * intern notering, för att kunna förmedla det till vyn.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  async #onViewEvent(event) {
    if ('change' !== event.type) return;

    const { target, value } = event;
    if ('source' === target.name) {
      this.#setCopyableRequirements(this.#audit.sample(Number(value)));
    }
  }

  /**
   * Populera vyn med modelldata.
   *
   * @private
   * @param {boolean} [initial] Första populeringen?
   */
  #populateView(initial = true) {
    if (initial) {
      this.#addBreadcrumbs();
      this.#setHeading();
      this._view.partial = this.#sample.partial;
      this.#setAuditLink();
      this.#showContentTypes();
      this.#showComponents();
      this.#setNote();
    }
    this.#setEditURL();
    this.#setResumeLink();
    this.#setAutoApprove();
    this.#setCopyableSamples();
    this.#setProgress();

    this.#showSections(this.#buildSections(this.#config));
    this.#showMisc();
  }

  /**
   * Sätt text och värde i autogodkännandeknappen.
   *
   * Om granskningen är avslutad eller inte innehåller några ogranskade krav:
   * deaktivera knappen;
   * annars, om stickprovet innehåller autogodkända krav: sätt knappen till
   * "Ångra autogodkännande".
   *
   * @private
   */
  #setAutoApprove() {
    const view = this._view;
    if (this.#audit.finished) {
      view.setApprove(null);
    } else {
      const approved = (req) => req.approved;
      const unchecked = (req) => undefined === req.state;
      if ([...this.#sample.requirements(true)].some(approved)) {
        view.setApprove('Ångra godkänn ogranskade', 'undo-approve');
      } else if (![...this.#sample.requirements()].some(unchecked)) {
        view.setApprove(null);
      } else {
        view.setApprove('Godkänn ogranskade', 'approve');
      }
    }
  }

  /**
   * Sätt sökväg och länktext för granskningsöversikten.
   *
   * @private
   */
  #setAuditLink() {
    const url = `?page=audit&audit=${this.#audit.id}`;
    this._view.setAuditLink(url, this.#audit.toString());
  }

  /**
   * Populera vyn med kopierbara krav från angivet stickprov.
   *
   * Ett kopierbart krav måste vara godkänt och inte vara granskat i det
   * aktuella stickprovet.
   *
   * @private
   * @param {Sample} sample Stickprov att kopiera ifrån.
   */
  #setCopyableRequirements(sample) {
    const has = (s) => '' !== s;
    let notes = false;
    const reqs = [];
    for (const src of sample.requirements()) {
      if (true !== src.state) continue;
      const target = this.#sample.requirement(src.id);
      if (target && null == target.state) {
        const { clause, id, title } = src;
        reqs.push({ clause, id, title });
        notes ||= has(src.externalNote) || has(src.internalNote);
      }
    }
    this._view.setCopyableRequirements(reqs, notes);
  }

  /**
   * Populera vyn med kopierbara stickprov.
   *
   * Ett kopierbart stickprov måste vara av samma typ som det aktuella stick-
   * provet och innehålla minst ett godkänt krav.
   *
   * Om inga kopierabara stickprov finns, eller om granskningen är avslutad
   * och inte medger ändringar, sätt kopierbara stickprov till en tom vektor.
   *
   * @private
   */
  async #setCopyableSamples() {
    const included = (r) => this.#sample.requirement(r.id);
    const samples = [];
    if (!this.#sample.done && !this.#audit.finished) {
      for (const sample of this.#audit.allSamples()) {
        if (sample.id === this.#sample.id) continue;
        if (sample.type !== this.#sample.type) continue;
        this.#audit.setSample(await this._model.getSample(sample.id));
        const s = this.#audit.sample(sample.id);
        for (const req of s.requirements()) {
          if (req.done && !req.failed && included(req)) {
            samples.push({ id: s.id, name: s.name });
            break;
          }
        }
      }
    }
    this._view.setCopyableSamples(samples);
  }

  /**
   * Sätt redigeringssökvägen för stickprovet i vyn.
   *
   * @private
   */
  #setEditURL() {
    if (this.#audit.finished) {
      this._view.edit = null;
    } else {
      const params = new URLParameters();
      params.add('sample', String(this.#sample.id));
      params.add('return', `sample&${params}`);
      params.add('edit');
      this._view.edit = `?page=sample&${params}`;
    }
  }

  /**
   * Sätt ikon och namn i sidrubriken.
   *
   * Sätt även dokumenttiteln.
   *
   * @private
   */
  #setHeading() {
    const { name, type, url } = this.#sample;
    this._view.title = name;
    this._view.setHeading(type, name, url);
  }

  /**
   * Sätt eventuell notering i vyn.
   *
   * @private
   */
  #setNote() {
    const { note } = this.#sample;
    if (note) {
      this._view.note = note;
    }
  }

  /**
   * Uppdatera förloppsindikatorn.
   *
   * @private
   */
  #setProgress() {
    const [done, total] = this.#sample.progress();
    const labels = { one: 'krav granskat', other: 'krav granskade' };
    const pr = new Intl.PluralRules('sv');
    const label = `${done} av ${total} ${labels[pr.select(done)]}`;
    this._view.setProgress(done, total, label);
  }

  /**
   * Sätt sökväg och länktext för fortsatt-granskningslänken.
   *
   * @private
   */
  #setResumeLink() {
    const next = this.#order.skip(null);
    if (next) {
      const params = new URLParameters();
      params.add('sample', String(this.#sample.id));
      params.add('requirement', next);
      const text = (this.#sample.started ? 'Fortsätt' : 'Börja') + ' granska';
      this._view.setResumeLink(`?page=requirement&${params}`, text);
    } else {
      this._view.setResumeLink(null, '');
    }
  }

  /**
   * Hämta angivet stickprov och sätt som aktuellt stickprov i controllern.
   *
   * Hämta också den granskning stickprovet ingår i och det ärende som
   * granskningen tillhör.
   *
   * Om granskning av stickprovet inte påbörjats, populera det med krav och
   * spara det i databasen.
   * Hämta kravkonfiguration for entiteten från servern.
   *
   * @private
   * @param {AppContext} context Applikationskontext.
   * @return {object} Kravkonfigurationen.
   * @throws {TypeError} Ogiltigt stickprovs-id eller fel vid hämtning av
   *                     konfiguration.
   */
  async #setSample(context) {
    const model = this._model;
    this.#sample = await model.getSample(context.sample);
    if (!this.#sample) {
      throw new TypeError(`Stickprov #${context.sample} finns inte.`);
    }

    this.#audit = await model.getAudit(this.#sample.auditID);
    this.#case = await model.getCase(this.#audit.caseID);

    for (const { id } of this.#sample.pending ?? []) {
      this.#audit.setSample(await model.getSample(id));
    }

    this.#advanced = this._model.advancedMode && this.#case.monitoring;
    this.#sample.mode = this.#advanced ? 'advanced' : 'simplified';

    const populate = !this.#sample.hasRequirements;
    const config = await this.#order.build(this.#sample);
    if (populate) {
      for (const req of this.#sample.requirements(true)) {
        await model.setRequirement(req);
      }
    }

    this.#audit.setSample(this.#sample);

    return config;
  }

  /**
   * Visa ingående komponenter.
   *
   * Lägg till namnen på ingående komponenter i vyn.
   *
   * @private
   */
  #showComponents() {
    for (const component of this.#sample.components ?? []) {
      this._view.addComponent(component.name);
    }
  }

  /**
   * Visa innehållstyper.
   *
   * Lägg till stickprovets eventuella innehållstyper i vyn.
   *
   * @private
   */
  #showContentTypes() {
    const names = this.#config.contentTypes.reduce(
      (acc, { id, title }) => ((acc[id] = title), acc),
      {}
    );

    for (const type of this.#sample.contentTypes) {
      this._view.addContentType(names[type] ?? `#okänd typ '${type}'#`);
    }
  }

  /**
   * Visa ett Övrigt-avsnitt om det finns "hemlösa" krav.
   *
   * Om konfigurationen ändrats efter att stickprovet populerades kan det
   * finnas krav som inte längre refereras från någon sektion. Skapa då ett
   * Övrigt-avsnitt och lägg in de hemlösa kraven där.
   *
   * @private
   */
  #showMisc() {
    const ids = Array.from(this.#order.sectionless());
    if (ids.length > 0) {
      this._view.addSection('Övrigt');
      for (const id of ids) {
        this.#showRequirement(id);
      }
    }
  }

  /**
   * Lägg till en kravlänk under aktuellt avsnitt i vyn.
   *
   * @private
   * @param {string} id Kravidentitet.
   */
  #showRequirement(id) {
    const requirement = this.#sample.requirement(id) ?? {};
    let { approved, clause, state, title } = requirement;
    const extNote = Boolean(requirement.externalNote);
    const intNote = Boolean(requirement.internalNote);
    const params = new URLParameters();
    const status = approved
      ? 'autopass'
      : state
        ? 'pass'
        : false === state
          ? 'fail'
          : 'unchecked';

    /^\D/.test(clause) && (clause = '');

    params.add('sample', String(this.#sample.id));
    params.add('requirement', id);

    const url = `?page=requirement&${params}`;
    this._view.addRequirement(url, status, clause, title, extNote, intNote);
  }

  /**
   * Lägg till ett granskningsavsnitt i vyn.
   *
   * @private
   * @param {object}  section Avsnittsstruktur.
   * @param {number}  level   Avsnittsnivå.
   */
  #showSection(section, level) {
    const view = this._view;

    if (2 === level) {
      view.addSection(section.title);
    } else {
      view.addSubsection(section.title, level);
    }

    section.requirements.forEach((id) => this.#showRequirement(id));
    this.#showSections(section.sections, level + 1);
  }

  /**
   * Lägg till ett granskningsavsnitt i vyn.
   *
   * @see #buildSections
   * @private
   * @param {object[]} sections Avsnittsstruktur.
   * @param {number}   [level]  Avsnittsnivå.
   */
  #showSections(sections, level = 2) {
    const req = (s) => s.requirements.length > 0;
    const show = (s) => req(s) || sub(s);
    const sub = (s) => s.sections.some(show);
    sections.filter(show).forEach((s) => this.#showSection(s, level));
  }
}

// Importera beroenden.
import { CheckFactory } from '../model/check.js';
import { ControllerBase } from './ControllerBase.js';
import {
  AppScreen,
  Component,
  NonWebDocument,
  Webpage,
} from '../model/sample.js';
import { Requirement } from '../model/Requirement.js';
import { URLParameters } from './URLParameters.js';

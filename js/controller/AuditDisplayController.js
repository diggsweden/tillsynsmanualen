/**
 * Controller för visning av urvalslista i en granskning.
 *
 * @license CC-BY 4.0
 */
export class AuditDisplayController extends ControllerBase {
  // Privata fält.
  #audit;
  #case;
  #protocolView;
  #remarksView;

  /**
   * Konstruera en controllerinstans.
   *
   * @param {Model}        model        Modellobjekt.
   * @param {ViewBase}     view         Vyinstans.
   * @param {ProtocolView} protocolView Protkollvy.
   * @param {RemarksView}  remarksView  Påpekande-/föreläggandevy.
   * @param {object}       [globals]    Globala objekt vid enhetstester.
   */
  constructor(model, view, protocolView, remarksView, globals = {}) {
    super(model, view, globals);
    this.#protocolView = protocolView;
    this.#remarksView = remarksView;
  }

  /**
   * @inheritDoc
   * @override
   * @throws {TypeError} Gransknings-id saknas.
   */
  async prepare(context) {
    if (!context.audit) {
      throw new TypeError('Ange granskningsidentitet.');
    }

    // Hämta ärende och granskning ur modellen.
    const id = context.audit;
    const model = this._model;
    this.#audit = await model.getAudit(id, true);
    if (!this.#audit) {
      throw new TypeError(`Granskning #'${id}' finns inte.`);
    }
    this.#case = await model.getCase(this.#audit.caseID);

    let [current, max] = this.#audit.auditProgress();
    const done = max > 0 && current === max;
    await this.#handleFinishRequest(context, done);

    const view = this._view;
    view.title = this.#audit.toString();
    view.heading = `Granskning ${this.#audit}`;
    view.service = this.#case.service.type;
    this.#audit.version && (view.appVersion = this.#audit.version);

    view.componentCount = this.#audit.countType(Component);
    view.documentCount = this.#audit.countType(NonWebDocument);
    view.screenCount = this.#audit.countType(AppScreen);
    view.webpageCount = this.#audit.countType(Webpage);

    const finished = null !== this.#audit.finished;
    view.setFinishedMode(finished, this.#audit.failed);

    this.#setBreadcrumbs();
    this.#addSamples();
    this._action('deleteDoc', (ev) => this.#onDeleteDocument(ev));
    view.subscribe((e) => this.#onDocument(e));

    if (this.#audit.finished) {
      if (!this.#case.monitoring) {
        view.advancedMode = false;
      } else {
        this._action('remarks', (ev) => this.#addRemarks(ev));
        this._action('injunction', (ev) => this.#addInjunction(ev));
      }
      this._action('reopen', (ev) => this.#reopenAudit(ev));
      this.#addProtocol();
      const remarkCount = this.#addDocuments();
      view.enableInjunctions(remarkCount > 0);
      view.advancedMode && this.#setActionDate();
      view.enableReopen();
    } else {
      this.#setProgress() && this.#addProtocol();
      this.#setSampleLink();
      this.#setAuditLink();
    }
  }

  /**
   * Lägg till påpekanden och förelägganden i dokumentlistan.
   *
   * Lägg till skapade påpekanden och förelägganden i stigande datumordning.
   *
   * @private
   * @return {number} Antalet påpekanden.
   */
  #addDocuments() {
    const date = (d) => new Date(d).toLocaleDateString('sv');
    const docs = [];
    const types = { injunction: 'Föreläggande', remarks: 'Påpekande' };
    const view = this._view;

    let count = 0;
    for (const [created] of this.#audit.remarks) {
      docs.push({ created, type: 'remarks' });
      ++count;
    }
    for (const [created] of this.#audit.injunctions) {
      docs.push({ created, type: 'injunction' });
    }
    docs.sort((a, b) => a.created.getTime() - b.created.getTime());

    for (const { created, type } of docs) {
      view.addDocument(
        type,
        `${types[type]} ${date(created)}`,
        created.getTime()
      );
    }

    return count;
  }

  /**
   * Skapa och lägg till ett föreläggande.
   *
   * Lägg till ett föreläggande i granskningen och spara äarendet.
   * Lägg sedan till föreläggandet i dokumentlistan.
   *
   * @private
   * @param {object}            event         Händelseinformation.
   * @param {HTMLButtonElement} event.trigger Klickad knapp.
   */
  async #addInjunction({ trigger }) {
    const now = new Date();
    const date = now.toLocaleDateString('sv');
    const dates = this.#audit.injunctions;
    const view = this._view;
    this.#audit.addInjunction(now, view.date);
    if (!(await this.#warnIfExists(dates, 'föreläggande', trigger))) {
      throw null;
    }
    this._view.hideStatus();
    await this._model.setAudit(this.#audit);
    this._view.showSuccess(`Föreläggande ${date} tillagt i granskningen.`);
    this._view.addDocument('injunction', `Föreläggande ${date}`, now.getTime());
  }

  /**
   * Lägg till ett granskningsprotokoll i dokumentlistan.
   *
   * @private
   */
  #addProtocol() {
    this._view.addProtocol(this.#audit.id);
  }

  /**
   * Skapa och lägg till ett påpekande.
   *
   * Lägg till ett nytt påpekande i granskningen och spara ärendet.
   * Lägg sedan till påpekandet i dokumentlistan.
   *
   * @private
   * @param {object}            event         Händelseinformation.
   * @param {HTMLButtonElement} event.trigger Klickad knapp.
   */
  async #addRemarks({ trigger }) {
    const now = new Date();
    const date = now.toLocaleDateString('sv');
    const dates = this.#audit.remarks;
    const view = this._view;
    if (!(await this.#warnIfExists(dates, 'påpekande', trigger))) {
      throw null;
    }
    this.#audit.addRemarks(now, view.date);
    view.hideStatus();
    view.enableInjunctions(true);
    await this._model.setAudit(this.#audit);
    view.showSuccess(`Påpekande ${date} tillagt i granskningen.`);
    view.addDocument('remarks', `Påpekande ${date}`, now.getTime());
  }

  /**
   * Lägg till alla komponenter och stickprov i vyn.
   *
   * @private
   */
  #addSamples() {
    const pr = new Intl.PluralRules('sv');
    const adv = (n) => ({ one: 'granskat', other: 'granskade' })[pr.select(n)];
    const progress = ([done, total]) =>
      0 === done
        ? '0 granskade'
        : done === total
          ? 'Klar'
          : `${done} av ${total} ${adv(done)}`;

    // Komponenter.
    for (const component of this.#audit.components()) {
      this._view.addSample(
        this.#audit.id,
        component.id,
        progress(component.progress()),
        'komponenter',
        this.#audit.useCount(component.id),
        'component',
        component.name,
        null,
        component.note
      );
    }

    // Stickprov.
    for (let category of Audit.AuditCategories) {
      for (const sample of this.#audit.samples(category)) {
        this._view.addSample(
          this.#audit.id,
          sample.id,
          progress(sample.progress()),
          this.#categoryName(category, sample),
          sample.numComponents ?? 0,
          sample.type,
          sample.name,
          sample.url,
          sample.note
        );
      }
    }
  }

  /**
   * Översätt kategorityp till svenska.
   *
   * @private
   * @param {string} category Kategorinamn.
   * @param {Sample} sample   Stickprov.
   * @return {string}
   */
  #categoryName(category, sample) {
    return (
      {
        start: 'startsida',
        login: 'inloggning',
        sitemap: 'webbkarta',
        contact: 'kontakt',
        help: 'hjälp',
        legal: 'juridik',
        statement: 'redogörelse',
        feedback: 'meddelande',
        special: 'udda',
        service: sample.service,
        relevant: 'relevant',
        random: 'slump',
      }[category] ?? '?'
    );
  }

  /**
   * Hantera eventuell begäran om att slutföra granskningen.
   *
   * @private
   * @param {AppContext} context Applikationskontext.
   * @param {boolean}    done    Gruanskningen klar att slutföra?
   */
  async #handleFinishRequest(context, done) {
    if (!context.hasParam('finish')) return;
    if (!done) {
      context.error =
        'Kan inte slutföra granskningen: ' +
        'det finns stickprov som inte är färdiggranskade.';
      return;
    }

    try {
      this.#audit.finish();
      await this._model.setAudit(this.#audit);

      const entry = new LogEntry(this.#case.id);
      entry.data = this.#audit.started.getTime();
      entry.direction = LogEntry.Direction.None;
      entry.summary = 'Granskning slutförd';
      entry.type = LogEntry.EntryType.AuditFinish;
      await this._model.setLogEntry(entry);
      /* borttaget på begäran 2022-11-10
            context.status = `Granskning ${this.#audit} slutförd och sparad.`;
            */
    } catch (err) {
      context.error = err.message;
    }
  }

  /**
   * Ta bort ett skapat påpekande eller föreläggande.
   *
   * Begär bekräftelse från användaren. Ta bort dokumentet ur granskningen och
   * ur vyn. Spara sedan granskningen och visa en kvittens.
   *
   * @private
   * @param {object}            event         Händelseinformation.
   * @param {HTMLButtonElement} event.trigger Ta bort-knapp som tryckts.
   */
  async #onDeleteDocument({ trigger }) {
    const descr =
      {
        injunction: 'Föreläggandet',
        remarks: 'Påpekandet',
      }[trigger.dataset.type] ?? '#okänd typ#';
    const method = {
      injunction: 'deleteInjunction',
      remarks: 'deleteRemarks',
    }[trigger.dataset.type];
    const view = this._view;
    const ok = await view.confirm(
      `${descr} kommer att tas bort. Åtgärden går inte att ångra.
            Du behöver manuellt ta bort tillhörande noteringar i ärendeloggen.`,
      trigger
    );
    if (!ok) return;
    this.#audit[method]?.(new Date(Number(trigger.dataset.id)));
    view.deleteDocument(trigger.dataset.id);
    await this._model.setAudit(this.#audit);
    view.showSuccess(`${descr} har tagits bort ur granskningen.`);
  }

  /**
   * Hantera klick på dokumentlänkar i vyn.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  #onDocument(event) {
    const action = {
      injunction: (id) => this.#showDocument(id, 'injunction'),
      protocol: () => this.#showProtocol(),
      remarks: (id) => this.#showDocument(id, 'remarks'),
    }[event.type];
    action?.(Number(event.id));
  }

  /**
   * Lås upp en slutförd granskning.
   *
   * Lås upp granskningen och spara den i objektdatabasen.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  async #reopenAudit(event) {
    this.#audit.reopen();
    await this._model.setAudit(this.#audit);
    /* borttaget på begäran 2022-11-10
        this._context.status = "Granskningen har låsts upp.";
        */
    this._context.path = ''; // Forcera sidladdning.
    event.path = `?page=audit&audit=${this.#audit.id}`;
  }

  /**
   * Sätt åtgärdsdatum i vyn.
   *
   * Standarddatum är fem månader från dagens datum.
   *
   * @private
   */
  #setActionDate() {
    const date = new Date();
    date.setMonth(date.getMonth() + 5);
    this._view.date = date;
  }

  /**
   * Sätter sökväg och text i granskningslänken.
   *
   * Länk och text beror på om urvalet är påbörjat och om  granskningen är
   * startklar, pågående eller färdig.
   *
   * @private
   */
  #setAuditLink() {
    if (this.#audit.finished) return;
    const first = this.#audit.firstSample;
    if (!first) {
      // Urvalet är inte påbörjat. Deaktivera länken.
      this._view.setAuditLink(null, 'Börja granska');
    } else {
      const sample = this.#audit.nextSample();

      if (undefined === sample) {
        // Inga återstående kontroller.
        const params = new URLParameters();
        params.add('audit', String(this.#audit.id));
        params.add('finish');
        this._view.setAuditLink(
          `?page=audit&${params}`,
          'Slutför granskningen'
        );
      } else {
        const samp = new URLParameters();
        samp.add('sample', sample.id);
        const text =
          first === sample && !sample.started
            ? 'Börja granska'
            : 'Fortsätt granska';
        this._view.setAuditLink(`?page=sample&${samp}`, text);
      }
    }
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
    breadcrumbs.current = `Granskning ${this.#audit}`;
  }

  /**
   * Uppdatera förloppsindikatorerna.
   *
   * @private
   * @return `true` om minst ett stickprov är färdiggranskat, annars `false`.
   */
  #setProgress() {
    let [current, max] = this.#audit.sampleProgress();
    let done = { one: 'klar', other: 'klara' };
    const total = { one: 'kategori', other: 'kategorier' };
    const pr = new Intl.PluralRules('sv');
    this._view.setSampleProgress(
      current,
      max,
      `${current} av ${max} ${total[pr.select(max)]} ` +
        `${done[pr.select(current)]}`
    );

    [current, max] = this.#audit.auditProgress();
    if (max > 0) {
      done = { one: 'granskat', other: 'granskade' };
      this._view.setAuditProgress(
        current,
        max,
        `${current} av ${max} stickprov ${done[pr.select(current)]}`
      );
    }

    return current > 0;
  }

  /**
   * Sätter sökväg och text i urvalslänken.
   *
   * Länk och text beror på om urvalet är tomt, pågående eller klart.
   *
   * @private
   */
  #setSampleLink() {
    if (this.#audit.finished) return;
    const cat = this.#audit.nextCategory();
    const params = new URLParameters();
    params.add('audit', String(this.#audit.id));
    params.add(undefined === cat ? 'add' : 'new');
    const text =
      {
        start: 'Påbörja urvalet',
        '': 'Komplettera urvalet',
      }[cat ?? ''] ?? 'Fortsätt urvalet';
    this._view.setSampleLink(`?page=sample&${params}`, text);
  }

  /**
   * Visa angivet påpekande eller föreläggande.
   *
   * @private
   * @param {number} time Tidsstämpel för dokumentet.
   * @param {string} type Dokumenttyp (remarks/injunction).
   */
  #showDocument(time, type) {
    this.#remarksView.open(this.#case, this.#audit, new Date(time), type);
  }

  /**
   * Visa tillsynsprotokollet för aktuell granskning.
   *
   * @private
   */
  #showProtocol() {
    this.#protocolView.open(this.#case, this.#audit);
  }

  /**
   * Varna vid skapande av två dokument samma dag.
   *
   * Visa en bekräftelsedialog vid skapande av påpekande eller föreläggande om
   * ett dokuemnt av samma typ redan finns med dagens datum som skapatdatum.
   *
   * @private
   * @param {date[][]}          dates   Dokumentdatumvektor.
   * @param {string}            type    Dokumenttyp att använda i meddelandet.
   * @param {HTMLButtonElement} trigger Knappen som triggade händelsen.
   */
  async #warnIfExists(dates, type, trigger) {
    const cd = (a, b) => day(a) === day(b);
    const cm = (a, b) => month(a) === month(b);
    const cmp = (a, b) => cd(a, b) && cm(a, b) && cy(a, b);
    const cy = (a, b) => year(a) === year(b);
    const day = (d) => d.getDate();
    const has = (a, d) => a.some(([c]) => cmp(c, d));
    const month = (d) => d.getMonth();
    const now = new Date();
    const year = (d) => d.getFullYear();

    if (has(dates, now)) {
      const d = now.toLocaleDateString('sv');
      const msg = `Det finns redan ett ${type} från ${d}.
                         Vill du skapa ett ändå?`;
      return this._view.confirm(msg, trigger, ['Nej', 'Ja'], false);
    }
    return true;
  }
}

// Importera beroenden.
import {
  AppScreen,
  Component,
  NonWebDocument,
  Webpage,
} from '../model/sample.js';
import { Audit } from '../model/Audit.js';
import { ControllerBase } from './ControllerBase.js';
import { LogEntry } from '../model/LogEntry.js';
import { URLParameters } from './URLParameters.js';

/**
 * Controller för redigering av ärendeinformation.
 *
 * @license CC-BY 4.0
 */
export class CaseEditController extends ControllerBase {
  // Privata fält.
  #case;
  #caseNumber;
  #cases;
  #schedules;
  #supervisors;

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
   * @throws {TypeError} Ingen tillsynsansvarig definierad vid internt bruk.
   */
  async prepare(context) {
    const model = this._model;
    const view = this._view;
    const { breadcrumbs } = view;
    breadcrumbs.list('case', 'Ärenden');

    // Registrera åtgärder för Ta bort och Spara.
    const entity = () => this.#case;
    this._action('delete', (ev) => this.#onDelete(ev));
    this._action('save', (ev) => this.#onSave(ev));

    // Registrera en observatör på vyhändelser.
    view.subscribe((event) => this.#onViewEvent(event));

    // Hämta information ur modellen.
    const tasks = [];
    tasks.push(model.allSchedules());
    tasks.push(model.peopleByRole('supervisor'));
    if (context.case) {
      tasks.push(model.getCase(context.case));
    }

    [this.#schedules, this.#supervisors, this.#case = null] =
      await Promise.all(tasks);
    this.#addScheduleFromCase();
    this.#caseNumber = this.#case?.caseNumber.toString();

    const advanced = model.advancedMode;
    if (advanced && 0 === this.#supervisors.length) {
      throw new TypeError(
        'Lägg till en tillsynsansvarig innan du skapar ett ' + 'tillsynsärende.'
      );
    }
    if (advanced && 0 === this.#schedules.length) {
      view.disableMonitoring();
    }

    // Populera rullgardinslistor.
    const map = (l, v) => ({ label: l, value: v });
    const mapPerson = (p) => map(p.toString(), p.email);
    const mapSchedule = (s) => map(s.period, String(s.caseNumber));

    view.schedules = this.#schedules.map(mapSchedule);
    view.supervisors = this.#supervisors.map(mapPerson);

    if (null !== this.#case) {
      breadcrumbs.current = this.#case.caseNumber.toString();
      view.title = this.#case.caseNumber.toString();
    } else {
      // Skapa nytt ärende som aktuell entitet i modellen.
      this.#case = advanced
        ? 0 === this.#schedules.length
          ? new ComplaintCase()
          : new MonitoringCase()
        : new AuditCase();
      const caseClass = {
        app: 'MobileApp',
        website: 'Website',
      }[view.serviceType];
      this.#case.service = ServiceFactory.build({
        access: view.access,
        class: caseClass,
      });

      // Avaktivera Ta bort-knappen i vyn.
      breadcrumbs.current = 'Nytt ärende';
      view.title = 'Nytt ärende';
      view.disableRemove();
    }

    this.#populateView(this.#case);
  }

  /**
   * Lägg till tillsynsplan från ärendet.
   *
   * Om den tillsynsplan som  anges i ett övervakningsärende inte finns i den
   * aktuella granskarens objektdatabas behöver vi lägga till den i listan i
   * vyn.
   *
   * @private
   */
  #addScheduleFromCase() {
    const compare = (s1, s2) => s1.caseNumber.id === s2.caseNumber.id;
    const schedule = this.#case?.schedule;
    if (!schedule) return;
    if (!this.#schedules.find((s) => compare(s, schedule))) {
      this.#schedules.push(schedule);
    }
  }

  /**
   * Hantera ändring av ärendenummer.
   *
   * Verifiera att angivet ärendenummer är giltigt och inte krockar med ett
   * befintligt ärende.
   *
   * @private
   * @param {object} event       Händelseinformation.
   * @param {string} event.value Nytt ärendenummer.
   */
  async #changeCaseNumber({ value }) {
    try {
      this.#case.caseNumber = value;
      const cno = this.#case.caseNumber?.toString();
      if (cno && this.#caseNumber !== cno) {
        this.#cases ??= await this._model.allCases();
        const id = this.#case.caseNumber.id;
        if (this.#cases.find((c) => c.caseNumber.id === id)) {
          this._view.caseNumber = new ValidationError(
            `Ärendenummer ${cno} finns redan.`,
            cno
          );
        }
      }
    } catch (err) {
      if (err instanceof ValidationError) {
        // Sätt felmeddelande på vyfältet.
        this._view.caseNumber = err;
      } else {
        throw err;
      }
    }
  }

  /**
   * Hantera ändring av ärendetyp.
   *
   * Ersätt aktuellt ärende med ett nytt ärende av angiven typ.
   *
   * @private
   * @param {object} event       Händelseinformation.
   * @param {string} event.value Ny ärendetyp.
   */
  #changeCaseType({ value }) {
    this.#case = {
      audit: (o) => new AuditCase(o),
      complaint: (o) => new ComplaintCase(o),
      monitoring: (o) => new MonitoringCase(o),
    }[value](this.#case);
    this._view.caseType = value;
  }

  /**
   * Hantera ändring av tillsynsplan.
   *
   * Sätt tillsynsplanen med angivet ärendenummer som tillsynsplan i det aktu-
   * ella ärendet.
   *
   * @private
   * @param {object} event       Händelseinformation.
   * @param {string} event.value Identitet för tillsynsplan.
   * @param {object} obj         Dataobjekt.
   * @param {string} field       Fältnamn.
   */
  async #changeSchedule({ value }, obj, field) {
    const match = (s) => value === s.caseNumber.toString();
    obj[field] = this.#schedules.find(match);
  }

  /**
   * Hantera ändring av typ av tjänst.
   *
   * Ersätt tjänsten i aktuellt ärenden med en ny tjänst av angiven typ.
   *
   * @private
   * @param {object} event       Händelseinformation.
   * @param {string} event.value Ny typ av tjänst..
   */
  #changeServiceType({ value }) {
    this.#case.service = {
      app: (o) => new MobileApp(o),
      website: (o) => new Website(o),
    }[value](this.#case.service?.toJSON());
    this._view.serviceType = value;
  }

  /**
   * Hantera ändring av tillsynsansvarig.
   *
   * Sätt personen med angiven e-postadress som tillsynsansvarig i det aktu-
   * ella ärendet.
   *
   * @private
   * @param {object} event       Händelseinformation.
   * @param {string} event.value E-postadress för tillsynsansvarig.
   * @param {object} obj         Dataobjekt.
   * @param {string} field       Fältnamn.
   */
  async #changeSupervisor({ value }, obj, field) {
    obj[field] = this.#supervisors.find((p) => p.email === value);
  }

  /**
   * Ta bort ärendet ur objektdatabasen.
   *
   * Begär bekräftelse från användaren före borttag.
   *
   * @private
   * @param {object}      event         Händelseinformation.
   * @param {HTMLElement} event.trigger Ta bort-knappen i formuläret.
   */
  async #onDelete({ trigger }) {
    const message =
      `${this.#case} kommer att tas bort ur databasen.\n` +
      'Åtgärden går inte att ångra.';
    const ok = await this._view.confirm(message, trigger);
    if (!ok) throw null;
    try {
      await this._model.deleteCase(this.#case.id);
      /* borttaget på begäran 2022-11-10
            this._context.status =
                `${this.#case} har tagits bort ur databasen.`;
            */
    } catch (err) {
      this._context.error = `Kan inte ta bort ${this.#case} ur databasen: ${err}.`;
      throw err;
    }
  }

  /**
   * Sparar ärendet i objektdatabasen.
   *
   * @private
   * @param {object}      event         Händelseinformation.
   * @param {HTMLElement} event.trigger Ta bort-knappen i formuläret.
   */
  async #onSave({ trigger }) {
    try {
      await this._model.setCase(this.#case);
      /* borttaget på begäran 2022-11-10
            this._context.status = `${this.#case} har sparats i databasen.`;
            */
    } catch (err) {
      this._context.error = `Kan inte spara ${this.#case}: ${err}.`;
      throw err;
    }
  }

  /**
   * Hantera händelseaviseringar från vyn.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  async #onViewEvent(event) {
    if ('change' !== event.type) return;

    const { state, target, value } = event;
    const [obj, field] = this.#parseEventTarget(event);

    try {
      const changes = {
        caseNumber: (...args) => this.#changeCaseNumber(...args),
        caseType: (...args) => this.#changeCaseType(...args),
        serviceType: (...args) => this.#changeServiceType(...args),
        schedule: (...args) => this.#changeSchedule(...args),
        supervisor: (...args) => this.#changeSupervisor(...args),
      };
      if (target in changes) {
        await changes[target](event, obj, field);
      } else {
        // Sätt värdet i modellen.
        const checkbox = undefined !== state;
        obj[field] = checkbox ? state : value;

        if (!checkbox && obj[field] !== value) {
          // Värdet formaterat; uppdatera vyn.
          this._view[target] = obj[field];
        }
      }
    } catch (err) {
      if (err instanceof ValidationError) {
        // Sätt felmeddelande på vyfältet.
        this._view[target] = err;
      } else {
        throw err;
      }
    }
  }

  /**
   * Omvandlar en händelses målelementnamn till objekt och fältnman.
   *
   * @private
   * @param {object} event        Händelseinformation.
   * @param {string} event.target Målelement för händelsen.
   * @return {array}
   */
  #parseEventTarget({ target }) {
    let [obj, field] = {
      abbr: ['organization', 'abbreviation'],
      access: ['service', 'access'],
      addr: ['organization', 'address'],
      appOS: ['service', 'operatingSystem'],
      auth: ['service', 'authentication'],
      caseNumber: [null, 'caseNumber'],
      caseType: [null, 'type'],
      date: [null, 'date'],
      email: ['organization', 'email'],
      org: ['organization', 'name'],
      regNo: ['organization', 'registrationNumber'],
      schedule: [null, 'schedule'],
      service: ['service', 'name'],
      serviceType: ['service', 'type'],
      supervisor: [null, 'supervisor'],
      tel: ['organization', 'telephone'],
    }[target];

    obj = null === obj ? this.#case : this.#case[obj];
    return [obj, field];
  }

  /**
   * Populera specifika vyfält för anmälningsärende.
   *
   * @private
   * @param {ComplaintCase} aCase Ärende.
   */
  #populateComplaintView(aCase) {
    const view = this._view;
    view.date = aCase.date;
    view.supervisor = aCase.supervisor?.email ?? '';
  }

  /**
   * Populera specifika vyfält för mobila applikationer.
   *
   * @private
   * @param {MobileApp} app Mobil applikation.
   */
  #populateMobileAppView(app) {
    this._view.appOS = app.operatingSystem;
  }

  /**
   * Populera specifika vyfält för övervakningsärende.
   *
   * @private
   * @param {MonitoringCase} aCase Ärende.
   */
  #populateMonitoringView(aCase) {
    const cno = aCase.schedule?.caseNumber?.id;
    const schedule = this.#schedules.find((s) => cno === s.caseNumber.id);
    const view = this._view;
    view.schedule = String(schedule?.caseNumber ?? '');
  }

  /**
   * Populera specifika vyfält för webbplatser.
   *
   * @private
   * @param {Websie} site Webbplats.
   */
  #populateWebsiteView(site) {
    this._view.access = site.access;
  }

  /**
   * Populera vyn med modelldata.
   *
   * @private
   * @param {CaseInfo} aCase Ärendeinformation.
   */
  #populateView(aCase) {
    const view = this._view;
    view.caseNumber = aCase.caseNumber?.toString() ?? '';

    view.org = aCase.organization.name ?? '';
    view.abbr = aCase.organization.abbreviation ?? '';
    view.regNo = aCase.organization.registrationNumber ?? '';
    view.email = aCase.organization.email ?? '';
    view.tel = aCase.organization.telephone ?? '';
    view.addr = aCase.organization.address ?? '';

    view.serviceType = aCase.service.type;
    view.service = aCase.service.name;
    view.auth = aCase.service.authentication;

    // Populera ärendetypspecifika fält.
    ({
      complaint: (c) => this.#populateComplaintView(c),
      monitoring: (c) => this.#populateMonitoringView(c),
    })[aCase.type]?.(aCase);
    this._view.caseType = aCase.type;

    // Populera tjänstetypspecifika fält.
    ({
      app: (c) => this.#populateMobileAppView(c),
      website: (c) => this.#populateWebsiteView(c),
    })[aCase.service.type](aCase.service);
  }
}

// Importera beroenden.
import { ControllerBase } from './ControllerBase.js';
import { Person } from '../model/Person.js';
import { Schedule } from '../model/Schedule.js';
import { ValidationError } from '../model/ValidationError.js';
import { MobileApp, ServiceFactory, Website } from '../model/service.js';
import {
  AuditCase,
  CaseFactory,
  ComplaintCase,
  MonitoringCase,
} from '../model/case.js';

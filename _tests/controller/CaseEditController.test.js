/**
 * Enhetstestfall för ärenderedigeringssidans controller.
 *
 * @license CC-BY 4.0
 * @see CaseEditController
 */

let context;
let controller;
let model;
let view;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Vyn.
  const form = mock.eventTarget('form', { action: '' });

  view = mock.view(
    {
      abbr: '',
      access: 'public',
      addr: '',
      advancedMode: true,
      appOS: '',
      auth: false,
      breadcrumbs: mock.breadcrumbTrail(),
      caseNumber: '',
      caseType: 'monitoring',
      date: '',
      email: '',
      form,
      org: '',
      regNo: '',
      schedule: '',
      schedules: null,
      service: '',
      serviceType: 'website',
      supervisor: '',
      supervisors: null,
      tel: '',
    },
    {
      confirm: async () => true,
      disableMonitoring: () => {},
      disableRemove: () => {},
    }
  );
});

describe('Förbered sidvisning vid nyskapande', () => {
  let schedules;
  let supervisors;

  beforeEach(() => {
    // Tillsynsplaner.
    schedules = [
      {
        caseNumber: { id: 20201388, toString: () => '2020-1388' },
        id: 1388,
        period: '2020–2021',
      },
    ];

    // Tillsynsansvariga.
    supervisors = [
      {
        email: 'julia.jurist@digg.se',
        id: 1,
        toString: () => 'Julia Jurist',
      },
    ];

    // Modellen.
    model = mock.model(
      {
        _schedules: schedules,
        _supervisors: supervisors,
      },
      {
        allSchedules: async () => model._schedules,
        peopleByRole: async () => model._supervisors,
      }
    );

    // Applikationskontexten.
    context = mock.appContext({ path: '?page=test' });

    // Skapa en controllerinstans.
    controller = new CaseEditController(model, view, mock.globals());
  });

  it('refuserar intern sidvisning utan tillsynsansvarig', async () => {
    model._supervisors = [];
    await expect.failure(() => controller.prepare(context));
  });

  it('kräver inte tillsynsansvarig för extern användare', async () => {
    model.advancedMode = false;
    model._supervisors = [];
    await controller.prepare(context);
    expect(true).toBe(true);
  });

  it('sätter titel och länkstig', async () => {
    await controller.prepare(context);
    const bc = view.breadcrumbs;
    expect(bc.list).toHaveBeenCalled.with('case', 'Ärenden');
    expect(bc.current).toBe('Nytt ärende');
    expect(view.title).toBe('Nytt ärende');
  });

  it('populerar tillsynsplaner och tillsynsansvariga', async () => {
    await controller.prepare(context);
    expect(view.schedules.length).toBe(1);
    expect(view.schedules[0].value).toBe(String(schedules[0].caseNumber));
    expect(view.supervisors.length).toBe(1);
    expect(view.supervisors[0].value).toBe(supervisors[0].email);
  });

  it('deaktiverar övervakningsärenden utan tillsynsplan', async () => {
    model._schedules = [];
    await controller.prepare(context);
    expect(view.disableMonitoring).toHaveBeenCalled.once();
  });

  it('deaktiverar ta bort-knappen', async () => {
    await controller.prepare(context);
    expect(view.disableRemove).toHaveBeenCalled.once();
  });
});

describe('Förbered sidvisning vid redigering', () => {
  let app;
  let complaint;
  let generic;
  let monitoring;
  let schedules;
  let site;
  let supervisors;

  beforeEach(() => {
    // Tillsynsplaner.
    schedules = [
      {
        caseNumber: { id: 20201388, toString: () => '2020-1388' },
        id: 1388,
        period: '2020–2021',
      },
    ];

    // Tillsynsansvariga.
    supervisors = [
      {
        email: 'julia.jurist@digg.se',
        id: 1,
        toString: () => 'Julia Jurist',
      },
    ];

    // Offentlig aktör.
    const org = {
      abbr: 'DIGG',
      addr: 'Box 14, 85102 Sundsvall',
      email: 'info@digg.se',
      name: 'Myndigheten för digital förvaltning',
      regNo: '202100-6883',
      tel: '0771-11 44 00',
    };

    // Generiskt ärende.
    generic = CaseFactory.build({
      class: 'AuditCase',
      cn: 20200123,
      org,
    });
    generic.id = 123;

    // Anmälningsärende.
    complaint = CaseFactory.build({
      class: 'ComplaintCase',
      date: 1600819200000,
      cn: 20201234,
      org,
      supervisor: {
        email: 'julia.jurist@digg.se',
        fName: 'Jurist',
        gName: 'Julia',
      },
    });
    complaint.id = 1234;

    // Övervakningsärende.
    monitoring = CaseFactory.build({
      class: 'MonitoringCase',
      cn: 20202345,
      org,
      schedule: { case: 20201388, toString: () => '2020-1388' },
    });
    monitoring.id = 2345;

    // Mobil applikation.
    app = ServiceFactory.build({
      auth: true,
      class: 'MobileApp',
      name: 'The App',
      os: 'Android',
    });

    // Webbplats.
    site = ServiceFactory.build({
      class: 'Website',
      name: 'digg.se',
    });

    // Modellen.
    model = mock.model(
      {
        case: null,
      },
      {
        getCase: async (c) =>
          (model.case = {
            123: generic,
            1234: complaint,
            2345: monitoring,
          }[c]),
        allSchedules: async () => schedules,
        peopleByRole: async () => supervisors,
        setCase: async (o) => (model.case = o),
      }
    );

    // Applikationskontexten.
    context = mock.appContext({ path: '?page=test' });

    // Skapa en controllerinstans.
    controller = new CaseEditController(model, view, mock.globals());
  });

  it.with(
    [() => generic, () => app, 'generiskt ärende', 'app'],
    [() => generic, () => site, 'generiskt ärende', 'webbplats'],
    [() => complaint, () => app, 'anmälningsärende', 'app'],
    [() => complaint, () => site, 'anmälningsärende', 'webbplats'],
    [() => monitoring, () => app, 'övervakningsärende', 'app'],
    [() => monitoring, () => site, 'övervakningsärende', 'webbplats']
  )('sätter titel och länkstig ({2}, {3})', async (fc, fs) => {
    const aCase = fc();
    aCase.service = fs();
    model.case = aCase;
    model.advancedMode = aCase.monitoring;
    context.case = aCase.id;
    await controller.prepare(context);
    expect(view.breadcrumbs.current).toBe(aCase.caseNumber.toString());
    expect(view.title).toBe(aCase.caseNumber.toString());
  });

  it.with(
    [() => generic, () => app, 'generiskt ärende', 'app'],
    [() => generic, () => site, 'generiskt ärende', 'webbplats'],
    [() => complaint, () => app, 'anmälningsärende', 'app'],
    [() => complaint, () => site, 'anmälningsärende', 'webbplats'],
    [() => monitoring, () => app, 'övervakningsärende', 'app'],
    [() => monitoring, () => site, 'övervakningsärende', 'webbplats']
  )('hämtar data och populerar vyn ({2}, {3})', async (fc, fs) => {
    const aCase = fc();
    const org = aCase.organization;
    const service = fs();
    aCase.service = service;
    model.case = aCase;
    model.advancedMode = aCase.monitoring;
    context.case = aCase.id;
    await controller.prepare(context);
    expect(view.schedules[0].value).toBe(String(schedules[0].caseNumber));
    expect(view.supervisors[0].value).toBe(supervisors[0].email);
    expect(view.caseNumber).toBe(aCase.caseNumber.toString());
    expect(view.org).toBe(org.name);
    expect(view.email).toBe(org.email);
    expect(view.tel).toBe(org.telephone);
    expect(view.addr).toBe(org.address);
    expect(view.serviceType).toBe(service.type);
    expect(view.service).toBe(service.name);
    expect(view.auth).toBe(service.authentication);

    if (generic !== aCase) {
      expect(view.abbr).toBe(org.abbreviation);
      expect(view.regNo).toBe(org.registrationNumber);
    }

    if (complaint === aCase) {
      expect(view.date).toEqual(aCase.date);
      expect(view.supervisor).toBe(aCase.supervisor.email);
    } else if (monitoring === aCase.type) {
      expect(view.schedule).toEqual(String(aCase.schedule.caseNumber));
    }

    if (app === service) {
      expect(view.appOS).toEqual(service.operatingSystem);
    } else if (site === service) {
      expect(view.access).toBe(service.access);
    }
  });

  it('populerar listan med tillsynsplaner', async () => {
    const aCase = monitoring;
    aCase.schedule = {
      caseNumber: { id: 20212159, toString: () => '2021-2159' },
      period: '2022',
    };
    aCase.service = site;
    model.case = aCase;
    context.case = aCase.id;
    await controller.prepare(context);
    expect(view.schedules).toEqual([
      { label: '2020–2021', value: '2020-1388' },
      { label: '2022', value: '2021-2159' },
    ]);
  });

  it('deaktiverar inte ta bort-knappen', async () => {
    model.case = monitoring;
    model.case.service = site;
    model.advancedMode = true;
    context.case = monitoring.id;
    await controller.prepare(context);
    expect(view.disableRemove).toHaveBeenCalled.never();
  });
});

describe('Hantera interaktion', () => {
  let complaint;
  let monitoring;
  let schedules;
  let supervisors;

  beforeEach(() => {
    // Tillsynsplaner.
    schedules = [
      new Schedule({
        begins: 1577836800000,
        case: 20201388,
        ends: 1640908800000,
      }),
    ];
    schedules[0].id = 1388;

    // Tillsynsansvariga.
    supervisors = [
      new Person({
        email: 'julia.jurist@digg.se',
        fName: 'Jurist',
        gName: 'Julia',
      }),
    ];
    supervisors[0].id = 1;

    // Offentlig aktör.
    const org = {
      abbr: 'DIGG',
      addr: 'Box 14, 85102 Sundsvall',
      email: 'info@digg.se',
      name: 'Myndigheten för digital förvaltning',
      regNo: '202100-6883',
      tel: '0771-11 44 00',
    };

    // Webbplats.
    const site = {
      access: 'public',
      authentication: false,
      class: 'Website',
      name: 'digg.se',
    };

    // Anmälningsärende.
    complaint = new ComplaintCase({
      date: 1600819200000,
      cn: 20201234,
      org,
      supervisor: {
        email: 'julia.jurist@digg.se',
        fName: 'Jurist',
        gName: 'Julia',
      },
    });
    complaint.id = 1234;

    // Övervakningsärende.
    monitoring = new MonitoringCase({
      cn: '2020-2345',
      org,
      schedule: { case: 20201388 },
      service: site,
    });
    monitoring.id = 2345;

    // Modellen.
    model = mock.model(
      {
        case: null,
      },
      {
        allCases: async () => [complaint, monitoring],
        allSchedules: async () => schedules,
        deleteCase: async () => (model.case = null),
        getCase: async (c) =>
          (model.case = {
            1234: complaint,
            2345: monitoring,
          }[c]),
        peopleByRole: async () => supervisors,
        setCase: async (o) => (model.case = o),
      }
    );

    // Applikationskontexten.
    context = mock.appContext({ path: '?page=test' });

    // Skapa en controllerinstans.
    controller = new CaseEditController(model, view, mock.globals());
  });

  it('uppdaterar modellen vid ändringar i vyn', async () => {
    const data = {
      caseNumber: '20201234',
      caseType: 'complaint',
      date: new Date('2020-09-23'),
      supervisor: 'julia.jurist@digg.se',
      org: 'Myndigheten för digital förvaltning',
      abbr: 'digg',
      regNo: '2021006883',
      email: 'registrator@digg.se',
      tel: '0771114400',
      addr: 'Box 14\n85102 Sundsvall',
      serviceType: 'app',
      service: 'The App',
      type: 'screen',
      appOS: 'Android',
      auth: true,
    };
    const change = (target) => ({
      state: true === data[target] ? true : undefined,
      target,
      type: 'change',
      value: data[target],
    });
    await controller.prepare(context);
    view.notify(
      change('caseNumber'),
      change('caseType'),
      change('date'),
      change('supervisor'),
      change('org'),
      change('abbr'),
      change('regNo'),
      change('email'),
      change('tel'),
      change('addr'),
      change('serviceType'),
      change('service'),
      change('appOS'),
      change('auth')
    );
    view.notify({ action: 'save', path: '?page=other', type: 'form' });
    await controller.handle(context);
    const aCase = model.case;
    const org = aCase.organization;
    const service = aCase.service;
    expect(aCase).toBeAnInstanceOf(ComplaintCase);
    expect(service).toBeAnInstanceOf(MobileApp);
    expect(aCase.caseNumber.toString()).toBe('2020-1234');
    expect(aCase.date).toEqual(data.date);
    expect(aCase.supervisor).not.toBe(null);
    expect(aCase.supervisor.email).toBe(data.supervisor);
    expect(org.name).toBe(data.org);
    expect(org.abbreviation).toBe(data.abbr.toUpperCase());
    expect(org.registrationNumber).toBe('202100-6883');
    expect(org.email).toBe(data.email);
    expect(org.telephone).toBe('0771-11 44 00');
    expect(org.address).toBe(data.addr);
    expect(service.name).toBe(data.service);
    expect(service.operatingSystem).toBe(data.appOS);
    expect(service.authentication).toBe(data.auth);
  });

  it.with(
    ['caseNumber', '1234', 'ogiltigt ärendenummer'],
    ['caseNumber', '2020-1234', 'befintligt ärendenummer'],
    ['regNo', '2021006884', 'ogiltigt organisationsnummer'],
    ['email', 'nobody%digg.se', 'ogiltig e-postadress'],
    ['tel', '114400', 'ogiltigt telefonnummer']
  )('refuserar {2}', async (target, value) => {
    await controller.prepare(context);
    view.notify({ target, type: 'change', value });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(view[target]).toBeAnInstanceOf(ValidationError);
  });

  it('sparar ett ärende i modellen', async () => {
    context.case = 2345;
    await controller.prepare(context);
    view.notify({ action: 'save', type: 'form' });
    await controller.handle(context);
    expect(model.setCase).toHaveBeenCalled.once().with(monitoring);
    //2022-11-10: expect(context.status).not.toBe("");
  });

  it('tar bort ett ärende ur modellen', async () => {
    context.case = 2345;
    await controller.prepare(context);
    view.notify({ action: 'delete', type: 'form' });
    await controller.handle(context);
    expect(view.confirm).toHaveBeenCalled.once();
    expect(model.deleteCase).toHaveBeenCalled.once().with(monitoring);
    //2022-11-10: expect(context.status).not.toBe("");
  });
});

// Importera beroenden.
import { CaseEditController } from '../../js/controller/CaseEditController.js';
import {
  CaseFactory,
  ComplaintCase,
  MonitoringCase,
} from '../../js/model/case.js';
import { MobileApp } from '../../js/model/service.js';
import { Person } from '../../js/model/Person.js';
import { Schedule } from '../../js/model/Schedule.js';
import { ServiceFactory } from '../../js/model/service.js';
import { ValidationError } from '../../js/model/ValidationError.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

/**
 * Enhetstestfall för ärendevisningssidans controller.
 *
 * @license CC-BY 4.0
 * @see CaseDisplayController
 */

let context;
let controller;
let view;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Vyn.
  view = mock.view(
    {
      addr: '',
      advancedMode: true,
      breadcrumbs: mock.breadcrumbTrail(),
      create: '',
      edit: '',
      email: '',
      heading: '',
      log: '',
      logSize: 0,
      org: '',
      regNo: '',
      supervisor: '',
      tel: '',
    },
    {
      addAudit: () => {},
      addDocument: () => {},
      addProtocol: () => {},
    }
  );
});

describe('Förbered sidvisning', () => {
  let aCase;
  let audits;
  let model;

  beforeEach(() => {
    // Granskningar.
    audits = [];
    audits.push({
      finished: new Date(1603411200000),
      id: 13,
      injunctions: [[new Date('2020-11-23'), new Date('2020-12-31')]],
      officer: 'gg',
      remarks: [[new Date('2020-10-23'), new Date('2020-11-21')]],
      started: new Date(1600840800000),
      auditProgress: () => [42, 42],
      toString: () => '2020-09-23–2020-10-23',
    });
    audits.push({
      finished: null,
      id: 42,
      injunctions: [],
      officer: 'hh',
      remarks: [],
      started: new Date(1624406400000),
      auditProgress: () => [13, 42],
      toString: () => '2021-06-23',
    });

    // Árende.
    aCase = {
      caseNumber: '2020-1234',
      id: 42,
      logSize: 13,
      monitoring: true,
      organization: {
        address: 'Box 14\n85102 Sundsvall',
        email: 'info@digg.se',
        name: 'Myndigheten för digital förvaltning',
        registrationNumber: '202100-6883',
        telephone: '0771-11 44 00',
      },
      service: { name: 'digg.se' },
      supervisor: 'julia.jurist@digg.se',
      *audits() {
        for (const audit of audits) {
          yield audit;
        }
      },
      getAudit: () => audits[0],
    };

    // Modellen.
    model = mock.model({
      getCase: async (n) => ({ 42: aCase })[n] ?? null,
    });

    // Applikationskontexten.
    context = mock.appContext({ case: 42 });

    // Skapa en controllerinstans.
    controller = new CaseDisplayController(
      model,
      view,
      {},
      {},
      {},
      {},
      mock.globals()
    );
  });

  it('refuserar ogiltigt ärende', async () => {
    context.case = 13;
    await expect.failure(() => controller.prepare(context));
  });

  it('sätter titel, rubrik och länkstig', async () => {
    const cno = aCase.caseNumber;
    await controller.prepare(context);
    expect(view.title).toBe(cno);
    expect(view.heading).toBe(`${cno} ${aCase.service.name}`);
    expect(view.breadcrumbs.current).toBe(cno);
  });

  it('sätter förenklat visningsläge för granskningsärende', async () => {
    aCase.monitoring = false;
    await controller.prepare(context);
    expect(view.advancedMode).toBe(false);
  });

  it('populerar ärendeinformation', async () => {
    const org = aCase.organization;
    await controller.prepare(context);
    expect(view.supervisor).toBe(aCase.supervisor);
    expect(view.org).toBe(org.name);
    expect(view.regNo).toBe(org.registrationNumber);
    expect(view.email).toBe(org.email);
    expect(view.tel).toBe(org.telephone);
    expect(view.addr).toBe(org.address);
  });

  it('populerar fasta länkar', async () => {
    const c = `case=${aCase.id}`;
    const ce = `case%3D${aCase.id}`;
    await controller.prepare(context);
    expect(view.create).toBe(`?page=audit&${c}`);
    expect(view.edit).toBe(`?page=case&${c}&return=case%26${ce}&edit`);
    expect(view.log).toBe(`?page=log&${c}`);
    expect(view.logSize).toBe(13);
  });

  it('lägger till granskningar', async () => {
    const c = `case=${aCase.id}`;
    const e = (a) => (a.finished ? null : `${p(a)}&edit`);
    const p = (a) => `?page=audit&audit=${a.id}`;
    const v = (a) => [e(a), p(a), [a.toString(), a.officer]];
    await controller.prepare(context);
    expect(view.addAudit)
      .toHaveBeenCalled.times(2)
      .with(v(audits[0]), v(audits[1]));
  });

  it('lägger till dokument; förenklat visningsläge', async () => {
    aCase.monitoring = false;
    const p = (a) => [a.id, a.started.toISOString().slice(0, 10)];
    const s = (a) => a.toString().slice(0, 10);
    await controller.prepare(context);
    expect(view.addProtocol)
      .toHaveBeenCalled.once()
      .with(...p(audits[0]));
  });

  it('lägger till dokument; avancerat visningsläge', async () => {
    const c1 = (a) => ['csvAudit', String(a.id), ['Översikt, CSV', s(a)]];
    const c2 = (a) => [
      'csv',
      String(a.id),
      ['Granskningsprotokoll, CSV', s(a)],
    ];
    const d = (t, T, a, d) => [t, i(a, a[d][0][0]), [T, f(a[d][0][0])]];
    const f = (d) => d.toLocaleDateString('sv');
    const i = (a, d) => `${a.id},${d.getTime()}`;
    const p = (a) => [a.id, a.started.toISOString().slice(0, 10)];
    const s = (a) => a.toString().slice(0, 10);
    await controller.prepare(context);
    expect(view.addProtocol)
      .toHaveBeenCalled.once()
      .with(...p(audits[0]));
    expect(view.addDocument)
      .toHaveBeenCalled.times(4)
      .with(
        c1(audits[0]),
        c2(audits[0]),
        d('remarks', 'Påpekande', audits[0], 'remarks'),
        d('injunction', 'Föreläggande', audits[0], 'injunctions')
      );
  });
});

describe('Hantera interaktion', () => {
  let aCase;
  let audit;
  let csvAuditView;
  let csvView;
  let filesystem;
  let model;
  let protocolView;
  let remarksView;

  beforeEach(() => {
    // Granskningar.
    audit = {
      finished: new Date(1603411200000),
      id: 13,
      injunctions: [[new Date('2020-11-23'), new Date('2020-12-31')]],
      officer: 'gg',
      remarks: [[new Date('2020-10-23'), new Date('2020-11-21')]],
      started: new Date(1600840800000),
      auditProgress: () => [42, 42],
      toString: () => '2020-09-23–2020-10-23',
    };

    // Árende.
    aCase = {
      caseNumber: '2020-1234',
      filename: 'test.json',
      logSize: 13,
      organization: {
        address: 'A',
        email: 'E',
        name: 'N',
        registrationNumber: 'R',
        telephone: 'T',
      },
      service: { name: 'digg.se' },
      supervisor: 'S',
      *audits() {
        yield audit;
      },
    };

    // Fillagring.
    filesystem = mock({ saveToJSONFile: async () => {} });

    // Modellen.
    model = mock.model(
      {
        case: aCase,
      },
      {
        getAudit: async (a) => ({ 13: audit })[a] ?? null,
        getCase: async (n) => ({ 42: aCase })[n] ?? null,
        populate: async () => {},
      }
    );

    // Protokoll- och påpekande-/föreläggandevyerna.
    csvAuditView = mock({
      save: async () => {},
    });

    csvView = mock({
      save: async () => {},
    });

    protocolView = mock({
      open: async () => {},
      save: async () => {},
    });

    remarksView = mock({
      open: async () => {},
      save: async () => {},
    });

    // Applikationskontexten.
    context = mock.appContext({ case: 42 });

    // Skapa en controllerinstans.
    controller = new CaseDisplayController(
      model,
      view,
      filesystem,
      protocolView,
      csvAuditView,
      csvView,
      remarksView,
      mock.globals()
    );
  });

  it('öppnar ett protokoll', async () => {
    await controller.prepare(context);
    view.notify({ action: 'open', id: String(audit.id), type: 'protocol' });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(protocolView.open).toHaveBeenCalled.once().with(aCase, audit);
  });

  it.with(
    ['remarks', 'remarks', 'påpekande'],
    ['injunction', 'injunctions', 'föreläggande']
  )('öppnar ett {2}', async (type, field) => {
    const created = audit[field][0][0];
    const id = `${audit.id},${created.getTime()}`;
    await controller.prepare(context);
    view.notify({ action: 'open', id, type });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(remarksView.open)
      .toHaveBeenCalled.once()
      .with(aCase, audit, created, type);
  });

  it('sparar ett protokoll', async () => {
    await controller.prepare(context);
    view.notify({
      action: 'save',
      path: null,
      trigger: { dataset: { id: String(audit.id), type: 'protocol' } },
      type: 'form',
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(protocolView.save).toHaveBeenCalled.once().with(aCase, audit);
  });

  it('sparar en granskningsöversikt som CSV', async () => {
    await controller.prepare(context);
    view.notify({
      action: 'save',
      path: null,
      trigger: { dataset: { id: String(audit.id), type: 'csvAudit' } },
      type: 'form',
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(csvAuditView.save).toHaveBeenCalled.once().with(aCase, audit);
  });

  it('sparar ett protokoll som CSV', async () => {
    await controller.prepare(context);
    view.notify({
      action: 'save',
      path: null,
      trigger: { dataset: { id: String(audit.id), type: 'csv' } },
      type: 'form',
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(csvView.save).toHaveBeenCalled.once().with(aCase, audit);
  });

  it.with(
    ['remarks', 'remarks', 'påpekande'],
    ['injunction', 'injunctions', 'föreläggande']
  )('sparar ett {2}', async (type, field) => {
    const created = audit[field][0][0];
    const id = `${audit.id},${created.getTime()}`;
    await controller.prepare(context);
    view.notify({
      action: 'save',
      path: null,
      trigger: { dataset: { id, type } },
      type: 'form',
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(remarksView.save)
      .toHaveBeenCalled.once()
      .with(aCase, audit, created, type);
  });

  it('sparar aktuellt ärende', async () => {
    await controller.prepare(context);
    view.notify({
      action: 'save',
      path: null,
      trigger: { dataset: { type: 'case' } },
      type: 'form',
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(model.populate).toHaveBeenCalled.once().with(aCase);
    expect(filesystem.saveToJSONFile)
      .toHaveBeenCalled.once()
      .with(aCase.filename, aCase);
  });
});

// Importera beroenden.
import { CaseDisplayController } from '../../js/controller/CaseDisplayController.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

/**
 * Enhetstestfall för granskningsredigeringscontrollern.
 *
 * @license CC-BY 4.0
 * @see AuditEditController
 */

let context;
let view;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Vyn.
  view = mock.view(
    {
      action: '',
      breadcrumbs: mock.breadcrumbTrail(),
      officer: '',
      officers: null,
      service: '',
      version: '',
    },
    {
      confirm: async () => true,
      hide: () => {},
    }
  );

  // Applikationskontexten.
  context = mock.appContext({
    audit: 42,
    params: { return: 'foo%26bar' },
  });
});

describe('Förbered sidvisning', () => {
  let controller;
  let model;
  let officer;

  beforeEach(() => {
    // Handläggare.
    const email = 'greta.granskare@digg.se';
    officer = new Person({
      email,
      familyName: 'Granskare',
      givenName: 'Greta',
      roles: ['officer'],
      telephone: '0771-11 44 00',
    });
    officer.id = 1;

    // Modellen.
    model = mock.model(
      {
        _audit: {
          caseID: 13,
          finished: null,
          id: 42,
          officer: { email },
          started: new Date(1600857296000),
          version: '3.14',
          toString: () => '2020-09-23',
        },
        _case: mock(
          {
            id: 13,
            organization: { name: 'Acme' },
            service: { name: 'Test' },
            _audits: [],
          },
          {
            toString: () => '2020-1234',
            *audits() {
              for (const audit of model._case._audits) {
                yield audit;
              }
            },
          }
        ),
      },
      {
        getAudit: async (n) => ({ 42: model._audit })[n] ?? null,
        getCase: async (n) => ({ 13: model._case })[n] ?? null,
        peopleByRole: async () => [officer],
      }
    );

    // Skapa en controllerinstans.
    controller = new AuditEditController(model, view, mock.globals());
  });

  it('refuserar sidvisning utan gransknings-id', async () => {
    delete context.audit;
    await expect.failure(() => controller.prepare(context));
  });

  it('refuserar redigering av en avslutad granskning', async () => {
    model._audit.finished = new Date();
    await expect.failure(() => controller.prepare(context));
    expect(view.hide).toHaveBeenCalled.once();
  });

  it('sätter länkstigen', async () => {
    await controller.prepare(context);
    const { breadcrumbs } = view;
    expect(breadcrumbs.case)
      .toHaveBeenCalled.once()
      .with(13, '2020-1234', 'Acme', 'Test');
    expect(breadcrumbs.current).toBe('Granskning 2020-09-23');
  });

  it('sätter angiven åtgärdssökväg i formuläret', async () => {
    await controller.prepare(context);
    expect(view.action).toBe('?page=foo&bar');
  });

  it('sätter default åtgärdssökväg i formuläret', async () => {
    delete context.params.return;
    await controller.prepare(context);
    expect(view.action).toBe('?page=case&case=13');
  });

  it('populerar listan med granskare', async () => {
    model._case._audits = [
      {
        officer: {
          email: 'pia.pensionar@digg.se',
          familyName: 'Pensionär',
          givenName: 'Pia',
          toString: () => 'Pia Pensionär',
        },
      },
    ];
    await controller.prepare(context);
    expect(view.officers.length).toBe(2);
    expect(view.officers[0].label).toBe(officer.toString());
    expect(view.officers[0].value).toBe(officer.email);
    expect(view.officers[1].label).toBe('Pia Pensionär');
    expect(view.officers[1].value).toBe('pia.pensionar@digg.se');
  });

  it.with(
    [new MobileApp(), 'mobil applikation'],
    [{ type: 'website' }, 'webbplats']
  )('populerar vyn för en {1}', async (service) => {
    const audit = model._audit;
    model._case.service = service;
    await controller.prepare(context);
    expect(view.officer).toBe(audit.officer.email);
    expect(view.version).toBe(
      service instanceof MobileApp ? audit.version : ''
    );
  });
});

describe('Hantera interaktion', () => {
  let controller;
  let model;

  beforeEach(() => {
    // Modellen.
    const email = 'greta.granskare@digg.se';
    model = mock.model(
      {
        _audit: {
          finished: null,
          id: 42,
          officer: { email },
          started: new Date(1600857296000),
          version: '3.14',
          clone: () => Object.assign({}, model._audit),
          toString: () => '2020-09-23',
        },
        _case: mock(
          {
            organization: { name: 'Acme' },
            service: { name: 'Test', type: 'website' },
            _entries: [],
          },
          {
            *audits() {},
            *log() {
              for (const entry of model._case._entries) {
                yield entry;
              }
            },
            toString: () => '2020-1234',
          }
        ),
      },
      {
        deleteAudit: async () => {},
        deleteLogEntry: async () => {},
        getAudit: async () => model._audit,
        getCase: async () => model._case,
        peopleByRole: async () => [
          new Person({
            email,
            familyName: 'Granskare',
            givenName: 'Greta',
            roles: ['officer'],
            telephone: '0771-11 44 00',
          }),
        ],
        setAudit: async () => {},
      }
    );

    // Skapa en controller-instans.
    controller = new AuditEditController(model, view, mock.globals());
  });

  it.with(['app', 'mobil applikation'], ['website', 'webbplats'])(
    'sparar en redigerad granskning av en {1}',
    async (type) => {
      const aCase = model._case;
      aCase.service.type = type;
      await controller.prepare(context);
      view.notify({ action: 'save', path: '?page=other', type: 'form' });
      await controller.handle(context);
      expect(model.setAudit).toHaveBeenCalled.once().with(model._audit);
    }
  );

  it('raderar en granskning', async () => {
    const audit = model._audit;
    model._case._entries.push({
      data: 1600857296000,
      id: 69,
      type: 'audit start',
    });
    await controller.prepare(context);
    view.notify({ action: 'delete', path: '?page=other', type: 'form' });
    await controller.handle(context);
    expect(view.confirm).toHaveBeenCalled.once();
    expect(model.deleteAudit).toHaveBeenCalled.once().with(audit.id);
    expect(model.deleteLogEntry).toHaveBeenCalled.once().with(69);
  });
});

// Importera beroenden.
import { AuditEditController } from '../../js/controller/AuditEditController.js';
import { MobileApp } from '../../js/model/service.js';
import { MonitoringCase } from '../../js/model/case.js';
import { Person } from '../../js/model/Person.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

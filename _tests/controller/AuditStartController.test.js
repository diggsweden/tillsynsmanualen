/**
 * Enhetstestfall för granskningsstartcontrollern.
 *
 * @license CC-BY 4.0
 * @see AuditStartController
 */

let context;
let controller;
const email = 'greta.granskare@digg.se';
let model;
let view;

const mkAudit = (id, d) => {
  const audit = mock(
    {
      id: id,
      officer: {
        email: 'pia.pensionar@digg.se',
        toString: () => 'Pia Pensionär',
      },
      started: d,
      _colours: [],
      _samples: [],
    },
    {
      allSamples: () => audit._samples,
      colours: () => audit._colours,
      toString: () => d.toLocaleDateString('sv'),
    }
  );
  return audit;
};

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Modellen.
  const officers = [
    new Person({ email }),
    new Person({ email: 'hanna.handlaggare@digg.se' }),
  ];
  officers[0].id = 1;
  officers[1].id = 2;

  model = mock.model(
    {
      caseDirectory: 'G:\\audits',
      _audit: null,
      _case: mock(
        {
          caseNumber: { year: 2020 },
          id: 13,
          monitoring: true,
          opened: undefined,
          organization: { name: 'Acme' },
          service: { name: 'Test' },
          _audits: {},
        },
        {
          audit: (t) => model._case._audits.filter((a) => t === a.id)[0],
          open: () => {},
          toString: () => '2020-1234',
          *audits() {
            for (const audit of Object.values(model._case._audits)) {
              yield audit;
            }
          },
        }
      ),
      _officers: officers,
      _samples: [],
    },
    {
      getAudit: async () => model._audit,
      getCase: async (n) => ({ 13: model._case })[n] ?? null,
      peopleByRole: async () => model._officers,
      setAudit: async (a) => ((a.id = 69), (model._audit = a)),
      setCase: async () => {},
      setLogEntry: async () => {},
      setSample: async (s) => model._samples.push(s),
    }
  );

  // Vyn.
  view = mock.view(
    {
      action: '',
      breadcrumbs: mock.breadcrumbTrail(),
      officer: '',
      officers: null,
      service: '',
      source: null,
      version: '',
    },
    {
      addAudit: () => {},
      hideSource: () => {},
      showPreparations: async () => {},
    }
  );

  // Applikationskontexten.
  context = mock.appContext({
    case: 13,
    params: { return: 'other' },
  });

  // Skapa en controllerinstans.
  controller = new AuditStartController(model, view, mock.globals());
});

describe('Förbered sidvisning', () => {
  it('refuserar sidvisning utan ärendenummer', async () => {
    delete context.case;
    await expect.failure(() => controller.prepare(context));
  });

  it('refuserar sidvisning med ogiltigt ärendenummer', async () => {
    context.case = 1234;
    await expect.failure(() => controller.prepare(context));
  });

  it('refuserar sidvisning utan handläggare', async () => {
    model._officers = [];
    await expect.failure(() => controller.prepare(context));
  });

  it('refuserar intern sidvisning utan tillsynskatalog', async () => {
    model.caseDirectory = null;
    await expect.failure(() => controller.prepare(context));
  });

  it('sätter länkstigen', async () => {
    await controller.prepare(context);
    const { breadcrumbs } = view;
    expect(breadcrumbs.case)
      .toHaveBeenCalled.once()
      .with(13, '2020-1234', 'Acme', 'Test');
    expect(breadcrumbs.current).toBe('Ny granskning');
  });

  it.with(
    [new MobileApp(), 'app', 'mobil applikation'],
    [new Website(), 'website', 'webbplats']
  )('sätter typ av tjänst i vyn för en {2}', async (service, type) => {
    model._case.service = service;
    await controller.prepare(context);
    expect(view.service).toBe(type);
  });

  it('populerar listan med granskare', async () => {
    model._case._audits = { 42: mkAudit(42, new Date('2020-09-23')) };
    await controller.prepare(context);
    expect(view.officers.length).toBe(3);
    expect(view.officers[0].value).toBe(email);
    expect(view.officers[1].value).toBe('hanna.handlaggare@digg.se');
    expect(view.officers[2].value).toBe('pia.pensionar@digg.se');
    expect(view.officer).toBe('');
  });

  it('väljer automatiskt unik granskare', async () => {
    model._officers = [model._officers[0]];
    await controller.prepare(context);
    expect(view.officers.length).toBe(1);
    expect(view.officers[0].value).toBe(email);
    expect(view.officer).toBe(email);
  });

  it('populerar listan med tidigare granskningar', async () => {
    const aCase = model._case;
    aCase._audits = {
      13: mkAudit(13, new Date('2020-09-23')),
      42: mkAudit(42, new Date('2021-06-23')),
    };
    await controller.prepare(context);
    expect(view.hideSource).toHaveBeenCalled.never();
    expect(view.addAudit)
      .toHaveBeenCalled.times(2)
      .with(
        ['13', aCase._audits[13].toString()],
        ['42', aCase._audits[42].toString()]
      );
  });

  it('döljer listan med tidigare granskningar', async () => {
    await controller.prepare(context);
    expect(view.hideSource).toHaveBeenCalled.once();
  });
});

describe('Hantera interaktion', () => {
  it.with([new MobileApp(), 'mobil applikation'], [new Website(), 'webbplats'])(
    'skapar en ny granskning av en {1}',
    async (service) => {
      const event = {
        action: 'start',
        path: null,
        type: 'form',
      };
      const version = '3.14';
      model._case.service = service;
      await controller.prepare(context);
      view.officer = email;
      service instanceof MobileApp && (view.version = version);
      view.notify(event);
      await controller.handle(context);
      expect(view.action).toMatch(/^\?page=sample&/);
      expect(event.path).toMatch(/^\?page=sample&/);
      //2022-11-10: expect(context.status).not.toBe("");
      expect(model.setAudit).toHaveBeenCalled.once();
      expect(model.setLogEntry).toHaveBeenCalled.times(2);
      expect(model.setCase).toHaveBeenCalled.once();
      expect(model._case.open).toHaveBeenCalled.once();
      expect(model._audit.officer.email).toBe(email);
      service instanceof MobileApp &&
        expect(model._audit.version).toBe(version);
    }
  );

  it('kopierar en tidigare granskning', async () => {
    const aCase = model._case;
    const event = {
      action: 'start',
      path: null,
      type: 'form',
    };
    const mkSample = (name) => {
      const sample = {
        auditID: 42,
        category: 'special',
        class: 'Webpage',
        name,
        serialize: () => sample,
      };
      return sample;
    };
    aCase.opened = new Date('2020-09-23T12:34:56+02:00');
    aCase.service = new Website();
    aCase._audits = {
      13: mkAudit(13, new Date('2020-09-23')),
      42: mkAudit(42, new Date('2021-06-23')),
    };
    model._audit = aCase._audits[42];
    model._audit._colours = [['#00c', 'blue']];
    model._audit._samples = [mkSample('foo'), mkSample('bar')];
    await controller.prepare(context);
    view.source = '42';
    view.notify(event);
    await controller.handle(context);
    expect(view.action).toMatch(/^\?page=audit&/);
    expect(event.path).toMatch(/^\?page=audit&/);
    expect(model.setAudit).toHaveBeenCalled.once();
    expect(model.setSample).toHaveBeenCalled.times(2);
    expect(model.setLogEntry).toHaveBeenCalled.once();
    expect(model.setCase).toHaveBeenCalled.never();
    expect(model._case.open).toHaveBeenCalled.never();
    expect(model._samples[0].name).toBe('foo');
    expect(model._samples[1].name).toBe('bar');
  });

  it.with([true, 'visar', 'avancerat'], [false, 'visar inte', 'förenklat'])(
    '{1} förberedelsedialog i {2} visningsläge',
    async (advanced) => {
      const event = {
        action: 'start',
        path: null,
        type: 'form',
      };
      model.advancedMode = advanced;
      model._case.service = new Website({ name: 'test' });
      await controller.prepare(context);
      view.officer = email;
      view.notify(event);
      await controller.handle(context);
      if (advanced) {
        expect(view.showPreparations)
          .toHaveBeenCalled.once()
          .with(
            model.caseDirectory,
            '2020',
            `${model._case} test`,
            model._audit.toString()
          );
      } else {
        expect(view.showPreparations).toHaveBeenCalled.never();
      }
    }
  );

  it.with(
    [true, 'visar', 'tillsynsärende'],
    [false, 'visar inte', 'granskningsärende']
  )('{1} förberedelsedialog i {2}', async (monitoring) => {
    const event = {
      action: 'start',
      path: null,
      type: 'form',
    };
    model.advancedMode = true;
    model._case.monitoring = monitoring;
    model._case.service = new Website({ name: 'test' });
    await controller.prepare(context);
    view.officer = email;
    view.notify(event);
    await controller.handle(context);
    if (monitoring) {
      expect(view.showPreparations)
        .toHaveBeenCalled.once()
        .with(
          model.caseDirectory,
          '2020',
          `${model._case} test`,
          model._audit.toString()
        );
    } else {
      expect(view.showPreparations).toHaveBeenCalled.never();
    }
  });
});

// Importera beroenden.
import { AuditStartController } from '../../js/controller/AuditStartController.js';
import { MobileApp, Website } from '../../js/model/service.js';
import { Person } from '../../js/model/Person.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

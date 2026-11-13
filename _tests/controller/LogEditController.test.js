/**
 * Enhetstestfall för loggnoteringsredigeringscontrollern.
 *
 * @see LogEditController
 */

let context;
let controller;
let model;
let view;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Vyn.
  view = mock.view(
    {
      action: '',
      data: '',
      direction: '',
      breadcrumbs: mock.breadcrumbTrail(),
      readOnly: false,
      summary: '',
      text: '',
      timestamp: new Date(0),
      type: '',
    },
    {
      confirm: async () => true,
      disableData: () => {},
      disableDirection: () => {},
      disableRemove: () => {},
      disableTypes: () => {},
      requireData: () => {},
      setData: () => {},
      suggestSummary: () => {},
    }
  );
});

describe('Förbered sidvisning vid nyskapande', () => {
  beforeEach(() => {
    // Modellen.
    model = mock.model(
      {
        _case: {
          id: 42,
          organization: { name: 'Acme' },
          service: { name: 'Test' },
          toString: () => '2020-1234',
          *audits() {},
        },
      },
      {
        getCase: async () => model._case,
      }
    );

    // Applikationskontexten.
    context = mock.appContext({ case: 42 });

    // Skapa en controllerinstans.
    controller = new LogEditController(model, view, mock.globals());
  });

  it('sätter åtgärdssökvägen i formuläret', async () => {
    await controller.prepare(context);
    expect(view.action).toBe('?page=log&case=42');
  });

  it('sätter länkstigen', async () => {
    await controller.prepare(context);
    const aCase = model._case;
    const bc = view.breadcrumbs;
    expect(bc.case).toHaveBeenCalled.with(
      aCase.id,
      aCase.toString(),
      'Acme',
      'Test'
    );
    expect(bc.log).toHaveBeenCalled.with(aCase.id);
    expect(bc.current).toBe('Ny notering');
  });

  it('avaktiverar ärende- och granskningstyper', async () => {
    await controller.prepare(context);
    expect(view.disableTypes)
      .toHaveBeenCalled.once()
      .with(['audit finish', 'audit start', 'open case']);
  });

  it('avaktiverar Ta bort-knappen', async () => {
    await controller.prepare(context);
    expect(view.disableRemove).toHaveBeenCalled.once();
  });
});

describe('Förbered sidvisning vid redigering', () => {
  let entry;

  beforeEach(() => {
    // Loggnotering.
    entry = {
      caseID: 42,
      data: '',
      direction: 'internal',
      summary: 'Test',
      text: 'test',
      timestamp: new Date(1600857296000),
      type: 'other',
    };

    // Modellen.
    model = mock.model(
      {
        _case: mock(
          {
            _audits: [],
            id: 42,
            organization: { name: 'Acme' },
            service: { name: 'Test' },
            toString: () => '2020-1234',
            *audits() {
              const audits = model._case._audits.map((d) => ({
                started: new Date(d),
                toString: () => d,
              }));
              for (const audit of audits) {
                yield audit;
              }
            },
          },
          {}
        ),
      },
      {
        getCase: async (i) => ({ 42: model._case })[i] ?? null,
        getLogEntry: async (i) => ({ 13: entry })[i] ?? null,
      }
    );

    // Applikationskontexten.
    context = mock.appContext({
      case: 42,
      params: { entry: '13' },
    });

    // Skapa en controllerinstans.
    controller = new LogEditController(model, view, mock.globals());
  });

  it('sätter åtgärdssökvägen i formuläret', async () => {
    await controller.prepare(context);
    expect(view.action).toBe('?page=log&case=42');
  });

  it('sätter länkstigen', async () => {
    await controller.prepare(context);
    const aCase = model._case;
    const bc = view.breadcrumbs;
    expect(bc.case).toHaveBeenCalled.with(
      aCase.id,
      aCase.toString(),
      'Acme',
      'Test'
    );
    expect(bc.log).toHaveBeenCalled.with(aCase.id);
    expect(bc.current).toBe(entry.summary);
  });

  it('populerar lista med granskningar', async () => {
    model._case._audits = ['2020-09-23', '2021-06-23'];
    await controller.prepare(context);
    expect(view.setData)
      .toHaveBeenCalled.once()
      .with([
        [1600819200000, '2020-09-23'],
        [1624406400000, '2021-06-23'],
      ]);
  });

  it('populerar vyfälten', async () => {
    await controller.prepare(context);
    expect(view.data).toBe(entry.data);
    expect(view.direction).toBe(entry.direction);
    expect(view.summary).toBe(entry.summary);
    expect(view.text).toBe(entry.text);
    expect(view.timestamp).toEqual(entry.timestamp);
    expect(view.type).toBe(entry.type);
  });

  it.with(
    ['action plan', true, 'aktiverar'],
    ['appeal', true, 'aktiverar'],
    ['audit finish', true, 'aktiverar'],
    ['audit start', true, 'aktiverar'],
    ['open case', false, 'avaktiverar'],
    ['deferment', true, 'aktiverar'],
    ['email', true, 'aktiverar'],
    ['injunction', true, 'aktiverar'],
    ['letter', true, 'aktiverar'],
    ['minutes', true, 'aktiverar'],
    ['note', true, 'aktiverar'],
    ['notification', false, 'avaktiverar'],
    ['other', true, 'aktiverar'],
    ['remarks', true, 'aktiverar'],
    ['telephone', true, 'aktiverar']
  )("{2} granskningslistan för typen '{0}'", async (type, enable) => {
    entry.type = type;
    await controller.prepare(context);
    expect(view.disableData).toHaveBeenCalled.once().with(!enable);
  });

  it.with(
    ['action plan', true, 'obligatorisk'],
    ['appeal', true, 'obligatorisk'],
    ['audit finish', true, 'obligatorisk'],
    ['audit start', true, 'obligatorisk'],
    ['open case', false, 'frivillig'],
    ['deferment', true, 'obligatorisk'],
    ['email', false, 'frivillig'],
    ['injunction', true, 'obligatorisk'],
    ['letter', false, 'frivillig'],
    ['minutes', false, 'frivillig'],
    ['note', false, 'frivillig'],
    ['notification', false, 'frivillig'],
    ['other', false, 'frivillig'],
    ['remarks', true, 'obligatorisk'],
    ['telephone', false, 'frivillig']
  )("gör granskningslistan {2} för typen '{0}'", async (type, required) => {
    entry.type = type;
    await controller.prepare(context);
    expect(view.requireData).toHaveBeenCalled.once().with(required);
  });

  it.with(
    ['action plan', true, 'aktiverar'],
    ['appeal', true, 'aktiverar'],
    ['audit finish', true, 'aktiverar'],
    ['audit start', true, 'aktiverar'],
    ['open case', false, 'avaktiverar'],
    ['deferment', true, 'aktiverar'],
    ['email', true, 'aktiverar'],
    ['injunction', true, 'aktiverar'],
    ['letter', true, 'aktiverar'],
    ['minutes', true, 'aktiverar'],
    ['note', true, 'aktiverar'],
    ['notification', true, 'avaktiverar'],
    ['other', true, 'aktiverar'],
    ['remarks', true, 'aktiverar'],
    ['telephone', true, 'aktiverar']
  )("{2} Ta bort-knappen för typen '{0}'", async (type, enabled) => {
    entry.type = type;
    await controller.prepare(context);
    enabled || expect(view.disableRemove).toHaveBeenCalled.once();
  });

  it.with(
    ['action plan', false, 'avaktiverar'],
    ['appeal', false, 'avaktiverar'],
    ['audit finish', true, 'aktiverar'],
    ['audit start', true, 'aktiverar'],
    ['open case', true, 'aktiverar'],
    ['deferment', false, 'avaktiverar'],
    ['email', false, 'avaktiverar'],
    ['injunction', false, 'avaktiverar'],
    ['letter', false, 'avaktiverar'],
    ['minutes', false, 'avaktiverar'],
    ['note', false, 'avaktiverar'],
    ['notification', false, 'avaktiverar'],
    ['other', false, 'avaktiverar'],
    ['remarks', false, 'avaktiverar'],
    ['telephone', false, 'avaktiverar']
  )("sätter skrivskyddat läge för typen '{0}'", async (type, readOnly) => {
    entry.type = type;
    await controller.prepare(context);
    expect(view.readOnly).toBe(readOnly);
  });
});

describe('Hantera interaktion', () => {
  beforeEach(() => {
    // Modellen.
    model = mock.model(
      {
        _case: mock(
          {
            _entries: [],
            id: 42,
            organization: { name: 'Acme' },
            service: { name: 'Test' },
          },
          {
            toString: () => '2020-1234',
            *audits() {},
            *entries() {
              for (const entry of model._case._entries) {
                yield entry;
              }
            },
          }
        ),
      },
      {
        deleteLogEntry: async () => {},
        getCase: async (i) => ({ 42: model._case })[i] ?? null,
        getLogEntry: async (i) => ({ 13: entry })[i] ?? null,
        setLogEntry: async (e) => (model._case._entries.push(e), e),
      }
    );

    // Applikationskontexten.
    context = mock.appContext({ case: 42 });

    // Skapa en controllerinstans.
    controller = new LogEditController(model, view, mock.globals());
  });

  it.with(
    ['data', '1600819200000'],
    ['direction', 'sent'],
    ['sumary', 'Test'],
    ['text', 'test'],
    ['timestamp', new Date('2020-09-23T12:34:00+02:00')],
    ['type', 'notification']
  )("uppdaterar modellen vid ändring av '{0}'", async (target, value) => {
    await controller.prepare(context);
    view.notify({ target, type: 'change', value });
    view.notify({ action: 'save', path: '?page=other', type: 'form' });
    await controller.handle(context);
    const obj = model._case._entries[0];
    expect(obj).not.toBe(null);
    expect(obj[target]).toEqual(value);
  });

  it('sparar en loggnotering i ärendet', async () => {
    await controller.prepare(context);
    view.notify({ action: 'save', path: '?page=other', type: 'form' });
    await controller.handle(context);
    expect(model.setLogEntry).toHaveBeenCalled.once();
  });

  it('tar bort en loggnotering ur ärendet', async () => {
    await controller.prepare(context);
    view.notify({ action: 'delete', path: '?page=other', type: 'form' });
    await controller.handle(context);
    expect(view.confirm).toHaveBeenCalled.once();
    expect(model.deleteLogEntry).toHaveBeenCalled.once();
  });
});

// Importera beroenden.
import { LogEditController } from '../../js/controller/LogEditController.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

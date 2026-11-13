/**
 * Enhetstester för urvalslistans controller.
 *
 * @license CC-BY 4.0
 * @see AuditDisplayController
 */

const component = (d = 0, t = 0) => ({
  done: false,
  id: 1,
  name: 'test component',
  note: null,
  started: false,
  progress: () => [d, t],
});

const document = (d = 0, t = 0) => ({
  done: true,
  id: 2,
  name: 'test document',
  note: null,
  started: true,
  service: 'test',
  type: 'document',
  url: 'https://digg.se/test.pdf',
  progress: () => [d, t],
});

const webpage = (d = 0, t = 0) => ({
  done: false,
  id: 3,
  name: 'test page',
  note: null,
  started: true,
  type: 'webpage',
  url: 'https://digg.se',
  progress: () => [d, t],
});

let context;
let controller;
let model;
let view;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Modellen.
  model = mock.model(
    {
      advancedMode: true,
      _audit: mock(
        {
          caseID: 13,
          finished: null,
          firstSample: undefined,
          id: 42,
          started: new Date('2020-09-23'),
          version: null,
          _auditProgress: [0, 0],
          _components: [],
          _next: 'start',
          _sampleProgress: [0, 12],
          _samples: {},
          _uses: {},
        },
        {
          auditProgress: () => model._audit._auditProgress,
          countType: () => 13,
          deleteInjunction: () => {},
          deleteRemarks: () => {},
          sample: () => {},
          sampleProgress: () => model._audit._sampleProgress,
          nextCategory: () => model._audit._next,
          nextSample: () => {},
          reopen: () => {},
          toString: () => '2020-09-23',
          useCount: (i) => model._audit._uses[String(i)] ?? 0,
          *categories() {
            for (const cat of ['start', 'service']) {
              yield cat;
            }
          },
          *components() {
            for (const component of model._audit._components) {
              yield component;
            }
          },
          *samples(c) {
            for (const sample of model._audit._samples[c] ?? []) {
              yield sample;
            }
          },
        }
      ),
      _case: {
        id: 13,
        monitoring: true,
        organization: { name: 'Acme' },
        service: { name: 'Test', type: 'website' },
        _log: [],
        setEntry: (e) => model._case._log.push(e),
        toString: () => '2020-1234',
      },
      _entry: null,
    },
    {
      getAudit: async () => model._audit,
      getCase: async () => model._case,
      setAudit: async () => {},
      setCase: async () => {},
      setLogEntry: async (e) => (model._entry = e),
    }
  );

  // Vyn.
  view = mock.view(
    {
      advancedMode: true,
      appVersion: '',
      breadcrumbs: mock.breadcrumbTrail(),
      componentCount: 0,
      date: '',
      documentCount: 0,
      heading: '',
      minDate: '',
      screenCount: 0,
      service: '',
      title: '',
      webpageCount: 0,
    },
    {
      addDocument: () => {},
      addProtocol: () => {},
      addSample: () => {},
      confirm: async () => true,
      deleteDocument: () => {},
      enableInjunctions: () => {},
      enableReopen: () => {},
      setAuditLink: () => {},
      setAuditProgress: () => {},
      setFinishedMode: () => {},
      setSampleLink: () => {},
      setSampleProgress: () => {},
    }
  );
});

describe('Förbered sidvisning (allmänna kontroller)', () => {
  beforeEach(() => {
    // Applikationskontexten.
    context = mock.appContext({ audit: 42 });

    // Skapa en controllerinstans.
    controller = new AuditDisplayController(
      model,
      view,
      {},
      {},
      mock.globals()
    );
  });

  it('refuserar sidvisning utan gransknings-id', async () => {
    delete context.audit;
    await expect.failure(() => controller.prepare(context));
  });

  it('sätter titel, rubrik och länkstig', async () => {
    const { breadcrumbs } = view;
    await controller.prepare(context);
    expect(view.title).toBe(model._audit.toString());
    expect(view.heading).toBe(`Granskning ${model._audit}`);
    expect(breadcrumbs.case)
      .toHaveBeenCalled.once()
      .with(13, '2020-1234', 'Acme', 'Test');
    expect(breadcrumbs.current).toBe(`Granskning ${model._audit.toString()}`);
  });

  it.with(['app', 'mobil applikation'], ['website', 'webbplats'])(
    'sätter typ av digital service till {1}',
    async (type) => {
      model._case.service = { type };
      await controller.prepare(context);
      expect(view.service).toBe(type);
    }
  );

  it('visar versionsnummer för mobil applikation', async () => {
    const version = '3.14';
    model._audit.version = version;
    await controller.prepare(context);
    expect(view.appVersion).toBe(version);
  });

  it('visar antalet stickprov i urvalet', async () => {
    await controller.prepare(context);
    expect(view.componentCount).toBe(13);
    expect(view.documentCount).toBe(13);
    expect(view.screenCount).toBe(13);
    expect(view.webpageCount).toBe(13);
  });

  it('visar stickprov', async () => {
    const audit = model._audit;
    audit._components.push(component(13, 13));
    audit._samples.start = [webpage(1, 42)];
    audit._samples.service = [document(0, 0)];
    audit._samples.start[0].numComponents = 1;
    audit._uses['1'] = 1;
    await controller.prepare(context);
    const s = (n) => `&sample=${n}`;
    expect(view.addSample)
      .toHaveBeenCalled.times(3)
      .with(
        [
          audit.id,
          audit._components[0].id,
          'Klar',
          'komponenter',
          1,
          'component',
          'test component',
          null,
          null,
        ],
        [
          audit.id,
          audit._samples.start[0].id,
          '1 av 42 granskat',
          'startsida',
          1,
          'webpage',
          'test page',
          'https://digg.se',
          null,
        ],
        [
          audit.id,
          audit._samples.service[0].id,
          '0 granskade',
          'test',
          0,
          'document',
          'test document',
          'https://digg.se/test.pdf',
          null,
        ]
      );
  });
});

describe('Förbered sidvisning av pågående granskning', () => {
  beforeEach(() => {
    // Applikationskontexten.
    context = mock.appContext({
      audit: 42,
      case: 13,
    });

    // Skapa en controllerinstans.
    controller = new AuditDisplayController(
      model,
      view,
      {},
      {},
      mock.globals()
    );
  });

  it('sätter vyn i "pågående" läge', async () => {
    await controller.prepare(context);
    expect(view.setFinishedMode).toHaveBeenCalled.once().with(false, undefined);
  });

  it('visar inte dokumentformuläret', async () => {
    model._audit._samples.service = [document()];
    await controller.prepare(context);
    expect(view.addDocument).toHaveBeenCalled.never();
  });

  it.with(
    [1, 1, 'kategori klar', 0, 1, 'granskade'],
    [1, 12, 'kategorier klar', 1, 42, 'granskat'],
    [3, 12, 'kategorier klara', 13, 42, 'granskade']
  )(
    'visar urvals- och granskningsförlopp ({0}/{1})',
    async (curS, maxS, textS, curA, maxA, textA) => {
      const audit = model._audit;
      audit._auditProgress = [curA, maxA];
      audit._sampleProgress = [curS, maxS];
      await controller.prepare(context);
      expect(view.setSampleProgress)
        .toHaveBeenCalled.once()
        .with(curS, maxS, `${curS} av ${maxS} ${textS}`);
      expect(view.setAuditProgress)
        .toHaveBeenCalled.once()
        .with(curA, maxA, `${curA} av ${maxA} stickprov ${textA}`);
    }
  );

  it.with(
    [null, 1, 'Börja granska', null, 'tomt urval'],
    [1, 1, 'Börja granska', true, 'gransking inte påbörjad'],
    [1, 2, 'Fortsätt granska', true, 'pågående granskning'],
    [1, undefined, 'Slutför granskningen', true, 'färdig granskning']
  )('sätter granskningslänken ({4})', async (first, next, text, url) => {
    const audit = model._audit;
    const s1 = { id: 1, name: first, started: first !== next };
    const s2 = { id: 2, name: next, started: url };
    audit.firstSample = first ? s1 : undefined;
    audit.nextSample = () => (next === first ? s1 : next && s2);
    await controller.prepare(context);
    let page;
    if (undefined === next) {
      page = `audit&audit=${audit.id}&finish`;
    } else {
      page = `sample&sample=${next}`;
    }
    expect(view.setAuditLink)
      .toHaveBeenCalled.once()
      .with(first ? `?page=${page}` : null, text);
  });

  it.with(
    ['start', 'new', 'Påbörja urvalet', 'tomt'],
    ['service', 'new', 'Fortsätt urvalet', 'påbörjat'],
    [undefined, 'add', 'Komplettera urvalet', 'komplett ']
  )('sätter urvalslänken ({3} urval)', async (next, param, text) => {
    const audit = model._audit;
    audit._next = next;
    await controller.prepare(context);
    expect(view.setSampleLink)
      .toHaveBeenCalled.once()
      .with(`?page=sample&audit=${audit.id}&${param}`, text);
  });

  it.with([false, 'ingen', 'inget'], [true, 'en', 'minst ett'])(
    'visar {1} protokollänk om {2} stickprov är färdiggranskat',
    async (done) => {
      const audit = model._audit;
      const s1 = { id: 1, name: 'first', done };
      const s2 = { id: 2, name: 'next', done: false };
      audit._auditProgress = [done ? 1 : 0, 2];
      audit.firstSample = s1;
      audit.nextSample = () => s2;
      await controller.prepare(context);
      expect(view.addProtocol).toHaveBeenCalled.times(done ? 1 : 0);
      done && expect(view.addProtocol).toHaveBeenCalled.with(audit.id);
    }
  );
});

describe('Förbered sidvisning av slutförd granskning', () => {
  beforeEach(() => {
    // Granskning.
    const audit = model._audit;
    audit.failed = undefined;
    audit.finished = new Date('2020-10-23');
    audit.injunctions = [];
    audit.remarks = [];

    // Applikationskontexten.
    context = mock.appContext({
      audit: 42,
      case: 13,
    });

    // Skapa en controllerinstans.
    controller = new AuditDisplayController(
      model,
      view,
      {},
      {},
      mock.globals()
    );
  });

  it.with([false, 'godkänd'], [true, 'underkänd'])(
    'sätter vyn i "slutfört" läge ({1})',
    async (failed) => {
      const date = new Date();
      const valueOf = (d) => d.toLocaleDateString('sv');
      date.setMonth(date.getMonth() + 5);
      model._audit.failed = failed;
      await controller.prepare(context);
      expect(view.setFinishedMode).toHaveBeenCalled.once().with(true, failed);
      expect(valueOf(view.date)).toBe(valueOf(date));
    }
  );

  it.with(
    [true, 'avancerat', 'tillsynsärende'],
    [false, 'förenklat', 'granskningsärende']
  )('sätter {1} visningsläge för {2}', async (monitoring) => {
    model._case.monitoring = monitoring;
    await controller.prepare(context);
    expect(view.advancedMode).toBe(monitoring);
  });

  it('visar upplåsningsknappen', async () => {
    await controller.prepare(context);
    expect(view.enableReopen).toHaveBeenCalled.once();
  });

  it('visar protokoll, påpekanden och förelägganden', async () => {
    const audit = model._audit;
    const injDate = new Date('2020-11-23');
    const remDate = new Date('2020-10-23');
    audit.remarks = [[remDate, new Date('2020-11-22')]];
    audit.injunctions = [[injDate, new Date('2021-06-23')]];
    await controller.prepare(context);
    expect(view.addProtocol).toHaveBeenCalled.with(audit.id);
    expect(view.addDocument)
      .toHaveBeenCalled.times(2)
      .with(
        ['remarks', 'Påpekande 2020-10-23', remDate.getTime()],
        ['injunction', 'Föreläggande 2020-11-23', injDate.getTime()]
      );
  });

  it.with([true, 'Aktiverar'], [false, 'Avaktiverar'])(
    '{1} föreläggandeknappen',
    async (remark) => {
      if (remark) {
        const audit = model._audit;
        audit.remarks = [[new Date('2020-10-23'), new Date('2020-11-22')]];
      }
      await controller.prepare(context);
      expect(view.enableInjunctions).toHaveBeenCalled.once().with(remark);
    }
  );
});

describe('Hantera interaktion', () => {
  let protocolView;
  let remarksView;

  beforeEach(() => {
    // Granskning.
    const audit = model._audit;
    audit.failed = true;
    audit.finished = new Date('2020-10-23');
    audit.injunctions = [];
    audit.remarks = [];
    audit._auditProgress = [13, 13];
    audit._sampleProgress = [12, 12];
    audit.addInjunction = (c, d) => audit.injunctions.push([c, d]);
    audit.addRemarks = (c, d) => audit.remarks.push([c, d]);
    audit.finish = () => (audit.finished = new Date());

    // Protokoll- och påpekande-/föreläggandevyerna.
    protocolView = mock({ open: async () => {} });
    remarksView = mock({ open: async () => {} });

    // Applikationskontexten.
    context = mock.appContext({
      audit: 42,
      case: 13,
    });

    // Skapa en controllerinstans.
    controller = new AuditDisplayController(
      model,
      view,
      protocolView,
      remarksView,
      mock.globals()
    );
  });

  it('slutför en granskning', async () => {
    context.params.finish = '';
    const audit = model._audit;
    await controller.prepare(context);
    expect(audit.finished).not.toBe(null);
    expect(model.setAudit).toHaveBeenCalled.once().with(model._audit);
    expect(model.setLogEntry).toHaveBeenCalled.once();
    //2022-11-10: expect(context.status).not.toBe("");
    const entry = model._entry;
    expect(entry.data).toBe(audit.started.getTime());
    expect(entry.type).toBe(LogEntry.EntryType.AuditFinish);
  });

  it('skapar ett påpekande', async () => {
    const audit = model._audit;
    await controller.prepare(context);
    view.date = new Date('2020-11-23');
    view.notify({ action: 'remarks', path: null, type: 'form' });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(audit.remarks.length).toBe(1);
    expect(audit.remarks[0][1]).toEqual(view.date);
    expect(view.hideStatus).toHaveBeenCalled.once();
    expect(view.enableInjunctions)
      .toHaveBeenCalled.times(2)
      .with([false], [true]);
    expect(view.showSuccess).toHaveBeenCalled.once();
    expect(view.addProtocol).toHaveBeenCalled.once();
    expect(view.addDocument).toHaveBeenCalled.once();
    expect(model.setAudit).toHaveBeenCalled.once().with(model._audit);
  });

  it('varnar vid två påpekanden samma dag', async () => {
    const audit = model._audit;
    audit.addRemarks(new Date(), new Date(Date.now() + 2592000000));
    await controller.prepare(context);
    view.date = new Date(Date.now() + 2592000000);
    view.notify({ action: 'remarks', path: null, type: 'form' });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(view.confirm).toHaveBeenCalled.once();
  });

  it('skapar ett föreläggande', async () => {
    const audit = model._audit;
    audit.remarks = [[new Date('2020-10-23'), new Date('2020-11-23')]];
    await controller.prepare(context);
    view.date = new Date('2021-06-23');
    view.notify({ action: 'injunction', path: null, type: 'form' });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(audit.injunctions.length).toBe(1);
    expect(audit.injunctions[0][1]).toEqual(view.date);
    expect(view.hideStatus).toHaveBeenCalled.once();
    expect(view.showSuccess).toHaveBeenCalled.once();
    expect(view.addDocument).toHaveBeenCalled.times(2);
    expect(model.setAudit).toHaveBeenCalled.once().with(model._audit);
  });

  it('varnar vid två förelägganden samma dag', async () => {
    const audit = model._audit;
    audit.addInjunction(new Date(), new Date(Date.now() + 2592000000));
    await controller.prepare(context);
    view.date = new Date(Date.now() + 2592000000);
    view.notify({ action: 'injunction', path: null, type: 'form' });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(view.confirm).toHaveBeenCalled.once();
  });

  it('öppnar ett granskningsprotokoll', async () => {
    await controller.prepare(context);
    view.notify({ action: 'open', id: null, type: 'protocol' });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(protocolView.open)
      .toHaveBeenCalled.once()
      .with(model._case, model._audit);
  });

  it('öppnar ett påpekande', async () => {
    const audit = model._audit;
    audit.remarks = [[new Date('2020-10-23'), new Date('2020-11-23')]];
    await controller.prepare(context);
    view.notify({
      action: 'open',
      id: String(audit.remarks[0][0].getTime()),
      type: 'remarks',
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(remarksView.open)
      .toHaveBeenCalled.once()
      .with(model._case, model._audit, audit.remarks[0][0], 'remarks');
  });

  it('öppnar ett föreläggande', async () => {
    const audit = model._audit;
    audit.injunctions = [[new Date('2020-11-23'), new Date('2021-06-23')]];
    audit.remarks = [[new Date('2020-10-23'), new Date('2020-11-23')]];
    await controller.prepare(context);
    view.notify({
      action: 'open',
      id: String(audit.injunctions[0][0].getTime()),
      type: 'injunction',
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(remarksView.open)
      .toHaveBeenCalled.once()
      .with(model._case, model._audit, audit.injunctions[0][0], 'injunction');
  });

  it('raderar ett påpekande', async (type) => {
    const audit = model._audit;
    const date = new Date('2020-10-23');
    const id = String(date.getTime());
    audit.remarks = [[date, new Date('2021-03-23')]];
    const button = {
      dataset: { id, type: 'remarks' },
      focus: () => {},
    };
    await controller.prepare(context);
    view.notify({
      action: 'deleteDoc',
      path: null,
      trigger: button,
      type: 'form',
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(view.confirm).toHaveBeenCalled.once();
    expect(audit.deleteRemarks).toHaveBeenCalled.once().with(date);
    expect(view.deleteDocument).toHaveBeenCalled.once().with(id);
    expect(model.setAudit).toHaveBeenCalled.once().with(audit);
    expect(view.showSuccess).toHaveBeenCalled.once();
  });

  it('raderar ett föreläggande', async (type) => {
    const audit = model._audit;
    const date = new Date('2020-11-23');
    const id = String(date.getTime());
    audit.injunctions = [[date, new Date('2021-06-23')]];
    audit.remarks = [[new Date('2020-10-23'), new Date('2020-11-23')]];
    const button = {
      dataset: { id, type: 'injunction' },
      focus: () => {},
    };
    await controller.prepare(context);
    view.notify({
      action: 'deleteDoc',
      path: null,
      trigger: button,
      type: 'form',
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(view.confirm).toHaveBeenCalled.once();
    expect(audit.deleteInjunction).toHaveBeenCalled.once().with(date);
    expect(view.deleteDocument).toHaveBeenCalled.once().with(id);
    expect(model.setAudit).toHaveBeenCalled.once().with(audit);
    expect(view.showSuccess).toHaveBeenCalled.once();
  });

  it('öppnar en avslutad granskning', async () => {
    const audit = model._audit;
    audit.finished = new Date();
    const event = {
      action: 'reopen',
      path: null,
      trigger: { focus: () => {} },
      type: 'form',
    };
    await controller.prepare(context);
    view.notify(event);
    await controller.handle(context);
    expect(event.path).toBe('?page=audit&audit=42');
    expect(audit.reopen).toHaveBeenCalled.once();
    expect(model.setAudit).toHaveBeenCalled.once().with(audit);
    //2022-11-10: expect(context.status).not.toBe("");
  });
});

// Importera beroenden.
import { AuditDisplayController } from '../../js/controller/AuditDisplayController.js';
import { LogEntry } from '../../js/model/LogEntry.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

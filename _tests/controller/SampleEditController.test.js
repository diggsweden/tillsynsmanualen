/**
 * Enhetstestfall för stickprovsredigeringscontrollern.
 *
 * @license CC-BY 4.0
 * @see SampleEditController
 */

const Audit = {
  SampleCategories: [
    'start',
    'login',
    'sitemap',
    'contact',
    'help',
    'legal',
    'statement',
    'feedback',
    'special',
    'service',
    'relevant',
    'doc',
    'support',
    'random',
  ],
};

let audit;
let componentCfg;
let loader;
let model;
let pageCfg;
let view;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Konfiguration för komponent.
  componentCfg = {
    contentTypes: [
      { id: 'baz', title: 'Baz', end: 1569242096000 },
      { id: 'bar', title: 'Bar' },
      { id: 'foo', title: 'Foo' },
      { id: 'quux', title: 'Quux', begin: 1624451696000 },
    ],
  };

  // Konfiguration för appvy/dokument/webbsida.
  pageCfg = {
    contentTypes: [
      { id: 'baz', title: 'Baz', end: 1569242096000 },
      { id: 'foo', title: 'Foo', default: true },
      { id: 'bar', title: 'Bar' },
      { id: 'quux', title: 'Quux', begin: 1624451696000 },
    ],
    requirements: {
      all: { title: 'All' },
      bar: { title: 'Bar', contentTypes: ['bar'] },
      both: { title: 'Both', contentTypes: ['bar', 'foo'] },
      foo: { title: 'Foo', contentTypes: ['foo'] },
    },
  };

  // Resursladdaren: ska hämta kravkonfiguration från serven.
  loader = {
    configuration: async (path) =>
      ({
        'requirements/document': pageCfg,
        'requirements/screen-open': pageCfg,
        'requirements/webpage': pageCfg,
        'requirements/screen-component-open': componentCfg,
        'requirements/webpage-component': componentCfg,
      })[path],
  };

  // Granskning.
  audit = {
    caseID: 13,
    id: 42,
    started: new Date(1600857296000),
    _components: [],
    _progress: 0,
    _samples: [],
    auditProgress: () => [audit._progress, 14],
    components: () => [],
    contains: () => false,
    count: () => 0,
    countType: () => 0,
    sample: () => null,
    randomCount: () => 0,
    setSample: (s) => {
      audit._samples.push(s);
      if ('component' === s.type) audit._components.push(s);
    },
    *allSamples() {},
    *components() {
      yield* audit._components.values();
    },
    *samples() {},
  };

  // Modellen.
  model = {
    _case: {
      id: 13,
      monitoring: true,
      organization: { name: 'DIGG' },
      service: { name: 'digg.se', type: 'website' },
      toString: () => '2020-1234',
    },
    getAudit: async () => audit,
    getCase: async () => model._case,
  };

  // Vyn.
  view = mock.view(
    {
      action: null,
      breadcrumbs: mock.breadcrumbTrail(),
      category: null,
      component: '',
      components: [],
      contentTypes: [],
      default: false,
      deleteAction: null,
      follows: null,
      format: null,
      heading: 'New sample',
      name: null,
      note: null,
      parentType: '',
      randomCount: '0 sidor',
      service: 'website',
      serviceType: null,
      type: 'webpage',
      url: null,
      _categories: null,
      _componentCT: [],
      _components: [],
      _compStatus: null,
      _connections: [],
      _progress: null,
      _sampleCT: [],
    },
    {
      addComponent: (i, n, d) => view._components.push([i, n, d]),
      addConnection: (i, n, d) => view._connections.push([i, n, d]),
      clearComponentFields: () => {
        view.component = '';
        view.default = false;
      },
      clearComponentList: () => (view._components = []),
      confirm: async () => true,
      confirmComponents: async () => true,
      setCategories: (c) => (view._categories = c),
      setComponentContentTypes: (t) => (view._componentCT = t),
      setProgress: (c, t) => (view._progress = [c, t]),
      setSampleContentTypes: (t) => (view._sampleCT = t),
      showComponentStatus: (s) => (view._compStatus = s),
      testComponentValidity: () => true,
    }
  );
});

describe('Validera parametrar', () => {
  it('refuserar sidvisning utan gransknings-id (ny)', async () => {
    const controller = new SampleEditController();
    const context = { hasParam: () => true };
    await expect.failure(() => controller.prepare(context));
  });

  it('refuserar sidvisning utan stickprovs-id (ändra)', async () => {
    const controller = new SampleEditController();
    const context = { hasParam: () => false };
    await expect.failure(() => controller.prepare(context));
  });

  it('refuserar ogiltigt stickprov', async () => {
    const model = { getSample: async () => null };
    const controller = new SampleEditController(model);
    const context = { sample: 42, hasParam: () => false };
    await expect.failure(() => controller.prepare(context));
  });

  it('refuserar skapa i avslutad granskning', async () => {
    const audit = { finished: new Date() };
    const model = { getAudit: async () => audit };
    const controller = new SampleEditController(model);
    const context = { audit: 42, hasParam: () => true };
    await expect.failure(() => controller.prepare(context));
  });

  it('refuserar redigering i avslutad granskning', async () => {
    const audit = { finished: new Date() };
    const sample = { audit };
    const model = {
      getAudit: async () => audit,
      getSample: async () => sample,
    };
    const controller = new SampleEditController(model);
    const context = { sample: 42, hasParam: () => false };
    await expect.failure(() => controller.prepare(context));
  });
});

describe('Nytt stickprov', () => {
  let context;
  let controller;

  beforeEach(() => {
    // Modellen.
    model.confirmComponents = true;

    // Applikationskontexten.
    context = mock.appContext({
      audit: 42,
      case: 13,
      params: { new: '' },
    });

    // Skapa en controllerinstans.
    controller = new SampleEditController(model, view, loader, mock.globals());
  });

  describe('Förbered sidvisning', () => {
    it.with(['app', 'mobil applikation'], ['website', 'webbplats'])(
      'sätter typ av digital service för {1}',
      async (service) => {
        model._case.service.type = service;
        await controller.prepare(context);
        expect(view.service).toBe(service);
      }
    );

    it('uppdaterar förloppsindikatorn', async () => {
      audit._progress = 3;
      await controller.prepare(context);
      expect(view._progress).toEqual([3, 14]);
    });

    it('sätter länkstig', async () => {
      await controller.prepare(context);
      const { breadcrumbs } = view;
      expect(breadcrumbs.case)
        .toHaveBeenCalled.once()
        .with(13, '2020-1234', 'DIGG', 'digg.se');
      expect(breadcrumbs.audit).toHaveBeenCalled.once().with(42, audit.started);
      expect(breadcrumbs.current).toBe('Nytt stickprov');
    });

    it('populerar kategorilistan', async () => {
      audit.count = (c) => ({ start: 1 })[c] ?? 0;
      await controller.prepare(context);
      expect(view._categories).toEqual([
        { id: 'start', name: 'Start', count: 1 },
        { id: 'login', name: 'Inloggning', count: 0 },
        { id: 'sitemap', name: 'Webbplatskarta', count: 0 },
        { id: 'contact', name: 'Kontakt', count: 0 },
        { id: 'help', name: 'Hjälp', count: 0 },
        { id: 'legal', name: 'Juridisk information', count: 0 },
        { id: 'statement', name: 'Tillgänglighetsredogörelse', count: 0 },
        { id: 'feedback', name: 'Meddelandefunktion', count: 0 },
        { id: 'special', name: 'Udda innehåll', count: 0 },
        { id: 'service', name: 'Typ av tjänst', count: 0 },
        { id: 'relevant', name: 'Relevant', count: 0 },
        { id: 'doc', name: 'Produktdokumentation', count: 0 },
        { id: 'support', name: 'Supporttjänster', count: 0 },
        { id: 'random', name: 'Slumpmässigt urval', count: 0 },
      ]);
    });

    it.with(
      ['app', 1, '1 vy'],
      ['app', 2, '2 vyer'],
      ['website', 1, '1 sida'],
      ['website', 0, '0 sidor']
    )('sätter återstående slumpurval till {2}', async (type, count, text) => {
      model._case.service.type = type;
      audit.randomCount = () => count;
      await controller.prepare(context);
      expect(view.randomCount).toBe(text);
    });

    it('sätter åtgärdssökvägar', async () => {
      const expected = `?page=sample&audit=${audit.id}&new`;
      await controller.prepare(context);
      expect(view.action).toBe(expected);
      expect(view.deleteAction).toBe(null);
    });

    it('populerar innehållstyper för stickprovet', async () => {
      await controller.prepare(context);
      expect(view._sampleCT).toEqual([
        ['foo', 'Foo', true],
        ['bar', 'Bar', false],
      ]);
      expect(view._componentCT).toEqual([
        ['bar', 'Bar', false],
        ['foo', 'Foo', false],
      ]);
    });

    it('populerar komponentlistan', async () => {
      audit._components = [
        { id: 1, name: 'foo', default: true, parentType: 'webpage' },
        { id: 2, name: 'bar', default: false, parentType: 'webpage' },
        { id: 3, name: 'baz', default: false, parentType: 'screen' },
      ];
      await controller.prepare(context);
      expect(view._components).toEqual([
        [1, 'foo', true],
        [2, 'bar', false],
      ]);
    });
  });

  describe('Hantera interaktion', () => {
    beforeEach(() => {
      // Modellen.
      model.deleteRequirements = () => {};
    });

    it.with(
      [false, 'screen', 'icke förvald vykomponent'],
      [true, 'webpage', 'förvald webbkomponent']
    )('lägger till en {2} i granskningen', async (flag, type) => {
      model._saved = null;
      model.setSample = async (s) => {
        s.id = 17;
        model._saved = s;
      };
      await controller.prepare(context);
      view.component = 'Test';
      view.default = flag;
      view.notify(
        { target: 'type', type: 'change', value: type },
        { action: 'component', type: 'form', path: null }
      );
      view.notify({ path: '?page=other', type: 'link' });
      await controller.handle(context);
      expect(model._saved).not.toBe(null);
      expect(model._saved).toBeAnInstanceOf(Component);
      expect(model._saved.name).toBe('Test');
      expect(model._saved.default).toBe(flag);
      expect(view._components).toEqual([[17, 'Test', true]]);
      expect(view.component).toBe('');
      expect(view.default).toBe(false);
    });

    it.with(
      ['app', 'screen', 'en ny vy'],
      ['website', 'document', 'ett nytt dokument'],
      ['website', 'webpage', 'en ny webbsida']
    )('sparar {2}', async (service, type) => {
      model._case.service.type = service;
      model._saved = null;
      model.setSample = async (s) => {
        s.id = 17;
        model._saved = s;
      };
      await controller.prepare(context);
      view.notify(
        { target: 'type', type: 'change', value: type },
        { target: 'name', type: 'change', value: 'Test' }
      );
      view.notify({ action: 'save', path: '?page=other', type: 'form' });
      await controller.handle(context);
      expect(model._saved).not.toBe(null);
      expect(model._saved.type).toBe(type);
      expect(model._saved.name).toBe('Test');
    });

    it('bekräftar komponenter vid spara', async () => {
      const mkComp = (id, inc) => ({ id, inc, parentType: 'webpage' });
      audit.countType = () => 2;
      model.confirmComponents = true;
      model._saved = null;
      model.setSample = async (s) => {
        s.id = 17;
        model._saved = s;
      };
      view.components = [mkComp(1, true), mkComp(2, false)];
      audit.sample = (id) => view.components[id - 1];
      await controller.prepare(context);
      view.notify({ target: 'name', type: 'change', value: 'Test' });
      view.notify({ action: 'save', type: 'form', path: '?page=other' });
      await controller.handle(context);
      expect(model._saved).not.toBe(null);
      expect(view.confirmComponents).toHaveBeenCalled.once();
      expect(model._saved.hasComponent(1)).toBe(true);
      expect(model._saved.hasComponent(2)).toBe(false);
    });

    it('visar ingen bekräftelse om användaren avböjt', async () => {
      audit.countType = () => 2;
      model.confirmComponents = false;
      model.setSample = async (s) => {};
      await controller.prepare(context);
      view.notify({ target: 'name', type: 'change', value: 'Test' });
      view.notify({ action: 'save', type: 'form', path: '?page=other' });
      await controller.handle(context);
      expect(view.confirmComponents).toHaveBeenCalled.never();
    });

    it('visar ingen bekräftelse för dokument', async () => {
      audit.countType = () => 2;
      model.confirmComponents = true;
      model.setSample = async (s) => {};
      await controller.prepare(context);
      view.notify(
        { target: 'type', type: 'change', value: 'document' },
        { target: 'name', type: 'change', value: 'Test' }
      );
      view.notify({ action: 'save', type: 'form', path: '?page=other' });
      await controller.handle(context);
      expect(view.confirmComponents).toHaveBeenCalled.never();
    });

    it('sparar ändrad inställning för bekräfta', async () => {
      audit.countType = () => 2;
      model.confirmComponents = true;
      model.setSample = async (s) => {};
      view.components = [
        { id: 1, inc: true },
        { id: 2, inc: false },
      ];
      view.confirmOnSave = false;
      audit.sample = (id) => view.components[id - 1];
      await controller.prepare(context);
      view.notify({ target: 'name', type: 'change', value: 'Test' });
      view.notify({ action: 'save', type: 'form', path: '?page=other' });
      await controller.handle(context);
      expect(model.confirmComponents).toBe(false);
    });

    it('avbryter spara vid avbruten bekräftelse', async () => {
      audit.countType = () => 2;
      model.confirmComponents = true;
      model._saved = null;
      model.setSample = async (s) => (model._saved = s);
      view.components = [
        { id: 1, inc: true },
        { id: 2, inc: false },
      ];
      view.confirmComponents = async () => false;
      await controller.prepare(context);
      view.notify({ target: 'name', type: 'change', value: 'Test' });
      view.notify({ action: 'save', type: 'form', path: '?page=other' });
      await controller.handle(context);
      expect(model._saved).toBe(null);
    });
  });
});

describe('Redigera befintligt stickprov', () => {
  let context;
  let controller;
  let sample;

  beforeEach(() => {
    // Stickprov.
    sample = {
      auditID: 42,
      id: 69,
      category: 'start',
      isComposite: true,
      name: 'Test',
      type: 'webpage',
      _components: new Map(),
      addComponent: (c) => sample._components.set(c.id, c),
      contains: () => false,
      deleteComponent: (i) => sample._components.delete(i),
      hasComponent: (i) => sample._components.has(i),
      serialize: () => ({
        auditID: sample.auditID,
        category: sample.category,
        class: 'Webpage',
        name: sample.name,
        components: [...sample._components.keys()],
      }),
    };

    // Granskningen.
    audit.sample = () => sample;

    // Modellen.
    model.getSample = async () => sample;

    // Applikationskontexten.
    context = mock.appContext({
      audit: 42,
      case: 13,
      sample: 69,
      params: { return: 'audit%26audit%3D42' },
    });

    // Skapa en controllerinstans.
    controller = new SampleEditController(model, view, loader, mock.globals());
  });

  describe('Förbered sidvisning', () => {
    it.with(['app', 'mobil applikation'], ['website', 'webbplats'])(
      'sätter typ av digital service för {1}',
      async (service) => {
        sample.type = 'app' === service ? 'screen' : 'webpage';
        model._case.service.type = service;
        await controller.prepare(context);
        expect(view.service).toBe(service);
      }
    );

    it('sätter stickprovsnamnet som sidrubrik', async () => {
      await controller.prepare(context);
      expect(view.heading).toBe(sample.name);
    });

    it('sätter länkstig', async () => {
      await controller.prepare(context);
      const { breadcrumbs } = view;
      expect(breadcrumbs.case)
        .toHaveBeenCalled.once()
        .with(13, '2020-1234', 'DIGG', 'digg.se');
      expect(breadcrumbs.audit).toHaveBeenCalled.once().with(42, audit.started);
      expect(breadcrumbs.current).toBe(sample.name);
    });

    it('populerar kategorilistan för ett stickprov', async () => {
      audit.count = (c) => ({ start: 1 })[c] ?? 0;
      await controller.prepare(context);
      expect(view._categories).toEqual([
        { id: 'start', name: 'Start', count: 1 },
        { id: 'login', name: 'Inloggning', count: 0 },
        { id: 'sitemap', name: 'Webbplatskarta', count: 0 },
        { id: 'contact', name: 'Kontakt', count: 0 },
        { id: 'help', name: 'Hjälp', count: 0 },
        { id: 'legal', name: 'Juridisk information', count: 0 },
        { id: 'statement', name: 'Tillgänglighetsredogörelse', count: 0 },
        { id: 'feedback', name: 'Meddelandefunktion', count: 0 },
        { id: 'special', name: 'Udda innehåll', count: 0 },
        { id: 'service', name: 'Typ av tjänst', count: 0 },
        { id: 'relevant', name: 'Relevant', count: 0 },
        { id: 'doc', name: 'Produktdokumentation', count: 0 },
        { id: 'support', name: 'Supporttjänster', count: 0 },
        { id: 'random', name: 'Slumpmässigt urval', count: 0 },
      ]);
    });

    it('populerar kategorilistan för en komponent', async () => {
      sample.type = 'component';
      sample.parentType = 'webpage';
      audit.count = (c) => ({ component: 1 })[c] ?? 0;
      await controller.prepare(context);
      expect(view._categories).toEqual([
        { id: 'component', name: 'Komponent', count: 1 },
      ]);
    });

    it('sätter åtgärdssökvägar', async () => {
      const expected = `?page=audit&audit=42`;
      await controller.prepare(context);
      expect(view.action).toBe(expected);
      expect(view.deleteAction).toBe(expected);
    });

    it('populerar innehållstyper för stickprovet', async () => {
      sample.contains = (id) => ['bar', 'baz'].includes(id);
      await controller.prepare(context);
      expect(view._sampleCT).toEqual([
        ['baz', 'Baz', true],
        ['foo', 'Foo', false],
        ['bar', 'Bar', true],
      ]);
      expect(view._componentCT).toEqual([
        ['bar', 'Bar', false],
        ['foo', 'Foo', false],
      ]);
    });

    it('populerar komponentlistan', async () => {
      audit._components = [
        { id: 1, name: 'foo', default: true, parentType: 'webpage' },
        { id: 2, name: 'bar', default: false, parentType: 'webpage' },
        { id: 3, name: 'baz', default: false, parentType: 'screen' },
      ];
      sample.hasComponent = (id) => 2 === id;
      await controller.prepare(context);
      expect(view._components).toEqual([
        [1, 'foo', false],
        [2, 'bar', true],
      ]);
    });

    it('populerar kopplingslista för en komponent', async () => {
      const mkSamp = (id, name, type, inc) => ({
        id,
        name,
        type,
        hasComponent: () => inc,
      });
      audit.allSamples = function* () {
        const samples = [
          mkSamp(67, 'Foo', 'screen', false),
          mkSamp(68, 'Bar', 'webpage', false),
          mkSamp(69, 'Test', 'webpage', true),
          mkSamp(70, 'Quux', 'webpage', true),
        ];
        for (const s of samples) {
          yield s;
        }
      };
      sample.isComposite = false;
      sample.type = 'component';
      sample.parentType = 'webpage';
      await controller.prepare(context);
      expect(view._connections).toEqual([
        [68, 'Bar', false],
        [69, 'Test', true],
        [70, 'Quux', true],
      ]);
    });

    it('populerar formuläret med stickprovsdata', async () => {
      Object.assign(sample, {
        category: 'test',
        follows: 'first',
        format: 'pdf',
        isComposite: false,
        note: 'Test note',
        service: 'test',
        type: 'document',
        url: 'https://digg.se/test.pdf',
      });
      await controller.prepare(context);
      expect(view.category).toBe(sample.category);
      expect(view.follows).toBe(sample.follows);
      expect(view.format).toBe(sample.format);
      expect(view.name).toBe(sample.name);
      expect(view.note).toBe(sample.note);
      expect(view.serviceType).toBe(sample.service);
      expect(view.type).toBe(sample.type);
      expect(view.url).toBe(sample.url);
    });

    it('populerar kandidater till föregående processteg', async () => {
      const mkSamp = (id, name, follows, type) => ({ id, name, follows, type });
      const samples = [
        mkSamp(64, 'comp', '', 'component'),
        mkSamp(65, 'screen', '', 'screen'),
        mkSamp(66, 'first', '', 'webpage'),
        mkSamp(67, 'second', 'first', 'webpage'),
        mkSamp(68, 'Quux', '', 'webpage'),
        mkSamp(69, 'Test', 'second', 'webpage'),
        mkSamp(70, 'doc', '', 'document'),
        mkSamp(71, 'Foo', '', 'webpage'),
      ];
      audit.samples = function* () {
        for (const s of samples) {
          yield s;
        }
      };
      sample.follows = 'second';
      await controller.prepare(context);
      expect(view.predecessors).toEqual(['Foo', 'Quux', 'second']);
    });
  });

  describe('Hantera interaktion', () => {
    it('markerar ingående komponenter', async () => {
      audit._samples = [
        { id: 1, type: 'component' },
        { id: 2, type: 'component' },
      ];
      audit.sample = (id) => audit._samples[id - 1];
      await controller.prepare(context);
      view.notify({
        state: true,
        target: 'component-1',
        type: 'change',
        value: '2',
      });
      view.notify({ path: '?page=other', type: 'link' });
      await controller.handle(context);
      expect(sample.hasComponent(1)).toBe(false);
      expect(sample.hasComponent(2)).toBe(true);
    });

    it("ändrar kategori till 'typ av tjänst'", async () => {
      const value = 'service';
      await controller.prepare(context);
      view.notify({ target: 'category', type: 'change', value });
      view.notify({ path: '?page=other', type: 'link' });
      await controller.handle(context);
      expect(sample.category).toBe(value);
      expect(view.category).toBe(value);
    });

    it('ändrar typ av tjänst', async () => {
      const value = 'test';
      sample.category = 'service';
      await controller.prepare(context);
      view.notify({ target: 'serviceType', type: 'change', value });
      view.notify({ path: '?page=other', type: 'link' });
      await controller.handle(context);
      expect(sample.service).toBe(value);
    });

    it('sätter format från URL för ett dokument', async () => {
      const value = 'https://digg.se/test.pdf';
      sample.isComposite = false;
      sample.type = 'document';
      await controller.prepare(context);
      view.notify({ target: 'url', type: 'change', value });
      view.notify({ path: '?page=other', type: 'link' });
      await controller.handle(context);
      expect(sample.format).toBe('pdf');
      expect(view.format).toBe('pdf');
    });

    it('raderar krav vid ändring av öppen/stängd funktionalitet', async () => {
      sample.type = 'screen';
      sample.closed = false;
      model._deleted = null;
      model._saved = null;
      model.deleteRequirements = async (i) => (model._deleted = i);
      model.setSample = async (s) => (model._saved = s);
      await controller.prepare(context);
      view.notify({ target: 'srSupport', type: 'change', state: false });
      view.notify({ action: 'save', path: '?page=other', type: 'form' });
      await controller.handle(context);
      expect(model._deleted).toBe(sample.id);
      expect(sample.closed).toBe(true);
    });

    it('validerar namnets unicitet för komponent', async () => {
      audit.contains = (n) => true;
      await controller.prepare(context);
      view.notify({ target: 'component', type: 'change', value: 'Test' });
      view.notify({ path: '?page=other', type: 'link' });
      await controller.handle(context);
      expect(view.component).toBeAnInstanceOf(ValidationError);
    });

    it('validerar namnets unicitet för stickprov', async () => {
      audit.contains = () => true;
      await controller.prepare(context);
      view.notify({ target: 'name', type: 'change', value: 'Test' });
      view.notify({ path: '?page=other', type: 'link' });
      await controller.handle(context);
      expect(view.name).toBeAnInstanceOf(ValidationError);
    });

    it('refuserar tillägg av komponent med ogiltigt namn', async () => {
      model._saved = null;
      model.setSample = async (s) => (model._saved = s);
      view.testComponentValidity = () => false;
      await controller.prepare(context);
      view.notify({ action: 'component', path: null, type: 'form' });
      view.notify({ path: '?page=other', type: 'link' });
      await controller.handle(context);
      expect(view.component).toBeAnInstanceOf(ValidationError);
      expect(view.components.length).toBe(0);
      expect(model._saved).toBe(null);
    });

    it.with(
      [false, 'screen', 'icke förvald vykomponent'],
      [true, 'webpage', 'förvald webbkomponent']
    )('lägger till en {2} i granskningen', async (flag, type) => {
      model._saved = null;
      model.setSample = async (s) => ((s.id = 17), (model._saved = s));
      await controller.prepare(context);
      view.component = 'Test';
      view.default = flag;
      view.notify(
        { target: 'type', type: 'change', value: type },
        { action: 'component', type: 'form', path: null }
      );
      view.notify({ path: '?page=other', type: 'link' });
      await controller.handle(context);
      expect(model._saved).not.toBe(null);
      expect(model._saved).toBeAnInstanceOf(Component);
      expect(model._saved.name).toBe('Test');
      expect(model._saved.default).toBe(flag);
      expect(view._components).toEqual([[17, 'Test', true]]);
      expect(view.component).toBe('');
      expect(view.default).toBe(false);
    });

    it('sparar redigerad komponent', async () => {
      sample.isComposite = false;
      sample.type = 'component';
      sample.parentType = 'webpage';
      model._deleted = null;
      model._saved = null;
      model.deleteRequirements = async (i) => (model._deleted = i);
      model.setSample = async (s) => (model._saved = s);
      await controller.prepare(context);
      view.notify({ target: 'note', type: 'change', value: 'test' });
      view.notify({ action: 'save', type: 'form', path: '?page=other' });
      await controller.handle(context);
      expect(model._saved).toBe(sample);
      expect(model._deleted).toBe(null);
    });

    it('uppdaterar kopplingar vid spara komponent', async () => {
      class MockSample {
        #comp = new Map();
        constructor(id, name, type) {
          this.id = id;
          this.name = name;
          this.type = type;
        }
        addComponent(c) {
          this.#comp.set(c.id, c);
        }
        deleteComponent(i) {
          this.#comp.delete(i);
        }
        hasComponent(i) {
          return this.#comp.has(i);
        }
      }
      const mkSamp = (id, name, type) => new MockSample(id, name, type);
      const samples = [
        mkSamp(67, 'Foo', 'screen', false),
        mkSamp(68, 'Bar', 'webpage', false),
        mkSamp(69, 'Test', 'webpage', true),
        mkSamp(70, 'Quux', 'webpage', true),
      ];
      samples[2].addComponent(sample);
      samples[3].addComponent(sample);
      audit.allSamples = function* () {
        for (const s of samples) {
          yield s;
        }
      };
      audit.sample = (id) => samples[id - 67];
      sample.isComposite = false;
      sample.type = 'component';
      sample.parentType = 'webpage';
      model._saved = [];
      model.setSample = async (s) => model._saved.push(s);
      await controller.prepare(context);
      view.notify(
        { state: true, target: 'connection-68', type: 'change', value: '68' },
        { state: false, target: 'connection-69', type: 'change', value: '69' }
      );
      view.notify({ action: 'save', type: 'form', path: '?page=other' });
      await controller.handle(context);
      expect(model._saved).toEqual([sample, samples[1], samples[2]]);
      expect(samples[1].hasComponent(sample.id)).toBe(true);
      expect(samples[2].hasComponent(sample.id)).toBe(false);
    });

    it.with(
      ['app', 'screen', 'redigerad vy'],
      ['website', 'document', 'redigerat dokument'],
      ['website', 'webpage', 'redigerad webbsida']
    )('sparar {2}', async (service, type) => {
      model._case.service.type = service;
      model._saved = null;
      model.setSample = async (s) => (model._saved = s);
      sample.isComposite = type !== 'document';
      sample.type = type;
      await controller.prepare(context);
      view.notify({ target: 'note', type: 'change', value: 'Test note' });
      view.notify({ action: 'save', type: 'form', path: '?page=other' });
      await controller.handle(context);
      expect(model._saved).not.toBe(null);
      expect(model._saved.type).toBe(type);
      expect(model._saved.note).toBe('Test note');
    });

    it('uppdaterar stickprovslista vid ändrad kategori', async () => {
      const mkSamp = (id, name, type, follows) => ({
        follows,
        id,
        name,
        type,
      });
      const samples = [
        mkSamp(47, 'scr', 'screen', ''), // wrong type
        mkSamp(48, 'doc', 'document', ''), // wrong type
        mkSamp(49, 'wp1', 'webpage', ''), // intiial value
        mkSamp(50, 'wp2', 'webpage', ''), // referred
        mkSamp(51, 'wp3', 'webpage', 'wp2'), // eligible
        mkSamp(52, 'wp4', 'webpage', ''), // eligible
        sample,
      ];
      audit.samples = function* (category) {
        const arr = {
          start: [0, 1, 2],
          test: [0, 1, 3, 4, 5],
        }[category].map((i) => samples[i]);
        for (const s of arr) {
          yield s;
        }
      };
      await controller.prepare(context);
      view.notify({ target: 'category', type: 'change', value: 'test' });
      view.notify({ path: '?page=other', type: 'link' });
      await controller.handle(context);
      expect(view.predecessors).toEqual(['wp3', 'wp4']);
    });

    it('uppdaterar referenter vid namnbyte', async () => {
      const mkSamp = (id, name, type, follows) => ({
        follows,
        id,
        name,
        type,
      });
      const samples = [
        mkSamp(68, 'Foo', 'webpage', ''),
        sample, // orig. name="Test"
        mkSamp(70, 'Bar', 'webpage', 'Test'),
      ];
      audit.allSamples = function* () {
        for (const s of samples) {
          yield s;
        }
      };
      model._saved = [];
      model.setSample = async (s) => model._saved.push(s);
      await controller.prepare(context);
      view.notify({ target: 'name', type: 'change', value: 'Redux' });
      view.notify({ action: 'save', type: 'form', path: '?page=other' });
      await controller.handle(context);
      expect(model._saved).toEqual([sample, samples[2]]);
      expect(samples[2].follows).toBe('Redux');
    });

    it('tar bort en komponent ur granskningen', async () => {
      audit._deleted = null;
      audit.deleteSample = (i) => (audit._deleted = i);
      model._deleted = null;
      model._saved = null;
      model.deleteSample = async (i) => (model._deleted = i);
      model.setAuditSamples = async (a) => (model._saved = a);
      sample.isComposite = false;
      sample.type = 'component';
      sample.parentType = 'webpage';
      await controller.prepare(context);
      view.notify({ action: 'delete', type: 'form', path: '?page=other' });
      await controller.handle(context);
      expect(view.confirm).toHaveBeenCalled.once();
      expect(audit._deleted).toBe(sample.id);
      expect(model._deleted).toBe(sample.id);
      expect(model._saved).toBe(audit);
    });

    it.with(
      ['app', 'screen', 'en vy'],
      ['website', 'document', 'ett dokument'],
      ['website', 'webpage', 'en webbsida']
    )('tar bort {2} ur granskningen', async (service, type) => {
      model._case.service.type = service;
      audit._deleted = null;
      audit.deleteSample = (s) => (audit._deleted = s);
      model._deleted = null;
      model.deleteSample = async (i) => (model._deleted = i);
      sample.isComposite = 'document' !== type;
      sample.type = type;
      await controller.prepare(context);
      view.notify({ action: 'delete', path: '?page=other', type: 'form' });
      await controller.handle(context);
      expect(view.confirm).toHaveBeenCalled.once();
      expect(audit._deleted).toBe(sample.id);
      expect(model._deleted).toBe(sample.id);
    });

    it('tar bort ett refererat processteg', async () => {
      const mkSamp = (id, name, type, follows) => ({
        follows,
        id,
        name,
        type,
      });
      const samples = [
        mkSamp(68, 'Foo', 'webpage', ''),
        sample,
        mkSamp(70, 'Bar', 'webpage', 'Test'), // follows current
      ];
      audit.allSamples = function* () {
        for (const s of samples) {
          yield s;
        }
      };
      sample.follows = 'prev';
      audit._deleted = null;
      audit.deleteSample = (i) => (audit._deleted = i);
      model._saved = null;
      model.deleteSample = async () => {};
      model.setAuditSamples = async (a) => (model._saved = a);
      await controller.prepare(context);
      view.notify({ action: 'delete', path: '?page=other', type: 'form' });
      await controller.handle(context);
      expect(model._saved).toBe(audit);
      expect(samples[2].follows).toBe('prev');
    });
  });
});

// Importera beroenden.
import { Component } from '../../js/model/sample.js';
import { SampleEditController } from '../../js/controller/SampleEditController.js';
import { ValidationError } from '../../js/model/ValidationError.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

/**
 * Enhetstestfall för kravgranskningscontrollern.
 *
 * @license CC-BY 4.0
 * @see RequirementController
 */

let context;
let controller;
let loader;
let model;
let order;
let tree;
let view;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Modellen.
  model = mock.model(
    {
      advancedMode: true,
      caseDirectory: 'G:\\dir',
      _audit: null,
      _case: {
        caseNumber: { year: 2020, toString: () => '2020-1234' },
        id: 13,
        monitoring: true,
        organization: { name: 'Acme' },
        service: { name: 'Test Site', type: 'website' },
        toString: () => '2020-1234',
      },
      _requirement: null,
      _sample: null,
      _saved: null,
    },
    {
      getAudit: async () => model._audit,
      getCase: async () => model._case,
      getRequirement: async () => model._requirement,
      getSample: async () => model._sample,
      setRequirement: async (r) => (model._saved = r),
    }
  );

  // Kravordning.
  order = mock({
    _next: null,
    _prev: null,
    _skip: null,
    build: async () => ({}),
    next: () => order._next,
    previous: () => order._prev,
    skip: () => order._skip,
  });

  // Villkorsträd.
  tree = mock(
    {
      configuration: null,
      requirement: null,
      _condition: mock(
        {
          enabled: true,
          id: '',
          state: null,
        },
        {
          hasBranch: () => true,
          update: () => {},
        }
      ),
    },
    {
      apply: () => {},
      build: () => {},
      get: (i) => tree._condition,
      *update() {
        yield tree._condition;
      },
    }
  );

  // Vyn.
  view = mock.view(
    {
      breadcrumbs: mock.breadcrumbTrail(),
      externalNote: '',
      heading: '',
      internalNote: '',
      readOnly: false,
      _details: mock({ text: () => {} }),
      _figure: mock({ caption: () => {}, image: () => {} }),
      _groups: {},
      _wave: mock({
        absent: () => {},
        present: () => {},
        tab: () => {},
      }),
    },
    {
      action: () => {},
      addFilter: () => {},
      bookmarklet: () => {},
      check: () => {},
      condition: () => {},
      createDetails: () => view._details,
      createFigure: () => view._figure,
      createWAVE: () => view._wave,
      definition: () => {},
      devTool: () => {},
      examples: () => {},
      exceptions: () => {},
      externalTool: () => {},
      group: (i) => (view._groups[i] = {}),
      image: () => {},
      instruction: () => {},
      link: () => {},
      methods: () => {},
      moduleTool: () => {},
      note: () => {},
      oList: () => {},
      reference: () => {},
      removeExternalNote: () => {},
      setAuditLink: () => {},
      setCheck: () => {},
      setNext: () => {},
      setPrevious: () => {},
      setProgress: () => {},
      setSample: () => {},
      setSampleInfo: () => {},
      setSkip: () => {},
      showFail: () => {},
      showGroup: () => {},
      steps: () => {},
      table: () => {},
      text: () => {},
      tip: () => {},
      uList: () => {},
      warning: () => {},
      webDeveloper: () => {},
    }
  );
});

describe('Förbered sidvisning', () => {
  let requirement;
  let sampCfg;
  let sample;

  beforeEach(() => {
    // Krav.
    requirement = model._requirement = {
      hasChecks: true,
      id: 'test',
      title: 'Test requirement',
    };

    // Stickprov.
    sample = model._sample = {
      auditID: 42,
      id: 69,
      name: 'Test',
      type: 'webpage',
      _done: 0,
      contains: (...t) => t.includes('test'),
      progress: () => [sample._done, 42],
      requirement: (r) => ({ test: requirement })[r] ?? null,
      setRequirement: () => {},
    };

    // Granskning.
    model._audit = {
      caseID: 13,
      id: 42,
      observations: () => [],
      started: new Date('2020-09-23'),
      setSample: () => {},
      toString: () => '2020-09-23',
    };

    // Stickprovskonfiguration.
    sampCfg = {
      sections: [{ title: 'Test', requirements: ['test'] }],
      requirements: { test: { title: requirement.title, checks: [] } },
    };

    // Resursladdaren.
    loader = mock({ configuration: async () => sampCfg });

    // Applikationskontexten.
    context = mock.appContext({
      requirement: 'test',
      sample: 69,
    });

    // Skapa en controllerinstans.
    controller = new RequirementController(
      model,
      view,
      loader,
      order,
      tree,
      mock.globals()
    );
  });

  it('refuserar sidvisning utan stickprovs-id', async () => {
    delete context.sample;
    await expect.failure(() => controller.prepare(context));
  });

  it('refuserar sidvisning utan krav', async () => {
    delete context.requirement;
    await expect.failure(() => controller.prepare(context));
  });

  it('sätter titel, sidrubrik och länkstig', async () => {
    const audit = model._audit;
    const title = requirement.title;
    await controller.prepare(context);
    const bc = view.breadcrumbs;
    expect(view.title).toBe(title);
    expect(view.heading).toBe(title);
    expect(bc.case)
      .toHaveBeenCalled.once()
      .with(13, '2020-1234', 'Acme', 'Test Site');
    expect(bc.audit).toHaveBeenCalled.once().with(42, audit.started);
    expect(bc.sample).toHaveBeenCalled.once().with(69, sample.name);
    expect(bc.current).toBe(title);
  });

  it('länkar till granskningsöversikten', async () => {
    await controller.prepare(context);
    expect(view.setAuditLink)
      .toHaveBeenCalled.once()
      .with('?page=audit&audit=42', '2020-09-23');
  });

  it('skrivskyddar vyn vid avslutad granskning', async () => {
    model._audit.finished = new Date();
    await controller.prepare(context);
    expect(view.readOnly).toBe(true);
  });

  it('bygger kravordningen', async () => {
    await controller.prepare(context);
    expect(order.build).toHaveBeenCalled.once();
  });

  it.with([0, '0 av 42 krav granskade'], [1, '1 av 42 krav granskat'])(
    'uppdaterar förloppsindikatorn med {0} krav',
    async (done, text) => {
      sample._done = done;
      await controller.prepare(context);
      expect(view.setProgress).toHaveBeenCalled.once().with(done, 42, text);
    }
  );

  it('sätter filterklass i vyn för mobil applikation', async () => {
    model._case.service.operatingSystem = 'Android';
    model._case.service.type = 'app';
    await controller.prepare(context);
    expect(view.addFilter).toHaveBeenCalled.once().with('android');
  });

  it('sätter filterklass i vyn för dokument', async () => {
    sample.format = 'pdf';
    sample.type = 'document';
    await controller.prepare(context);
    expect(view.addFilter).toHaveBeenCalled.once().with('pdf');
  });

  it.with([false, 'första avsnittet'], [true, 'senare avsnitt'])(
    'sätter föregående sida i navigeringen för {1}',
    async (prev) => {
      const url = '?page=requirement&sample=69&requirement=test';
      model.advancedMode = false;
      order._prev = prev ? 'test' : null;
      await controller.prepare(context);
      expect(view.setPrevious)
        .toHaveBeenCalled.once()
        .with(prev ? url : null, prev ? 'Test requirement' : null);
    }
  );

  it.with([false, 'sista avsnittet'], [true, 'tidigare avsnitt'])(
    'sätter nästa sida i navigeringen för {1}',
    async (next) => {
      const url = '?page=requirement&sample=69&requirement=test';
      const audit = '?page=audit&audit=42';
      order._next = next ? 'test' : null;
      await controller.prepare(context);
      expect(view.setNext)
        .toHaveBeenCalled.once()
        .with(next ? url : audit, next ? 'Test requirement' : '2020-09-23');
    }
  );

  it.with([false, 'avaktiverar'], [true, 'sätter'])(
    '{1} nästa ogranskade krav i navigeringen',
    async (skip) => {
      const url = '?page=requirement&sample=69&requirement=test';
      order._skip = skip ? 'test' : null;
      await controller.prepare(context);
      expect(view.setSkip)
        .toHaveBeenCalled.once()
        .with(skip ? url : null, skip ? 'Test requirement' : null);
    }
  );

  it('sätter stickprovslänk i ingressen', async () => {
    const url = 'https://example.com/';
    sample.url = url;
    await controller.prepare(context);
    expect(view.setSampleInfo).toHaveBeenCalled.once().with('Test', url);
  });

  it('sätter stickprovslänk i navigeringen', async () => {
    const url = '?page=sample&sample=69';
    await controller.prepare(context);
    expect(view.setSample).toHaveBeenCalled.once().with(url, 'Test');
  });

  describe('Granskning', () => {
    let auditCfg;

    beforeEach(() => {
      // Resursladdaren.
      loader = mock({
        configuration: async (p) =>
          ({
            'requirements/webpage': sampCfg,
            'requirements/webpage/test': auditCfg,
          })[p],
      });

      // Skapa en controllerinstans.
      controller = new RequirementController(
        model,
        view,
        loader,
        order,
        tree,
        mock.globals()
      );
    });

    it('visar metodbeskrivning (separata metoder)', async () => {
      const methods = ['First', 'Second'];
      auditCfg = { methods };
      await controller.prepare(context);
      expect(view.methods).toHaveBeenCalled.once().with(methods);
    });

    it('visar metodbeskrivning (steglista)', async () => {
      const steps = ['First', 'Second'];
      auditCfg = { steps };
      await controller.prepare(context);
      expect(view.steps).toHaveBeenCalled.once().with(steps);
    });

    it('visar undantagslista', async () => {
      const exceptions = ['First', 'Second'];
      auditCfg = { exceptions };
      await controller.prepare(context);
      expect(view.exceptions).toHaveBeenCalled.once().with(exceptions);
    });

    it('visar exempel', async () => {
      const examples = {
        bad: ['Bad'],
        better: ['Better'],
        good: ['Good'],
        neutral: ['Neutral'],
      };
      auditCfg = { examples };
      await controller.prepare(context);
      expect(view.examples).toHaveBeenCalled.once().with(examples);
    });

    it.with(
      [undefined, 'ogranskad'],
      [true, 'godkänd'],
      [false, 'underkänd']
    )('visar en {1} enkel kontroll', async (state) => {
      const check = {
        observation: false === state ? 'Observation' : null,
        screenshot: {
          path: false === state ? 'screenshot.png' : null,
          alt: false === state ? 'alt text' : null,
        },
        state,
      };
      const obs = ['Previous'];
      model._audit.observations = () => obs;
      requirement.checks = { test: check };
      requirement.check = (c) => ({ test: check })[c] ?? null;
      sampCfg.requirements.test.checks = [{ check: 'test' }];
      sampCfg.checks = {
        test: {
          texts: ['Single check'],
          observation: 'Test observation',
        },
      };
      await controller.prepare(context);
      expect(view.check)
        .toHaveBeenCalled.once()
        .with(
          'test',
          [[state, 'Single check']],
          [],
          check.observation ?? 'Test observation',
          obs,
          check.screenshot.path,
          check.screenshot.alt,
          null,
          null
        );
    });

    it('visar en enkel kontroll med undantag', async () => {
      const check = { state: true };
      const exceptions = ['First', 'Second'];
      requirement.checks = { test: check };
      requirement.check = (c) => ({ test: check })[c] ?? null;
      sampCfg.requirements.test.checks = [{ check: 'test' }];
      sampCfg.checks = {
        test: {
          texts: ['Single check'],
          exceptions,
          observation: 'Test observation',
        },
      };
      await controller.prepare(context);
      expect(view.check)
        .toHaveBeenCalled.once()
        .with(
          'test',
          [[true, 'Single check']],
          exceptions,
          'Test observation',
          [],
          null,
          null,
          null,
          null
        );
    });

    it('visar en pseudokontroll', async () => {
      const check = { state: true };
      requirement.checks = { test: check };
      requirement.check = (c) => ({ test: check })[c] ?? null;
      sampCfg.requirements.test.checks = [{ check: 'test' }];
      sampCfg.requirements.test.pseudo = true;
      sampCfg.checks = { test: { texts: ['%dir%, %name%, %file%'] } };
      sample.url = 'https://digg.se/test.html';
      await controller.prepare(context);
      expect(view.check)
        .toHaveBeenCalled.once()
        .with(
          'test',
          [
            [
              true,
              'G:\\dir\\2020\\2020-1234 Test Site\\2020-09-23, test, test.html',
            ],
          ],
          [],
          undefined,
          [],
          null,
          null,
          null,
          null
        );
    });

    it.with(
      [undefined, 'ogranskad'],
      [true, 'godkänd'],
      [false, 'underkänd']
    )('visar en {1} härledd kontroll', async (state) => {
      const check = {
        _applicable: undefined === state ? state : true,
        observation: false === state ? 'Observation' : null,
        state,
        sources: ['other'],
        get applicable() {
          return this._applicable;
        },
        set applicable(flag) {},
      };
      const url = '?page=requirement&sample=69&requirement=other';
      const other = { clause: '1.0', state: true, title: 'Other', url };
      requirement.checks = { test: check };
      requirement.check = (c) => ({ test: check })[c] ?? null;
      sampCfg.requirements.test.checks = [{ check: 'test' }];
      sampCfg.checks = {
        test: {
          texts: ['Derived check'],
          observation: 'Test observation',
          sources: ['other'],
        },
      };
      sample.requirement = (r) =>
        ({
          other,
          test: requirement,
        })[r] ?? null;
      await controller.prepare(context);
      expect(view.check)
        .toHaveBeenCalled.once()
        .with(
          'test',
          [[state, 'Derived check']],
          [],
          check.observation ?? 'Test observation',
          [],
          null,
          null,
          null,
          [{ clause: '1.0', status: 'pass', title: 'Other', url }]
        );
    });

    it.with(
      [undefined, 'ogranskad'],
      [true, 'godkänd'],
      [false, 'underkänd']
    )('visar en {1} multipel kontroll', async (state) => {
      const check = {
        observation: false === state ? 'Observation' : null,
        screenshot: {
          path: false === state ? 'screenshot.png' : null,
          alt: false === state ? 'alt text' : null,
        },
        fails: () => false === state,
      };
      requirement.checks = { test: check };
      requirement.check = (c) => ({ test: check })[c] ?? null;
      sampCfg.requirements.test.checks = [{ check: 'test' }];
      sampCfg.checks = {
        test: {
          texts: ['First option', 'Second option'],
          observation: 'Test observation',
        },
      };
      await controller.prepare(context);
      expect(view.check)
        .toHaveBeenCalled.once()
        .with(
          'test',
          [
            [false !== state, 'First option'],
            [false !== state, 'Second option'],
          ],
          [],
          check.observation ?? 'Test observation',
          [],
          check.screenshot.path,
          check.screenshot.alt,
          null,
          null
        );
    });

    it.with(
      [undefined, 'som inte besvarats'],
      [true, 'besvarat med "uppfyllt"'],
      [false, 'besvarat med "inte uppfyllt"']
    )('visar ett manuellt villkor med 1 gren {1}', async (state) => {
      const check = (branch) => ({
        applicable: undefined === state ? state : branch === state,
        observation: false === state ? 'Observation' : null,
        screenshot: {
          path: false === state ? 'screenshot.png' : null,
          alt: false === state ? 'alt text' : null,
        },
        state,
      });
      requirement.checks = { only: check(true) };
      requirement.check = (c) => requirement.checks[c];
      sampCfg.requirements.test.checks = [{ condition: 'test' }];
      sampCfg.conditions = {
        test: {
          precondition: 'Test condition',
          yes: [{ check: 'only' }],
        },
      };
      sampCfg.checks = {
        only: {
          texts: ['Only check'],
          observation: 'Only observation',
        },
      };
      tree._condition.state = state;
      await controller.prepare(context);
      expect(view.condition)
        .toHaveBeenCalled.once()
        .with('test', state, 'Test condition', null);
      expect(view.group)
        .toHaveBeenCalled.once()
        .with('test--yes', true === state, null);
      expect(view.check)
        .toHaveBeenCalled.once()
        .with(
          'only',
          [[state, 'Only check']],
          [],
          false === state ? 'Observation' : 'Only observation',
          [],
          false === state ? 'screenshot.png' : null,
          false === state ? 'alt text' : null,
          view._groups['test--yes'],
          null
        );
    });

    it.with(
      [undefined, 'som inte besvarats'],
      [true, 'besvarat med "ja"'],
      [false, 'besvarat med "nej"']
    )('visar ett manuellt villkor med 2 grenar {1}', async (state) => {
      const check = (branch) => ({
        applicable: undefined === state ? state : branch === state,
        observation: false === state ? 'Observation' : null,
        screenshot: {
          path: false === state ? 'screenshot.png' : null,
          alt: false === state ? 'alt text' : null,
        },
        state,
      });
      requirement.checks = { first: check(true), second: check(false) };
      requirement.check = (c) => requirement.checks[c];
      sampCfg.requirements.test.checks = [{ condition: 'test' }];
      sampCfg.conditions = {
        test: {
          precondition: 'Test condition',
          yes: [{ check: 'first' }],
          no: [{ check: 'second' }],
        },
      };
      sampCfg.checks = {
        first: {
          texts: ['First check'],
          observation: 'First observation',
        },
        second: {
          texts: ['Second check'],
          observation: 'Second observation',
        },
      };
      tree._condition.state = state;
      await controller.prepare(context);
      expect(view.condition)
        .toHaveBeenCalled.once()
        .with('test', state, 'Test condition', null);
      expect(view.group)
        .toHaveBeenCalled.times(2)
        .with(
          ['test--yes', true === state, null],
          ['test--no', false === state, null]
        );
      expect(view.check)
        .toHaveBeenCalled.times(2)
        .with(
          [
            'first',
            [[state, 'First check']],
            [],
            false === state ? 'Observation' : 'First observation',
            [],
            false === state ? 'screenshot.png' : null,
            false === state ? 'alt text' : null,
            view._groups['test--yes'],
            null,
          ],
          [
            'second',
            [[state, 'Second check']],
            [],
            false === state ? 'Observation' : 'Second observation',
            [],
            false === state ? 'screenshot.png' : null,
            false === state ? 'alt text' : null,
            view._groups['test--no'],
            null,
          ]
        );
    });

    it.with(
      [undefined, 'ogranskad'],
      [true, 'godkänd'],
      [false, 'underkänd']
    )('visar ett villkor härlett från en {1} kontroll', async (state) => {
      const check = (branch) => ({
        applicable: undefined === state ? state : branch === state,
        failed: false === state,
        observation: false === state ? 'Observation' : null,
      });
      requirement.checks = {
        first: check(true),
        second: check(false),
        test: check(false),
      };
      requirement.check = (c) => requirement.checks[c];
      sampCfg.requirements.test.checks = [{ condition: 'test' }];
      sampCfg.conditions = {
        test: {
          sources: ['test'],
          yes: [{ check: 'first' }],
          no: [{ check: 'second' }],
        },
      };
      sampCfg.checks = {
        first: {
          texts: ['First check'],
          observation: 'First observation',
        },
        second: {
          texts: ['Second check'],
          observation: 'Second observation',
        },
      };
      tree._condition.state = state;
      await controller.prepare(context);
      expect(view.group)
        .toHaveBeenCalled.times(2)
        .with(
          ['test--yes', true === state, null],
          ['test--no', false === state, null]
        );
    });
  });

  describe('Relaterad information', () => {
    let auditCfg;
    let module;

    beforeEach(() => {
      // Resursladdaren.
      loader = mock({
        configuration: async (p) =>
          ({
            'requirements/webpage': sampCfg,
            'requirements/webpage/test': auditCfg,
          })[p],
        resource: async (p) =>
          ({
            'tools/test.js': 'CODE',
          })[p],
        loadModule: async (p) => module,
      });

      module = {};

      // Skapa en controllerinstans.
      controller = new RequirementController(
        model,
        view,
        loader,
        order,
        tree,
        mock.globals()
      );
    });

    it('visar en bookmarklet', async () => {
      auditCfg = {
        tools: [
          {
            tool: 'bookmarklet',
            file: 'test',
            title: 'Test',
          },
        ],
      };
      await controller.prepare(context);
      expect(view.bookmarklet).toHaveBeenCalled.once().with('Test', 'CODE');
    });

    it('visar verktyg: Inspektör (flik/panel)', async () => {
      auditCfg = {
        tools: [
          {
            tool: 'DevTool',
            tab: 'Elements',
            pane: 'Style',
            properties: ['font-size', 'outline'],
            help: 'Help text',
          },
        ],
      };
      await controller.prepare(context);
      expect(view.devTool)
        .toHaveBeenCalled.once()
        .with(
          'Elements',
          'Style',
          ['font-size', 'outline'],
          undefined,
          'Help text'
        );
    });

    it('visar verktyg: Inspektör (funktion)', async () => {
      auditCfg = {
        tools: [
          {
            tool: 'DevTool',
            function: 'Device',
          },
        ],
      };
      await controller.prepare(context);
      expect(view.devTool)
        .toHaveBeenCalled.once()
        .with(undefined, undefined, [], 'Device', undefined);
    });

    it('visar externt verktygsnamn', async () => {
      auditCfg = {
        tools: [
          {
            tool: 'external',
            text: 'screen reader',
          },
        ],
      };
      await controller.prepare(context);
      expect(view.externalTool).toHaveBeenCalled.once().with('screen reader');
    });

    it('laddar verktygsmodul', async () => {
      const params = { foo: 'bar', controller, model };
      auditCfg = {
        tools: [
          {
            tool: 'module',
            module: 'TestModule',
            params: { foo: 'bar' },
          },
        ],
      };
      await controller.prepare(context);
      expect(view.moduleTool).toHaveBeenCalled.once().with(module, params);
    });

    it('visar verktyg: WAVE (felindikering)', async () => {
      const icon = { src: 'wave-x.png', alt: 'Alt' };
      auditCfg = {
        tools: [
          {
            tool: 'WAVE',
            absent: {
              tab: 'Details',
              section: 'Errors',
              icon: icon,
              text: 'Bad',
            },
          },
        ],
      };
      await controller.prepare(context);
      expect(view.createWAVE).toHaveBeenCalled.once();
      expect(view._wave.absent)
        .toHaveBeenCalled.once()
        .with('Details', 'Errors', ['Bad'], icon);
    });

    it('visar verktyg: WAVE (godkänt)', async () => {
      const icon = { src: 'wave-x.png', alt: 'Alt' };
      auditCfg = {
        tools: [
          {
            tool: 'WAVE',
            present: {
              tab: 'Details',
              section: 'Features',
              icon: icon,
              texts: ['Good', 'Also good'],
            },
          },
        ],
      };
      await controller.prepare(context);
      expect(view.createWAVE).toHaveBeenCalled.once();
      expect(view._wave.present)
        .toHaveBeenCalled.once()
        .with('Details', 'Features', ['Good', 'Also good'], icon);
    });

    it('visar verktyg: WAVE (flik)', async () => {
      const icon = { src: 'wave-x.png', alt: 'Alt' };
      auditCfg = {
        tools: [
          {
            tool: 'WAVE',
            tab: 'Structure',
          },
        ],
      };
      await controller.prepare(context);
      expect(view.createWAVE).toHaveBeenCalled.once();
      expect(view._wave.tab).toHaveBeenCalled.once().with('Structure');
    });

    it('visar verktyg: WebDeveloper', async () => {
      auditCfg = {
        tools: [
          {
            tool: 'WebDeveloper',
            tab: 'Tools',
            function: 'Validate Local HTML',
          },
        ],
      };
      await controller.prepare(context);
      expect(view.webDeveloper)
        .toHaveBeenCalled.once()
        .with('Tools', 'Validate Local HTML');
    });

    it('visar relaterade länkar', async () => {
      const links = [
        { url: 'https://digg.se', title: 'DIGG' },
        { url: 'https://example.com', title: 'Example' },
      ];
      auditCfg = { links };
      await controller.prepare(context);
      expect(view.link)
        .toHaveBeenCalled.times(2)
        .with([links[0].url, links[0].title], [links[1].url, links[1].title]);
    });

    it('visar detaljinfo: åtgärd', async () => {
      auditCfg = {
        info: [
          {
            type: 'action',
            text: 'Test',
          },
        ],
      };
      await controller.prepare(context);
      expect(view.action).toHaveBeenCalled.once().with('Test');
    });

    it('visar detaljinfo: definition', async () => {
      const description = 'test description';
      const term = 'test';
      auditCfg = {
        info: [
          {
            type: 'definition',
            term,
            description,
          },
        ],
      };
      await controller.prepare(context);
      expect(view.definition).toHaveBeenCalled.once().with(term, description);
    });

    it('visar detaljinfo: utfällbart avsnitt', async () => {
      auditCfg = {
        info: [
          {
            type: 'details',
            summary: 'summary',
            content: [{ type: 'text', text: 'test' }],
          },
        ],
      };
      await controller.prepare(context);
      expect(view.createDetails).toHaveBeenCalled.once().with('summary');
      expect(view._details.text).toHaveBeenCalled.once().with('test');
    });

    it('visar detaljinfo: figur', async () => {
      auditCfg = {
        info: [
          {
            type: 'figure',
            caption: 'Test caption',
            content: [{ type: 'image', path: 'test.png', alt: 'Test' }],
          },
        ],
      };
      await controller.prepare(context);
      expect(view.createFigure).toHaveBeenCalled.once();
      expect(view._figure.image)
        .toHaveBeenCalled.once()
        .with('test.png', 'Test');
      expect(view._figure.caption).toHaveBeenCalled.once().with('Test caption');
    });

    it('visar detaljinfo: bild', async () => {
      auditCfg = {
        info: [
          {
            type: 'image',
            path: 'test.png',
            alt: 'Test',
          },
        ],
      };
      await controller.prepare(context);
      expect(view.image).toHaveBeenCalled.once().with('test.png', 'Test');
    });

    it('visar detaljinfo: notera', async () => {
      auditCfg = {
        info: [
          {
            type: 'note',
            text: 'Test',
          },
        ],
      };
      await controller.prepare(context);
      expect(view.note).toHaveBeenCalled.once().with('Test');
    });

    it('visar detaljinfo: numrerad lista', async () => {
      const items = ['First', 'Second'];
      auditCfg = {
        info: [
          {
            type: 'olist',
            items,
          },
        ],
      };
      await controller.prepare(context);
      expect(view.oList).toHaveBeenCalled.once().with(items);
    });

    it('visar detaljinfo: tabell', async () => {
      const headers = ['First', 'Second'];
      const rows = [
        ['A1', 'B1'],
        ['A2', 'B2'],
      ];
      auditCfg = {
        info: [
          {
            type: 'table',
            headers,
            rows,
          },
        ],
      };
      await controller.prepare(context);
      expect(view.table).toHaveBeenCalled.once().with(headers, rows);
    });

    it('visar detaljinfo: textstycke', async () => {
      auditCfg = {
        info: [
          {
            type: 'text',
            text: 'Test',
          },
        ],
      };
      await controller.prepare(context);
      expect(view.text).toHaveBeenCalled.once().with('Test');
    });

    it('visar detaljinfo: tips', async () => {
      auditCfg = {
        info: [
          {
            type: 'tip',
            text: 'Test',
          },
        ],
      };
      await controller.prepare(context);
      expect(view.tip).toHaveBeenCalled.once().with('Test');
    });

    it('visar detaljinfo: punktlista', async () => {
      const items = ['First', 'Second'];
      auditCfg = {
        info: [
          {
            type: 'ulist',
            items,
          },
        ],
      };
      await controller.prepare(context);
      expect(view.uList).toHaveBeenCalled.once().with(items);
    });

    it('visar detaljinfo: varning', async () => {
      auditCfg = {
        info: [
          {
            type: 'warning',
            text: 'Test',
          },
        ],
      };
      await controller.prepare(context);
      expect(view.warning).toHaveBeenCalled.once().with('Test');
    });

    it('visar tillämpningsanvisning', async () => {
      auditCfg = {
        instruction: { id: 'test', title: 'Test' },
      };
      await controller.prepare(context);
      expect(view.instruction).toHaveBeenCalled.once().with('test', 'Test');
    });

    it('visar kravreferens', async () => {
      auditCfg = {};
      requirement.clause = '9.1.2.3';
      await controller.prepare(context);
      expect(view.reference).toHaveBeenCalled.once().with('9.1.2.3');
    });

    it('visar extern anteckning', async () => {
      auditCfg = {};
      requirement.externalNote = 'Test';
      await controller.prepare(context);
      expect(view.externalNote).toBe('Test');
    });

    it('döljer extern anteckning för pseudokrav', async () => {
      sampCfg.requirements.test.pseudo = true;
      await controller.prepare(context);
      expect(view.removeExternalNote).toHaveBeenCalled.once();
    });

    it('visar intern anteckning', async () => {
      requirement.internalNote = 'Test';
      await controller.prepare(context);
      expect(view.internalNote).toBe('Test');
    });
  });
});

describe('Hantera interaktion', () => {
  let requirement;
  let sampCfg;
  let sample;

  beforeEach(() => {
    // Krav.
    requirement = () => {
      const req = {
        externalNote: '',
        id: 'test',
        internalNote: '',
        title: 'Test requirement',
        _checks: {},
        check: (i) => req._checks[i],
        setCheck: (c) => (req._checks[c.id] = c),
        get hasChecks() {
          return Object.keys(req._checks).length > 0;
        },
      };
      return req;
    };

    // Stickprov.
    sample = model._sample = {
      auditID: 42,
      id: 69,
      name: 'Test',
      type: 'webpage',
      _done: 0,
      _reqs: { test: requirement() },
      contains: (...t) => t.includes('test'),
      progress: () => [sample._done, 42],
      requirement: (i) => sample._reqs[i],
      setRequirement: (r) => (sample._reqs[r.id] = r),
    };
    model._requirement = sample._reqs.test;

    // Granskning.
    model._audit = {
      caseID: 13,
      id: 42,
      observations: () => [],
      started: new Date('2020-09-23'),
      setSample: () => {},
    };

    // Stickprovskonfiguration.
    sampCfg = {
      sections: [{ title: 'Test', requirements: ['test'] }],
      requirements: {
        test: {
          title: requirement.title,
          checks: [{ check: 'first' }, { condition: 'cond' }],
        },
      },
      conditions: {
        cond: {
          precondition: 'Test',
          yes: [{ check: 'yes' }],
          no: [{ check: 'no' }],
        },
      },
      checks: {
        first: { texts: ['First'], observation: 'First' },
        yes: { texts: ['Yes'], observation: 'Yes' },
        no: { texts: ['No'], observation: 'No' },
      },
    };

    // Resursladdaren.
    loader = mock({ configuration: async () => sampCfg });

    // Applikationskontexten.
    context = mock.appContext({
      requirement: 'test',
      sample: 69,
    });

    // Skapa en controllerinstans.
    controller = new RequirementController(
      model,
      view,
      loader,
      order,
      tree,
      mock.globals()
    );
  });

  it('populerar ett tomt krav med kontroller', async () => {
    await controller.prepare(context);
    expect(Object.keys(sample._reqs.test._checks).length).toBe(3);
  });

  it.with(
    ['externalNote', 'extern anteckning'],
    ['internalNote', 'intern anteckning']
  )('uppdaterar kravet vid ändring av {1}', async (target) => {
    const value = 'Test note';
    await controller.prepare(context);
    view.notify({ target, type: 'change', value });
    view.notify({ action: 'next', path: '?page=other', type: 'form' });
    await controller.handle(context);
    expect(model._saved).not.toBe(null);
    expect(model._saved[target]).toBe(value);
  });

  it('sparar inte krav som inte ändrats', async () => {
    await controller.prepare(context);
    view.notify({ action: 'next', path: '?page=other', type: 'form' });
    await controller.handle(context);
    expect(model._saved).toBe(null);
  });

  it.with(['pass', false, 'godkänner'], ['fail', true, 'underkänner'])(
    '{2} en enkel kontroll',
    async (value, failed) => {
      const change = (target, value) => ({ target, value, type: 'change' });
      const events = [change('first.check', value)];
      failed && events.push(change('first.obs', 'Wrong'));
      failed && events.push(change('first.path', 'screenshot.png'));
      failed && events.push(change('first.alt', 'alt text'));
      await controller.prepare(context);
      view.notify(...events);
      view.notify({ action: 'next', path: '?page=other', type: 'form' });
      await controller.handle(context);
      const check = model._saved._checks.first;
      expect(check.failed).toBe(failed);
      failed && expect(check.observation).toBe('Wrong');
      failed && expect(check.screenshot.path).toBe('screenshot.png');
      failed && expect(check.screenshot.alt).toBe('alt text');
    }
  );

  it.with(['pass', false, 'godkänner'], ['fail', true, 'underkänner'])(
    '{2} en multipel kontroll',
    async (value, failed) => {
      sampCfg.checks.first.texts = ['First', 'Second'];
      const change = (target, value) => ({ target, value, type: 'change' });
      const events = [
        change('first[0].check', value),
        change('first[1].check', value),
      ];
      failed && events.push(change('first.obs', 'Wrong'));
      failed && events.push(change('first.path', 'screenshot.png'));
      failed && events.push(change('first.alt', 'alt text'));
      await controller.prepare(context);
      view.notify(...events);
      view.notify({ action: 'next', path: '?page=other', type: 'form' });
      await controller.handle(context);
      const check = model._saved._checks.first;
      expect(check.failed).toBe(failed);
      failed && expect(check.observation).toBe('Wrong');
      failed && expect(check.screenshot.path).toBe('screenshot.png');
      failed && expect(check.screenshot.alt).toBe('alt text');
    }
  );

  it('visar/döljer villkorliga kontroller', async () => {
    await controller.prepare(context);
    view.notify({ target: 'cond.cond', type: 'change', value: 'no' });
    view.notify({ action: 'next', path: '?page=other', type: 'form' });
    await controller.handle(context);
    expect(view.showGroup)
      .toHaveBeenCalled.times(2)
      .with(['cond--yes', false], ['cond--no', true]);
    const checks = model._saved._checks;
    expect(tree._condition.state).toBe(false);
  });

  it.with([true, 'godkänner'], [false, 'underkänner'])(
    '{1} en kontroll via externt gränssnitt',
    async (state) => {
      await controller.prepare(context);
      controller.setCheck('first', state);
      view.notify({ action: 'next', path: '?page=other', type: 'form' });
      await controller.handle(context);
      expect(view.setCheck).toHaveBeenCalled.once().with('first', state);
      expect(view.showFail).toHaveBeenCalled.once().with('first', !state);
      const check = model._saved._checks.first;
      expect(check.state).toBe(state);
    }
  );

  it.with(
    ['prev', 'till föregående krav'],
    ['up', 'till stickprovet'],
    ['next', 'till nästa krav'],
    ['skip', 'till nästa ogranskade krav']
  )('sparar granskat krav vid navigering {1}', async (action) => {
    const change = (target, value) => ({ target, value, type: 'change' });
    const events = [
      change('first.check', 'fail'),
      change('first.obs', 'Wrong'),
      change('cond.cond', 'no'),
      change('no.check', 'pass'),
      change('externalNote', 'Note'),
    ];
    await controller.prepare(context);
    view.notify(...events);
    view.notify({ action, path: '?page=other', type: 'form' });
    await controller.handle(context);
    const checks = model._saved._checks;
    expect(checks.first.failed).toBe(true);
    expect(checks.first.observation).toBe('Wrong');
    expect(tree._condition.state).toBe(false);
    expect(model._saved.externalNote).toBe('Note');
    //2022-11-10: expect(context.status).not.toBe("");
  });
});

// Importera beroenden.
import { RequirementController } from '../../js/controller/RequirementController.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

/**
 * Enhetstestfall för påpekande-/föreläggandevyn.
 *
 * @license CC-BY 4.0
 * @see ProtocolView
 */

let config;
let content;
let doc;
let filesystem;
let globals;
let loader;
let model;
let view;

const makeSample = (id, obj) => {
  const sample = SampleFactory.build({ id: 42 }, obj);
  sample.id = id;
  for (const req of obj._requirements) {
    sample.setRequirement({
      clause: req.clause,
      failed: req.failed,
      id: req.id,
      matchCategory: () => true,
      matchContentType: () => true,
      matchFormat: () => true,
      matchMode: () => true,
      matchPlatform: () => true,
    });
  }
  return sample;
};

// Skapa förutsättninganra för varje test.
beforeEach(() => {
  // Fillagring.
  filesystem = mock({ saveToHTMLFile: async () => {} });

  // Modellobjektet.
  const entry = (ts, type, text) => ({
    data: 1601510400000,
    summary: text,
    timestamp: new Date(ts),
    type,
  });
  const log = [
    entry('2020-09-24', 'open case', 'Ärendet öppnat'),
    entry('2020-09-24', 'notification', 'Avisering om granskning'),
    entry('2020-10-01', 'audit start', 'Granskning inledd'),
    entry('2020-10-07', 'note', 'Anteckning'),
    entry('2020-10-15', 'audit finish', 'Granskning avslutad'),
    entry('2020-10-16', 'remarks', 'Påpekande'),
  ];

  model = {
    _audit: {
      finished: new Date('2020-10-15'),
      id: 42,
      officer: {
        name: 'Greta Granskare',
        toString: () => model._audit.officer.name,
      },
      started: new Date('2020-10-01'),
      _components: [],
      _samples: {},
      count: (c) => (model._audit._samples[c] ?? []).length,
      countDone: () => 0,
      failures: () => ({}),
      getSample: () => null,
      *samples(cat) {
        for (const sample of model._audit._samples[cat] ?? []) {
          yield sample;
        }
      },
    },
    _case: {
      caseNumber: { toString: () => '2020-1234' },
      logSize: log.length,
      organization: {
        abbreviation: 'DIGG',
        name: 'Myndigheten för digital förvaltning',
        registrationNumber: '202100-6883',
      },
      schedule: { date: new Date('2020-09-23') },
      service: {},
      *log() {
        for (const entry of log) {
          yield entry;
        }
      },
    },
    _template: 'TEMPLATE',
  };

  // Mallsidans innehåll.
  const cell = () => {
    const cell = {
      children: [],
      textContent: '',
      appendChild: (c) => (cell.children.push(c), c),
    };
    return cell;
  };
  const row = () => {
    const row = {
      cells: [],
      insertCell: () => {
        const c = cell();
        row.cells.push(c);
        return c;
      },
    };
    return row;
  };

  content = {
    a11y: mock(
      {
        abbrDOS: mock({ remove: () => {} }),
        abbrOrdinance: mock({ remove: () => {} }),
        dfnDOS: mock({ remove: () => {} }),
        dfnOrdinance: mock({ remove: () => {} }),
      },
      {
        querySelectorAll: (s) =>
          ({
            '.abbr.dos': [content.a11y.abbrDOS],
            '.abbr.ord': [content.a11y.abbrOrdinance],
            '.dfn.dos': [content.a11y.dfnDOS],
            '.dfn.ord': [content.a11y.dfnOrdinance],
          })[s] ?? [],
        remove: () => {},
      }
    ),
    caseInfo: { children: [{}, { children: [{}] }, {}, {}, {}, {}] },
    compliance: mock({ remove: () => {} }),
    deadline: {
      textContent: '',
      _datetime: '',
      setAttribute: (n, v) => (content.deadline._datetime = v),
    },
    fails: mock.element('ul'),
    log: {
      rows: [],
      insertRow: () => {
        const r = row();
        content.log.rows.push(r);
        return r;
      },
    },
    noStatement: mock({ remove: () => {} }),
    psb: {
      abbr: { textContent: '' },
      name: { textContent: '' },
      psb: { textContent: '' },
      regNo: { textContent: '' },
      service: { textContent: '' },
      url: { href: '#', textContent: '' },
    },
    sampleInfo: {
      innerHTML:
        'DIGG har inom sitt tillsynsuppdrag genomfört en granskning av %service%. I granskningen konstaterades att %samples% brister i tillgänglighet, då %pronoun% utifrån <cite>DOS-lagen</cite> inte är %requirements%.',
    },
    summary: {
      dd: [{ children: [{}] }, { children: [{}] }, {}, {}],
      querySelectorAll: () => content.summary.dd,
    },
  };

  // Det skapade dokumentet.
  const element = () => ({ appendChild: (c) => c });

  const elements = (n) => {
    const e = [];
    for (let i = 0; i < n; ++i) {
      e.push(element());
    }
    return e;
  };

  const makeTag = (tag) => {
    const e = element();
    e.attrs = [];
    e.tagName = tag;
    e.setAttribute = (n, v) => (e.attrs[n] = v);
    return e;
  };

  doc = mock(
    {
      documentElement: {},
      firstChild: {},
      implementation: mock({
        createDocumentType: () => doc._docType,
        createHTMLDocument: () => doc,
      }),
      title: 'Påpekande',
    },
    {
      createElement: (t) => makeTag(t),
      createElementNS: (n, t) => makeTag(t),
      createTextNode: () => ({}),
      getElementById: (id) =>
        ({
          fails: content.fails,
          'item-a11y': content.a11y,
          'item-no-stmt': content.noStatement,
          'item-stmt-compliance': content.compliance,
          log: content.log,
          'sample-info': content.sampleInfo,
          'sample-summary': content.summary,
        })[id] ?? null,
      insertBefore: (n, c) => n,
      querySelector: (s) =>
        ({
          'main > dl:first-of-type': content.caseInfo,
        })[s] ?? null,
      querySelectorAll: (s) =>
        ({
          '.deadline': [content.deadline],
          '.psb': [content.psb.psb],
          '.psb-abbr': [content.psb.abbr],
          '.psb-name': [content.psb.name],
          '.reg-no': [content.psb.regNo],
          '.service': [content.psb.service],
          '.url': [content.psb.url],
        })[s] ?? [],
    }
  );

  globals = {
    document: doc,
    window: mock(
      {
        document: doc,
      },
      {
        open: () => globals.window,
      }
    ),
  };
});

describe('Påpekande/föreläggande för webbplats', () => {
  // Skapa förutsättnginarna för varje test.
  beforeEach(() => {
    // Dokumentkonfiguration.
    config = {
      '9.1.1.1': 'Images in webpages must have text equivalents.',
      '9.4.1.3': 'Status messages must be identifiable as such.',
      '10.1.1.1': 'Images in documents must have text equivalents.',
      '13 § SFFS2018:1937': 'There must be an a11y statement.',
      'MDFFS2019:2 6 §': 'Statement must contain required info.',
    };

    // Resursladdare.
    loader = mock({
      configuration: async (p) =>
        ({
          'remarks/website': config,
        })[p],
      pageTemplate: async () => model._template,
    });

    // Modellinnehåll.
    const samples = {};
    samples.component = makeSample(1, {
      class: 'Component',
      name: 'header',
      _requirements: [{ clause: '9.1.1.1', failed: true, id: 'alt' }],
    });
    samples.start = makeSample(2, {
      class: 'Webpage',
      components: ['header'],
      name: 'Start page',
      url: 'https://www.digg.se',
      _requirements: [
        { clause: '9.1.1.1', failed: true, id: 'alt' },
        { clause: '9.4.1.3', failed: true, id: 'status-messages' },
      ],
    });
    samples.special = makeSample(3, {
      class: 'NonWebDocument',
      name: 'Document',
      _requirements: [{ clause: '10.1.1.1', failed: false, id: 'alt' }],
    });
    samples.statement = makeSample(4, {
      class: 'Webpage',
      components: ['header'],
      name: 'A11y statement',
      _requirements: [
        {
          clause: 'MDFFS2019:2 6 §',
          failed: true,
          id: 'a11y-statement',
        },
      ],
    });

    model._case.service = new Website({ name: 'digg.se' });
    const audit = model._audit;
    audit._components = [samples.component];
    audit._samples = {
      start: [samples.start],
      special: [samples.special],
      statement: [samples.statement],
    };
    audit.countDone = (...c) =>
      ({
        NonWebDocument: 1,
        Webpage: 1,
      })[c[0].name] ?? 0;
    (audit.failures = () => ({
      '9.1.1.1': 2,
      '9.4.1.3': 1,
      '10.1.1.1': 1,
      'MDFFS2019:2 6 §': 1,
    })),
      (audit.getSample = (n) => ({ header: samples.component })[n]);
    audit.injunctions = [[new Date('2020-11-16'), new Date('2020-12-16')]];
    audit.remarks = [[new Date('2020-10-15'), new Date('2020-11-15')]];

    // Skapa en vyinstans.
    view = new RemarksView(model, filesystem, loader, globals);
  });

  it('öppnar ett påpekande för en webbplats i en ny vy', async () => {
    const created = new Date('2020-10-15');
    await view.open(model._case, model._audit, created, 'remarks');

    expect(loader.pageTemplate).toHaveBeenCalled.once().with('remarks-website');

    expect(globals.window.open).toHaveBeenCalled.once().with('', '_blank');

    expect(doc.insertBefore)
      .toHaveBeenCalled.once()
      .with(doc._docType, doc.firstChild);

    expect(doc.documentElement.lang).toBe('sv');
    expect(doc.documentElement.innerHTML).toBe(model._template);
  });

  it('sparar ett påpekande för en webbplats som fil', async () => {
    const created = new Date('2020-10-15');
    await view.save(model._case, model._audit, created, 'remarks');

    expect(loader.pageTemplate).toHaveBeenCalled.once().with('remarks-website');

    expect(
      globals.document.implementation.createHTMLDocument
    ).toHaveBeenCalled.once();

    expect(filesystem.saveToHTMLFile).toHaveBeenCalled.once();
  });

  it('öppnar ett föreläggande för en webbplats i en ny vy', async () => {
    const created = new Date('2020-11-16');
    await view.open(model._case, model._audit, created, 'injunction');

    expect(loader.pageTemplate)
      .toHaveBeenCalled.once()
      .with('injunction-website');

    expect(globals.window.open).toHaveBeenCalled.once().with('', '_blank');

    expect(doc.insertBefore)
      .toHaveBeenCalled.once()
      .with(doc._docType, doc.firstChild);

    expect(doc.documentElement.lang).toBe('sv');
    expect(doc.documentElement.innerHTML).toBe(model._template);
  });

  it('sparar ett föreläggande för en webbplats som fil', async () => {
    const created = new Date('2020-11-16');
    await view.save(model._case, model._audit, created, 'injunction');

    expect(loader.pageTemplate)
      .toHaveBeenCalled.once()
      .with('injunction-website');

    expect(
      globals.document.implementation.createHTMLDocument
    ).toHaveBeenCalled.once();

    expect(filesystem.saveToHTMLFile).toHaveBeenCalled.once();
  });

  it('populerar ärendeinformationen (webbplats)', async () => {
    const c = content.caseInfo.children;
    const caseNo = model._case.caseNumber.toString();
    const created = new Date('2020-10-15');
    const name = model._case.organization.name;
    const regNo = model._case.organization.registrationNumber;
    await view.open(model._case, model._audit, created, 'remarks');
    expect(c[1].children[0].textContent).toBe('den 15 oktober 2020');
    expect(c[3].textContent).toBe(caseNo);
    expect(c[5].textContent).toBe(`${name} (org.nr: ${regNo})`);
  });

  it('populerar formaliedelen (webbplats, redogörelse saknas)', async () => {
    const created = new Date('2020-10-15');
    model._audit._samples.statement = [];
    await view.open(model._case, model._audit, created, 'remarks');
    expect(content.noStatement.remove).toHaveBeenCalled.never();
    expect(content.compliance.remove).toHaveBeenCalled.once();
    expect(content.a11y.dfnDOS.remove).toHaveBeenCalled.once();
    expect(content.a11y.abbrDOS.remove).toHaveBeenCalled.never();
    expect(content.a11y.abbrOrdinance.remove).toHaveBeenCalled.once();
    expect(content.a11y.dfnOrdinance.remove).toHaveBeenCalled.never();
  });

  it('populerar formaliedelen (webbplats, redogörelse bristfällig)', async () => {
    const created = new Date('2020-10-15');
    await view.open(model._case, model._audit, created, 'remarks');
    expect(content.noStatement.remove).toHaveBeenCalled.once();
    expect(content.compliance.remove).toHaveBeenCalled.never();
    expect(content.a11y.dfnDOS.remove).toHaveBeenCalled.once();
    expect(content.a11y.abbrDOS.remove).toHaveBeenCalled.never();
    expect(content.a11y.abbrOrdinance.remove).toHaveBeenCalled.never();
    expect(content.a11y.dfnOrdinance.remove).toHaveBeenCalled.once();
  });

  it('populerar formaliedelen (webbplats, redogörelse OK)', async () => {
    const created = new Date('2020-10-15');
    const stmt = model._audit._samples.statement[0];
    stmt.requirement('a11y-statement').failed = false;
    await view.open(model._case, model._audit, created, 'remarks');
    expect(content.noStatement.remove).toHaveBeenCalled.once();
    expect(content.compliance.remove).toHaveBeenCalled.once();
    expect(content.a11y.dfnDOS.remove).toHaveBeenCalled.never();
    expect(content.a11y.abbrDOS.remove).toHaveBeenCalled.once();
    expect(content.a11y.abbrOrdinance.remove).toHaveBeenCalled.once();
    expect(content.a11y.dfnOrdinance.remove).toHaveBeenCalled.never();
  });

  it('populerar formaliedelen (webbplats, inga brister)', async () => {
    const audit = model._audit;
    const created = new Date('2020-10-15');
    audit.failures = () => ({});
    await view.open(model._case, model._audit, created, 'remarks');
    expect(content.noStatement.remove).toHaveBeenCalled.once();
    expect(content.compliance.remove).toHaveBeenCalled.never();
    expect(content.a11y.remove).toHaveBeenCalled.once();
  });

  it('populerar detaljavsnittet (webbplats)', async () => {
    const aCase = model._case;
    const audit = model._audit;
    const created = new Date('2020-10-15');
    const org = aCase.organization;
    await view.open(model._case, model._audit, created, 'remarks');
    expect(content.deadline._datetime).toEqual('2020-11-15');
    expect(content.deadline.textContent).toEqual('den 15 november 2020');
    expect(content.psb.psb.textContent).toBe(org.abbreviation);
    expect(content.psb.abbr.textContent).toBe(`(${org.abbreviation})`);
    expect(content.psb.name.textContent).toBe(org.name + 's');
    expect(content.psb.regNo.textContent).toBe(org.registrationNumber);
    expect(content.psb.url.href).toBe(audit._samples.start[0].url);
    expect(content.psb.url.textContent).toBe(aCase.service.name);
  });

  it('populerar åtgärdslistan (webbplats)', async () => {
    const created = new Date('2020-10-15');
    const li = content.fails.children;
    await view.open(model._case, model._audit, created, 'remarks');
    expect(li.length).toBe(4);
    expect(li[0].textContent).toBe(config['MDFFS2019:2 6 §']);
    expect(li[1].textContent).toBe(config['9.1.1.1']);
    expect(li[2].textContent).toBe(config['9.4.1.3']);
    expect(li[3].textContent).toBe(config['10.1.1.1']);
  });

  it('populerar bakgrundsinformationen (webbplats)', async () => {
    const created = new Date('2020-10-15');
    const info =
      'DIGG har inom sitt tillsynsuppdrag genomfört en granskning av digg.se. I granskningen konstaterades att de granskade webbsidorna och dokumentet brister i tillgänglighet, då de utifrån <cite>DOS-lagen</cite> inte är möjliga att uppfatta, hanterbara, begripliga och robusta.';
    await view.open(model._case, model._audit, created, 'remarks');
    expect(content.sampleInfo.innerHTML).toBe(info);
  });

  it('populerar granskningssammanfattningen (webbplats)', async () => {
    const audit = model._audit;
    const created = new Date('2020-10-15');
    const dd = content.summary.dd;
    await view.open(model._case, model._audit, created, 'remarks');
    expect(dd[0].children[0].textContent).toBe('den 1 oktober 2020');
    expect(dd[1].children[0].textContent).toBe('den 15 oktober 2020');
    expect(dd[2].textContent).toBe('0');
    expect(dd[3].textContent).toBe('1');
  });

  it('populerar ärendehistoriken (webbplats)', async () => {
    const cell = (r, c) => content.log.rows[r].cells[c];
    const created = new Date('2020-10-15');
    await view.open(model._case, model._audit, created, 'remarks');
    expect(content.log.rows.length).toBe(5);
    expect(cell(0, 0).children[0].textContent).toBe('Den 24 september 2020');
    expect(cell(0, 1).textContent).toBe('Ärendet öppnat');
    expect(cell(1, 0).children[0].textContent).toBe('Den 24 september 2020');
    expect(cell(1, 1).textContent).toBe('Avisering om granskning');
    expect(cell(2, 0).children[0].textContent).toBe('Den 1 oktober 2020');
    expect(cell(2, 1).textContent).toBe('Granskning inledd');
    expect(cell(3, 0).children[0].textContent).toBe('Den 15 oktober 2020');
    expect(cell(3, 1).textContent).toBe('Granskning avslutad');
    expect(cell(4, 0).children[0].textContent).toBe('Den 16 oktober 2020');
    expect(cell(4, 1).textContent).toBe('Påpekande');
  });
});

describe('Påpekande/föreläggande för mobil applikation', () => {
  // Skapa förutsättnginarna för varje test.
  beforeEach(() => {
    // Dokumentkonfiguration.
    config = {
      '11.1.1.1': 'Images in apps must have text equivalents.',
      '11.4.1.3': 'Status messages must be identifiable as such.',
      'SFS2018:1937 13 §': 'There must be an a11y statement.',
    };

    // Resursladdare.
    loader = mock({
      configuration: async (p) =>
        ({
          'remarks/app': config,
        })[p],
      pageTemplate: async () => model._template,
    });

    // Modellinnehåll.
    const samples = {};
    samples.component = makeSample(1, {
      class: 'Component',
      name: 'tabs',
      _requirements: [{ clause: '11.1.1.1', failed: true, id: 'alt' }],
    });
    samples.start = makeSample(2, {
      class: 'AppScreen',
      components: ['tabs'],
      name: 'Start screen',
      _requirements: [
        { clause: '11.1.1.1', failed: true, id: 'alt' },
        { clause: '11.4.1.3', failed: true, id: 'status-messages' },
      ],
    });
    samples.statement = makeSample(3, {
      class: 'Webpage',
      components: [],
      name: 'A11y statement',
      _requirements: [
        {
          clause: 'MDFFS2019:2 6 §',
          failed: true,
          id: 'a11y-statement',
        },
      ],
    });

    model._case.service = new MobileApp({
      os: 'Android',
      name: 'Test',
      version: '3.14',
    });
    const audit = model._audit;
    audit.version = '3.14';
    audit._components = [samples.component];
    audit._samples = {
      start: [samples.start],
      statement: [samples.statement],
    };
    audit.countDone = (...c) =>
      ({
        AppScreen: 1,
        NonWebDocument: 0,
        Webpage: 0,
      })[c[0].name];
    (audit.failures = () => ({
      '11.1.1.1': 1,
      '11.4.1.3': 1,
      'SFS2018:1937 13 §': 1,
    })),
      (audit.getSample = (n) => ({ tabs: samples.component })[n]);
    audit.injunctions = [[new Date('2020-11-16'), new Date('2020-12-16')]];
    audit.remarks = [[new Date('2020-10-15'), new Date('2020-11-15')]];

    // Skapa en vyinstans.
    view = new RemarksView(model, filesystem, loader, globals);
  });

  it('öppnar ett påpekande för en mobil applikation i en ny vy', async () => {
    const created = new Date('2020-10-15');
    await view.open(model._case, model._audit, created, 'remarks');

    expect(loader.pageTemplate).toHaveBeenCalled.once().with('remarks-app');

    expect(globals.window.open).toHaveBeenCalled.once().with('', '_blank');

    expect(doc.insertBefore)
      .toHaveBeenCalled.once()
      .with(doc._docType, doc.firstChild);

    expect(doc.documentElement.lang).toBe('sv');
    expect(doc.documentElement.innerHTML).toBe(model._template);
  });

  it('sparar ett påpekande för en mobil applikation som fil', async () => {
    const created = new Date('2020-10-15');
    await view.save(model._case, model._audit, created, 'remarks');

    expect(loader.pageTemplate).toHaveBeenCalled.once().with('remarks-app');

    expect(
      globals.document.implementation.createHTMLDocument
    ).toHaveBeenCalled.once();

    expect(filesystem.saveToHTMLFile).toHaveBeenCalled.once();
  });

  it('öppnar ett föreläggande för en mobil applikation i en ny vy', async () => {
    const created = new Date('2020-11-16');
    await view.open(model._case, model._audit, created, 'injunction');

    expect(loader.pageTemplate).toHaveBeenCalled.once().with('injunction-app');

    expect(globals.window.open).toHaveBeenCalled.once().with('', '_blank');

    expect(doc.insertBefore)
      .toHaveBeenCalled.once()
      .with(doc._docType, doc.firstChild);

    expect(doc.documentElement.lang).toBe('sv');
    expect(doc.documentElement.innerHTML).toBe(model._template);
  });

  it('sparar ett föreläggande för en mobil applikation som fil', async () => {
    const created = new Date('2020-11-16');
    await view.save(model._case, model._audit, created, 'injunction');

    expect(loader.pageTemplate).toHaveBeenCalled.once().with('injunction-app');

    expect(
      globals.document.implementation.createHTMLDocument
    ).toHaveBeenCalled.once();

    expect(filesystem.saveToHTMLFile).toHaveBeenCalled.once();
  });

  it('populerar ärendeinformationen (mobil applikation)', async () => {
    const c = content.caseInfo.children;
    const caseNo = model._case.caseNumber.toString();
    const created = new Date('2020-10-15');
    const name = model._case.organization.name;
    const regNo = model._case.organization.registrationNumber;
    await view.open(model._case, model._audit, created, 'remarks');
    expect(c[1].children[0].textContent).toBe('den 15 oktober 2020');
    expect(c[3].textContent).toBe(caseNo);
    expect(c[5].textContent).toBe(`${name} (org.nr: ${regNo})`);
  });

  it('populerar formaliedelen (mobil applikation, redogörelse saknas)', async () => {
    const created = new Date('2020-10-15');
    model._audit._samples.statement = [];
    await view.open(model._case, model._audit, created, 'remarks');
    expect(content.noStatement.remove).toHaveBeenCalled.never();
    expect(content.compliance.remove).toHaveBeenCalled.once();
    expect(content.a11y.dfnDOS.remove).toHaveBeenCalled.once();
    expect(content.a11y.abbrDOS.remove).toHaveBeenCalled.never();
    expect(content.a11y.abbrOrdinance.remove).toHaveBeenCalled.once();
    expect(content.a11y.dfnOrdinance.remove).toHaveBeenCalled.never();
  });

  it('populerar formaliedelen (mobil applikation, redogörelse bristfällig)', async () => {
    const created = new Date('2020-10-15');
    await view.open(model._case, model._audit, created, 'remarks');
    expect(content.noStatement.remove).toHaveBeenCalled.once();
    expect(content.compliance.remove).toHaveBeenCalled.never();
    expect(content.a11y.dfnDOS.remove).toHaveBeenCalled.once();
    expect(content.a11y.abbrDOS.remove).toHaveBeenCalled.never();
    expect(content.a11y.abbrOrdinance.remove).toHaveBeenCalled.never();
    expect(content.a11y.dfnOrdinance.remove).toHaveBeenCalled.once();
  });

  it('populerar formaliedelen (mobil applikation, redogörelse OK)', async () => {
    const created = new Date('2020-10-15');
    const stmt = model._audit._samples.statement[0];
    stmt.requirement('a11y-statement').failed = false;
    await view.open(model._case, model._audit, created, 'remarks');
    expect(content.noStatement.remove).toHaveBeenCalled.once();
    expect(content.compliance.remove).toHaveBeenCalled.once();
    expect(content.a11y.dfnDOS.remove).toHaveBeenCalled.never();
    expect(content.a11y.abbrDOS.remove).toHaveBeenCalled.once();
    expect(content.a11y.abbrOrdinance.remove).toHaveBeenCalled.once();
    expect(content.a11y.dfnOrdinance.remove).toHaveBeenCalled.never();
  });

  it('populerar formaliedelen (mobil applikation, inga brister)', async () => {
    const audit = model._audit;
    const created = new Date('2020-10-15');
    audit.failures = () => ({});
    await view.open(model._case, model._audit, created, 'remarks');
    expect(content.noStatement.remove).toHaveBeenCalled.once();
    expect(content.compliance.remove).toHaveBeenCalled.never();
    expect(content.a11y.remove).toHaveBeenCalled.once();
  });

  it('populerar detaljavsnittet (mobil applikation)', async () => {
    const aCase = model._case;
    const audit = model._audit;
    const created = new Date('2020-10-15');
    const org = aCase.organization;
    await view.open(model._case, model._audit, created, 'remarks');
    expect(content.deadline._datetime).toEqual('2020-11-15');
    expect(content.deadline.textContent).toEqual('den 15 november 2020');
    expect(content.psb.psb.textContent).toBe(org.abbreviation);
    expect(content.psb.abbr.textContent).toBe(`(${org.abbreviation})`);
    expect(content.psb.name.textContent).toBe(org.name + 's');
    expect(content.psb.regNo.textContent).toBe(org.registrationNumber);
    expect(content.psb.service.textContent).toBe(aCase.service.name);
  });

  it('populerar åtgärdslistan (mobil applikation)', async () => {
    const audit = model._audit;
    const created = new Date('2020-10-15');
    const li = content.fails.children;
    audit._samples.statement = [];
    await view.open(model._case, audit, created, 'remarks');
    expect(li.length).toBe(3);
    expect(li[0].textContent).toBe(config['SFS2018:1937 13 §']);
    expect(li[1].textContent).toBe(config['11.1.1.1']);
    expect(li[2].textContent).toBe(config['11.4.1.3']);
  });

  it('populerar bakgrundsinformationen (mobil applikation)', async () => {
    const created = new Date('2020-10-15');
    const info =
      'DIGG har inom sitt tillsynsuppdrag genomfört en granskning av Test. I granskningen konstaterades att den granskade vyn och webbsidan brister i tillgänglighet, då de utifrån <cite>DOS-lagen</cite> inte är möjliga att uppfatta, hanterbara, begripliga och robusta.';
    await view.open(model._case, model._audit, created, 'remarks');
    expect(content.sampleInfo.innerHTML).toBe(info);
  });

  it('populerar granskningssammanfattningen (mobil applikation)', async () => {
    const audit = model._audit;
    const created = new Date('2020-10-15');
    const dd = content.summary.dd;
    await view.open(model._case, model._audit, created, 'remarks');
    expect(dd[0].children[0].textContent).toBe('den 1 oktober 2020');
    expect(dd[1].children[0].textContent).toBe('den 15 oktober 2020');
    expect(dd[2].textContent).toBe('1');
    expect(dd[3].textContent).toBe('0');
  });

  it('populerar ärendehistoriken (mobil applikation)', async () => {
    const cell = (r, c) => content.log.rows[r].cells[c];
    const created = new Date('2020-10-15');
    await view.open(model._case, model._audit, created, 'remarks');
    expect(content.log.rows.length).toBe(5);
    expect(cell(0, 0).children[0].textContent).toBe('Den 24 september 2020');
    expect(cell(0, 1).textContent).toBe('Ärendet öppnat');
    expect(cell(1, 0).children[0].textContent).toBe('Den 24 september 2020');
    expect(cell(1, 1).textContent).toBe('Avisering om granskning');
    expect(cell(2, 0).children[0].textContent).toBe('Den 1 oktober 2020');
    expect(cell(2, 1).textContent).toBe('Granskning inledd');
    expect(cell(3, 0).children[0].textContent).toBe('Den 15 oktober 2020');
    expect(cell(3, 1).textContent).toBe('Granskning avslutad');
    expect(cell(4, 0).children[0].textContent).toBe('Den 16 oktober 2020');
    expect(cell(4, 1).textContent).toBe('Påpekande');
  });
});

// Importera beroenden.
import { MobileApp, Website } from '../../js/model/service.js';
import { RemarksView } from '../../js/view/RemarksView.js';
import { SampleFactory } from '../../js/model/sample.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

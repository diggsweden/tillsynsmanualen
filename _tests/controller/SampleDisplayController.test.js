/**
 * Enhetstestfall för controllern för kravlistning i ett stickprov.
 *
 * @license CC-BY 4.0
 * @see SampleDisplayController
 */

let context;
let controller;
let model;
let order;
let view;
let webCfg;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Kravkonfiguration för en komponent.
  const compCfg = {
    contentTypes: [{ id: 'img', title: 'Images' }],
    sections: [
      {
        id: 'test',
        title: 'Test',
        requirements: ['contrast', 'non-text-content'],
      },
    ],
    requirements: {
      contrast: {
        title: 'Contrast (minimum)',
        reference: '11.1.4.3',
        section: 'test',
        platforms: ['ios'],
        checks: [{ check: 'contrast' }],
      },
      'non-text-content': {
        title: 'Non-text content',
        reference: '11.1.1.1',
        section: 'test',
        contentTypes: ['img'],
        checks: [{ check: 'non-text-content' }],
      },
    },
  };

  // Kravkonfiguration för ett dokument.
  const docCfg = {
    contentTypes: [{ id: 'img', title: 'Images' }],
    sections: [
      {
        id: 'test',
        title: 'Test',
        requirements: ['contrast', 'tagged-pdf'],
      },
    ],
    requirements: {
      contrast: {
        title: 'Contrast (minimum)',
        reference: '10.1.4.3',
        section: 'test',
        checks: [{ check: 'contrast' }],
      },
      'tagged-pdf': {
        title: 'Tagged PDF',
        reference: '10.1.3.1',
        section: 'test',
        contentTypes: ['img'],
        formats: ['pdf'],
        checks: [{ check: 'tagged-pdf' }],
      },
    },
  };

  // Kravkonfiguration för en webbsida.
  webCfg = {
    contentTypes: [
      { id: 'foo', title: 'Bar' },
      { id: 'mov', title: 'Moving' },
    ],
    sections: [
      {
        id: 'ubiquitous',
        title: 'Ubiquitous',
        requirements: ['tables'],
        sections: [
          {
            id: 'sub',
            title: 'Sub-section',
            requirements: ['non-text-content', 'contrast'],
          },
        ],
      },
      {
        id: 'invisible',
        title: 'Not shown',
        categories: ['non-existent'],
        sections: [
          {
            id: 'also-invisible',
            title: 'Not shown either',
            categories: ['non-existent'],
            requirements: ['no-such-criterion'],
          },
        ],
      },
      {
        id: 'statement',
        title: 'A11y statement',
        categories: ['statement'],
        requirements: ['statement'],
      },
    ],
    requirements: {
      'audio-control': {
        title: 'Audio control',
        reference: '9.1.4.2',
        section: 'cond',
      },
      contrast: {
        title: 'Contrast (minimum)',
        reference: '9.1.4.3',
        section: 'ubiquitous',
        subsection: 'sub',
      },
      'no-such-criterion': {
        title: 'No such criterion',
        reference: '9.0',
        section: 'no-such-section-anymore',
      },
      'non-text-content': {
        title: 'Non-text content',
        reference: '9.1.1.1',
        section: 'ubiquitous',
        subsection: 'sub',
      },
      statement: {
        title: 'A11y statement',
        reference: '6 § MDFFS2019:2',
        section: 'statement',
      },
      tables: {
        title: 'Tables',
        reference: '9.1.3.1',
        section: 'ubiquitous',
      },
      'three-flashes': {
        title: 'Flashes',
        reference: '9.2.3.1',
        section: 'cond',
      },
    },
  };

  // Modellen.
  model = mock.model(
    {
      _audit: new Audit(13, {
        caseID: 13,
        samples: { start: [], statement: [] },
        started: new Date('2020-09-23').getTime(),
      }),
      _case: {
        id: 13,
        monitoring: true,
        organization: { name: 'Acme' },
        service: { name: 'Test', operatingSystem: 'iOS', type: 'app' },
        toString: () => '2020-1234',
      },
      _sample: null,
    },
    {
      getAudit: async (a) => ({ 42: model._audit })[a] ?? null,
      getCase: async (c) => ({ 13: model._case })[c] ?? null,
      getSample: async () => model._sample,
      setRequirement: async () => {},
      setSample: async (s) => ((s.id ??= 3), (model._sample = s)),
    }
  );

  model._audit.id = 42;

  // Komponent.
  const component = new Component(model._audit.id, {
    auditID: 42,
    category: 'component',
    content: ['img'],
    name: 'Test component',
    parent: 'webpage',
  });
  component.id = 1;

  // Stickprov.
  const sample = new Webpage(model._audit.id, {
    auditID: 42,
    category: 'start',
    components: [1],
    content: ['mov'],
    name: 'Test',
    note: 'Test note',
  });
  sample.id = 2;

  model._audit.setSample(component);
  model._audit.setSample(sample);
  model._sample = sample;

  // Kravordning.
  order = {
    build: async (sample) =>
      ({
        component: compCfg,
        document: docCfg,
        webpage: webCfg,
      })[sample.type],
    _orphans: [],
    skip: () => 'next',
    *section(cfg) {
      if (/invisible/.test(cfg.id)) return;
      for (const id of cfg.requirements ?? []) {
        yield id;
      }
    },
    *sectionless() {
      for (const id of order._orphans) {
        yield id;
      }
    },
  };

  // Vyn.
  view = mock.view(
    {
      breadcrumbs: mock.breadcrumbTrail(),
      copyNotes: false,
      edit: '',
      note: '',
      partial: false,
      sourceRequirements: [],
      sourceSample: null,
    },
    {
      addComponent: () => {},
      addContentType: () => {},
      addRequirement: () => {},
      addSection: () => {},
      addSubsection: () => {},
      clear: () => {},
      setApprove: () => {},
      setAuditLink: () => {},
      setCopyableRequirements: () => {},
      setCopyableSamples: () => {},
      setHeading: () => {},
      setProgress: () => {},
      setResumeLink: () => {},
    }
  );

  // Applikationskontexten.
  context = mock.appContext({
    audit: 42,
    case: 13,
    sample: 2,
  });

  // Skapa en controllerinstans.
  controller = new SampleDisplayController(model, view, order, mock.globals());
});

it('refuserar sidvisning utan stickprovs-id', async () => {
  delete context.sample;
  await expect.failure(() => controller.prepare(context));
});

it('refuserar sidvisning med ogiltigt stickprovs-id', async () => {
  model._sample = null;
  await expect.failure(() => controller.prepare(context));
});

it.with([true, 'advanced', 'avancerat'], [false, 'simplified', 'förenklat'])(
  'sätter {2} visningsläge i stickprovet för filtrering',
  async (flg, mode) => {
    model._case.monitoring = flg;
    await controller.prepare(context);
    expect(model._sample.mode).toBe(mode);
  }
);

it.with(
  [1, 'component', 'Test component', 'en komponent'],
  [2, 'webpage', 'Test', 'ett stickprov']
)('sätter sidrubrik och länkstig för {3}', async (id, type, name) => {
  context.sample = id;
  model._sample = model._audit.sample(id);
  await controller.prepare(context);
  expect(view.title).toBe(name);
  expect(view.setHeading).toHaveBeenCalled.once().with(type, name, null);
  const { breadcrumbs } = view;
  const date = model._audit.started;
  expect(breadcrumbs.case)
    .toHaveBeenCalled.once()
    .with(13, '2020-1234', 'Acme', 'Test');
  expect(breadcrumbs.audit).toHaveBeenCalled.once().with(42, date);
  expect(breadcrumbs.current).toBe(name);
  await controller.prepare(context);
});

it('sätter en länkad sidrubrik', async () => {
  context.sample = 2;
  model._sample = model._audit.sample(2);
  const url = 'https://example.com/';
  model._sample.url = url;
  await controller.prepare(context);
  expect(view.setHeading).toHaveBeenCalled.once().with('webpage', 'Test', url);
});

it('länkar till granskningsöversikten', async () => {
  await controller.prepare(context);
  expect(view.setAuditLink)
    .toHaveBeenCalled.once()
    .with('?page=audit&audit=42', '2020-09-23');
});

it('visar ingående innehållstyper', async () => {
  await controller.prepare(context);
  expect(view.addContentType).toHaveBeenCalled.once().with('Moving');
});

it('visar ingående komponenter', async () => {
  await controller.prepare(context);
  expect(view.addComponent).toHaveBeenCalled.once().with('Test component');
});

it('visar urvalsnotering', async () => {
  await controller.prepare(context);
  expect(view.note).toBe('Test note');
});

it('sätter partialgranskningsflagga', async () => {
  model._sample.partial = true;
  await controller.prepare(context);
  expect(view.partial).toBe(true);
});

it('sätter redigeringssökväg', async () => {
  const s = 'sample=2';
  const rs = 'sample%3D2';
  const r = `return=sample%26${rs}`;
  const url = `?page=sample&${s}&${r}&edit`;
  await controller.prepare(context);
  expect(view.edit).toBe(url);
});

it('avaktiverar redigering för avslutad granskning', async () => {
  model._audit.finish();
  await controller.prepare(context);
  expect(view.edit).toBe(null);
});

it('uppdaterar förloppsindikatorn', async () => {
  await controller.prepare(context);
  expect(view.setProgress)
    .toHaveBeenCalled.once()
    .with(0, 0, '0 av 0 krav granskade');
});

it('sätter granskningssökväg för nytt stickprov', async () => {
  const r = 'requirement=next';
  const s = 'sample=2';
  await controller.prepare(context);
  expect(view.setResumeLink)
    .toHaveBeenCalled.once()
    .with(`?page=requirement&${s}&${r}`, 'Börja granska');
});

it('sätter granskningssökväg för pågående stickprov', async () => {
  const r = 'requirement=next';
  const s = 'sample=2';
  const sample = model._audit.sample(2);
  const req = new Requirement(2, { id: 'next' });
  req.setCheck({ applicable: true, failed: false, done: false, id: 'test' });
  sample.setRequirement(req);
  await controller.prepare(context);
  expect(view.setResumeLink)
    .toHaveBeenCalled.once()
    .with(`?page=requirement&${s}&${r}`, 'Fortsätt granska');
});

it('tar bort granskningssökväg för färdiggranskat stickprov', async () => {
  order.skip = () => null;
  await controller.prepare(context);
  expect(view.setResumeLink).toHaveBeenCalled.once().with(null, '');
});

it('gör autogodkänn till ångra om det finns autogodkända krav', async () => {
  const sample = model._audit.sample(2);
  const req = new Requirement(2, { id: 'tables' });
  req.approved = true;
  sample.setRequirement(req);
  await controller.prepare(context);
  expect(view.setApprove)
    .toHaveBeenCalled.once()
    .with('Ångra godkänn ogranskade', 'undo-approve');
});

it('deaktiverar autogodkänn om inga ogranskade krav finns', async () => {
  const sample = model._audit.sample(2);
  const req = new Requirement(2, { id: 'tables' });
  req.setCheck({ applicable: true, state: true, id: 'test' });
  sample.setRequirement(req);
  await controller.prepare(context);
  expect(view.setApprove).toHaveBeenCalled.once().with(null);
});

it('deaktiverar autogodkänn i avslutad granskning', async () => {
  model._audit.finish();
  await controller.prepare(context);
  expect(view.setApprove).toHaveBeenCalled.once().with(null);
});

it('sätter kopierbara stickprov för pågående stickprov', async () => {
  const other = new Webpage(model._audit.id, {
    auditID: 42,
    category: 'special',
    content: ['mov'],
    name: 'Other',
  });
  other.id = 3;
  model._audit.setSample(other);

  const src = new Requirement(3, { id: 'tables' });
  src.setCheck({ applicable: true, state: true, id: 'tables' });
  other.setRequirement(src);

  const sample = model._audit.sample(2);
  const req = new Requirement(2, { id: 'tables' });
  req.setCheck({ applicable: true, id: 'tables' });
  sample.setRequirement(req);

  model.getSample = async (id) => ({ 2: sample, 3: other })[id] ?? null;

  await controller.prepare(context);

  expect(view.setCopyableSamples)
    .toHaveBeenCalled.once()
    .with([{ id: 3, name: 'Other' }]);
  expect(model.getSample).toHaveBeenCalled.times(2).with([2], [3]);
});

it('sätter noll kopierbara stickprov för färdiggranskat stickprov', async () => {
  const other = new Webpage(model._audit.id, {
    auditID: 42,
    category: 'special',
    content: ['mov'],
    name: 'Other',
  });
  other.id = 3;
  model._audit.setSample(other);

  const src = new Requirement(3, { id: 'tables' });
  src.setCheck({ applicable: true, state: true, id: 'tables' });
  other.setRequirement(src);

  const sample = model._audit.sample(2);
  const req = new Requirement(2, { id: 'next' });
  req.setCheck({ applicable: true, state: true, id: 'test' });
  sample.setRequirement(req);
  await controller.prepare(context);

  expect(view.setCopyableSamples).toHaveBeenCalled.once().with([]);
});

it('sätter noll kopierbara stickprov i avslutad granskning', async () => {
  const other = new Webpage(model._audit.id, {
    auditID: 42,
    category: 'special',
    content: ['mov'],
    name: 'Other',
  });
  other.id = 3;
  model._audit.setSample(other);

  const src = new Requirement(3, { id: 'tables' });
  src.setCheck({ applicable: true, state: true, id: 'tables' });
  other.setRequirement(src);

  const sample = model._audit.sample(2);
  const req = new Requirement(2, { id: 'next' });
  req.setCheck({ applicable: true, id: 'test' });
  sample.setRequirement(req);
  model._audit.finish();
  await controller.prepare(context);
  expect(view.setCopyableSamples).toHaveBeenCalled.once().with([]);
});

it('populerar tomt stickprov med krav', async () => {
  const req = new Requirement(2, { id: 'next' });
  order.build = async () => {
    model._sample.setRequirement(req);
    return webCfg;
  };
  await controller.prepare(context);
  expect(model.setRequirement).toHaveBeenCalled.once().with(req);
});

it('sparar inte redan populerat stickprov', async () => {
  model._sample.setRequirement(new Requirement(2, { id: 'next' }));
  await controller.prepare(context);
  expect(model.setRequirement).toHaveBeenCalled.never();
});

it('lägger till kravavsnitt i vyn', async () => {
  const m = (r) => model._sample.setRequirement(r);
  const mkReq = (clause, id, title) => {
    const r = new Requirement(2, { clause, id, title });
    r.setCheck({ id: `${id}-c`, applicable: true, state: undefined });
    return r;
  };
  m(mkReq('9.1.3.1', 'tables', 'Tables'));
  m(mkReq('9.1.1.1', 'non-text-content', 'Non-text content'));
  m(mkReq('9.1.4.3', 'contrast', 'Contrast (minimum)'));
  m(mkReq('MDFFS2019:2 6 § 1 st 1 p', 'statement', 'A11y statement'));
  await controller.prepare(context);
  expect(view.addSection)
    .toHaveBeenCalled.times(2)
    .with(['Ubiquitous'], ['A11y statement']);
  expect(view.addSubsection).toHaveBeenCalled.once().with('Sub-section', 3);
  const e = (u, r, t) => [u, 'unchecked', r, t, false, false];
  expect(view.addRequirement)
    .toHaveBeenCalled.times(4)
    .with(
      e(/tables$/, '9.1.3.1', 'Tables'),
      e(/non-text-content/, '9.1.1.1', 'Non-text content'),
      e(/contrast/, '9.1.4.3', 'Contrast (minimum)'),
      e(/statement/, '', 'A11y statement')
    );
});

it('lägger till ett Övrigt-avsnitt för avsnittslösa krav', async () => {
  const req = new Requirement(2, {
    clause: '0.1',
    id: 'no-such-criterion',
    extNote: 'yes',
    intNote: 'yes',
    title: 'Old title',
  });
  req.setCheck({ id: 'nsc', applicable: true, state: undefined });
  order.build({ type: 'webpage' }).then((cfg) => (cfg.sections = []));
  order._orphans = [req.id];
  model._sample.setRequirement(req);
  await controller.prepare(context);
  expect(view.addSection).toHaveBeenCalled.once().with('Övrigt');
  expect(view.addRequirement)
    .toHaveBeenCalled.once()
    .with(/no-such-criterion$/, 'unchecked', '0.1', 'Old title', true, true);
});

describe('Hanterar interaktion', () => {
  const mkCheck = (ok, id) => new SingleCheck({ id, ok });

  beforeEach(() => {
    const other = new Webpage(model._audit.id, {
      auditID: 42,
      category: 'special',
      content: ['mov'],
      name: 'Other',
    });
    other.id = 3;
    model._audit.setSample(other);

    const src1 = new Requirement(3, {
      clause: '9.1.4.3',
      id: 'contrast',
      title: 'Contrast (minimum)',
    });
    src1.setCheck(mkCheck(false, 'contrast'));
    other.setRequirement(src1);

    const src2 = new Requirement(3, {
      clause: '9.1.3.1',
      extNote: 'NOTE',
      id: 'tables',
      title: 'Tables',
    });
    src2.setCheck(mkCheck(true, 'tables'));
    other.setRequirement(src2);

    const sample = model._audit.sample(2);
    const req = new Requirement(2, { id: 'tables' });
    req.setCheck(mkCheck(undefined, 'tables'));
    sample.setRequirement(req);

    model.getSample = async (id) => ({ 2: sample, 3: other })[id] ?? null;
  });

  it('markerar stickprovet som partiellt granskat', async () => {
    view.partial = false;
    const sample = model._audit.sample(2);
    sample.requirement('tables').check('tables').applicable = true;
    await controller.prepare(context);
    view.notify({
      action: 'partial',
      path: null,
      trigger: {},
      type: 'form',
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(sample.partial).toBe(true);
    expect(model.setSample).toHaveBeenCalled.once().with(sample);
    expect(view.partial).toBe(true);
  });

  it('autogodkänner ogranskade krav', async () => {
    const sample = model._audit.sample(2);
    const req = new Requirement(2, { id: 'tables' });
    sample.setRequirement(req);
    await controller.prepare(context);
    view.notify({
      action: 'approve',
      path: null,
      type: 'form',
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(req.approved).toBe(true);
    expect(model.setRequirement).toHaveBeenCalled.once().with(req);
    expect(view.clear).toHaveBeenCalled.once();
  });

  it('ångrar autogodkännande', async () => {
    const sample = model._audit.sample(2);
    const req = new Requirement(2, { approved: true, id: 'tables' });
    sample.setRequirement(req);
    await controller.prepare(context);
    view.notify({
      action: 'undo-approve',
      path: null,
      type: 'form',
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(req.approved).toBe(false);
    expect(model.setRequirement).toHaveBeenCalled.once().with(req);
    expect(view.clear).toHaveBeenCalled.once();
  });

  it('sätter kopierbara krav vid val av stickprov', async () => {
    const sample = model._audit.sample(2);
    sample.setRequirement(
      new Requirement(2, {
        clause: '9.1.3.1',
        id: 'tables',
        title: 'Tables',
      })
    );
    await controller.prepare(context);
    view.notify({
      target: { name: 'source' },
      type: 'change',
      value: '3',
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);

    expect(view.setCopyableRequirements)
      .toHaveBeenCalled.once()
      .with([{ clause: '9.1.3.1', id: 'tables', title: 'Tables' }], true);
  });

  it('kopierar angivna krav och populerar om vyn', async () => {
    const other = model._audit.sample(3);
    view.copyNotes = true;
    view.sourceRequirements = ['tables'];
    view.sourceSample = 3;
    await controller.prepare(context);
    view.notify({
      action: 'copy',
      path: null,
      type: 'form',
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    const sample = model._audit.sample(2);
    const req = sample.requirement('tables');
    const chk = req.check('tables');
    expect(req.externalNote).toBe('NOTE');
    expect(req.state).toBe(true);
    expect(chk.state).toBe(true);
    expect(model.setRequirement).toHaveBeenCalled.once().with(req);
    expect(view.clear).toHaveBeenCalled.once();
  });
});

// Importera beroenden.
import { Audit } from '../../js/model/Audit.js';
import { Component, NonWebDocument, Webpage } from '../../js/model/sample.js';
import { Requirement } from '../../js/model/Requirement.js';
import { SampleDisplayController } from '../../js/controller/SampleDisplayController.js';
import { SingleCheck } from '../../js/model/check.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

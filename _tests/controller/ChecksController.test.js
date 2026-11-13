/**
 * Enhetstestfall för kontrollpresentationssidans controller.
 *
 * @license CC-BY 4.0
 * @see ChecksController
 */

let context;
let controller;
let loader;
let model;
let reqCfg;
let sampCfg;
let view;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Konfigurationer.
  reqCfg = {};
  sampCfg = {};

  // Resursladdaren: ska hämta kravdata från servern.
  loader = mock({
    configuration: async (p) =>
      ({
        'requirements/document': sampCfg,
        'requirements/screen-closed': sampCfg,
        'requirements/screen-open': sampCfg,
        'requirements/webpage': sampCfg,
        'requirements/webpage/first': reqCfg.first,
        'requirements/webpage/second': reqCfg.second,
      })[p],
  });

  // Modellen.
  model = mock.model();

  // Vyn.
  const mkCond = () => {
    const cond = mock({
      check: () => {},
      condition: () => {},
      heading: () => {},
    });
    return cond;
  };

  const mkReq = () => {
    const req = mock(
      {
        conditions: [],
      },
      {
        condition: () => {
          const c = mkCond();
          req.conditions.push(c);
          return c;
        },
        check: () => {},
        exceptions: () => {},
        instruction: () => {},
        methods: () => {},
        steps: () => {},
      }
    );
    return req;
  };

  const mkSec = () => {
    const sec = mock(
      {
        requirements: [],
        sections: [],
      },
      {
        requirement: () => {
          const r = mkReq();
          sec.requirements.push(r);
          return r;
        },
        section: () => {
          const s = mkSec();
          sec.sections.push(s);
          return s;
        },
      }
    );
    return sec;
  };

  view = mock.model(
    {
      heading: '',
      requirementCount: 0,
      _sections: [],
    },
    {
      hideProgress: () => {},
      section: () => {
        const s = mkSec();
        view._sections.push(s);
        return s;
      },
    }
  );

  // Applikationskontexten.
  context = mock.appContext({
    params: { type: 'webpage' },
    path: '?page=test',
  });

  // Skapa en controller-instans.
  controller = new ChecksController(model, view, loader);
});

it.with(
  ['document', false, 'dokument'],
  ['screen', false, 'vy i mobil applikation (öppen funktionalitet)'],
  ['screen', true, 'vy i mobil applikation (stängd funktionalitet)'],
  ['webpage', false, 'webbsida']
)('sätter titel och sidrubrik för {2}', async (type, closed, text) => {
  context.params.type = type;
  closed && (context.params.closed = '');
  await controller.prepare(context);
  expect(view.title).toBe(`Kontroller, ${text}`);
  expect(view.heading).toBe(`Kontroller, ${text}`);
});

it('visar ett avsnitt', async () => {
  sampCfg = { sections: [{ title: 'Test section' }] };
  await controller.prepare(context);
  expect(view.section).toHaveBeenCalled.once().with('Test section');
});

it('visar inte ett icke-publikt avsnitt', async () => {
  sampCfg = { sections: [{ public: false, title: 'Test section' }] };
  await controller.prepare(context);
  expect(view.section).toHaveBeenCalled.never();
});

it('visar ett underavsnitt', async () => {
  const title = 'Subsection';
  sampCfg = {
    sections: [
      {
        title: 'Main section',
        sections: [{ title }],
      },
    ],
  };
  await controller.prepare(context);
  const [sec] = view._sections;
  expect(sec.section).toHaveBeenCalled.once().with(title);
});

it('sätter antalet krav i vyn', async () => {
  sampCfg = {
    sections: [
      {
        title: 'Main section',
        requirements: ['first'],
        sections: [{ title: 'Sub', requirements: ['second'] }],
      },
    ],
    requirements: {
      first: { title: 'first', reference: '9.1.1.1' },
      second: { title: 'second', reference: '9.1.2.1' },
    },
  };
  await controller.prepare(context);
  expect(view.requirementCount).toBe(2);
});

it('visar ett krav', async () => {
  const reference = '9.1.1.1';
  const title = 'First requirement';
  sampCfg = {
    sections: [
      {
        title: 'Main section',
        requirements: ['first'],
      },
    ],
    requirements: { first: { title, reference } },
  };
  await controller.prepare(context);
  const [sec] = view._sections;
  expect(sec.requirement).toHaveBeenCalled.once().with(title, reference);
});

it('visar inte ett pseudokrav', async () => {
  sampCfg = {
    sections: [
      {
        title: 'Main section',
        requirements: ['first'],
      },
    ],
    requirements: { first: { pseudo: true } },
  };
  await controller.prepare(context);
  const [sec] = view._sections;
  expect(sec.requirement).toHaveBeenCalled.never();
});

it('visar metodbeskrivning', async () => {
  const methods = ['Method'];
  reqCfg.first = { methods };
  sampCfg = {
    sections: [
      {
        title: 'Main section',
        requirements: ['first'],
      },
    ],
    requirements: {
      first: {
        title: 'First requirement',
        reference: '9.1.1.1',
      },
    },
  };
  await controller.prepare(context);
  const [sec] = view._sections;
  const [req] = sec.requirements;
  expect(req.methods).toHaveBeenCalled.once().with(methods);
});

it('visar stegbeskrivning', async () => {
  const steps = ['First step', 'Second step'];
  reqCfg.first = { steps };
  sampCfg = {
    sections: [
      {
        title: 'Main section',
        requirements: ['first'],
      },
    ],
    requirements: {
      first: {
        title: 'First requirement',
        reference: '9.1.1.1',
      },
    },
  };
  await controller.prepare(context);
  const [sec] = view._sections;
  const [req] = sec.requirements;
  expect(req.steps).toHaveBeenCalled.once().with(steps);
});

it('visar undantag på kravnivå', async () => {
  const exceptions = ['First exception', 'Second exception'];
  reqCfg.first = { exceptions };
  sampCfg = {
    sections: [
      {
        title: 'Main section',
        requirements: ['first'],
      },
    ],
    requirements: {
      first: {
        title: 'First requirement',
        reference: '9.1.1.1',
      },
    },
  };
  await controller.prepare(context);
  const [sec] = view._sections;
  const [req] = sec.requirements;
  expect(req.exceptions).toHaveBeenCalled.once().with(exceptions);
});

it('visar tillämpningsanvisning', async () => {
  const id = 'test';
  const title = 'Instruction';
  reqCfg.first = { instruction: { id, title } };
  sampCfg = {
    sections: [
      {
        title: 'Main section',
        requirements: ['first'],
      },
    ],
    requirements: {
      first: {
        title: 'First requirement',
        reference: '9.1.1.1',
      },
    },
  };
  await controller.prepare(context);
  const [sec] = view._sections;
  const [req] = sec.requirements;
  expect(req.instruction).toHaveBeenCalled.once().with(id, title);
});

it('visar en kontroll', async () => {
  const texts = ['Test check'];
  sampCfg = {
    sections: [
      {
        title: 'Main section',
        requirements: ['first'],
      },
    ],
    requirements: {
      first: {
        title: 'First requirement',
        reference: '9.1.1.1',
        checks: [{ check: 'test' }],
      },
    },
    checks: { test: { texts } },
  };
  await controller.prepare(context);
  const [sec] = view._sections;
  const [req] = sec.requirements;
  expect(req.check).toHaveBeenCalled.once().with(texts);
});

it('visar ett manuellt villkor', async () => {
  const precondition = 'Precondition';
  const textsNo = ['Test no'];
  const textsYes = ['Test yes'];
  sampCfg = {
    sections: [
      {
        title: 'Main section',
        requirements: ['first'],
      },
    ],
    requirements: {
      first: {
        title: 'First requirement',
        reference: '9.1.1.1',
        checks: [{ condition: 'test' }],
      },
    },
    conditions: {
      test: {
        precondition,
        yes: [{ check: 'test-yes' }],
        no: [{ check: 'test-no' }],
      },
    },
    checks: {
      'test-no': { texts: textsNo },
      'test-yes': { texts: textsYes },
    },
  };
  await controller.prepare(context);
  const [sec] = view._sections;
  const [req] = sec.requirements;
  expect(req.condition)
    .toHaveBeenCalled.times(2)
    .with([precondition, true], [precondition, false]);
  const [yes, no] = req.conditions;
  expect(yes.check).toHaveBeenCalled.once().with(textsYes);
  expect(no.check).toHaveBeenCalled.once().with(textsNo);
});

it('visar ett härlett villkor', async () => {
  const texts = ['Test check'];
  sampCfg = {
    sections: [
      {
        title: 'Main section',
        requirements: ['first'],
      },
    ],
    requirements: {
      first: {
        title: 'First requirement',
        reference: '9.1.1.1',
        checks: [{ condition: 'test' }],
      },
    },
    conditions: {
      test: {
        sources: ['src1', 'src2'],
        yes: [{ check: 'test' }],
      },
    },
    checks: {
      src1: { texts: ['First', 'Second'] },
      src2: { texts: ['Third'] },
      test: { texts },
    },
  };
  await controller.prepare(context);
  const [sec] = view._sections;
  const [req] = sec.requirements;
  expect(req.condition)
    .toHaveBeenCalled.once()
    .with('First, Second och Third', true);
  const [yes] = req.conditions;
  expect(yes.check).toHaveBeenCalled.once().with(texts);
});

it('döljer förloppsindikatorn när allt innehåll laddats', async () => {
  await controller.prepare(context);
  expect(view.hideProgress).toHaveBeenCalled.once();
});

// Importera beroenden.
import { ChecksController } from '../../js/controller/ChecksController.js';
import { beforeEach, expect, it, mock } from '../functions.js';

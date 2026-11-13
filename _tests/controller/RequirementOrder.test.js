/**
 * Enhetstester för kravnavigeringsordningen.
 *
 * @license CC-BY 4.0
 * @see RequirementOrder
 */

let config;
let order;
let service;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Kravkonfigurationer.
  config = {};

  // Kravkonfiguration för en komponent med öppen funktionalitet.
  config.compOpen = {
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

  // Kravkonfiguration för en komponent med stängd funktionalitet.
  config.compClosed = {
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
        checks: [{ check: 'speech-non-text-content' }],
      },
    },
  };

  // Kravkonfiguration för ett dokument.
  config.doc = {
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
  config.web = {
    contentTypes: [
      { id: 'foo', title: 'Bar' },
      { id: 'mov', title: 'Moving' },
    ],
    sections: [
      {
        id: 'pseudo',
        title: 'Pseudo',
        modes: ['advanced'],
        requirements: ['screenshot'],
      },
      {
        id: 'cond',
        title: 'Conditional',
        contentTypes: ['mov'],
        requirements: ['audio-control', 'three-flashes'],
      },
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
        id: 'skipped',
        title: 'Skipped',
        contentTypes: ['foo'],
        requirements: ['no-such-criterion'],
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
      deprecated: {
        title: 'Deprecated',
        reference: '9.1.2.5',
        section: 'no-such-section-anymore',
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
      screenshot: {
        title: 'Screenshot',
        pseudo: true,
        section: 'pseudo',
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

  // Resursladdaren: ska hämta kravdata från serven.
  const loader = {
    configuration: async (path) =>
      ({
        'requirements/screen-component-closed': config.compClosed,
        'requirements/screen-component-open': config.compOpen,
        'requirements/document': config.doc,
        'requirements/webpage': config.web,
      })[path],
  };

  // Digital service.
  service = { type: 'website' };

  // Skapa en kravordningsingsinstans.
  order = new RequirementOrder(loader);
});

it.with(
  [
    new Component({ id: 42 }, 'screen'),
    () => config.compOpen,
    'en appkomponent med öppen funktionalitet',
  ],
  [
    new Component({ id: 42 }, { closed: true, parent: 'screen' }),
    () => config.compClosed,
    'en appkomponent med stängd funktionalitet',
  ],
  [new NonWebDocument({ id: 42 }, 'service'), () => config.doc, 'ett dokument'],
  [new Webpage({ id: 42 }, 'start'), () => config.web, 'en webbplats']
)('hämtar och returnerar konfiguration för {2}', async (sample, cfg) => {
  sample.id = 13;
  const result = await order.build(sample);
  expect(result).toBe(cfg());
});

it('populerar ett tomt stickprov med krav', async () => {
  const expected = [
    'screenshot',
    'audio-control',
    'three-flashes',
    'tables',
    'non-text-content',
    'contrast',
    'no-such-criterion',
    'statement',
  ];
  const sample = new Webpage({ id: 42 }, 'start');
  sample.id = 13;
  await order.build(sample);
  const obj = sample.toJSON();
  let i = 0;
  for (const req of obj.req) {
    expect(req.id).toBe(expected[i++]);
  }
  expect(i).toBe(expected.length);
});

it.with(['simplified', false, 'inte matchar'], ['advanced', true, 'matchar'])(
  'itererar över alla krav som {2} visningsläge',
  async (mode, match) => {
    const sample = new Webpage({ id: 42 }, 'start');
    sample.id = 13;
    sample.mode = mode;
    await order.build(sample);
    let matched = false;
    for (const id of order) {
      matched ||= 'screenshot' === id;
    }
    expect(matched).toBe(match);
  }
);

it.with(['start', false, 'inte matchar'], ['statement', true, 'matchar'])(
  'itererar över alla krav som {2} urvalskategori',
  async (cat, match) => {
    const sample = new Webpage({ id: 42 }, cat);
    sample.id = 13;
    await order.build(sample);
    let matched = false;
    for (const id of order) {
      matched ||= 'statement' === id;
    }
    expect(matched).toBe(match);
  }
);

it.with([[], false, 'inte matchar'], [['mov'], true, 'matchar'])(
  'itererar över alla krav som {2} innehållstyp',
  async (types, match) => {
    const sample = new Webpage({ id: 42 }, 'start');
    sample.id = 13;
    types.forEach((type) => sample.addContentType(type));
    await order.build(sample);
    let matched = 0;
    for (const id of order) {
      'audio-control' === id && ++matched;
      'three-flashes' === id && ++matched;
    }
    expect(matched).toBe(match ? 2 : 0);
  }
);

it.with(['doc', false, 'inte matchar'], ['pdf', true, 'matchar'])(
  'itererar över alla krav som {2} dokumentformat',
  async (fmt, match) => {
    const sample = new NonWebDocument({ id: 42 }, 'service');
    sample.id = 13;
    sample.format = fmt;
    sample.addContentType('img');
    await order.build(sample);
    let matched = false;
    for (const id of order) {
      matched ||= 'tagged-pdf' === id;
    }
    expect(matched).toBe(match);
  }
);

it.with(['Android', false, 'inte matchar'], ['iOS', true, 'matchar'])(
  'itererar över alla krav som {2} plattform',
  async (os, match) => {
    const sample = new Component({ id: 42 }, 'screen');
    sample.id = 13;
    sample.platform = os;
    await order.build(sample);
    let matched = false;
    for (const id of order) {
      matched ||= 'contrast' === id;
    }
    expect(matched).toBe(match);
  }
);

it('itererar över krav i ett granskningsavsnitt', async () => {
  const sample = new Webpage({ id: 42 }, 'statement');
  const sections = config.web.sections;
  sample.id = 13;
  await order.build(sample);
  expect(Array.from(order.section(sections[0])).length).toBe(0);
  expect(Array.from(order.section(sections[1])).length).toBe(0);
  expect(Array.from(order.section(sections[2])).length).toBe(1);
  expect(Array.from(order.section(sections[3])).length).toBe(0);
  expect(Array.from(order.section(sections[4])).length).toBe(1);
});

it('itererar över avsnittslösa krav', async () => {
  const sample = new Webpage({ id: 42 }, 'start');
  sample.id = 13;
  await order.build(sample);
  sample.setRequirement(new Requirement(sample.id, { id: 'deprecated' }));
  await order.build(sample);
  const ids = Array.from(order.sectionless());
  expect(ids.length).toBe(1);
  expect(ids[0]).toBe('deprecated');
});

it('returnerar nästa krav från ett referenskrav', async () => {
  const sample = new Webpage({ id: 42 }, 'statement');
  const sequence = [
    null,
    'tables',
    'non-text-content',
    'contrast',
    'statement',
  ];
  sample.id = 13;
  await order.build(sample);
  for (const [index, reference] of sequence.entries()) {
    expect(order.next(reference)).toBe(sequence[index + 1] ?? null);
  }
});

it('returnerar nästa ogranskade krav från ett referenskrav', async () => {
  const chk = (id, state) => ({ id, applicable: true, state });
  const sample = new Webpage({ id: 42 }, 'start');
  sample.id = 13;
  await order.build(sample);
  sample.requirement('tables').setCheck(chk('a', true));
  sample.requirement('non-text-content').setCheck(chk('b', true));
  sample.requirement('contrast').setCheck(chk('c', undefined));
  expect(order.skip('tables')).toBe('contrast');
  expect(order.skip('contrast')).toBe(null);
});

it('returnerar föregående krav från ett referenskrav', async () => {
  const sample = new Webpage({ id: 42 }, 'statement');
  const sequence = ['statement', 'contrast', 'non-text-content', 'tables'];
  sample.id = 13;
  await order.build(sample);
  for (const [index, reference] of sequence.entries()) {
    expect(order.previous(reference)).toBe(sequence[index + 1] ?? null);
  }
});

// Importera beroenden.
import { Component, NonWebDocument, Webpage } from '../../js/model/sample.js';
import { Requirement } from '../../js/model/Requirement.js';
import { RequirementOrder } from '../../js/controller/RequirementOrder.js';
import { beforeEach, expect, it, mock } from '../functions.js';

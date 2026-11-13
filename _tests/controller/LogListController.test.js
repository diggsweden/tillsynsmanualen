/**
 * Enhetstest för loggnoteringslistingscontrollern.
 *
 * @see LogListController
 */

let context;
let controller;
let model;
let view;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Modellen.
  model = mock.model(
    {
      _case: {
        _log: [],
        organization: { name: 'Acme' },
        service: { name: 'Test' },
        toString: () => '2020-1234',
        *log() {
          for (const entry of model._case._log) {
            yield entry;
          }
        },
      },
    },
    {
      getCase: async (i) => ({ 42: model._case })[i] ?? null,
    }
  );

  // Vyn.
  view = mock.view(
    {
      breadcrumbs: mock.breadcrumbTrail(),
      heading: '',
    },
    {
      addEntry: () => {},
    }
  );

  // Applikationskontexten.
  context = mock.appContext({ case: 42 });

  // Skapa en controllerinstans.
  controller = new LogListController(model, view, mock.globals());
});

it('sätter titel, rubrik och länkstig', async () => {
  const title = 'Ärendelogg 2020-1234';
  await controller.prepare(context);
  expect(view.title).toBe(title);
  expect(view.heading).toBe(title);
  const { breadcrumbs } = view;
  expect(breadcrumbs.case).toHaveBeenCalled.with(
    42,
    '2020-1234',
    'Acme',
    'Test'
  );
  expect(breadcrumbs.current).toBe('Ärendelogg');
});

it('sätter sökväg i skapalänken', async () => {
  await controller.prepare(context);
  expect(view.create).toBe('?page=log&case=42&new');
});

it.with(
  ['received', 'action plan', '\u2193', '\u2611', 'inkommen', 'åtgärdsplan'],
  ['received', 'appeal', '\u2193', '\u2709', 'inkommen', 'överklagande'],
  [
    'internal',
    'audit finish',
    '\u21e2',
    '\u23f9',
    'intern',
    'granskning avslutad',
  ],
  [
    'internal',
    'audit start',
    '\u21e2',
    '\u23f5',
    'intern',
    'granskning påbörjad',
  ],
  ['internal', 'open case', '\u21e2', '\u23f5', 'intern', 'ärende öppnat'],
  ['received', 'deferment', '\u2193', '\u2709', 'inkommen', 'anståndsansökan'],
  ['sent', 'email', '\u2191', '\u2709', 'skickad', 'e-brev'],
  ['sent', 'injunction', '\u2191', '§', 'skickad', 'förläggande'],
  ['received', 'letter', '\u2193', '\u2709', 'inkommen', 'brev'],
  ['internal', 'minutes', '\u21e2', '\u275e', 'intern', 'mötesanteckning'],
  ['internal', 'note', '\u21e2', '\u270e', 'intern', 'tjänsteanteckning'],
  [
    'sent',
    'notification',
    '\u2191',
    '\u2310',
    'skickad',
    'avisering om granskning',
  ],
  ['internal', 'other', '\u21e2', '\u2318', 'intern', 'övrigt'],
  ['sent', 'remarks', '\u2191', '§', 'skickad', 'påpekande'],
  ['received', 'telephone', '\u2193', '\u260e', 'inkommen', 'telefonsamtal']
)(
  'populerar listan med {4} notering av typ {5}',
  async (direction, type, dirSym, typeSym) => {
    const timestamp = new Date('2020-09-23T12:34:56+02:00');
    model._case._log = [
      {
        direction,
        id: 13,
        summary: 'test',
        text: 'test test',
        timestamp,
        type,
      },
    ];
    await controller.prepare(context);
    expect(view.addEntry)
      .toHaveBeenCalled.once()
      .with('?page=log&entry=13', typeSym, dirSym, timestamp, 'test');
  }
);

// Importera beroenden.
import { LogListController } from '../../js/controller/LogListController.js';
import { beforeEach, expect, it, mock } from '../functions.js';

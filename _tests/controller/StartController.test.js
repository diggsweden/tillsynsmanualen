/**
 * Enhetstestfall för granskningsstartsidans controller.
 *
 * @license CC-BY 4.0
 * @see StartController
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
      advancedMode: false,
      caseDirectory: null,
      _cases: [],
      _officers: [],
      _schedules: [],
      _supervisors: [],
    },
    {
      allCases: async () => model._cases,
      allSchedules: async () => model._schedules,
      peopleByRole: async (r) =>
        ({
          officer: model._officers,
          supervisor: model._supervisors,
        })[r] ?? [],
    }
  );

  // Vyinstans.
  view = mock.view(
    { breadcrumbs: mock.breadcrumbTrail() },
    { checkStep: () => {} }
  );

  // Mocka applikationskontexten.
  context = mock.appContext({ path: '?page=test' });

  // Skapa en controller-instans.
  controller = new StartController(model, view, mock.globals());
});

it.with([false, 'förenklat'], [true, 'avancerat'])(
  'visar ifyllda markeringar för utförda steg i {1} visningsläge',
  async (advanced, label) => {
    model.advancedMode = advanced;
    view.advancedMode = advanced;
    const c = '&id=69';
    const expected = [];
    const i = '&id=';
    const p = '?page=';
    const r = '&role=';
    const ret = (t) => `&return=start%26target%3Dstep-${t}`;
    const s = `${r}supervisor`;
    const t = '&type=';
    model._cases = [{ id: 13 }, { id: 42 }];
    model._officers = [{ id: 1 }, { id: 2 }];

    expected.push(['officer', true, `${p}list${t}person${r}officer`]);
    if (advanced) {
      model.caseDirectory = 'G:\\Test';
      model._schedules = [{ id: 69 }];
      model._supervisors = [{ id: 3 }];
      expected.push([
        'supervisor',
        true,
        `${p}person${s}${ret('supervisor')}${i}3`,
      ]);
      expected.push(['dir', true, `${p}directory${ret('dir')}`]);
      expected.push(['schedule', true, `${p}schedule${ret('schedule')}${c}`]);
    }
    expected.push(['cases', true, `${p}list${t}case`]);

    await controller.prepare(context);
    const bc = view.breadcrumbs;
    expect(bc.deleteRoot).toHaveBeenCalled.once();
    expect(bc.current).toBe('Granska');
    expect(view.checkStep).toHaveBeenCalled.with(...expected);
  }
);

// Importera beroenden.
import { StartController } from '../../js/controller/StartController.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

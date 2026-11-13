/**
 * Enhetstestfall för tillsynsplanredigeringssidans controller.
 *
 * @license CC-BY 4.0
 * @see ScheduleController
 */

const supervisors = [
  new Person({
    email: 'julia.jurist@digg.se',
    fName: 'Jurist',
    gName: 'Julia',
    roles: ['supervisor'],
    tel: '0771-11 44 00',
  }),
];
supervisors[0].id = 42;

let context;
let controller;
let model;
let view;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Vyn.
  view = mock.view(
    {
      begins: '',
      breadcrumbs: mock.breadcrumbTrail(),
      caseNnumber: '',
      date: '',
      ends: '',
      familyName: '',
      supervisor: '',
      supervisors: [],
      title: 'Ny tillsynsplan',
    },
    {
      confirm: async () => true,
      disableRemove: () => {},
    }
  );
});

describe('Förbered sidvisning vid nyskapande', () => {
  beforeEach(() => {
    // Modellen.
    model = mock.model({
      peopleByRole: async () => supervisors,
    });

    // Applikationskontexten.
    context = mock.appContext({ path: '?page=test' });

    // Skapa en controller-instans.
    controller = new ScheduleController(model, view, mock.globals());
  });

  it('sätter titel och länkstig', async () => {
    await controller.prepare(context);
    const bc = view.breadcrumbs;
    expect(bc.list).toHaveBeenCalled.once().with('schedule', 'Tillsynsplaner');
    expect(bc.current).toBe('Ny tillsynsplan');
    expect(view.title).toBe('Ny tillsynsplan');
  });

  it('populerar listan med tillsynsansvariga', async () => {
    await controller.prepare(context);
    expect(view.supervisors).toEqual([
      { label: 'Julia Jurist', value: 'julia.jurist@digg.se' },
    ]);
  });

  it('deaktiverar ta bort-knappen', async () => {
    await controller.prepare(context);
    expect(view.disableRemove).toHaveBeenCalled.once();
  });
});

describe('Förbered sidvisning vid redigering', () => {
  let schedule;

  beforeEach(() => {
    // Modellen.
    schedule = new Schedule({
      begins: '2020-01-01',
      caseNumber: '2020-1388',
      date: '2020-09-23',
      ends: '2021-12-22',
      supervisor: supervisors[0],
    });
    schedule.id = 1;

    model = mock.model({
      getSchedule: async (i) => ({ 1: schedule })[i] ?? null,
      peopleByRole: async () => supervisors,
    });

    // Applikationskontexten.
    context = mock.appContext({
      params: { id: '1' },
      path: '?page=test',
    });

    // Skapa en controller-instans.
    controller = new ScheduleController(model, view, mock.globals());
  });

  it('sätter titel och länkstig', async () => {
    await controller.prepare(context);
    const bc = view.breadcrumbs;
    expect(bc.list).toHaveBeenCalled.once().with('schedule', 'Tillsynsplaner');
    expect(bc.current).toBe(schedule.period);
    expect(view.title).toBe(schedule.period);
  });

  it('hämtar data och populerar vyn', async () => {
    await controller.prepare(context);
    expect(view.begins).toBe(schedule.begins);
    expect(view.caseNumber).toBe(schedule.caseNumber);
    expect(view.date).toBe(schedule.date);
    expect(view.ends).toBe(schedule.ends);
    expect(view.supervisor).toBe(schedule.supervisor.email);
    expect(view.supervisors).toEqual([
      { label: 'Julia Jurist', value: 'julia.jurist@digg.se' },
    ]);
  });

  it('hanterar ej existerande tillsynsplan som ny', async () => {
    context.params.id = '2';
    await controller.prepare(context);
    const bc = view.breadcrumbs;
    expect(bc.current).toBe('Ny tillsynsplan');
    expect(view.title).toBe('Ny tillsynsplan');
    expect(view.showError).toHaveBeenCalled.once();
  });

  it('deaktiverar inte ta bort-knappen', async () => {
    await controller.prepare(context);
    expect(view.disableRemove).toHaveBeenCalled.never();
  });
});

describe('Hantera interaktion', () => {
  let schedule;

  beforeEach(() => {
    // Modellen.
    schedule = new Schedule({
      begins: '2020-01-01',
      caseNumber: '2020-1388',
      date: '2020-09-23',
      ends: '2021-12-22',
      supervisor: supervisors[0],
    });
    schedule.id = 1;

    model = mock.model(
      {
        _save: null,
      },
      {
        deleteSchedule: async () => {},
        getSchedule: async (i) => ({ 1: schedule })[i] ?? null,
        peopleByRole: async () => supervisors,
        setSchedule: async (s) => (model._save = s),
      }
    );

    // Applikationskontexten.
    context = mock.appContext({ path: '?page=test' });

    // Skapa en controller-instans.
    controller = new ScheduleController(model, view, mock.globals());
  });

  it('sätter åtgärdssökvägen i vyn', async () => {
    context.params = { return: 'start%23next' };
    await controller.prepare(context);
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(view.action).toBe('?page=start#next');
  });

  it.with(
    ['begins', new Date('2020-01-01')],
    ['date', new Date('2020-09-02')],
    ['ends', new Date('2021-12-22')]
  )("uppdaterar modellen vid ändring av '{0}'", async (target, value) => {
    const path = '?page=other';
    await controller.prepare(context);
    view.notify({ state: undefined, target, type: 'change', value });
    view.notify({ action: 'save', path, type: 'form' });
    await controller.handle(context);
    const obj = model._save;
    expect(obj).not.toBe(null);
    expect(obj[target]).toEqual(value);
  });

  it('uppdaterar modellen vid ändring av ärendenummer', async () => {
    const path = '?page=other';
    await controller.prepare(context);
    view.notify({
      state: undefined,
      target: 'caseNumber',
      type: 'change',
      value: '2020-1388',
    });
    view.notify({ action: 'save', path, type: 'form' });
    await controller.handle(context);
    const obj = model._save;
    expect(obj).not.toBe(null);
    expect(obj.caseNumber.toString()).toBe('2020-1388');
  });

  it('uppdaterar modellen vid ändring av tillsynsansvarig', async () => {
    const path = '?page=other';
    const value = supervisors[0].email;
    await controller.prepare(context);
    view.notify({
      state: undefined,
      target: 'supervisor',
      value,
    });
    view.notify({ action: 'save', path, type: 'form' });
    await controller.handle(context);
    const obj = model._save;
    expect(obj).not.toBe(null);
    expect(obj.supervisor).toEqual(supervisors[0]);
  });

  it('refuserar ogiltig ändring av beslutsdatum', async () => {
    const path = '?page=other';
    await controller.prepare(context);
    view.notify({
      state: undefined,
      target: 'date',
      value: new Date(Date.now() + 86400000),
    });
    view.notify({ path, type: 'link' });
    await controller.handle(context);
    expect(view.date).toBeAnInstanceOf(ValidationError);
  });

  it('sparar en tillsynsplan i modellen', async () => {
    const path = '?page=other';
    context.params = { id: '1' };
    await controller.prepare(context);
    view.notify({ action: 'save', path, type: 'form' });
    await controller.handle(context);
    expect(model.setSchedule).toHaveBeenCalled.once().with(schedule);
  });

  it('tar bort en tillsynsplan ur modellen', async () => {
    const path = '?page=other';
    context.params = { id: '1' };
    await controller.prepare(context);
    view.notify({ action: 'delete', path, type: 'form' });
    await controller.handle(context);
    expect(model.deleteSchedule).toHaveBeenCalled.once().with(schedule);
  });
});

// Importera beroenden.
import { Person } from '../../js/model/Person.js';
import { Schedule } from '../../js/model/Schedule.js';
import { ScheduleController } from '../../js/controller/ScheduleController.js';
import { ValidationError } from '../../js/model/ValidationError.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

/**
 * Enhetstestfall för personredigeringssidans controller.
 *
 * @license CC-BY 4.0
 * @see PersonController
 */

let context;
let controller;
let model;
let view;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Vyn.
  view = mock.view(
    {
      breadcrumbs: mock.breadcrumbTrail(),
      email: '',
      familyName: '',
      form: { action: '' },
      givenName: '',
      roles: [],
      telephone: '',
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
    model = mock.model();

    // Applikationskontexten.
    context = mock.appContext({ path: '?page=test' });

    // Skapa en controllerinstans.
    controller = new PersonController(model, view, mock.globals());
  });

  it.with([false, null, 'förenklat'], [true, 'supervisor', 'avancerat'])(
    'sätter titel och länkstig ({2} läge)',
    async (advanced, role) => {
      const titles = { false: 'granskare', true: 'tillsynsansvarig' };
      model.advancedMode = advanced;
      role && (context.params.role = role);
      await controller.prepare(context);
      const bc = view.breadcrumbs;
      expect(bc.list).toHaveBeenCalled.once().with('person', 'Personer');
      expect(bc.current).toBe(`Ny ${titles[advanced]}`);
      expect(view.title).toBe(`Ny ${titles[advanced]}`);
      expect(view.roles).toEqual([role ?? 'officer']);
    }
  );

  it('deaktiverar ta bort-knappen', async () => {
    await controller.prepare(context);
    expect(view.disableRemove).toHaveBeenCalled.once();
  });
});

describe('Förbered sidvisning vid redigering', () => {
  let person;

  beforeEach(() => {
    // Modellen.
    person = new Person({
      email: 'julia.jurist@digg.se',
      familyName: 'Jurist',
      givenName: 'Julia',
      roles: ['supervisor'],
      telephone: '0771-11 44 00',
    });
    person.id = 1;

    model = mock.model({ getPerson: async (i) => ({ 1: person })[i] ?? null });

    // Applikationskontexten.
    context = mock.appContext({
      params: { id: '1' },
      path: '?page=test',
    });

    // Skapa en controllerinstans.
    controller = new PersonController(model, view, mock.globals());
  });

  it.with([false, 'förenklat'], [true, 'avancerat'])(
    'sätter titel och länkstig ({1} läge)',
    async (advanced) => {
      model.advancedMode = advanced;
      await controller.prepare(context);
      const bc = view.breadcrumbs;
      expect(bc.list).toHaveBeenCalled.once().with('person', 'Personer');
      expect(bc.current).toBe(person.toString());
      expect(view.title).toBe(person.toString());
    }
  );

  it.with([false, 'förenklat'], [true, 'avancerat'])(
    'hämtar data och populerar vyn ({1} läge)',
    async (advanced) => {
      model.advancedMode = advanced;
      await controller.prepare(context);
      expect(view.email).toBe(person.email);
      expect(view.familyName).toBe(person.familyName);
      expect(view.givenName).toBe(person.givenName);
      expect(view.roles).toEqual(person.roles);
      expect(view.telephone).toBe(person.telephone);
    }
  );

  it('hanterar ej existerande person som ny', async () => {
    context.params.id = '2';
    await controller.prepare(context);
    const bc = view.breadcrumbs;
    expect(bc.current).toBe('Ny person');
    expect(view.title).toBe('Ny person');
    expect(view.email).toBe('');
    expect(view.familyName).toBe('');
    expect(view.givenName).toBe('');
    expect(view.roles.length).toBe(0);
    expect(view.telephone).toBe('');
    expect(view.showError).toHaveBeenCalled.once();
  });

  it('deaktiverar inte ta bort-knappen', async () => {
    await controller.prepare(context);
    expect(view.disableRemove).toHaveBeenCalled.never();
  });
});

describe('Hantera interaktion', () => {
  let hanna;
  let julia;

  beforeEach(() => {
    // Modellen.
    hanna = new Person({
      email: 'hanna.handlaggare@digg.se',
      familyName: 'Handläggare',
      givenName: 'Hanna',
      roles: ['officer'],
      telephone: '0771-11 44 00',
    });
    hanna.id = 1;

    julia = new Person({
      email: 'julia.jurist@digg.se',
      familyName: 'Jurist',
      givenName: 'Julia',
      roles: ['supervisor'],
      telephone: '0771-11 44 00',
    });
    julia.id = 2;

    model = mock.model(
      {
        _saved: null,
      },
      {
        deletePerson: async () => {},
        getPerson: async (i) =>
          ({
            1: hanna,
            2: julia,
          })[i] ?? null,
        setPerson: async (p) => (model._saved = p),
      }
    );

    // Applikationskontexten.
    context = mock.appContext({
      params: { role: 'supervisor' },
      path: '?page=test',
    });

    // Skapa en controllerinstans.
    controller = new PersonController(model, view, mock.globals());
  });

  it('sätter åtgärdssökvägen i vyn', async () => {
    context.params = { return: 'start%23next' };
    await controller.prepare(context);
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(view.action).toBe('?page=start#next');
  });

  it.with(
    ['email', 'greta.granskare@digg.se'],
    ['familyName', 'Greta'],
    ['givenName', 'Granskare'],
    ['telephone', '0771114400', '0771-11 44 00']
  )(
    "uppdaterar modellen vid ändring av '{0}'",
    async (target, value, result = value) => {
      const path = '?page=other';
      await controller.prepare(context);
      view.notify({ state: undefined, target, type: 'change', value });
      view.notify({ action: 'save', path, type: 'form' });
      await controller.handle(context);
      const obj = model._saved;
      expect(obj).not.toBe(null);
      expect(obj[target]).toBe(result);
    }
  );

  it('uppdaterar modellen vid ändring av roll', async () => {
    const path = '?page=other';
    const role = (value, state) => ({
      state,
      target: `role-${value}`,
      type: 'change',
      value,
    });
    await controller.prepare(context);
    view.notify(role('officer', true), role('supervisor', false));
    view.notify({ action: 'save', path, type: 'form' });
    await controller.handle(context);
    const obj = model._saved;
    expect(obj).not.toBe(null);
    expect(obj.roles).toEqual(['officer']);
  });

  it.with(['email', 'hanna.handlaggare%digg.se'], ['telephone', '114400'])(
    "refuserar ogiltig ändring av '{0}'",
    async (target, value) => {
      const path = '?page=other';
      await controller.prepare(context);
      view.notify({ state: undefined, target, type: 'change', value });
      view.notify({ path, type: 'link' });
      await controller.handle(context);
      expect(view[target]).toBeAnInstanceOf(ValidationError);
    }
  );

  it('sparar personinformation i modellen', async () => {
    const path = '?page=other';
    context.params = { id: '2' };
    await controller.prepare(context);
    view.notify({ action: 'save', path, type: 'form' });
    await controller.handle(context);
    expect(view.confirm).toHaveBeenCalled.never();
    expect(model.setPerson).toHaveBeenCalled.once().with(julia);
  });

  it('tar bort personinformation ur modellen', async () => {
    const path = '?page=other';
    context.params = { id: '1' };
    await controller.prepare(context);
    view.notify({ target: 'email', type: 'change', value: 'other@digg.se' });
    view.notify({ action: 'delete', path, type: 'form' });
    await controller.handle(context);
    expect(view.confirm).toHaveBeenCalled.once();
    expect(model.deletePerson).toHaveBeenCalled.once().with(1);
  });
});

// Importera beroenden.
import { Person } from '../../js/model/Person.js';
import { PersonController } from '../../js/controller/PersonController.js';
import { ValidationError } from '../../js/model/ValidationError.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

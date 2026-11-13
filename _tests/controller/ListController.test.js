/**
 * Enhetstestfall för listningssidans controller.
 *
 * @license CC-BY 4.0
 * @see ListController
 */

describe('Personer', () => {
  let context;
  let controller;
  let view;

  beforeEach(() => {
    // Modellen.
    const person = new Person({
      email: 'greta.granskare@digg.se',
      fName: 'Granskare',
      gName: 'Greta',
      roles: ['officer'],
    });
    person.id = 2;

    const model = mock.model({
      allPeople: async () => [person],
    });

    // Vyn.
    view = mock.view(
      {
        emptyMessage: '',
        heading: '',
        listClass: '',
      },
      {
        addLink: () => {},
        setCreate: () => {},
      }
    );

    // Applikationskontexten.
    context = mock.appContext({ params: { type: 'person' } });

    // Skapa en contollerinstans.
    controller = new ListController(model, view, null, mock.globals());
  });

  it('sätter siditeln', async () => {
    await controller.prepare(context);
    expect(view.title).toBe('Personer');
  });

  it('sätter sidrubriken', async () => {
    await controller.prepare(context);
    expect(view.heading).toBe('Personer');
  });

  it('lägger till sida i länkstigen', async () => {
    await controller.prepare(context);
    expect(view.breadcrumbs.current).toBe('Personer');
  });

  it('sätter tom-meddelande på listan', async () => {
    await controller.prepare(context);
    expect(view.emptyMessage).toBe('Inga personer');
  });

  it('sätter listklass', async () => {
    await controller.prepare(context);
    expect(view.listClass).toBe('person');
  });

  it('sätter skapa-länken till personsidan', async () => {
    await controller.prepare(context);
    expect(view.setCreate)
      .toHaveBeenCalled.once()
      .with('?page=person', 'ico-person', 'Ny person');
  });

  it('lägger till alla personinstanser i modellen', async () => {
    await controller.prepare(context);
    expect(view.addLink)
      .toHaveBeenCalled.once()
      .with('ico-person', 'greta.granskare@digg.se', '?page=person&id=2', [
        'Granskare, Greta',
        'handläggare',
      ]);
  });
});

describe('Tillsynsplaner', () => {
  let context;
  let controller;
  let view;

  beforeEach(() => {
    // Modellen.
    const schedule = new Schedule({
      begins: new Date('2020-01-01').getTime(),
      case: 20201388,
      date: new Date('2020-09-02').getTime(),
      ends: new Date('2021-12-22').getTime(),
    });
    schedule.id = 42;

    const model = mock.model({
      allSchedules: async () => [schedule],
    });

    // Vyn.
    view = mock.view(
      {
        emptyMessage: '',
        heading: '',
        listClass: '',
      },
      {
        addLink: () => {},
        setCreate: () => {},
      }
    );

    // Applikationskontexten.
    context = mock.appContext({ params: { type: 'schedule' } });

    // Skapa en contollerinstans.
    controller = new ListController(model, view, null, mock.globals());
  });

  it('sätter siditeln', async () => {
    await controller.prepare(context);
    expect(view.title).toBe('Tillsynsplaner');
  });

  it('sätter sidrubriken', async () => {
    await controller.prepare(context);
    expect(view.heading).toBe('Tillsynsplaner');
  });

  it('lägger till sida i länkstigen', async () => {
    await controller.prepare(context);
    expect(view.breadcrumbs.current).toBe('Tillsynsplaner');
  });

  it('sätter tom-meddelande på listan', async () => {
    await controller.prepare(context);
    expect(view.emptyMessage).toBe('Inga tillsynsplaner');
  });

  it('sätter listklass', async () => {
    await controller.prepare(context);
    expect(view.listClass).toBe('schedule');
  });

  it('sätter skapa-länken till tillsynsplansidan', async () => {
    await controller.prepare(context);
    expect(view.setCreate)
      .toHaveBeenCalled.once()
      .with('?page=schedule', 'ico-document', 'Ny tillsynsplan');
  });

  it('lägger till alla tillsynsplaninstanser i modellen', async () => {
    await controller.prepare(context);
    expect(view.addLink)
      .toHaveBeenCalled.once()
      .with('ico-document', 20201388, '?page=schedule&id=42', [
        '2020-1388',
        '2020–2021',
      ]);
  });
});

describe('Ärenden', () => {
  let aCase;
  let context;
  let controller;
  let data;
  let model;
  let view;

  beforeEach(() => {
    // Modellen.
    const mkCase = (id) => {
      const aCase = new AuditCase();
      aCase.caseNumber = 20201234;
      aCase.id = id;
      aCase.service = { name: 'digg.se' };
      return aCase;
    };

    aCase = mkCase(13);

    model = mock.model({
      allCases: async () => [aCase],
      deleteCase: async () => {},
      unserialize: async () => mkCase(42),
    });

    // Vyn.
    view = mock.view(
      {
        emptyMessage: '',
        heading: '',
        listClass: '',
      },
      {
        addLink: () => {},
        confirm: async () => true,
        enableUpload: () => {},
        replaceLink: () => {},
        setCreate: () => {},
      }
    );

    // Applikationskontexten.
    context = mock.appContext({ params: { type: 'case' } });

    // Filläsaren.
    data = {
      class: 'ComplaintCase',
      cn: 20201234,
      service: { class: 'Website', name: 'digg.se' },
    };

    const reader = mock.eventTarget(
      '',
      {
        mock: true,
      },
      {
        get result() {
          return JSON.stringify(data);
        },
        readAsText: (f) => reader.triggerEvent({ type: 'load' }),
      }
    );

    // Skapa en contollerinstans.
    controller = new ListController(model, view, reader, mock.globals());
  });

  it('sätter siditeln', async () => {
    await controller.prepare(context);
    expect(view.title).toBe('Ärenden');
  });

  it('sätter sidrubriken', async () => {
    await controller.prepare(context);
    expect(view.heading).toBe('Ärenden');
  });

  it('lägger till sida i länkstigen', async () => {
    await controller.prepare(context);
    expect(view.breadcrumbs.current).toBe('Ärenden');
  });

  it('sätter tom-meddelande på listan', async () => {
    await controller.prepare(context);
    expect(view.emptyMessage).toBe('Inga ärenden');
  });

  it('sätter listklass', async () => {
    await controller.prepare(context);
    expect(view.listClass).toBe('case');
  });

  it('sätter skapa-länken till ärendesidan', async () => {
    await controller.prepare(context);
    expect(view.setCreate)
      .toHaveBeenCalled.once()
      .with('?page=case', 'ico-case', 'Nytt ärende');
  });

  it('lägger till alla ärenden i modellen', async () => {
    await controller.prepare(context);
    expect(view.addLink)
      .toHaveBeenCalled.once()
      .with('ico-case', 20201234, '?page=case&case=13', [
        '2020-1234',
        'digg.se',
      ]);
  });

  it('visar felmeddelande vid dra-och-släpp av icke-JSON-fil', async () => {
    data = '<html></html>';
    await controller.prepare(context);
    view.notify({
      action: 'drop',
      trigger: { focus: () => {} },
      type: 'upload',
      value: [{ name: 'test.html', type: 'text/html' }],
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(view.showError).toHaveBeenCalled.once();
  });

  it('visar felmeddelande vid uppladdning av icke-JSON-fil', async () => {
    data = '<html></html>';
    await controller.prepare(context);
    view.notify({
      action: undefined,
      trigger: { focus: () => {} },
      type: 'upload',
      value: { name: 'test.html', type: 'text/html' },
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(view.showError).toHaveBeenCalled.once();
  });

  it('visar felmeddelande vid dra-och-släpp av ogiltig fil', async () => {
    data = 'Not JSON';
    await controller.prepare(context);
    view.notify({
      action: 'drop',
      trigger: { focus: () => {} },
      type: 'upload',
      value: [{ name: 'test.json', type: 'application/json' }],
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(view.showError).toHaveBeenCalled.once();
  });

  it('visar felmeddelande vid uppladdning av ogiltig fil', async () => {
    data = '{foo: 42}';
    await controller.prepare(context);
    view.notify({
      action: undefined,
      trigger: { focus: () => {} },
      type: 'upload',
      value: { name: 'test.json', type: 'application/json' },
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(view.showError).toHaveBeenCalled.once();
  });

  it('läser in existerande ärende från fil som laddats upp', async () => {
    await controller.prepare(context);
    view.notify({
      action: undefined,
      trigger: { focus: () => {} },
      type: 'upload',
      value: { name: 'test.js', type: 'application/json' },
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(view.confirm).toHaveBeenCalled.once();
    expect(model.unserialize).toHaveBeenCalled.once().with(data);
    expect(model.deleteCase).toHaveBeenCalled.once().with(13);
    expect(view.replaceLink)
      .toHaveBeenCalled.once()
      .with(20201234, '?page=case&case=42', ['2020-1234', 'digg.se']);
  });

  it('läser in nytt ärende från fil via dra-och-släpp', async () => {
    await controller.prepare(context);
    view.notify({
      action: 'drop',
      trigger: null,
      type: 'upload',
      value: [{ name: 'test.js', type: 'application/json' }],
    });
    view.notify({ path: '?page=other', type: 'link' });
    await controller.handle(context);
    expect(model.unserialize).toHaveBeenCalled.once().with(data);
    expect(view.replaceLink)
      .toHaveBeenCalled.once()
      .with(20201234, '?page=case&case=42', ['2020-1234', 'digg.se']);
  });
});

// Importera beroenden.
import { AuditCase } from '../../js/model/case.js';
import { ListController } from '../../js/controller/ListController.js';
import { Person } from '../../js/model/Person.js';
import { Schedule } from '../../js/model/Schedule.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

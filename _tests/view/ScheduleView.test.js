/**
 * Enhetstestfall för tillsynsplanredigeringssidans vy.
 *
 * @license CC-BY 4.0
 * @see ScheduleView
 */

let article;
let status;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Artikelelementet: basklassen sätter och tar bort klasser samt
  // populerar det med sidinnehåll.
  article = {
    classList: mock.domTokenList(),
    innerHTML: '',
    querySelectorAll: () => [],
  };

  // Statusbehållaren: några attribut ska uppdateras av basklassen.
  status = mock.element('div');
});

describe('Åtkomst till formulärfält', () => {
  let form;
  let view;

  beforeEach(() => {
    // Formuläret.
    form = mock.eventTarget(
      'form',
      {
        begins: mock.input('date', 'begins'),
        caseNumber: mock.input('text', 'caseNumber'),
        date: mock.input('date', 'date'),
        ends: mock.input('date', 'ends'),
        supervisor: mock.select('supervisor', [1, 2, 3, 4, 5]),
        _delete: mock.element('button'),
      },
      {
        querySelector: (s) =>
          ({
            'button[value="delete"]': form._delete,
          })[s] ?? null,
        querySelectorAll: () => [],
      }
    );

    article.querySelector = (s) => ({ form })[s] ?? null;

    // DOM-dokumentet.
    const doc = {
      body: mock.element('body'),
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Skapa en vyinstans.
    view = new ScheduleView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      doc
    );
  });

  it.with(
    ['begins', new Date('2020-01-01')],
    ['caseNumber', '2020-1388'],
    ['date', new Date('2020-09-02')],
    ['ends', new Date('2021-12-22')],
    ['supervisor', 'julia.jurist@digg.se']
  )("skriver och läser värde i fältet '{0}'", async (field, value) => {
    const valueOf = (v) => v.toLocaleDateString?.('sv') ?? v;
    await view.open();
    view[field] = value;
    expect(form[field].value).toEqual(valueOf(value));
    expect(view[field]).toEqual(value);
  });

  it.with(
    ['caseNumber', '1388'],
    ['date', new Date(`${new Date().getFullYear() + 1}-01-01`)]
  )("sätter felmeddelande i fältet '{0}'", async (field, value) => {
    const msg = 'ERROR';
    const err = new ValidationError(msg, value);
    const valueOf = (v) => v.toLocaleDateString?.('sv') ?? v;
    await view.open();
    view[field] = err;
    expect(form[field].value).toEqual(valueOf(value));
    expect(view[field]).toEqual(value);
    expect(form[field].setCustomValidity).toHaveBeenCalled.once().with(msg);
  });

  it('sätter maxvärde för beslutsdatum', async () => {
    const date = new Date();
    await view.open();
    view.maxDate = date;
    expect(form.date.max).toBe(date.toLocaleDateString('sv'));
  });

  it('populerar listan med tillsynsansvariga', async () => {
    const select = form.supervisor;
    const supervisors = [
      { label: 'Anders Advokat', value: '1' },
      { label: 'Julia Jurist', value: '2' },
    ];
    await view.open();
    view.supervisors = supervisors;

    // Ska ha tagit bort alla element i listan utom det första och
    // sedan lagt till två Option-element.
    expect(select.children.length).toBe(3);

    expect(select.children[1].label).toBe('Anders Advokat');
    expect(select.children[1].value).toBe('1');

    expect(select.children[2].label).toBe('Julia Jurist');
    expect(select.children[2].value).toBe('2');
  });

  it('avaktiverar Ta bort-knappen', async () => {
    await view.open();
    expect(form._delete.disabled).toBe(false);
    view.disableRemove();
    expect(form._delete.disabled).toBe(true);
  });

  it.with(
    ['begins', new Date('2020-01-01')],
    ['caseNumber', '2020-1388'],
    ['date', new Date('2020-09-02')],
    ['ends', new Date('2021-12-22')],
    ['supervisor', '2']
  )(
    "meddelar observatörer vid ändring i fältet '{0}'",
    async (field, value) => {
      let notified = false;
      await view.open();
      view.activate();
      view.subscribe((e) => {
        notified = true;
        expect(e.state).toBe(undefined);
        expect(e.target).toBe(field);
        expect(e.value).toEqual(value);
      });
      form[field].value = value;
      form.triggerEvent({
        target: form[field],
        type: 'change',
      });
      expect(notified).toBe(true);
    }
  );
});

describe('Spara och ta bort tillsynsplan', () => {
  let dialog;
  let form;
  let view;

  beforeEach(() => {
    // Bekräftelsedialog och formulär.
    dialog = mock.confirmDialog();
    form = mock.eventTarget('form', { querySelectorAll: () => [] });

    article.querySelector = (s) => ({ form })[s] ?? null;

    // DOM-dokumentet.
    const doc = {
      body: mock.element('body'),
      getElementById: (s) => ({ 'confirm-dialog': dialog })[s] ?? null,
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Skapa en vyinstans.
    view = new ScheduleView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      doc
    );
  });

  it.with(['save', 'spara'], ['delete', 'ta bort'])(
    'meddelar observatörer vid {1}',
    async (value) => {
      let notified = false;
      const path = '?page=other';
      await view.open();
      view.activate();
      view.subscribe((e) => {
        notified = true;
        expect(e.action).toBe(value);
        expect(e.path).toBe(path);
        expect(e.type).toBe('form');
      });
      form.triggerEvent({
        submitter: { value, getAttribute: () => path },
        type: 'submit',
      });
    }
  );

  it('visar bekräftelsedialog', async () => {
    const prompt = 'Test';
    const trigger = mock({ focus: () => {} });
    dialog.returnValue = 'true';
    await view.open();
    view.activate();
    setTimeout(() => dialog.triggerEvent({ type: 'close' }), 0);
    const ok = await view.confirm(prompt, trigger);
    expect(ok).toBe(true);
    expect(dialog.prompt.textContent).toBe(prompt);
    expect(dialog.showModal).toHaveBeenCalled.once();
    expect(trigger.focus).toHaveBeenCalled.once();
  });
});

// Importera beroenden.
import { ScheduleView } from '../../js/view/ScheduleView.js';
import { ValidationError } from '../../js/model/ValidationError.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

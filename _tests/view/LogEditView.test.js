/**
 * Enhetstestfall för redigeringsvyn för loggnoteringar.
 *
 * @see LogEditView
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
    const option = (value) => mock.element('option', { value }, {});

    // Formuläret.
    form = mock.eventTarget(
      'form',
      {
        confirm: mock.confirmDialog(),
        data: mock.element(
          'select',
          {
            children: [option('')],
            name: 'data',
            value: '',
            get length() {
              return form.data.children.length;
            },
            get options() {
              return form.data.children;
            },
            get previousElementSibling() {
              form.dataLabel.children[0].parentNode = form.dataLabel;
              return form.dataLabel.children[0];
            },
          },
          {
            add: (o) => form.data.children.push(o),
            checkValidity: () => true,
            setCustomValidity: () => {},
          }
        ),
        dataLabel: mock.element(
          'label',
          {
            children: [mock.element('span', { textContent: 'Granskning' }, {})],
          },
          {}
        ),
        direction: mock.select('direction', [
          option(''),
          option('received'),
          option('internal'),
          option('sent'),
        ]),
        summary: mock.input('text', 'summary'),
        text: mock.textarea('text'),
        timestamp: mock.input('datetime-local', 'timestamp'),
        type: mock.select('type', [
          option(''),
          option('deferment'),
          option('notification'),
          option('letter'),
          option('email'),
          option('injunction'),
          option('finish audit'),
          option('start audit'),
          option('minutes'),
          option('remarks'),
          option('telephone'),
          option('note'),
          option('open case'),
          option('appeal'),
          option('other'),
        ]),
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
      createElement: (t) => mock.element(t),
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Skapa en vyinstans.
    view = new LogEditView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      doc
    );
  });

  it.with(
    ['data', '1600819200000'],
    ['direction', 'sent'],
    ['summary', 'test'],
    ['text', 'test'],
    ['timestamp', new Date('2020-09-23T12:34:00+02:00')],
    ['type', 'action plan']
  )("skriver och läser värde i fältet '{0}'", async (field, value) => {
    const d = (v) => v.toLocaleDateString?.('sv');
    const dt = (d, t) => (d ? `${d}T${t}` : d);
    const t = (v) => v.toLocaleTimeString?.('sv').slice(0, 5);
    const timeOf = (v) => v.getTime?.() ?? v;
    const valueOf = (v) => dt(d(v), t(v)) ?? v;
    await view.open();
    view[field] = value;
    expect(form[field].value).toEqual(valueOf(value));
    expect(view[field]).toEqual(timeOf(value));
  });

  it('sätter sammanfattning om fältet är tomt', async () => {
    const suggestion = 'test suggestion';
    await view.open();
    let result = view.suggestSummary(suggestion);
    expect(result).toBe(suggestion);
    result = view.suggestSummary('something different');
    expect(result).toBe(suggestion);
  });

  it('avaktiverar datalistan', async () => {
    await view.open();
    view.disableData(true);
    expect(form.data.disabled).toBe(true);
  });

  it('avaktiverar riktningslistan', async () => {
    await view.open();
    view.disableDirection(true);
    expect(form.direction.disabled).toBe(true);
  });

  it('avaktiverar noteringstyper', async () => {
    const types = ['finish audit', 'start audit', 'open case'];
    await view.open();
    view.disableTypes(types);
    for (const opt of form.type.options) {
      expect(opt.disabled).toBe(types.includes(opt.value));
    }
  });

  it('avaktiverar Ta bort-knappen', async () => {
    await view.open();
    view.disableRemove();
    expect(form._delete.disabled).toBe(true);
  });

  it('sätter skrivskyddat läge', async () => {
    await view.open();
    view.readOnly = true;
    expect(form.data.disabled).toBe(true);
    expect(form.direction.disabled).toBe(true);
    expect(form.type.disabled).toBe(true);
    expect(form.summary.readOnly).toBe(true);
    expect(form.timestamp.readOnly).toBe(true);
  });

  it('gör datafältet obligatoriskt', async () => {
    await view.open();
    view.requireData(true);
    expect(form.data.required).toBe(true);
    expect(form.dataLabel.children[0].tagName).toBe('EM');
    expect(form.dataLabel.children[0].textContent).toBe('Granskning');
  });

  it('populerar datalistan', async () => {
    const data = [
      ['1', 'first'],
      ['2', 'second'],
    ];
    await view.open();
    view.setData(data);
    for (const [index, [value, label]] of data.entries()) {
      expect(form.data.options[index + 1].label).toBe(label);
      expect(form.data.options[index + 1].value).toBe(value);
    }
  });

  it.with(
    ['data', '1600819200000'],
    ['direction', 'sent'],
    ['summary', 'Notification sent'],
    ['text', 'Sent notification to info@example.com.'],
    ['timestamp', 1600857240000],
    ['type', 'notification']
  )(
    "meddelar observatörer vid ändring i fältet '{0}'",
    async (target, value) => {
      let notified = false;
      const valueOf = (v) => ('number' === typeof v ? new Date(v) : v);
      await view.open();
      view.activate();
      view.subscribe((e) => {
        notified = true;
        expect(e.target).toBe(target);
        expect(e.type).toBe('change');
        expect(e.value).toEqual(valueOf(value));
      });
      form[target].value = value;
      form.triggerEvent({ target: form[target], type: 'change' });
      expect(notified).toBe(true);
    }
  );
});

describe('Spara och ta bort loggnotering', () => {
  let dialog;
  let form;
  let view;

  beforeEach(() => {
    // Formuläret.
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
    view = new LogEditView(
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
import { LogEditView } from '../../js/view/LogEditView.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

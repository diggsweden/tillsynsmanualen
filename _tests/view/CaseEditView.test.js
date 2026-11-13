/**
 * Enhetstestfall för ärenderedigeringssidans vy.
 *
 * @license CC-BY 4.0
 * @see CaseEditView
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
  };

  // Statusbehållaren: några attribut ska uppdateras av basklassen.
  status = mock.element('div');
});

describe('Åtkomst till formulärfält', () => {
  let form;
  let tabs;
  let view;

  beforeEach(() => {
    // Formuläret.
    const access = mock.radioGroup(
      'access',
      'public',
      'public',
      'extranet',
      'intranet'
    );

    const caseType = mock.radioGroup(
      'caseType',
      'monitoring',
      'monitoring',
      'complaint'
    );

    const serviceType = mock.radioGroup(
      'serviceType',
      'website',
      'website',
      'app'
    );

    form = mock.eventTarget(
      'form',
      {
        abbr: mock.input('text', 'abbr'),
        access,
        addr: mock.textarea('addr'),
        appOS: mock.input('text', 'appOS', '', { disabled: true }),
        auth: mock.checkbox(false, { name: 'auth' }),
        caseNumber: mock.input('text', 'caseNumber'),
        caseType,
        date: mock.input('date', 'date', '', { disabled: true }),
        email: mock.input('email', 'email'),
        org: mock.input('text', 'org'),
        regNo: mock.input('text', 'regNo'),
        schedule: mock.select('schedule'),
        service: mock.input('text', 'service'),
        serviceType,
        supervisor: mock.select('supervisor', [], { disabled: true }),
        tel: mock.input('tel', 'tel'),
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
    article.querySelectorAll = () => [];

    // Tabbflikslistan: ska kopplas och frikopplas. Panel ska väljas vid
    // valideringsfel.
    tabs = mock({
      attach: () => {},
      detach: () => {},
      selectPanel: () => {},
    });

    // DOM-dokumentet.
    const doc = {
      body: mock.element('body'),
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Villkorsstyrning.
    const fakeViewCondition = {
      apply: () => {},
      disconnect: () => {},
      observe: () => {},
    };

    // Skapa en vyinstans.
    view = new CaseEditView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      tabs,
      fakeViewCondition,
      doc
    );
  });

  it.with(
    ['abbr', 'DIGG'],
    ['access', 'public'],
    ['addr', 'Box 14,\n85102 Sundsvall'],
    ['appOS', 'Android'],
    ['caseNumber', '2020-1234'],
    ['email', 'info@digg.se'],
    ['org', 'Myndigheten för digital förvaltning'],
    ['regNo', '202100-6883'],
    ['schedule', '2020-1388'],
    ['service', 'digg.se'],
    ['supervisor', 'julia.jurist@digg.se'],
    ['tel', '0771-11 44 00']
  )("skriver och läser värde i fältet '{0}'", async (field, value) => {
    await view.open();
    view[field] = value;
    expect(form[field].value).toBe(value);
    expect(view[field]).toBe(value);
  });

  it.with(
    ['caseNumber', '1234'],
    ['date', new Date(Date.now() + 86400000)],
    ['email', 'info@%igg.se'],
    ['regNo', '202100-6884'],
    ['tel', '11 44 00']
  )("sätter felmeddelande i fältet '{0}'", async (field, value) => {
    const msg = 'ERROR';
    const err = new ValidationError(msg, value);
    const valueOf = (v) => v.toLocaleDateString?.('sv') ?? v;
    await view.open();
    view[field] = err;
    expect(form[field].value).toEqual(valueOf(value));
    expect(view[field]).toEqual(valueOf(value));
    expect(form[field].setCustomValidity).toHaveBeenCalled.once().with(msg);
  });

  it('sätter autentiseringsflaggan', async () => {
    await view.open();
    view.auth = true;
    expect(form.auth.checked).toBe(true);
    expect(view.auth).toBe(true);
  });

  it('avaktiverar övervakningsärende', async () => {
    await view.open();
    view.disableMonitoring();
    expect(form.caseType.value).toBe('complaint');
    expect(form.caseType.entries[0].disabled).toBe(true);
  });

  it('avaktiverar Ta bort-knappen', async () => {
    await view.open();
    expect(form._delete.disabled).toBe(false);
    view.disableRemove();
    expect(form._delete.disabled).toBe(true);
  });

  it.with(
    ['abbr', 'DIGG'],
    ['access', 'public'],
    ['addr', 'Box 14,\n85102 Sundsvall'],
    ['appOS', 'Android'],
    ['caseNumber', '2020-1234'],
    ['email', 'info@digg.se'],
    ['org', 'Myndigheten för digital förvaltning'],
    ['regNo', '202100-6883'],
    ['schedule', '2020-1388'],
    ['service', 'digg.se'],
    ['supervisor', 'julia.jurist@digg.se'],
    ['tel', '0771-11 44 00']
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
        expect(e.value).toBe(value);
      });
      form[field].value = value;
      form.triggerEvent({
        target: form[field],
        type: 'change',
      });
      expect(notified).toBe(true);
    }
  );

  it("meddelar observatörer vid ändring i fältet 'auth'", async () => {
    let notified = false;
    await view.open();
    view.activate();
    view.subscribe((e) => {
      notified = true;
      expect(e.state).toBe(true);
      expect(e.target).toBe('auth');
      expect(e.value).toBe('');
    });
    form.auth.checked = true;
    form.triggerEvent({
      target: form.auth,
      type: 'change',
    });
    expect(notified).toBe(true);
  });
});

describe('Tabbflikar', () => {
  let form;
  let tabs;
  let view;

  beforeEach(() => {
    // Formuläret
    form = mock.eventTarget(
      'form',
      {
        _invalid: mock({ focus: () => {}, reportValidity: () => {} }),
        _panel: { querySelector: () => form._invalid },
      },
      {
        querySelector: (s) =>
          ({
            'fieldset:invalid': form._panel,
          })[s] ?? null,
        querySelectorAll: () => [],
      }
    );

    article.querySelector = (s) => ({ form })[s] ?? null;
    article.querySelectorAll = () => [];

    // Tabbflikslistan: ska kopplas och frikopplas. Panel ska väljas vid
    // valideringsfel.
    tabs = mock({
      attach: () => {},
      detach: () => {},
      selectPanel: () => {},
    });

    // DOM-dokumentet.
    const doc = {
      body: mock.element('body'),
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Villkorsstyrning.
    const fakeViewCondition = {
      apply: () => {},
      disconnect: () => {},
      observe: () => {},
    };

    // Skapa en vyinstans.
    view = new CaseEditView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      tabs,
      fakeViewCondition,
      doc
    );
  });

  it('kopplar tabbflikar till paneler', async () => {
    await view.open();
    expect(tabs.attach).toHaveBeenCalled.once();
  });

  it('kopplar bort tabbflikar från paneler', async () => {
    await view.open();
    await view.close();
    expect(tabs.detach).toHaveBeenCalled.once();
  });

  it('visar panelen med första felet', async () => {
    await view.open();
    view.activate();
    form.triggerEvent({ target: form._invalid, type: 'invalid' });
    await wait(100);
    expect(tabs.selectPanel).toHaveBeenCalled.once();
    expect(form._invalid.focus).toHaveBeenCalled.once();
    expect(form._invalid.reportValidity).toHaveBeenCalled.once();
  });
});

describe('Spara och ta bort ärende', () => {
  let dialog;
  let form;
  let tabs;
  let view;

  beforeEach(() => {
    // Formuläret
    dialog = mock.confirmDialog();
    form = mock.eventTarget('form', { querySelectorAll: () => [] });

    article.querySelector = (s) => ({ form })[s] ?? null;
    article.querySelectorAll = () => [];

    // Tabbflikslistan: ska kopplas och frikopplas. Panel ska väljas vid
    // valideringsfel.
    tabs = mock({
      attach: () => {},
      detach: () => {},
      selectPanel: () => {},
    });

    // DOM-dokumentet.
    const doc = {
      body: mock.element('body'),
      getElementById: (s) => ({ 'confirm-dialog': dialog })[s] ?? null,
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Villkorsstyrning.
    const fakeViewCondition = {
      apply: () => {},
      disconnect: () => {},
      observe: () => {},
    };

    // Skapa en vyinstans.
    view = new CaseEditView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      tabs,
      fakeViewCondition,
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
      expect(notified).toBe(true);
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
import { CaseEditView } from '../../js/view/CaseEditView.js';
import { ValidationError } from '../../js/model/ValidationError.js';
import { beforeEach, describe, expect, it, mock, wait } from '../functions.js';

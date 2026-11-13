/**
 * Enhetstestfall för granskningsredigeringsvyn.
 *
 * @license CC-BY 4.0
 * @see AuditEditView
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
  let view;

  beforeEach(() => {
    // Formuläret.
    form = mock.eventTarget(
      'form',
      {
        officer: mock.select('officer', ['']),
        version: mock.input('text', 'version'),
      },
      {
        querySelectorAll: (s) =>
          ({
            '.app input': [form.version],
          })[s] ?? [],
      }
    );

    article.querySelector = (s) => ({ form })[s] ?? null;
    article.querySelectorAll = () => [];

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
    view = new AuditEditView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      fakeViewCondition,
      doc
    );
  });

  it.with(['officer', 'greta.granskare@digg.se'], ['version', '3.14'])(
    "skriver och läser värde i fältet '{0}'",
    async (field, value) => {
      await view.open();
      view[field] = value;
      expect(form[field].value).toBe(value);
      expect(view[field]).toBe(value);
    }
  );

  it.with(['app', 'mobil applikation'], ['website', 'webbplats'])(
    'sätter typ av digital service till {1}',
    async (service) => {
      await view.open();
      view.service = service;
      expect(view.service).toBe(service);
      expect(form.classList.contains(service)).toBe(true);
    }
  );

  it('populerar listan med granskare', async () => {
    const officers = [
      { label: 'Greta Granskare', value: 'greta.granskare@digg.se' },
      { label: 'Hanna Handläggare', value: 'hanna.handlaggasre@digg.se' },
    ];
    await view.open();
    view.officers = officers;
    const officer = form.officer;
    expect(officer.length).toBe(3);
    expect(officer.children[1].label).toBe(officers[0].label);
    expect(officer.children[1].value).toBe(officers[0].value);
    expect(officer.children[2].label).toBe(officers[1].label);
    expect(officer.children[2].value).toBe(officers[1].value);
  });

  it.with(['officer', 'greta.granskare@digg.se'], ['version', '3.14'])(
    "meddelar observatörer vid ändring i fältet '{0}'",
    async (target, value) => {
      let notified = false;
      await view.open();
      view.subscribe((e) => {
        notified = true;
        expect(e.state).toBe(undefined);
        expect(e.target).toBe(target);
        expect(e.type).toBe('change');
        expect(e.value).toBe(value);
      });
      view.activate();
      view[target] = value;
      form.triggerEvent({
        target: form[target],
        type: 'change',
      });
      expect(notified).toBe(true);
    }
  );

  it('döljer formuläret', async () => {
    await view.open();
    expect(form.hidden).toBe(false);
    view.hide();
    expect(form.hidden).toBe(true);
  });
});

describe('Spara och ta bort ärende', () => {
  let dialog;
  let form;
  let view;

  beforeEach(() => {
    // Formuläret.
    dialog = mock.confirmDialog();
    form = mock.eventTarget(
      'form',
      {
        _attrs: { action: '?page=other' },
        action: '?page=other',
      },
      {
        querySelectorAll: () => [],
      }
    );

    article.querySelector = (s) => ({ form })[s] ?? null;
    article.querySelectorAll = () => [];

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
    view = new AuditEditView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      fakeViewCondition,
      doc
    );
  });

  it.with(['save', 'spara'], ['delete', 'ta bort'])(
    'meddelar observatörer vid {1}',
    async (value) => {
      let notified = false;
      await view.open();
      view.activate();
      view.subscribe((e) => {
        notified = true;
        expect(e.action).toBe(value);
        expect(e.path).toBe(form.action);
        expect(e.type).toBe('form');
      });
      form.triggerEvent({
        submitter: { value, getAttribute: () => '' },
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
import { AuditEditView } from '../../js/view/AuditEditView.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

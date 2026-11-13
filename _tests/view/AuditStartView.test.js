/**
 * Enhetstestfall för granskningsstartvyn.
 *
 * @license CC-BY 4.0
 * @see AuditStartView
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
        source: mock.select('source', ['']),
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
    view = new AuditStartView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      fakeViewCondition,
      doc
    );
  });

  it.with(['app', 'mobil applikation'], ['website', 'webbplats'])(
    'sätter typ av tjänst till {1}',
    async (service) => {
      await view.open();
      view.service = service;
      expect(view.service).toBe(service);
      expect(form.classList.contains(service)).toBe(true);
    }
  );

  it.with(['officer', 'hanna.handlaggare@digg.se'], ['version', '3.14'])(
    "skriver och läser värde i fältet '{0}'",
    async (field, value) => {
      await view.open();
      view[field] = value;
      expect(form[field].value).toBe(String(value));
      expect(view[field]).toBe(value);
    }
  );

  it("läser värde i fältet 'source'", async () => {
    const audit = 1600819200000;
    await view.open();
    expect(view.source).toBe(null);
    form.source.value = String(audit);
    expect(view.source).toBe(audit);
  });

  it('populerar listan med granskare', async () => {
    const officers = [
      { label: 'Greta Granskare', value: 'greta.granskare@digg.se' },
      { label: 'Hanna Handläggare', value: 'hanna.handlaggare@digg.se' },
    ];
    await view.open();
    view.officers = officers;
    const options = form.officer.children;
    expect(options.length).toBe(3);
    expect(options[1].label).toBe(officers[0].label);
    expect(options[1].value).toBe(officers[0].value);
    expect(options[2].label).toBe(officers[1].label);
    expect(options[2].value).toBe(officers[1].value);
  });

  it('döljer granskningslistan', async () => {
    form.source.parentNode = { hidden: false };
    await view.open();
    view.hideSource();
    expect(form.source.parentNode.hidden).toBe(true);
  });

  it('lägger till en granskning i listan', async () => {
    const label = '2020-09-23';
    const value = 1600819200000;
    await view.open();
    view.addAudit(value, label);
    const options = form.source.children;
    expect(options.length).toBe(2);
    expect(options[1].label).toBe(label);
    expect(options[1].value).toBe(String(value));
  });

  it.with(
    ['officer', 'hanna.handlaggare@digg.se'],
    ['source', 1600819200000],
    ['version', '3.14']
  )(
    "meddelar observatörer vid ändring i fältet '{0}'",
    async (target, value) => {
      let notified = false;
      await view.open();
      view.subscribe((e) => {
        notified = true;
        expect(e.state).toBe(undefined);
        expect(e.target).toBe(target);
        expect(e.type).toBe('change');
        expect(e.value).toBe(String(value));
      });
      view.activate();
      form[target].value = String(value);
      form.triggerEvent({
        target: form[target],
        type: 'change',
      });
      expect(notified).toBe(true);
    }
  );
});

describe('Skapa granskning', () => {
  let dialog;
  let form;
  let view;

  beforeEach(() => {
    // Modal diaiogruta.
    dialog = mock.eventTarget(
      'dialog',
      {
        _audit: mock.element('strong'),
        _button: mock.eventTarget('button'),
        _case: mock.element('span'),
        _dir: mock.element('span'),
        _year: mock.element('span'),
      },
      {
        querySelector: (s) =>
          ({
            '.audit': dialog._audit,
            '.case': dialog._case,
            '.dir': dialog._dir,
            '.year': dialog._year,
            button: dialog._button,
          })[s] ?? null,
        showModal: async () => {},
      }
    );

    // Formuläret.
    form = mock.eventTarget(
      'form',
      {
        _attrs: { action: '?page=other' },
        _start: mock.element('button', { value: 'start' }, {}),
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
      getElementById: (s) => ({ 'prepare-dialog': dialog })[s] ?? null,
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Villkorsstyrning.
    const fakeViewCondition = {
      apply: () => {},
      disconnect: () => {},
      observe: () => {},
    };

    // Skapa en vyinstans.
    view = new AuditStartView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      fakeViewCondition,
      doc
    );
  });

  it('meddelar observatörer vid klick på Starta', async () => {
    let notified = false;
    await view.open();
    view.subscribe((e) => {
      notified = true;
      expect(e.action).toBe('start');
      expect(e.path).toBe(form._attrs.action);
      expect(e.trigger).toBe(form._start);
      expect(e.type).toBe('form');
    });
    view.activate();
    form.triggerEvent({
      submitter: form._start,
      type: 'submit',
    });
    expect(notified).toBe(true);
  });

  it.with(['OK'], ['Escape'])(
    'visar modal dialogruta som stängs med {0}',
    async (reason) => {
      const auditDir = '2020-09-23';
      const caseDir = '2020-1234 digg.se';
      const rootDir = 'C:\\Document\\Audits';
      const yearDir = '2020';
      await view.open();
      view.activate();
      setTimeout(
        () =>
          ({
            Escape: () => dialog.triggerEvent({ type: 'cancel' }),
            OK: () => dialog.triggerEvent({ type: 'close' }),
          })[reason](),
        0
      );
      await view.showPreparations(rootDir, yearDir, caseDir, auditDir);
      expect(dialog._dir.textContent).toBe(rootDir);
      expect(dialog._year.textContent).toBe(yearDir);
      expect(dialog._case.textContent).toBe(caseDir);
      expect(dialog._audit.textContent).toBe(auditDir);
      expect(dialog.showModal).toHaveBeenCalled.once();
    }
  );
});

// Importera beroenden.
import { AuditStartView } from '../../js/view/AuditStartView.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

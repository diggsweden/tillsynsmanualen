/**
 * Enhetstestfall för personredigeringssidans vy.
 *
 * @license CC-BY 4.0
 * @see PersonView
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
  const checkbox = (value) =>
    mock.checkbox(false, {
      id: `role-${value}`,
      value,
    });

  let form;
  let view;

  beforeEach(() => {
    // Formuläret.
    form = mock.eventTarget(
      'form',
      {
        email: mock.input('email', 'email'),
        familyName: mock.input('text', 'familyName'),
        givenName: mock.input('text', 'givenName'),
        telephone: mock.input('tel', 'telephone'),
        _cb: [checkbox('officer'), checkbox('supervisor')],
        _delete: mock.element('button'),
      },
      {
        querySelector: (s) =>
          ({
            'button[value="delete"]': form._delete,
          })[s] ?? null,
        querySelectorAll: (s) =>
          ({
            'input[type="checkbox"]': form._cb,
          })[s] ?? [],
      }
    );

    article.querySelector = (s) => ({ form })[s] ?? null;

    // DOM-dokumentet.
    const doc = {
      body: mock.element('body'),
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Skapa en vyinstans.
    view = new PersonView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      doc
    );
  });

  it.with(
    ['email', 'julia.jurist@example.com'],
    ['familyName', 'Jurist'],
    ['givenName', 'Julia'],
    ['telephone', '0771-11 44 00']
  )("skriver och läser värde i fältet '{0}'", async (field, value) => {
    await view.open();
    view[field] = value;
    expect(form[field].value).toBe(value);
    expect(view[field]).toBe(value);
  });

  it.with(['email', 'juali.jurist%example.com'], ['telephone', '11 44 00'])(
    "sätter felmeddelande i fältet '{0}'",
    async (field, value) => {
      const msg = 'ERROR';
      const err = new ValidationError(msg, value);
      await view.open();
      view[field] = err;
      expect(form[field].value).toBe(value);
      expect(view[field]).toBe(value);
      expect(form[field].setCustomValidity).toHaveBeenCalled.once().with(msg);
    }
  );

  it.with(
    [[]],
    [['officer']],
    [['supervisor']],
    [['officer', 'supervisor']]
  )("sätter roller till '{0}'", async (roles) => {
    await view.open();
    view.roles = roles;
    expect(form._cb[0].checked).toBe(roles.includes('officer'));
    expect(form._cb[1].checked).toBe(roles.includes('supervisor'));
    expect(view.roles).toEqual(roles);
  });

  it('avaktiverar Ta bort-knappen', async () => {
    await view.open();
    expect(form._delete.disabled).toBe(false);
    view.disableRemove();
    expect(form._delete.disabled).toBe(true);
  });

  it.with(
    ['email', 'greta.granskare@digg.se'],
    ['familyName', 'Jurist'],
    ['givenName', 'Julia'],
    ['telephone', '0771-11 44 00']
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

  it('meddelar observatörer vid ändring av roll', async (field, value) => {
    let notified = false;
    await view.open();
    view.activate();
    view.subscribe((e) => {
      notified = true;
      expect(e.state).toBe(form._cb[0].checked);
      expect(e.target).toBe(form._cb[0].id);
      expect(e.value).toBe(form._cb[0].value);
    });
    view.roles = ['officer'];
    form.triggerEvent({
      target: form._cb[0],
      type: 'change',
    });
    expect(notified).toBe(true);
  });
});

describe('Spara och ta bort personinformation', () => {
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
    view = new PersonView(
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
import { PersonView } from '../../js/view/PersonView.js';
import { ValidationError } from '../../js/model/ValidationError.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

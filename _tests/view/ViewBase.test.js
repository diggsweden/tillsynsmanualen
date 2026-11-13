/**
 * Enhetstestfall för vybasklassen.
 *
 * @license CC-BY 4.0
 * @see ViewBase
 */

let article;
let breadcrumbs;
let doc;
let listeners;
let status;
let view;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Artikelelementet: ska åsättas en klass beroende på om användaren är
  // intern eller extern.
  article = {
    classList: mock.domTokenList(),
    querySelector: () => null,
    querySelectorAll: (s) => [],
  };

  // Länkstigen.
  breadcrumbs = {
    links: [
      { title: 'Start', url: '../' },
      { title: 'Granska', url: '?page=start' },
      { title: 'Ärenden', url: '?page=list&type=case' },
    ],
    completed: async () => breadcrumbs,
  };

  // Statusbehållaren: ska populeras med innehåll och åsättas klass och
  // tabbindex.
  status = mock.element('div');
});

describe('Öppna, aktivera och stänga sida', () => {
  let header;

  beforeEach(() => {
    // Artikelelementet.
    article = {
      classList: mock.domTokenList(),
      _autoFocus: null,
      querySelector: () => {},
      querySelectorAll: (s) => [],
    };

    // Länkstigens sista element.
    breadcrumbs.current = 'Test';

    // Händelselyssnarlistan.
    listeners = mock.eventListenerList();

    // Sidhuvudet.
    header = mock.element('header');

    // DOM-dokumentet.
    doc = {
      body: mock.element('body'),
      title: 'not set',
      _skip: mock.link('#', { hash: '#start-of-content' }),
      _startOfContent: mock(
        { tabIndex: null },
        {
          focus: () => {},
          scrollIntoView: () => {},
        }
      ),
      _target: mock({ focus: () => {}, scrollIntoView: () => {} }),
      createElement: (t) => mock.element(t),
      getElementById: (s) =>
        ({
          'start-of-content': doc._startOfContent,
        })[s] ?? doc._target,
      querySelector: (s) =>
        ({
          'body > header': header,
          'body > header > a': doc._skip,
          'main > article[aria-live]': article,
          'main > [role="status"]': status,
        })[s] ?? null,
    };

    // Skapa en vyinstans.
    view = new ViewBase(
      'page',
      'Title',
      breadcrumbs,
      listeners,
      mock.pageContentLoader('HTML'),
      doc
    );
  });

  it('returnerar länkstigen', () => {
    expect(view.breadcrumbs).toBe(breadcrumbs);
  });

  it.with([true, 'avancerat'], [false, 'förenklat'])(
    'sätter och returnerar {1} visningsläge',
    (flag) => {
      view.advancedMode = flag;
      expect(view.advancedMode).toBe(flag);
    }
  );

  it('sätter och returnerar sidtitel', () => {
    const suffix = '– Tillsynsmanual';
    const title = 'Test';
    view.title = title;
    expect(view.title).toBe(`${title} ${suffix}`);
  });

  it('lägger till länkstigen', async () => {
    await view.open();

    // Ska ha skapat navigationsstrukturen i sidhuvudet.
    expect(header.children.length).toBe(1);

    const nav = header.children[0];
    expect(nav.children.length).toBe(1);
    expect(nav.tagName).toBe('NAV');

    const ol = nav.children[0];
    expect(ol.children.length).toBe(4);
    expect(ol.tagName).toBe('OL');

    for (const [i, li] of ol.children.entries()) {
      expect(li.children.length).toBe(1);
      expect(li.tagName).toBe('LI');
      if (i < 3) {
        const a = li.children[0];
        expect(a.tagName).toBe('A');
        expect(a._attrs.href).toBe(breadcrumbs.links[i].url);
        expect(a.textContent).toBe(breadcrumbs.links[i].title);
      } else {
        const strong = li.children[0];
        expect(strong.tagName).toBe('STRONG');
        expect(strong.textContent).toBe(breadcrumbs.current);
      }
    }
  });

  it('sätter sidtiteln i dokumentet', async () => {
    await view.open();
    expect(doc.title).toBe('Title – Tillsynsmanual');
  });

  it('döljer statusbehållaren vid öppning', async () => {
    await view.open();
    expect(status.className).toBe('');
    expect(status.textContent).toBe('');
    expect(status.tabIndex).toBe(-1);
  });

  it('populerar artikelementet', async () => {
    await view.open();
    expect(article.innerHTML).toBe('HTML');
  });

  it.with([true, 'avancerat'], [false, 'förenklat'])(
    'sätter body/artikelklass för {1} visningsläge',
    async (advanced) => {
      const cl1 = doc.body.classList;
      const cl2 = article.classList;
      view.advancedMode = advanced;
      await view.open();
      expect(cl1.contains('advanced-mode')).toBe(advanced);
      expect(cl2.contains('advanced')).toBe(advanced);
      expect(cl2.contains('simplified')).toBe(!advanced);
    }
  );

  it('tar bort upptagenmarkering efter sidladdning', async () => {
    await view.open();
    expect(doc.body.removeAttribute).toHaveBeenCalled.once().with('aria-busy');
  });

  it('sätter fokus till angivet element', async () => {
    await view.open();
    view.autoFocus('foo');
    await wait(1);
    expect(doc._target.focus).toHaveBeenCalled.once();
    expect(doc._target.scrollIntoView).toHaveBeenCalled.once();
  });

  it('deaktiverar händelselyssnare vid stängning', async () => {
    await view.open();
    view.close();
    expect(listeners.removeAll).toHaveBeenCalled.once();
  });

  it('sätter artikelklass vid stängning', async () => {
    await view.open();
    view.close();
    expect(article.classList.contains('changing')).toBe(true);
  });

  it('sätter statusmeddelande vid stängning', async () => {
    await view.open();
    view.close();
    expect(status.className).toBe('loading');
    expect(status.textContent).toBe('Laddar…');
    expect(status.tabIndex).toBe(-1);
  });

  it('tar bort länkstigen vid stängning', async () => {
    await view.open();
    view.close();
    expect(header.children[0].remove).toHaveBeenCalled.once();
  });

  it('lägger till händelselyssnare vid aktivering', async () => {
    await view.open();
    view.activate();
    expect(doc.body.addEventListener)
      .toHaveBeenCalled.once()
      .with('click', expect.anyFunction(), false);
    expect(doc._skip.addEventListener).toHaveBeenCalled.once();
    expect(status.addEventListener)
      .toHaveBeenCalled.times(2)
      .with(
        ['click', expect.anyFunction(), false],
        ['keypress', expect.anyFunction(), false]
      );
  });

  it('tar bort händelselyssnare vid deaktivering', async () => {
    await view.open();
    view.deactivate();
    expect(listeners.removeAll).toHaveBeenCalled.once();
  });
});

describe('Statusmeddelanden', () => {
  beforeEach(() => {
    // Statusbehållaren.
    status = mock.eventTarget(
      'div',
      {
        get className() {
          return Array.from(status.classList._tokens).join(' ');
        },
        set className(n) {
          status.classList._tokens = new Set(n.split(' '));
        },
      },
      {}
    );

    // DOM-dokumentet.
    doc = {
      body: mock.element('body'),
      title: '',
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Skapa en vyinstans.
    view = new ViewBase(
      'page',
      'Title',
      breadcrumbs,
      mock.eventListenerList(),
      mock.pageContentLoader('HTML'),
      doc
    );
  });

  it('sätter status och innehåll för felmeddelande', async () => {
    const error = 'ERROR';
    await view.open();
    view.showError(error);
    expect(status.className).toBe('error');
    expect(status.textContent).toBe(error);
    expect(status.tabIndex).toBe(-1);
  });

  it('sätter status och innehåll för statusmeddelande', async () => {
    const message = 'STATUS';
    const msgClass = 'test';
    await view.open();
    view.showStatus(message, msgClass);
    expect(status.className).toBe(msgClass);
    expect(status.textContent).toBe(message);
    expect(status.tabIndex).toBe(-1);
  });

  it('sätter status och innehåll för återkopplingsmeddelande', async () => {
    const message = 'SUCCESS';
    await view.open();
    view.showSuccess(message);
    expect(status.className).toBe('success closable');
    expect(status.textContent).toBe(message);
    expect(status.tabIndex).toBe(0);
  });

  it('döljer status vid klick', async () => {
    await view.open();
    view.activate();
    view.showSuccess('test');
    status.triggerEvent({ type: 'click' });

    // Ska ha dolt statusbehållaren.
    expect(status.className).toBe('');
    expect(status.textContent).toBe('');
    expect(status.tabIndex).toBe(-1);
  });

  it('döljer status vid Enter', async () => {
    await view.open();
    view.activate();
    view.showSuccess('test');

    // Andra tangenter ska inte påverka statusbehållaren.
    status.triggerEvent({ key: 'Escape', type: 'keypress' });
    expect(status.className).toBe('success closable');
    expect(status.textContent).toBe('test');
    expect(status.tabIndex).toBe(0);

    // Enter ska dölja statusbehållaren.
    status.triggerEvent({ key: 'Enter', type: 'keypress' });
    expect(status.className).toBe('');
    expect(status.textContent).toBe('');
    expect(status.tabIndex).toBe(-1);
  });
});

describe('Formulär', () => {
  let buttons;
  let dialog;
  let form;
  let required;

  beforeEach(() => {
    // Formuläret.
    buttons = [mock.eventTarget('button', { value: 'test' }, {})];
    required = { required: true };
    form = mock.eventTarget(
      'form',
      {},
      {
        querySelectorAll: (s) =>
          ({
            '.advanced [required]': [required],
          })[s] ?? [],
      }
    );

    // Artikelelementet.
    article = {
      classList: mock.domTokenList(),
      querySelector: (s) => ({ form })[s] ?? null,
      querySelectorAll: (s) =>
        ({
          'button[type="button"]': buttons,
        })[s] ?? [],
    };

    // Bekräftelsedialog
    dialog = mock.confirmDialog();

    // DOM-dokumentet.
    doc = {
      body: mock.element('body'),
      title: '',
      getElementById: (s) => ({ confirm: dialog })[s] ?? null,
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Skapa en vyinstans.
    view = new ViewBase(
      'page',
      'Title',
      breadcrumbs,
      mock.eventListenerList(),
      mock.pageContentLoader('HTML'),
      doc
    );
  });

  it('sätter åtgärdssökväg för formulär', async () => {
    const action = '?page=action';
    await view.open();
    view.action = action;
    expect(view.action).toBe(action);
    expect(form.getAttribute('action')).toBe(action);
  });

  it.with(['', ''], ['save', '?page=other'])(
    "anropar observatörer vid inskick, värde='{0}'",
    async (value, action) => {
      let notified = false;
      await view.open();
      view.action = '?page=test';
      view.activate();

      view.subscribe((e) => {
        notified = true;
        expect(e.action).toBe(value);
        expect(e.path).toBe(action || view.action);
        expect(e.type).toBe('form');
      });

      // Simulera att användaren skickar in formuläret.
      form.triggerEvent({
        submitter: { value, getAttribute: () => action },
        type: 'submit',
      });

      expect(notified).toBe(true);
    }
  );

  it('sätter formulärklass vid inskick med ogiltiga data', async () => {
    await view.open();
    view.activate();
    expect(form.classList.contains('validated')).toBe(false);
    form.triggerEvent({ type: 'invalid' });
    expect(form.classList.contains('validated')).toBe(true);
  });

  it('anropar observatörer vid klick på funktionsknapp', async () => {
    let notified = false;
    await view.open();
    view.activate();
    view.subscribe((e) => {
      notified = true;
      expect(e.action).toBe(buttons[0].value);
      expect(e.path).toBe(null);
      expect(e.trigger).toBe(buttons[0]);
      expect(e.type).toBe('form');
    });
    buttons[0].triggerEvent({ currentTarget: buttons[0], type: 'click' });
    expect(notified).toBe(true);
  });

  it('hanterar inte funktionsknappar med data-handler', async () => {
    buttons[0].dataset.handler = 'confirm';
    let notified = false;
    buttons[0].addEventListener('click', () => {});
    await view.open();
    view.activate();
    view.subscribe((e) => (notified = true));
    buttons[0].triggerEvent({ currentTarget: buttons[0], type: 'click' });
    expect(notified).toBe(false);
  });

  it.with(
    ['text', 'value', 'foo'],
    ['checkbox', 'checked', true],
    ['date', 'valueAsDate', new Date('2020-09-23')],
    ['datetime-local', 'valueAsNumber', 1600857296000],
    ['number', 'valueAsNumber', 42]
  )(
    'anropar observatörer vid ändring i formulärfält med type={0}',
    async (type, prop, value) => {
      const cb = 'checkbox' === type;
      let notified = false;
      const target = {
        name: 'test',
        [prop]: value,
        type,
        checkValidity: () => true,
        setCustomValidity: () => {},
      };
      cb && (target.value = 'foo');
      await view.open();
      view.activate();
      view.subscribe((e) => {
        notified = true;
        expect(e.state).toBe(cb ? value : undefined);
        expect(e.target).toBe(target.name);
        expect(e.type).toBe('change');
        expect(e.value).toEqual(cb ? target.value : value);
      });
      form.triggerEvent({ target, type: 'change' });
      expect(notified).toBe(true);
    }
  );

  it.with(
    ['OK'],
    ['Avbryt'],
    ['Escape']
  )('visar en bekräftelsedialogruta som stängs med {0}', async (reason) => {
    const prompt = 'Test';
    const trigger = mock({ focus: () => {} });
    dialog.returnValue = String('OK' === reason);
    view._confirmID = 'confirm';
    await view.open();
    view.activate();
    setTimeout(
      () =>
        ({
          Avbryt: () => dialog.triggerEvent({ type: 'close' }),
          Escape: () => dialog.triggerEvent({ type: 'cancel' }),
          OK: () => dialog.triggerEvent({ type: 'close' }),
        })[reason](),
      0
    );
    const ok = await view.confirm(prompt, trigger);
    expect(ok).toBe('OK' === reason);
    expect(dialog.prompt.textContent).toBe(prompt);
    expect(dialog.showModal).toHaveBeenCalled.once();
    expect(trigger.focus).toHaveBeenCalled.once();
  });

  it('visar en bekräftelsedialogruta med andra knapptexter', async () => {
    const prompt = 'Test';
    const trigger = mock({ focus: () => {} });
    dialog.returnValue = 'true';
    view._confirmID = 'confirm';
    await view.open();
    view.activate();
    setTimeout(() => dialog.triggerEvent({ type: 'close' }), 0);
    const ok = await view.confirm(prompt, trigger, ['No', 'Yes'], false);
    expect(ok).toBe(true);
    expect(dialog.prompt.textContent).toBe(prompt);
    expect(dialog.showModal).toHaveBeenCalled.once();
    for (const button of [dialog.cancel, dialog.ok]) {
      expect(button.classList.add).toHaveBeenCalled.with('no-icon');
      expect(button.classList.remove).toHaveBeenCalled.with('no-icon');
    }
  });
});

describe('Funktioner för härledda klasser', () => {
  it('lägger till extra stilmallar', async () => {
    class TestView extends ViewBase {
      constructor(p, t, b, i, o, d) {
        super(p, t, b, i, o, d);
        this._addStyles('foo', 'bar');
      }
    }
    const doc = mock(
      {
        body: mock.element('body'),
        head: mock.element('head'),
        _links: [],
      },
      {
        createElement: () => link(),
        querySelector: mock.defaultQuerySelector(article, status),
      }
    );
    const link = () => {
      const link = {};
      doc._links.push(link);
      return link;
    };
    const view = new TestView(
      'test',
      'Test',
      breadcrumbs,
      mock.eventListenerList(),
      mock.pageContentLoader('HTML'),
      doc
    );
    await view.open();
    expect(doc._links.length).toBe(2);
    expect(doc._links[0].href).toBe('../css/foo.css');
    expect(doc._links[0].rel).toBe('stylesheet');
    expect(doc._links[1].href).toBe('../css/bar.css');
    expect(doc._links[1].rel).toBe('stylesheet');
    expect(doc.head.appendChild)
      .toHaveBeenCalled.times(2)
      .with([doc._links[0]], [doc._links[1]]);
  });

  it.with(
    [false, {}, null, 'ett tomt element utan att infoga'],
    [true, { x: 'y' }, null, 'och infogar ett element attribut'],
    [
      true,
      { x: 'y' },
      'test',
      'och infogar ett element med attribut och textinnehåll',
    ]
  )('skapar {3}', async (parent, attrs, text) => {
    const parentDiv = mock.element('div');
    class TestView extends ViewBase {
      test() {
        const p = parent ? parentDiv : null;
        return this._element(p, 'p', attrs, text);
      }
    }
    const doc = mock(
      {
        body: mock.element('body'),
      },
      {
        createElement: (t) => mock.element(t),
        querySelector: mock.defaultQuerySelector(article, status),
      }
    );
    const view = new TestView(
      'test',
      'Test',
      breadcrumbs,
      mock.eventListenerList(),
      mock.pageContentLoader('HTML'),
      doc
    );
    await view.open();
    const element = view.test();
    expect(doc.createElement).toHaveBeenCalled.once().with('p');
    expect(parentDiv.appendChild).toHaveBeenCalled.times(parent ? 1 : 0);
    expect(element.getAttribute('x')).toBe(attrs.x ?? '');
    expect(element.textContent).toBe(text ?? '');
    expect(element.tagName).toBe('P');
  });

  it('anropar registrerade observatörer', async () => {
    const event = {};
    class TestView extends ViewBase {
      test(event) {
        this._notifyObservers(event);
      }
    }
    const doc = {
      body: mock.element('body'),
      querySelector: mock.defaultQuerySelector(article, status),
    };
    const observer1 = mock({ notify: () => {} });
    const observer2 = mock({ notify: () => {} });
    const view = new TestView(
      'test',
      'Test',
      breadcrumbs,
      mock.eventListenerList(),
      mock.pageContentLoader('HTML'),
      doc
    );
    await view.open();
    view.subscribe(observer1.notify);
    view.subscribe(observer2.notify);
    view.activate();
    view.test(event);
    expect(observer1.notify).toHaveBeenCalled.once().with(event);
    expect(observer2.notify).toHaveBeenCalled.once().with(event);
  });

  it('tar bort maxbredd för `main`', async () => {
    class TestView extends ViewBase {
      constructor(p, t, b, i, o, d) {
        super(p, t, b, i, o, d);
        this._wide = true;
      }
    }
    const doc = {
      body: mock.element('body'),
      _main: mock.element('main'),
      querySelector: (s) =>
        ({
          main: doc._main,
          'main > article[aria-live]': article,
          'main > [role="status"]': status,
        })[s] ?? null,
    };
    const view = new TestView(
      'test',
      'Test',
      breadcrumbs,
      mock.eventListenerList(),
      mock.pageContentLoader('HTML'),
      doc
    );
    await view.open();
    expect(doc._main.classList.contains('wide')).toBe(true);
    view.close();
    expect(doc._main.classList.contains('wide')).toBe(false);
  });
});

// Importera beroenden.
import { ViewBase } from '../../js/view/ViewBase.js';
import { beforeEach, describe, expect, it, mock, wait } from '../functions.js';

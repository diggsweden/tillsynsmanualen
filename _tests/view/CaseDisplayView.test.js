/**
 * Enhetstestfall för ärendevisningssidans vy.
 *
 * @license CC-BY 4.0
 * @see CaseDisplayView
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

describe('Populera sidinnehåll', () => {
  let auditFragment;
  let doc;
  let docFragment;
  let view;

  beforeEach(() => {
    // Komplettera artikelelementet.
    article._docs = mock.element('ul');
    article._h1 = mock.element('h1');
    article._info = {
      addr: mock.element('dd', { id: 'addr' }, {}),
      email: mock.element('dd', { id: 'email' }, {}),
      org: mock.element('dd', { id: 'org' }, {}),
      regNo: mock.element('dd', { id: 'reg-no' }, {}),
      supervisor: mock.element('dd', { id: 'supervisor' }, {}),
      tel: mock.element('dd', { id: 'tel' }, {}),
    };
    article._links = {
      create: mock.link(),
      edit: mock.link(),
      log: mock.link(),
      logCount: mock.element('span'),
    };
    article._listing = mock.element('ul');
    article._org = mock.element('section');
    article.querySelector = (s) =>
      ({
        '#addr': article._info.addr,
        '#create': article._links.create,
        '#edit': article._links.edit,
        '#email': article._info.email,
        '#log': article._links.log,
        '#log-count': article._links.logCount,
        '#org': article._info.org,
        '#reg-no': article._info.regNo,
        '#supervisor': article._info.supervisor,
        '#tel': article._info.tel,
        '.audit.listing': article._listing,
        '.doc ul': article._docs,
        '.org': article._org,
        h1: article._h1,
      })[s] ?? null;

    // Mallelement som klonas.
    auditFragment = {
      children: [
        mock.element(
          'li',
          { children: [] },
          {
            querySelectorAll: () => [auditFragment._edit, auditFragment._show],
          }
        ),
      ],
      _edit: mock.link(),
      _show: mock.link(),
    };
    auditFragment.children[0].children = [
      auditFragment._edit,
      auditFragment._show,
    ];

    docFragment = {
      children: [mock.element('li', { children: [] }, {})],
      _button: mock.element('button'),
      _link: mock.link('#', { target: '' }),
      _svg: mock.element('svg', { children: [mock.element('use')] }, {}),
    };
    docFragment.children[0].children = [
      docFragment._svg,
      docFragment._link,
      docFragment._button,
    ];

    // DOM-dokumentet.
    doc = {
      body: mock.element('body'),
      head: mock.element('head'),
      createElement: (t) => mock.element(t),
      getElementById: (s) =>
        ({
          'audit-listing-template': mock.template(() => auditFragment),
          'doc-listing-template': mock.template(() => docFragment),
        })[s] ?? null,
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Skapa en vyinstans.
    view = new CaseDisplayView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      doc
    );
  });

  it('lägger till en stilmall', async () => {
    await view.open();
    expect(doc.head.children.length).toBe(1);
    const [link] = doc.head.children;
    expect(link.href).toBe('../css/case.css');
  });

  it('tar bort den tillagda stilmallen', async () => {
    await view.open();
    view.close();
    const [link] = doc.head.children;
    expect(link.remove).toHaveBeenCalled.once();
  });

  it('sätter sidrubriken', async () => {
    const text = 'Test Heading';
    await view.open();
    view.heading = text;
    expect(article._h1.textContent).toBe(text);
  });

  it.with(
    ['addr', 'Box 14\n85152 Sundsvall', 'aktörens postadress'],
    ['email', 'registrator@digg.se', 'aktörens e-postadress'],
    ['org', 'Myndigheten för digital förvaltning', 'aktörens namn'],
    ['regNo', '202100-6883', 'aktörens organisationsnummer'],
    ['supervisor', 'julia.jurist@digg.se', 'tillsynsansvarigs namn'],
    ['tel', '0771-11 44 00', 'aktörens telefonnummer']
  )('visar {2}', async (field, value) => {
    await view.open();
    view[field] = value;
    expect(article._info[field].textContent).toBe(value);
  });

  it.with(
    ['create', 'Ny granskning-länken'],
    ['edit', 'Ändra-länken'],
    ['log', 'Logg-länken']
  )('sätter sökväg för {1}', async (prop) => {
    const url = '?page=other';
    await view.open();
    view[prop] = url;
    expect(article._links[prop].href).toBe(url);
  });

  it('visar antal noteringar i logglänken', async () => {
    await view.open();
    view.logSize = 13;
    expect(article._links.logCount.textContent).toBe('13');
  });

  it('lägger till en öppen granskning', async () => {
    const cols = ['first', 'second'];
    const edit = '?page=edit';
    const show = '?page=show';
    await view.open();
    view.addAudit(edit, show, Array.from(cols));
    const li = auditFragment.children[0];
    expect(auditFragment._edit.href).toBe(edit);
    expect(auditFragment._show.href).toBe(show);
    expect(auditFragment._show.textContent).toBe(cols[0]);
    expect(li.appendChild).toHaveBeenCalled.once();
    expect(li.children[2].textContent).toBe(cols[1]);
  });

  it('lägger till en slutförd granskning', async () => {
    const cols = ['first', 'second'];
    const edit = null;
    const show = '?page=show';
    await view.open();
    view.addAudit(edit, show, Array.from(cols));
    const li = auditFragment.children[0];
    expect(auditFragment._edit.removeAttribute)
      .toHaveBeenCalled.once()
      .with('href');
  });

  it('lägger till ett protokoll', async () => {
    const id = '42';
    const text = 'Hello, World!';
    await view.open();
    view.addProtocol(id, text);
    const li = docFragment.children[0];
    const icon = docFragment._svg.children[0];
    expect(icon.getAttribute('xlink:href').endsWith('#ico-document')).toBe(
      true
    );
    expect(docFragment._link.href).toBe('protokoll.html?audit=42');
    expect(docFragment._link.target).toBe('_blank');
    expect(docFragment._link.textContent).toBe('Granskningsprotokoll');
    expect(docFragment._button.dataset.type).toBe('protocol');
    expect(docFragment._button.dataset.id).toBe(id);
    expect(li.insertBefore).toHaveBeenCalled.once();
    expect(li.children[2].textContent).toBe(text);
  });

  it.with(['remarks', '#ico-remarks'], ['injunction', '#ico-injunction'])(
    "lägger till ett dokument av typ '{0}'",
    async (type, url) => {
      const cols = ['first', 'second'];
      const id = '42';
      await view.open();
      view.addDocument(type, id, Array.from(cols));
      const li = docFragment.children[0];
      const icon = docFragment._svg.children[0];
      expect(icon.getAttribute('xlink:href').endsWith(url)).toBe(true);
      expect(docFragment._link.dataset.type).toBe(type);
      expect(docFragment._link.dataset.id).toBe(id);
      expect(docFragment._link.textContent).toBe(cols[0]);
      expect(docFragment._button.dataset.type).toBe(type);
      expect(docFragment._button.dataset.id).toBe(id);
      expect(li.insertBefore).toHaveBeenCalled.once();
      expect(li.children[2].textContent).toBe(cols[1]);
    }
  );

  it.with(['csv'], ['csvAudit'])(
    "lägger till ett dokument av typ '{0}'",
    async (type) => {
      const cols = ['first', 'second'];
      const id = '42';
      const url = '#ico-document';
      await view.open();
      view.addDocument(type, id, Array.from(cols));
      const li = docFragment.children[0];
      const icon = docFragment._svg.children[0];
      const span = li.children[1];
      expect(icon.getAttribute('xlink:href').endsWith(url)).toBe(true);
      expect(span.tagName).toBe('SPAN');
      expect(span.textContent).toBe(cols[0]);
      expect(docFragment._button.dataset.type).toBe(type);
      expect(docFragment._button.dataset.id).toBe(id);
      expect(li.insertBefore).toHaveBeenCalled.once();
      expect(li.children[2].textContent).toBe(cols[1]);
    }
  );
});

describe('Hantera interaktion', () => {
  let docFragment;
  let view;

  beforeEach(() => {
    // Komplettera artikelelementet.
    article._docs = mock.element('ul');
    article._save = mock.eventTarget('button', { value: 'save' }, {});
    article.querySelector = (s) =>
      ({
        '#addr': mock.element('dd', { id: 'addr' }, {}),
        '#create': mock.link(),
        '#edit': mock.link(),
        '#email': mock.element('dd', { id: 'email' }, {}),
        '#log': mock.link(),
        '#log-count': mock.element('span'),
        '#org': mock.element('dd', { id: 'org' }, {}),
        '#reg-no': mock.element('dd', { id: 'reg-no' }, {}),
        '#supervisor': mock.element('dd', { id: 'supervisor' }, {}),
        '#tel': mock.element('dd', { id: 'tel' }, {}),
        '.doc ul': article._docs,
        '.org': mock.element('section'),
        'button value=["save"]': article._save,
        h1: mock.element('h1'),
      })[s] ?? null;
    article.querySelectorAll = (s) =>
      ({
        '.doc ul a:not([target])': [docFragment._link],
        'button[type="button"]': [article._save, docFragment._button],
      })[s] ?? [];

    docFragment = {
      children: [mock.element('li', { children: [] }, {})],
      _button: mock.eventTarget('button', { value: 'save' }, {}),
      _link: mock.eventTarget('a', { href: '#' }, {}),
      _svg: mock.element('svg', { children: [mock.element('use')] }, {}),
    };
    docFragment.children[0].children = [
      docFragment._svg,
      docFragment._link,
      docFragment._button,
    ];

    // DOM-dokumentet.
    const doc = {
      body: mock.element('body'),
      head: mock.element('head'),
      createElement: (t) => mock.element(t),
      getElementById: (s) =>
        ({
          'doc-listing-template': mock.template(() => docFragment),
        })[s] ?? null,
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Skapa en vyinstans.
    view = new CaseDisplayView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      doc
    );
  });

  it.with(['remarks', 'påpekande'], ['injunction', 'föreläggande'])(
    'meddelar observatörer vid klick på {1}',
    async (type) => {
      let notified = false;
      await view.open();
      view.addDocument(type, 42, ['test']);
      view.subscribe((e) => {
        notified = true;
        expect(e.action).toBe('open');
        expect(e.id).toBe('42');
        expect(e.type).toBe(type);
      });
      view.activate();
      docFragment._link.triggerEvent({ type: 'click' });
      expect(notified).toBe(true);
    }
  );

  it.with(['remarks', 'påpekande'], ['injunction', 'föreläggande'])(
    'meddelar observatörer vid nedladdning av {1}',
    async (type) => {
      let notified = false;
      await view.open();
      view.addDocument(type, 42, ['test']);
      view.subscribe((e) => {
        notified = true;
        expect(e.action).toBe('save');
        expect(e.path).toBe(null);
        expect(e.trigger).toEqual(docFragment._button);
        expect(e.type).toBe('form');
      });
      view.activate();
      docFragment._button.triggerEvent({ type: 'click' });
      expect(notified).toBe(true);
    }
  );

  it('meddelar observatörer vid spara', async () => {
    let notified = false;
    await view.open();
    view.subscribe((e) => {
      notified = true;
      expect(e.action).toBe('save');
      expect(e.path).toBe(null);
      expect(e.trigger).toEqual(article._save);
      expect(e.type).toBe('form');
    });
    view.activate();
    article._save.triggerEvent({ type: 'click' });
    expect(notified).toBe(true);
  });
});

// Importera beroenden.
import { CaseDisplayView } from '../../js/view/CaseDisplayView.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

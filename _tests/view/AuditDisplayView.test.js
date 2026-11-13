/**
 * Enhetstestfall för urvalslistningsvyn.
 *
 * @license CC-BY 4.9
 * @see AuditDisplayView
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
  let doc;
  let docFragment;
  let form;
  let listingFragment;
  let view;

  beforeEach(() => {
    form = mock.element(
      'form',
      {
        date: mock.input('date', 'date'),
      },
      {
        querySelectorAll: () => [],
      }
    );

    // Komplettera artikelelementet.
    article._audit = mock.element(
      'a',
      {
        children: [
          mock.element('svg', { children: mock.element('use') }, {}),
          mock.element('span'),
        ],
      },
      {}
    );
    (article._buttons = mock.element('p')),
      (article._counts = {
        component: mock.element('span'),
        doc: mock.element('span'),
        page: mock.element('span'),
        screen: mock.element('span'),
      });
    article._docs = mock.element(
      'ul',
      {},
      {
        querySelectorAll: () => [],
      }
    );
    article._docsSection = mock.element('section');
    article._h1 = mock.element('h1');
    article._injunction = mock.element(
      'button',
      {
        value: 'injunction',
      },
      {}
    );
    article._listing = mock.element('table');
    article._progress = mock.element(
      'p',
      {
        children: [
          mock.element('progress', { max: 0, value: 0 }),
          mock.element('progress', { max: 0, value: 0 }),
        ],
      },
      {}
    );
    article._reopen = mock.element(
      'p',
      {
        _button: mock.element('button'),
      },
      {
        querySelector: () => article._reopen._button,
      }
    );
    article._sample = mock.element(
      'a',
      {
        children: [
          mock.element('svg', { children: mock.element('use') }, {}),
          mock.element('span'),
        ],
      },
      {}
    );
    article._version = mock.element('p');
    article.querySelector = (s) =>
      ({
        '.audit.buttons': article._buttons,
        '.progress': article._progress,
        '#docs': article._docsSection,
        'button[value="injunction"]': article._injunction,
        form,
        h1: article._h1,
        'p.app': article._version,
        'table.sample': article._listing,
      })[s] ?? null;
    article.querySelectorAll = (s) =>
      ({
        progress: article._progress.children,
      })[s] ?? [];

    // Mallelement som klonas.
    docFragment = {
      children: [mock.element('li', { children: [] }, {})],
      _button: mock.element('button'),
      _link: mock.link('', { target: '' }),
      _svg: mock.element('svg', { children: [mock.element('use')] }, {}),
    };
    docFragment.children[0].children = [
      docFragment._svg,
      mock.element('span', { children: [docFragment._button] }),
      mock.element('span', { children: [docFragment._link] }),
    ];

    const td = (c) => mock.element('td', { children: [c] }, {});
    listingFragment = {
      children: [mock.element('tr', { children: [] }, {})],
      _audit: mock.link('sample={{id}}', {
        _attrs: {
          'aria-label': '{{name}}, {{progress}}, {{type}}',
          href: 'sample={{id}}',
        },
        children: [
          mock.element(
            'svg',
            {
              _attrs: { 'aria-label': '{{type}}' },
              children: [
                mock.element(
                  'use',
                  {
                    _attrs: {
                      'xlink:href': 'ico-{{ico}}',
                    },
                  },
                  {}
                ),
              ],
            },
            {}
          ),
          mock.element('span', { textContent: '{{name}}' }, {}),
        ],
      }),
      _category: mock.element('td', { textContent: '{{category}}' }, {}),
      _conn: mock.element('td', { textContent: '{{connections}}' }, {}),
      _edit: mock.link('sample={{id}}%3D{{audit}}', {
        _attrs: {
          'aria-label': '{{name}}',
          href: 'sample={{id}}%3D{{audit}}',
        },
      }),
      _link: mock.link('{{url}}', {
        _attrs: {
          'aria-label': '{{type}} {{name}}',
          href: '{{url}}',
        },
        children: [mock.element('span', { textContent: '{{type-d}}' })],
      }),
      _note: mock.element('td', { textContent: '{{note}}' }, {}),
      _progress: mock.element('td', { textContent: '{{progress}}' }, {}),
    };
    listingFragment.children[0].children = [
      td(listingFragment._audit),
      listingFragment._progress,
      td(listingFragment._edit),
      listingFragment._category,
      listingFragment._conn,
      td(listingFragment._link),
      listingFragment._note,
    ];

    // DOM-dokumentet.
    doc = {
      body: mock.element('body'),
      _ids: {},
      createElement: (t) => mock.element(t),
      getElementById: (s) =>
        ({
          audit: article._audit,
          'component-count': article._counts.component,
          'doc-count': article._counts.doc,
          'doc-list': article._docs,
          'doc-template': mock.template(() => docFragment),
          'grid-row-template': mock.template(() => listingFragment),
          'page-count': article._counts.page,
          reopen: article._reopen,
          sample: article._sample,
          'screen-count': article._counts.screen,
        })[s] ??
        doc._ids[s] ??
        null,
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Skapa en vyinstans.
    view = new AuditDisplayView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      doc
    );
  });

  it('sätter sidrubriken', async () => {
    const text = 'Test Heading';
    await view.open();
    view.heading = text;
    expect(article._h1.textContent).toBe(text);
  });

  it('sätter typ av digital service', async () => {
    await view.open();
    view.service = 'app';
    expect(article.classList.contains('app')).toBe(true);
    expect(article.classList.contains('website')).toBe(false);
    view.service = 'website';
    expect(article.classList.contains('app')).toBe(false);
    expect(article.classList.contains('website')).toBe(true);
  });

  it('tar bort typ av digital service vid stängning', async () => {
    await view.open();
    view.service = 'app';
    expect(article.classList.contains('app')).toBe(true);
    view.close();
    expect(article.classList.contains('app')).toBe(false);
  });

  it('sätter förloppsindikator för urval', async () => {
    await view.open();
    const max = 12;
    const progress = article._progress.children[0];
    const text = '1 av 12 kategorier';
    const value = 1;
    await view.open();
    view.setSampleProgress(value, max, text);
    expect(progress.value).toBe(value);
    expect(progress.max).toBe(max);
    expect(progress.getAttribute('aria-label')).toBe(text);
  });

  it('sätter förloppsindikator för granskning', async () => {
    await view.open();
    const max = 42;
    const progress = article._progress.children[1];
    const text = '13 av 42 stickprov';
    const value = 13;
    await view.open();
    view.setAuditProgress(value, max, text);
    expect(progress.value).toBe(value);
    expect(progress.max).toBe(max);
    expect(progress.getAttribute('aria-label')).toBe(text);
  });

  it('visar antalet stickprov i urvalet', async () => {
    await view.open();
    view.componentCount = 1;
    view.documentCount = 2;
    view.screenCount = 3;
    view.webpageCount = 4;
    expect(article._counts.component.textContent).toBe('1 komponent');
    expect(article._counts.doc.textContent).toBe('2 dokument');
    expect(article._counts.screen.textContent).toBe('3 vyer');
    expect(article._counts.page.textContent).toBe('4 webbsidor');
  });

  it('visar versionsnummer för mobil applikation', async () => {
    await view.open();
    view.appVersion = '3.14';
    expect(article._version.textContent).toBe(' 3.14');
  });

  it.with(
    ['component', 'Klar', null, ''],
    ['document', 'Klar', 'https://digg.se/test.pdf', ''],
    ['screen', '1 av 42 granskat', null, ''],
    ['webpage', '0 granskade', 'https://digg.se', 'Note']
  )(
    "lägger till ett stickprov av typ '{0}'",
    async (type, progress, url, note) => {
      const audit = 42;
      const name = 'Test sample';
      const sample = 69;
      await view.open();
      view.addSample(
        audit,
        sample,
        progress,
        'test',
        13,
        type,
        name,
        url,
        note
      );
      const frag = listingFragment;
      const [svg, nameSpan] = frag._audit.children;
      const [icon] = svg.children;
      const [linkSpan] = frag._link.children;
      const types = {
        component: 'Komponent',
        document: 'Dokument',
        screen: 'Vy',
        webpage: 'Webbsida',
      };
      expect(frag._audit.getAttribute('aria-label')).toBe(
        `${name}, ${progress}, ${types[type]}`
      );
      expect(frag._audit.getAttribute('href')).toBe(`sample=${sample}`);
      expect(frag._progress.textContent).toBe(progress);
      expect(svg.getAttribute('aria-label')).toBe(types[type]);
      expect(icon.getAttribute('xlink:href')).toBe(`ico-${type}`);
      expect(nameSpan.textContent).toBe(name);
      expect(frag._progress.textContent).toBe(progress);
      expect(frag._edit.getAttribute('aria-label')).toBe(name);
      expect(frag._edit.getAttribute('href')).toBe(
        `sample=${sample}%3D${audit}`
      );
      expect(frag._category.textContent).toBe('test');
      expect(frag._conn.textContent).toBe('13');
      if (url) {
        const typeD =
          {
            document: 'dokumentet',
            webpage: 'webbsidan',
          }[type] ?? '';
        expect(frag._link.getAttribute('aria-label')).toBe(
          `${types[type]} ${name}`
        );
        expect(frag._link.getAttribute('href')).toBe(url);
        expect(linkSpan.textContent).toBe(typeD);
      } else {
        expect(frag._link.remove).toHaveBeenCalled.once();
      }
      expect(frag._note.textContent).toBe(note);
    }
  );

  it('lägger till ett granskningsprotokoll', async () => {
    await view.open();
    view.addProtocol(42);
    const frag = docFragment;
    const [li] = frag.children;
    const [use] = frag._svg.children;
    expect(use.getAttribute('xlink:href')).toBe('document');
    expect(frag._link.href).toBe('protokoll.html?audit=42');
    expect(frag._link.textContent).toBe('Granskningsprotokoll');
    expect(frag._link.target).toBe('_blank');
    expect(article._docs.appendChild).toHaveBeenCalled.once();
  });

  it.with(['remarks', '13', 'påpekande'], ['injunction', '42', 'föreläggande'])(
    'lägger till ett {2} före aktivering',
    async (icon, id) => {
      await view.open();
      view.addDocument(icon, 'Test document', id);
      const frag = docFragment;
      const [li] = frag.children;
      const [use] = frag._svg.children;
      expect(li.id).toBe(`doc-${id}`);
      expect(use.getAttribute('xlink:href')).toBe(icon);
      expect(frag._link.dataset.id).toBe(String(id));
      expect(frag._link.dataset.type).toBe(icon);
      expect(frag._link.textContent).toBe('Test document');
      expect(article._docs.appendChild).toHaveBeenCalled.once();
    }
  );

  it.with(['remarks', '13', 'påpekande'], ['injunction', '42', 'föreläggande'])(
    'lägger till ett {2} efter aktivering',
    async (icon, id) => {
      await view.open();
      view.activate();
      view.addDocument(icon, 'Test document', id);
      const frag = docFragment;
      expect(frag._button.addEventListener).toHaveBeenCalled.once();
      expect(frag._link.addEventListener).toHaveBeenCalled.once();
    }
  );

  it('tar bort ett dokument', async () => {
    doc._ids['doc-42'] = docFragment.children[0];
    const id = '42';
    await view.open();
    view.addDocument('remarks', 'Test document', id);
    view.deleteDocument(id);
    const frag = docFragment;
    const [li] = frag.children;
    expect(li.remove).toHaveBeenCalled.once();
  });

  it('sätter sökväg för urvalslänken}', async () => {
    const link = article._sample;
    const text = 'Test';
    const url = '?page=other';
    await view.open();
    view.setSampleLink(url, text);
    expect(link.href).toBe(url);
    expect(link.children[1].textContent).toBe(text);
  });

  it('sätter sökväg för granskningslänken}', async () => {
    const link = article._audit;
    const text = 'Test';
    const url = '?page=other';
    await view.open();
    view.setAuditLink(url, text);
    expect(link.href).toBe(url);
    expect(link.children[1].textContent).toBe(text);
  });

  it('sätter "pågående" läge', async () => {
    await view.open();
    view.setFinishedMode(false);
    expect(article._docsSection.remove).toHaveBeenCalled.once();
  });

  it('sätter "slutfört" läge (godkänd)', async () => {
    view.advancedMode = true;
    await view.open();
    view.setFinishedMode(true, false);
    expect(article._progress.remove).toHaveBeenCalled.once();
    expect(article._buttons.remove).toHaveBeenCalled.once();
    expect(form.remove).toHaveBeenCalled.once();
  });

  it('sätter "slutfört" läge (underkänd)', async () => {
    view.advancedMode = true;
    await view.open();
    view.setFinishedMode(true, true);
    expect(article._progress.remove).toHaveBeenCalled.once();
    expect(article._buttons.remove).toHaveBeenCalled.once();
    expect(form.remove).toHaveBeenCalled.never();
  });

  it('tar bort formuläret (före öppning) i förenklat läge', async () => {
    view.advancedMode = false;
    await view.open();
    expect(form.remove).toHaveBeenCalled.once();
  });

  it('tar bort formuläret (efter öppning) i förenklat läge', async () => {
    view.advancedMode = true;
    await view.open();
    view.advancedMode = false;
    expect(form.remove).toHaveBeenCalled.once();
  });

  it('sätter tidigaste tillåtna åtgärdsdatum', async () => {
    const date = new Date();
    const trunc = (d) => d.toLocaleDateString('sv');
    await view.open();
    view.minDate = date;
    expect(form.date.min).toBe(trunc(date));
  });

  it('skriver och läser åtgärdsdatum', async () => {
    const date = new Date();
    const trunc = (d) => d.toLocaleDateString('sv');
    date.setMonth(date.getMonth() + 3);
    await view.open();
    view.date = date;
    expect(trunc(view.date)).toBe(trunc(date));
  });

  it.with([true, 'aktiverar'], [false, 'deaktiverar'])(
    '{1} föreläggandeknappen',
    async (enabled) => {
      await view.open();
      view.enableInjunctions(enabled);
      expect(article._injunction.disabled).toBe(!enabled);
    }
  );

  it('aktiverar upplåsningsknappen', async () => {
    await view.open();
    view.enableReopen();
    expect(article._reopen.hidden).toBe(false);
    expect(article._reopen._button.disabled).toBe(false);
  });
});

describe('Hantera interaktion', () => {
  let dialog;
  let view;

  beforeEach(() => {
    // Komplettera artikelelementet.
    article._docButton = mock.eventTarget(
      'button',
      { dataset: { id: 42, type: 'remarks' }, value: 'deleteDoc' },
      {}
    );
    article._docLink = mock.eventTarget('a', { href: '#' }, {});
    article._docs = {
      querySelectorAll: () => [article._docLink],
    };
    (article.querySelector = () => null),
      (article.querySelectorAll = (s) =>
        ({
          '#doc-list a': [article._docLink],
        })[s] ?? []);

    // Dialogruta för bekräftelse.
    dialog = mock.confirmDialog();

    // DOM-dokumentet.
    const doc = {
      body: mock.element('body'),
      getElementById: (s) =>
        ({
          'confirm-dialog': dialog,
          'doc-list': article._docs,
        })[s] ?? null,
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Skapa en vyinstans.
    view = new AuditDisplayView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      doc
    );
  });

  it.with(
    ['protocol', null, 'protokollänk'],
    ['remarks', '1600840800000,1603411200000', 'påpekandelänk'],
    ['injunction', '1600840800000,1606089600000', 'föreläggandelänk']
  )('meddelar observatorer vid klick på {2}', async (type, id) => {
    article._docLink.dataset = { id, type };
    let notified = false;
    await view.open();
    view.activate();
    view.subscribe((e) => {
      notified = true;
      expect(e.action).toBe('open');
      expect(e.id).toBe(id);
      expect(e.type).toBe(type);
    });
    article._docLink.triggerEvent({ type: 'click' });
    expect(notified).toBe(true);
  });

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
import { AuditDisplayView } from '../../js/view/AuditDisplayView.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

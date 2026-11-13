/**
 * Enhetstestfall för listvyn.
 *
 * @license CC-BY 4.0
 * @see ListView
 */

let article;
let status;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Statusbehållaren: några attribut ska uppdateras av basklassen.
  status = mock.element('div');
});

describe('Åtkomst till sidelement', () => {
  let doc;
  let fragment;
  let view;

  beforeEach(() => {
    // Artikelelementet.
    const list = mock.element('ul', {
      querySelector: (s) =>
        ({
          '[data-key="test1"]': article._li1.children[1],
          '[data-key="test2"]': article._li2.children[1],
        })[s] ?? null,
    });

    article = {
      classList: mock.domTokenList(),
      innerHTML: '',
      _create: mock.element(
        'a',
        {
          children: [
            mock.element('svg', { children: [mock.element('use')] }),
            mock.element('span'),
          ],
          href: '',
        },
        {}
      ),
      _h1: mock.element('h1'),
      _li1: mock.element(
        'li',
        {
          children: [
            mock.element('svg'),
            mock.element('a'),
            mock.element('span'),
          ],
        },
        {}
      ),
      _li2: mock.element(
        'li',
        {
          children: [
            mock.element('svg'),
            mock.element('a'),
            mock.element('span'),
            mock.element('span'),
            mock.element('span'),
            mock.element('span'),
          ],
        },
        {}
      ),
      _list: list,
      querySelector: (s) =>
        ({
          h1: article._h1,
          'ul.listing': article._list,
        })[s] ?? null,
    };

    article._li1.children[1].parentNode = article._li1;
    article._li2.children[1].parentNode = article._li2;

    // Mallelementet som klonas.
    fragment = {
      children: [
        mock.element(
          'li',
          {
            children: [
              mock.element('svg', { children: [mock.element('use')] }, {}),
              mock.link(),
            ],
          },
          {}
        ),
      ],
    };

    // DOM-dokumentet.
    doc = mock({
      body: mock.element('body'),
      createElement: (t) => mock.element(t),
      getElementById: (s) =>
        ({
          create: article._create,
          'listing-template': mock.template(() => fragment),
        })[s] ?? null,
      querySelector: mock.defaultQuerySelector(article, status),
    });

    // Skapa en vyninstans.
    view = new ListView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      doc
    );
  });

  it('sätter meddelandet som ska visas när listan är tom', async () => {
    const message = 'test message';
    await view.open();
    view.emptyMessage = message;
    expect(article._list.getAttribute('data-empty')).toBe(message);
  });

  it('sätter sidrubriken', async () => {
    const text = 'test heading';
    await view.open();
    view.heading = text;
    expect(article._h1.textContent).toBe(text);
  });

  it('sätter listklassen', async () => {
    const cls = 'test';
    await view.open();
    view.listClass = cls;
    expect(article._list.classList.contains(cls)).toBe(true);
  });

  it('lägger till en länk i listan', async () => {
    await view.open();
    view.addLink('icon', 'key', 'url', ['col-1', 'col-2']);
    const [li] = fragment.children;
    const [svg, a, span] = li.children;
    const [use] = svg.children;
    expect(use.getAttribute('xlink:href')).toBe('../img/ikoner.svg#icon');
    expect(a.dataset.key).toBe('key');
    expect(a.href).toBe('url');
    expect(a.textContent).toBe('col-1');
    expect(span.textContent).toBe('col-2');
    expect(article._list.children.length).toBe(1);
  });

  it('ersätter en länk i listan med fler kolumner', async () => {
    await view.open();
    view.replaceLink('test1', 'url', ['col-1', 'col-2', 'col-3']);
    expect(article._li1.children.length).toBe(4);
    const li = article._li1;
    const a = li.children[1];
    const span1 = li.children[2];
    const span2 = li.children[3];
    expect(a.href).toBe('url');
    expect(a.textContent).toBe('col-1');
    expect(span1.textContent).toBe('col-2');
    expect(span2.textContent).toBe('col-3');
  });

  it('ersätter en länk i listan med färre kolumner', async () => {
    await view.open();
    view.replaceLink('test2', 'url', ['col-1', 'col-2']);
    expect(article._li2.children.length).toBe(3);
    const li = article._li2;
    const a = li.children[1];
    const span = li.children[2];
    expect(a.href).toBe('url');
    expect(a.textContent).toBe('col-1');
    expect(span.textContent).toBe('col-2');
  });

  it('sätter ikon och text i skapa-länken', async () => {
    await view.open();
    view.setCreate('url', 'icon', 'text');
    const a = article._create;
    const [svg, span] = a.children;
    const [use] = svg.children;
    expect(a.href).toBe('url');
    expect(use.getAttribute('xlink:href')).toBe('../img/ikoner.svg#icon');
    expect(span.textContent).toBe('text');
  });
});

describe('Uppladdning av ärendefil', () => {
  let doc;
  let fileInput;
  let fragment;
  let template;
  let view;

  beforeEach(() => {
    // Artikelelementet.
    article = mock.eventTarget(
      'article',
      {},
      {
        querySelector: () => null,
      }
    );

    // Mallelementet som klonas.
    fileInput = mock.eventTarget(
      'input',
      {
        files: [{}],
        value: 'test.json',
      },
      {
        click: () => fileInput.triggerEvent({ type: 'click' }),
      }
    );

    fragment = {
      children: [
        mock.element('label', { children: [mock.element('span'), fileInput] }),
        mock.eventTarget('button'),
      ],
    };

    template = {
      content: { cloneNode: () => fragment },
      parentNode: mock({ insertBefore: (n, c) => n }),
    };

    // DOM-dokumentet.
    doc = mock({
      body: mock.eventTarget('body'),
      createElement: (t) => mock.element(t),
      getElementById: (s) =>
        ({
          'upload-template': template,
        })[s] ?? null,
      querySelector: mock.defaultQuerySelector(article, status),
    });

    // Skapa en vyninstans.
    view = new ListView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      doc
    );
  });

  it('aktiverar funktioner för uppladdning', async () => {
    await view.open();
    view.enableUpload();
    expect(template.parentNode.insertBefore)
      .toHaveBeenCalled.once()
      .with(fragment, template);
  });

  it('meddelar observatörer vid uppladdning via knapp', async () => {
    let notified = false;
    await view.open();
    view.enableUpload();
    view.subscribe((e) => {
      notified = true;
      expect(e.action).toBe(undefined);
      expect(e.trigger).toBe(fragment.children[1]);
      expect(e.type).toBe('upload');
      expect(e.value).toBe(fileInput.files[0]);
    });
    fileInput.triggerEvent({ type: 'change' });
    expect(notified).toBe(true);
  });

  it('meddelar observatörer vid uppladdning via dra-och-släpp', async () => {
    let notified = false;
    await view.open();
    view.enableUpload();
    view.subscribe((e) => {
      notified = true;
      expect(e.action).toBe('drop');
      expect(e.trigger).toBe(null);
      expect(e.type).toBe('upload');
      expect(e.value).toEqual(fileInput.files);
    });
    article.triggerEvent({
      dataTransfer: { files: fileInput.files },
      type: 'drop',
    });
    expect(notified).toBe(true);
  });
});

// Importera beroenden.
import { ListView } from '../../js/view/ListView.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

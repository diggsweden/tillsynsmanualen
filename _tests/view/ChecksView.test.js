/**
 * Enhetstestfall för kontrollpresentationsvyn.
 *
 * @license CC-BY 4.0
 * @see ChecksView
 */

let article;
let doc;
let view;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Artikelelementet.
  article = mock.element(
    'article',
    {
      classList: mock.domTokenList(),
      _h1: mock.element('h1'),
      _progress: mock.element(
        'progress',
        {
          max: 0,
          parentNode: mock({ remove: () => {} }),
          value: 0,
        },
        {}
      ),
    },
    {
      querySelector: (sel) =>
        ({
          h1: article._h1,
          progress: article._progress,
        })[sel] ?? null,
      querySelectorAll: () => [],
    }
  );

  // Statusbehållaren: några attribut ska uppdateras av basklassen.
  const status = mock.element('div');

  // DOM-dokumentet.
  doc = mock(
    {
      body: mock.eventTarget('body'),
      head: mock.eventTarget('head'),
      _ids: {},
    },
    {
      createElement: (t) => mock.element(t),
      createTextNode: (s) => s,
      querySelector: mock.defaultQuerySelector(article, status),
    }
  );

  // Skapa en vyinstans.
  view = new ChecksView(
    mock.eventListenerList(),
    mock.pageContentLoader(),
    doc
  );
});

describe('Vyfunktioner', () => {
  it('sätter sidrubriken', async () => {
    const heading = 'Test Heading';
    await view.open();
    view.heading = heading;
    expect(article._h1.textContent).toBe(heading);
  });

  it('sätter antalet krav i förloppsindikatorn', async () => {
    const count = 42;
    await view.open();
    view.requirementCount = count;
    const progress = article._progress;
    expect(progress.max).toBe(42);
    expect(progress.textContent).toBe('0 av 42 krav hämtade');
  });

  it('lägger till ett avsnitt', async () => {
    const heading = 'Test section';
    await view.open();
    view.section(heading);
    expect(article.children.length).toBe(1);
    const [section] = article.children;
    const [h2] = section.children;
    expect(section.tagName).toBe('SECTION');
    expect(h2.tagName).toBe('H2');
    expect(h2.textContent).toBe(heading);
  });

  it('döljer förloppsindikatorn', async () => {
    await view.open();
    view.hideProgress();
    expect(article._progress.parentNode.remove).toHaveBeenCalled.once();
  });
});

describe('Avsnittsfunktioner', () => {
  it('lägger till ett underavsnitt', async () => {
    const heading = 'Test section';
    await view.open();
    const section = view.section('Test section');
    section.section(heading);
    const [sec] = article.children;
    const [, sub] = sec.children;
    const [h3] = sub.children;
    expect(sub.tagName).toBe('SECTION');
    expect(h3.tagName).toBe('H3');
    expect(h3.textContent).toBe(heading);
  });

  it.with(
    ['5.3', 'Biometrics'],
    ['9.1.1.1', 'Non-text Content', ' (nivå\u00a0A)'],
    ['11.1.1.1.2', 'Non-text content (closed functionality)']
  )('lägger till ett krav för {0}', async (clause, link, suffix) => {
    const id = 'test';
    const title = 'Test requirement';
    await view.open();
    const section = view.section('Test section');
    section.requirement(title, clause);
    const [sec] = article.children;
    const [, req] = sec.children;
    const [h3, p] = req.children;
    const [a, suff] = p.children;
    expect(req.tagName).toBe('SECTION');
    expect(h3.tagName).toBe('H3');
    expect(h3.innerHTML).toBe(title);
    expect(p.textContent).toBe(`Krav: ${clause} `);
    expect(a.textContent).toBe(link);
    suffix && expect(suff).toBe(suffix);
    expect(article._progress.value).toBe(1);
  });

  it.with(
    ['6 §', '6 §'],
    ['6 § 2 st', '6 § 2 stycket'],
    ['6 § 1 st 3 p', '6 § 1 stycket 3 punkten']
  )(
    'lägger till ett krav mot {0} DIGG:s föreskrifter',
    async (clause, display) => {
      const ref =
        'Myndigheten för digital förvaltnings föreskrifter om ' +
        'tillgänglighet till digital offentlig service';
      const title = 'Test requirement';
      await view.open();
      const section = view.section('Test section');
      section.requirement(title, `MDFFS2019:2 ${clause}`);
      const [sec] = article.children;
      const [, req] = sec.children;
      const [h3, p] = req.children;
      const [a, suff] = p.children;
      const [cite] = a.children;
      expect(req.tagName).toBe('SECTION');
      expect(h3.tagName).toBe('H3');
      expect(h3.innerHTML).toBe(title);
      expect(p.innerHTML).toBe(`${display} `);
      expect(cite.innerHTML).toBe(ref);
      expect(suff).toBe(' (MDFFS\u00a02019:2)');
      expect(article._progress.value).toBe(1);
    }
  );

  it.with(['13 §', '13 §'], ['13 § 2 st', '13 § 2 stycket'])(
    'lägger till ett krav mot {0} DOS-lagen',
    async (clause, display) => {
      const ref =
        'lagen (2018:1937) om tillgänglighet till digital ' +
        'offentlig service';
      const title = 'Test requirement';
      await view.open();
      const section = view.section('Test section');
      section.requirement(title, `SFS2018:1937 ${clause}`);
      const [sec] = article.children;
      const [, req] = sec.children;
      const [h3, p] = req.children;
      const [a] = p.children;
      const [cite] = a.children;
      expect(req.tagName).toBe('SECTION');
      expect(h3.tagName).toBe('H3');
      expect(h3.innerHTML).toBe(title);
      expect(p.innerHTML).toBe(`${display} `);
      expect(cite.innerHTML).toBe(ref);
      expect(article._progress.value).toBe(1);
    }
  );
});

describe('kravfunktioner', () => {
  it('lägger till en ensam metod', async () => {
    const text = 'Single method';
    await view.open();
    const section = view.section('Test section');
    const reqSec = section.requirement('Test req', '9.1.1.1');
    reqSec.methods([text]);
    const [sec] = article.children;
    const [, req] = sec.children;
    const [, , h4, p] = req.children;
    expect(h4.tagName).toBe('H4');
    expect(h4.innerHTML).toBe('Metod');
    expect(p.tagName).toBe('P');
    expect(p.innerHTML).toBe(text);
  });

  it('lägger till flera metoder', async () => {
    const texts = ['First method', 'Second method'];
    await view.open();
    const section = view.section('Test section');
    const reqSec = section.requirement('Test req', '9.1.1.1');
    reqSec.methods(texts);
    const [sec] = article.children;
    const [, req] = sec.children;
    const [, , h41, p1, h42, p2] = req.children;
    expect(h41.innerHTML).toBe('Metod 1');
    expect(p1.innerHTML).toBe(texts[0]);
    expect(h42.innerHTML).toBe('Metod 2');
    expect(p2.innerHTML).toBe(texts[1]);
  });

  it('lägger till metodsteg', async () => {
    const texts = ['First step', 'Second step'];
    await view.open();
    const section = view.section('Test section');
    const reqSec = section.requirement('Test req', '9.1.1.1');
    reqSec.steps(texts);
    const [sec] = article.children;
    const [, req] = sec.children;
    const [, , h4, ol] = req.children;
    expect(h4.tagName).toBe('H4');
    expect(h4.innerHTML).toBe('Metod');
    expect(ol.tagName).toBe('OL');
    let i = 0;
    for (const li of ol.children) {
      expect(li.innerHTML).toBe(texts[i++]);
    }
  });

  it('lägger till undantag på kravnivå', async () => {
    const texts = ['First exception', 'Second exception'];
    await view.open();
    const section = view.section('Test section');
    const reqSec = section.requirement('Test req', '9.1.1.1');
    reqSec.exceptions(texts);
    const [sec] = article.children;
    const [, req] = sec.children;
    const [, , h4, ul] = req.children;
    expect(h4.tagName).toBe('H4');
    expect(h4.innerHTML).toBe('Undantag');
    expect(ul.tagName).toBe('UL');
    let i = 0;
    for (const li of ul.children) {
      expect(li.innerHTML).toBe(texts[i++]);
    }
  });

  it.with([true, 'Om', 'uppfyllt'], [false, 'Om inte', 'icke uppfyllt'])(
    'lägger till ett {2} villkor',
    async (yes, prefix) => {
      const text = 'Test condition';
      await view.open();
      const section = view.section('Test section');
      const reqSec = section.requirement('Test req', '11.7');
      reqSec.condition(text, yes);
      const [sec] = article.children;
      const [, req] = sec.children;
      const [, , h4, div] = req.children;
      const [p] = div.parentNode.children;
      expect(div.classList.contains('condition')).toBe(true);
      expect(div.tagName).toBe('DIV');
      expect(h4.tagName).toBe('H4');
      expect(h4.innerHTML).toBe('Kontroller');
      expect(p.getAttribute('class')).toBe('condition');
      expect(p.tagName).toBe('P');
      expect(p.innerHTML).toBe(`${prefix}: ${text}`);
    }
  );

  it('lägger till en enkel kontroll', async () => {
    const text = 'Test check';
    await view.open();
    const section = view.section('Test section');
    const reqSec = section.requirement('Test req', '11.7');
    reqSec.check([text]);
    const [sec] = article.children;
    const [, req] = sec.children;
    const [, , h4, p] = req.children;
    expect(h4.innerHTML).toBe('Kontroller');
    expect(p.getAttribute('class')).toBe('check');
    expect(p.innerHTML).toBe(text);
  });

  it('lägger till en enkel kontroll med undantag', async () => {
    const exceptions = ['First', 'Second'];
    const text = 'Test check';
    await view.open();
    const section = view.section('Test section');
    const reqSec = section.requirement('Test req', '11.7');
    reqSec.check([text], exceptions);
    const [sec] = article.children;
    const [, req] = sec.children;
    const [, , h4, p, ul] = req.children;
    expect(h4.innerHTML).toBe('Kontroller');
    expect(p.getAttribute('class')).toBe('check');
    expect(p.innerHTML).toBe(text);
    let i = 0;
    for (const li of ul.children) {
      expect(li.innerHTML).toBe(exceptions[i++]);
    }
  });

  it('lägger till en multipel kontroll', async () => {
    const texts = ['First option', 'Second option'];
    await view.open();
    const section = view.section('Test section');
    const reqSec = section.requirement('Test req', '11.7');
    reqSec.check(texts);
    const [sec] = article.children;
    const [, req] = sec.children;
    const [, , h4, p, ul] = req.children;
    expect(h4.innerHTML).toBe('Kontroller');
    expect(ul.getAttribute('class')).toBe('checks');
    let i = 0;
    for (const li of ul.children) {
      expect(li.innerHTML).toBe(texts[i++]);
    }
  });

  it('lägger till en tillämpningsanvisning', async () => {
    const id = 'test';
    const title = 'Test instruction';
    await view.open();
    const section = view.section('Test section');
    const reqSec = section.requirement('Test req', '11.7');
    reqSec.instruction(id, title);
    const [sec] = article.children;
    const [, req] = sec.children;
    const [, , p] = req.children;
    const [a] = p.children;
    expect(a.getAttribute('href')).toBe(`tillampning.html#${id}`);
    expect(a.innerHTML).toBe(title);
  });
});

// Importera beroenden.
import { ChecksView } from '../../js/view/ChecksView.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

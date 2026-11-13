/**
 * Enhetstestfall för loggnoteringslistvyn.
 *
 * @see LogListView
 */

let article;
let fragment;
let view;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Artikelelementet.
  article = {
    classList: mock.domTokenList(),
    innerHTML: '',
    _create: mock.link(),
    _h1: mock.element('h1'),
    _list: mock.element('ul'),
    querySelector: (s) =>
      ({
        h1: article._h1,
        'ul.listing': article._list,
      })[s] ?? null,
    querySelectorAll: () => [],
  };

  // Mallfragment som klonas.
  fragment = {
    children: [
      mock.element('li', {
        children: [
          mock.element('span'),
          mock.element('span'),
          mock.link(),
          mock.element('time', { datetime: '' }, {}),
          mock.element('time', { datetime: '' }, {}),
          mock.element('span'),
        ],
      }),
    ],
  };

  // Statusbehållaren: några attribut ska uppdateras av basklassen.
  const status = mock.element('div');

  // DOM-dokumentet.
  const doc = {
    body: mock.eventTarget('body'),
    getElementById: (s) =>
      ({
        create: article._create,
        'listing-template': mock.template(() => fragment),
      })[s] ?? null,
    querySelector: mock.defaultQuerySelector(article, status),
  };

  // Skapa en vyinstans.
  view = new LogListView(
    mock.breadcrumbTrail(),
    mock.eventListenerList(),
    mock.pageContentLoader(),
    doc
  );
});

it('sätter sidrubriken', async () => {
  const text = 'Ärendelogg 2020-1234';
  await view.open();
  view.heading = text;
  expect(article._h1.textContent).toBe(text);
});

it('sätter sökvägen i skapalänken', async () => {
  const url = '?page=log&case=42';
  await view.open();
  view.create = url;
  expect(article._create.href).toBe(url);
});

it('lägger till en notering i listan', async () => {
  const url = '?page=log&case=42&entry=13';
  await view.open();
  view.addEntry(url, 'T', 'D', new Date(1600857296000), 'test');
  const frag = fragment.children[0].children;
  expect(frag[0].textContent).toBe('T');
  expect(frag[1].textContent).toBe('D');
  expect(frag[2].href).toBe(url);
  expect(frag[3].datetime).toBe('2020-09-23T10:34:56.000Z');
  expect(frag[3].textContent).toBe('2020-09-23');
  expect(frag[4].datetime).toBe('2020-09-23T10:34:56.000Z');
  expect(frag[4].textContent).toBe('12:34');
  expect(frag[5].textContent).toBe('test');
});

// Importera beroenden.
import { LogListView } from '../../js/view/LogListView.js';
import { beforeEach, expect, it, mock } from '../functions.js';

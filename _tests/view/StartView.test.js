/**
 * Enhetstestfall för granskningsstartsidans vy.
 *
 * @license CC-BY 4.0
 * @see StartView
 */

let li;
let view;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Artikelelementet.
  const article = {
    classList: mock.domTokenList(),
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => [],
  };

  // Statusbehållaren.
  const status = mock.element('div');

  const anchor = mock.element('a');
  const svg = mock.element('svg');
  li = mock.element('li', { children: [svg, anchor] }, {});

  // DOM-dokumentet.
  const doc = {
    body: mock.element('body'),
    createElement: (t) => mock.element(t),
    getElementById: () => null,
    querySelector: (s) =>
      ({
        'main > article[aria-live]': article,
        'main > [role="status"]': status,
        'ol.check li[data-step="test"]': li,
      })[s] ?? null,
  };

  // Skapa en vyinstans.
  view = new StartView(
    mock.breadcrumbTrail(),
    mock.eventListenerList(),
    mock.pageContentLoader('HTML'),
    doc
  );
});

it.with([false, null, 'återstående'], [true, '?page=test', 'avklarat'])(
  'markerar ett steg som {2}',
  async (checked, url) => {
    await view.open();
    view.checkStep('test', checked, url);

    // Ska ha satt rätt klass på elementet.
    expect(li.classList.contains('checked')).toBe(checked);
    expect(li.classList.contains('unchecked')).toBe(!checked);

    const [svg, anchor] = li.children;

    // Ska ha satt eller raderat `href`-attributet på länken.
    if (url) {
      expect(anchor.getAttribute('href')).toBe(url);
    } else {
      expect(anchor.removeAttribute).toHaveBeenCalled.once().with('href');
    }

    // Ska ha satt ett ARIA-attribut på SVG-elementet ("kryssrutan").
    const done = { true: 'klart', false: 'inte klart' };
    expect(svg.getAttribute('aria-label')).toBe(done[checked]);
  }
);

// Importera beroenden.
import { StartView } from '../../js/view/StartView.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

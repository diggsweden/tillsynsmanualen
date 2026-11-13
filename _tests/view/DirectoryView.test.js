/**
 * Enhetstestfall för katalogredigeringssidans vy.
 *
 * @license CC-BY 4.0
 * @see DirectoryView
 */

it('returnerar angiven katalog', async () => {
  // Formulär och inmatningsfält för filkatalog.
  const form = mock.eventTarget('form', {
    dir: mock.input('text', 'dir'),
    querySelectorAll: () => [],
  });

  // Artikelelementet: basklassen ska sätta och ta bort klasser samt
  // populera det med sidinnehåll.
  const article = {
    classList: mock.domTokenList(),
    innerHTML: '',
    querySelector: (sel) => ({ form: form })[sel],
  };

  // Statusbehållaren: några attribut ska uppdateras av basklassen.
  const status = mock.element('div');

  // DOM-dokumentet: ska returnera fältet `body` på vilket basklassen tar
  // bort ett ARIA-attribut när sidladdningen är klar.
  const doc = {
    body: mock.element('body'),
    querySelector: mock.defaultQuerySelector(article, status),
    querySelectorAll: () => [],
  };

  const view = new DirectoryView(
    mock.breadcrumbTrail(),
    mock.eventListenerList(),
    mock.pageContentLoader(),
    doc
  );

  const path = 'G:\\Test';
  await view.open();
  view.dir = path;
  expect(form.dir.value).toBe(path);
  expect(view.dir).toBe(path);
});

// Importera beroenden.
import { DirectoryView } from '../../js/view/DirectoryView.js';
import { expect, it, mock } from '../functions.js';

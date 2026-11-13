/**
 * Enhetstestfall för kravlistvyn för ett stickprovsurval.
 *
 * @license CC-BY 4.0
 * @see SampleDisplayView
 */

let article;
let doc;
let reqFragment;
let secFragment;
let status;
let view;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Artikelelementet: basklassen sätter och tar bort klasser samt
  // populerar det med sidinnehåll.
  article = {
    classList: mock.domTokenList(),
    innerHTML: '',
    _approve: mock.eventTarget(
      'button',
      {
        children: [
          mock.element('svg'),
          mock.element('span', { textContent: 'Approve' }, {}),
        ],
        type: 'button',
        value: 'approve',
      },
      {}
    ),
    _audit: mock.element('a'),
    _components: mock.element('ul'),
    _contentTypes: mock.element('ul'),
    _copyDialog: mock.eventTarget(
      'dialog',
      {
        returnValue: undefined,
      },
      {
        close: (v) => (article._copyDialog.returnValue = v),
        showModal: () => {},
      }
    ),
    _copyDlgBtn: mock.eventTarget('button', { value: 'open' }, {}),
    _edit: mock.link(),
    _filter: mock.eventTarget('form'),
    _form: mock.eventTarget(
      'form',
      {
        _cancel: mock.eventTarget('button', { value: 'false' }, {}),
        _checkAll: mock.eventTarget(
          'button',
          {
            dataset: { value: 'check' },
          },
          {}
        ),
        _copy: mock.eventTarget('button', { value: 'true' }, {}),
        _reqs: mock.element('ul'),
        notes: mock.checkbox(false),
        source: mock.select('source', [{}]),
        querySelector: (s) =>
          ({
            'fieldset ul': article._form._reqs,
          })[s] ?? null,
        querySelectorAll: (s) =>
          ({
            'button[data-handler]': [
              article._form._cancel,
              article._form._copy,
            ],
            'fieldset li': article._form._reqs.children,
          })[s] ?? [],
      },
      {}
    ),
    _h1: mock.element(
      'h1',
      {
        children: [
          mock.element('svg', { children: [mock.element('use')] }, {}),
          mock.element(
            'span',
            {},
            {
              replaceWith: (e) => (article._h1.children[1] = e),
            }
          ),
        ],
      },
      {}
    ),
    _note: mock.element('dd'),
    _partial: mock.element(
      'button',
      {
        _attrs: { 'aria-pressed': 'false' },
      },
      {}
    ),
    _progress: mock.element('progress', { max: 0, value: 0 }, {}),
    _req: mock.element('div'),
    _resume: mock.element(
      'a',
      {
        children: [{}, mock.element('span')],
        href: '',
      },
      {}
    ),
    querySelector: (s) =>
      ({
        h1: article._h1,
        progress: article._progress,
      })[s] ?? null,
    querySelectorAll: () => [],
  };

  // Mallelement som klonas.
  const span = () =>
    mock.element(
      'span',
      {
        children: [
          mock.element('svg', { children: [mock.element('use')] }, {}),
        ],
      },
      {}
    );

  const reqItem = {
    _link: mock.link('.'),
    _rem1: mock.element('span', { innerHTML: 'text' }, {}),
    _rem2: mock.element('span', { innerHTML: 'text' }, {}),
    _req: mock.element('span'),
    _status: mock.element(
      'span',
      {
        children: [
          mock.element('svg', { children: [mock.element('use')] }, {}),
        ],
      },
      {}
    ),
    get children() {
      return [
        reqItem._status,
        reqItem._req,
        reqItem._link,
        reqItem._rem1,
        reqItem._rem2,
      ];
    },
  };

  reqFragment = { children: [mock.element('li', reqItem, {})] };

  secFragment = mock(
    {
      _h2: mock.element('h2'),
      _ul: mock.element('ul'),
      get children() {
        return [secFragment._h2, secFragment._ul];
      },
    },
    {
      replaceChild: (n, c) => (secFragment._h2 = n),
    }
  );

  // Statusbehållaren: några attribut ska uppdateras av basklassen.
  status = mock.element('div');

  // DOM-dokumentet.
  doc = {
    body: mock.element('body'),
    forms: { copy: article._form, filter: article._filter },
    head: mock.element('head'),
    createElement: (t) => mock.element(t),
    getElementById: (s) =>
      ({
        approve: article._approve,
        audit: article._audit,
        'check-all': article._form._checkAll,
        components: article._components,
        'content-types': article._contentTypes,
        'copy-btn': article._copyDlgBtn,
        'copy-dialog': article._copyDialog,
        edit: article._edit,
        note: article._note,
        partial: article._partial,
        'requirement-template': mock.template(() => reqFragment),
        resume: article._resume,
        'section-template': mock.template(() => secFragment, article._req),
      })[s] ?? null,
    querySelector: mock.defaultQuerySelector(article, status),
  };

  // Skapa en vyinstans.
  view = new SampleDisplayView(
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
  expect(link.href).toBe('../css/sample.css');
});

it('tar bort den tillagda stilmallen', async () => {
  await view.open();
  view.close();
  const [link] = doc.head.children;
  expect(link.remove).toHaveBeenCalled.once();
});

it.with(
  ['component', 'en komponent'],
  ['screen', 'en vy'],
  ['document', 'ett dokument'],
  ['webpage', 'en webbsida']
)('sätter sidrubrik för {1}', async (type) => {
  const name = 'Test';
  const path = `../img/ikoner.svg#ico-${type}`;
  await view.open();
  view.setHeading(type, name);
  const [svg, span] = article._h1.children;
  const [use] = svg.children;
  expect(span.textContent).toBe(name);
  expect(use.getAttribute('xlink:href')).toBe(path);
});

it('sätter en länkad sidrubrik', async () => {
  const name = 'Test';
  const url = 'https://example.com';
  await view.open();
  view.setHeading('webpage', name, url);
  const [svg, link] = article._h1.children;
  const [use] = svg.children;
  expect(link.getAttribute('href')).toBe(url);
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.textContent).toBe(name);
});

it('länkar till granskningsöversikten', async () => {
  const name = 'audit';
  const url = '?page=audit';
  await view.open();
  view.setAuditLink(url, name);
  const audit = article._audit;
  expect(audit.getAttribute('href')).toBe(url);
  expect(audit.textContent).toBe(name);
});

it('uppdaterar förloppsindikatorn', async () => {
  const max = 42;
  const text = '13 av 42 krav';
  const value = 13;
  await view.open();
  view.setProgress(value, max, text);
  const progress = article._progress;
  expect(progress.max).toBe(max);
  expect(progress.value).toBe(value);
  expect(progress.getAttribute('aria-label')).toBe(text);
});

it('sätter sökväg för redigering', async () => {
  const url = '?page=other';
  await view.open();
  view.edit = url;
  expect(article._edit.href).toBe(url);
});

it('deaktiverar redigeringslänken', async () => {
  await view.open();
  view.edit = null;
  expect(article._edit.removeAttribute).toHaveBeenCalled.with('href');
});

it('sätter partialgranskning', async () => {
  await view.open();
  expect(view.partial).toBe(false);
  view.partial = true;
  expect(view.partial).toBe(true);
  expect(article._partial.getAttribute('aria-pressed')).toBe('true');
});

it('sätter sökväg för fortsatt granskning', async () => {
  const text = 'Test';
  const url = '?page=other';
  await view.open();
  view.setResumeLink(url, text);
  const resume = article._resume;
  const [, span] = resume.children;
  expect(resume.href).toBe(url);
  expect(span.textContent).toBe(text);
});

it('deaktiverar fortsatt-granskningslänken', async () => {
  const text = 'Test';
  await view.open();
  view.setResumeLink(null, text);
  const resume = article._resume;
  const [, span] = resume.children;
  expect(span.textContent).toBe(text);
  expect(resume.removeAttribute).toHaveBeenCalled.once().with('href');
});

it('sätter text och värde i autogodkännandeknappen', async () => {
  await view.open();
  view.setApprove('Undo', 'undo');
  const approve = article._approve;
  const [, span] = approve.children;
  expect(approve.disabled).toBe(false);
  expect(approve.value).toBe('undo');
  expect(span.textContent).toBe('Undo');
});

it('deaktiverar autogodkännandeknappen', async () => {
  await view.open();
  view.setApprove(null);
  const approve = article._approve;
  expect(approve.disabled).toBe(true);
});

it('visar urvalsnotering', async () => {
  const text = 'Test';
  await view.open();
  view.note = text;
  expect(article._note.textContent).toBe(text);
});

it('lägger till ett komponentnamn', async () => {
  const name = 'test';
  await view.open();
  view.addComponent(name);
  const items = article._components.children;
  expect(items.length).toBe(1);
  expect(items[0].textContent).toBe(name);
});

it('lägger till en innehållstyp', async () => {
  const type = 'test';
  await view.open();
  view.addContentType(type);
  const items = article._contentTypes.children;
  expect(items.length).toBe(1);
  expect(items[0].textContent).toBe(type);
});

it('lägger till ett kravavsnitt', async () => {
  const title = 'Test';
  await view.open();
  view.addSection(title);
  expect(secFragment._h2.textContent).toBe(title);
  expect(article._req.insertBefore).toHaveBeenCalled.once();
});

it('lägger till ett underavsnitt', async () => {
  const title = 'Test';
  await view.open();
  view.addSubsection(title, 3);
  expect(secFragment._h2.textContent).toBe(title);
  expect(secFragment._h2.tagName).toBe('H3');
  expect(secFragment.replaceChild).toHaveBeenCalled.once();
  expect(article._req.insertBefore).toHaveBeenCalled.once();
});

it('refuserar tillägg av krav utan avsnitt', async () => {
  await view.open();
  expect.exception(() => view.addRequirement('', '', '', '', '', ''));
});

it.with(
  ['autopass', 'Autogodkänt', false, false],
  ['pass', 'Godkänt', false, false],
  ['fail', 'Underkänt', false, true],
  ['unchecked', 'Inte granskat', true, false]
)(
  "lägger till ett krav med status '{1}'",
  async (statusVal, statusText, external, internal) => {
    const clause = '1.2.3';
    const path = `../img/ikoner.svg#ico-${statusVal}`;
    const title = 'Test';
    const url = '?page=other';
    await view.open();
    view.addSection('Test');
    view.addRequirement(url, statusVal, clause, title, external, internal);
    expect(secFragment._ul.children.length).toBe(1);
    const li = reqFragment.children[0];
    const [status, req, link, rem, note] = li.children;
    const [svg] = status.children;
    const [use] = svg.children;
    expect(status.append).toHaveBeenCalled.once().with(statusText);
    expect(svg.getAttribute('class')).toBe(statusVal);
    expect(use.getAttribute('xlink:href')).toBe(path);
    external || expect(rem.innerHTML).toBe('');
    internal || expect(note.innerHTML).toBe('');
  }
);

it('rensar sidinnehållet', async () => {
  await view.open();
  view.addSection('Test');
  view.clear();
  let count = 0;
  for (const child of article._req.children) {
    expect(child._h2.remove).toHaveBeenCalled.once();
    expect(child._ul.remove).toHaveBeenCalled.once();
    ++count;
  }
  expect(count).toBe(1);
});

describe('Kopieringsdialog', () => {
  it('populerar listan med kopierbara stickprov', async () => {
    const samples = [{ id: 13, name: 'Test' }];
    await view.open();
    view.setCopyableSamples(samples);
    const sel = article._form.source;
    expect(sel.children.length).toBe(1 + samples.length);
    const opt = article._form.source.children[1];
    expect(opt.value).toBe(String(samples[0].id));
    expect(opt.label).toBe(samples[0].name);
  });

  it('avaktiverar knappen om inga kopierbara stickprov', async () => {
    await view.open();
    view.setCopyableSamples([]);
    expect(article._copyDlgBtn.disabled).toBe(true);
  });

  it('populerar listan med kopierbara krav', async () => {
    const reqs = [{ id: 'test', clause: '1.1.1', title: 'Test' }];
    await view.open();
    view.setCopyableRequirements(reqs, false);
    const ul = article._form._reqs;
    expect(ul.children.length).toBe(reqs.length);
    const [li] = ul.children;
    const [label] = li.children;
    const [cb, clause, title] = label.children;
    expect(cb.getAttribute('type')).toBe('checkbox');
    expect(clause.textContent).toBe(reqs[0].clause);
    expect(title.textContent).toBe(reqs[0].title);
    expect(article._form.notes.disabled).toBe(true);
  });

  it('returnerar stickprov att kopiera', async () => {
    await view.open();
    expect(view.sourceSample).toBe(-1);
    article._form.source.value = '13';
    expect(view.sourceSample).toBe(13);
  });

  it('returnerar krav att kopiera', async () => {
    const reqs = [{ id: 'test', clause: '1.1.1', title: 'Test' }];
    await view.open();
    view.setCopyableRequirements(reqs, false);
    expect(view.sourceRequirements.length).toBe(0);
    article._form._reqs.children[0].children[0].children[0].checked = true;
    expect(view.sourceRequirements.length).toBe(1);
  });

  it('returnerar flagga för kopiering av kommentarer', async () => {
    await view.open();
    expect(view.copyNotes).toBe(false);
    article._form.notes.checked = true;
    expect(view.copyNotes).toBe(true);
  });

  it('öppnar dialog vid knapptryck', async () => {
    await view.open();
    view.activate();
    article._copyDlgBtn.triggerEvent({ type: 'click' });
    expect(article._copyDialog.showModal).toHaveBeenCalled.once();
  });

  it('meddelar observatörer vid val av stickprov', async () => {
    let notified = false;
    const samples = [{ id: 13, name: 'Test' }];
    await view.open();
    view.setCopyableSamples(samples);
    view.subscribe((e) => {
      notified = true;
    });
    view.activate();
    article._form.triggerEvent({
      target: article._form.source,
      type: 'change',
    });
    expect(notified).toBe(true);
  });

  it('markerar alla krav att kopiera', async () => {
    const button = article._form._checkAll;
    const reqs = [{ id: 'test', clause: '1.1.1', title: 'Test' }];
    await view.open();
    view.setCopyableRequirements(reqs, false);
    view.activate();
    button.triggerEvent({ type: 'click' });
    const [cb] = article._form._reqs.children[0].children[0].children;
    expect(cb.checked).toBe(true);
    expect(button.textContent).toBe('Avmarkera alla');
    expect(button.dataset.value).toBe('uncheck');
  });

  it('avmarkerar alla krav att kopiera', async () => {
    const button = article._form._checkAll;
    const reqs = [{ id: 'test', clause: '1.1.1', title: 'Test' }];
    await view.open();
    view.setCopyableRequirements(reqs, false);
    const [cb] = article._form._reqs.children[0].children[0].children;
    cb.checked = true;
    button.dataset.value = 'uncheck';
    view.activate();
    button.triggerEvent({ type: 'click' });
    expect(cb.checked).toBe(false);
    expect(button.textContent).toBe('Markera alla');
    expect(button.dataset.value).toBe('check');
  });

  it('stänger dialog och meddelar observatörer vid kopiering', async () => {
    const dialog = article._copyDialog;
    let notified = false;
    await view.open();
    view.subscribe((e) => {
      notified = true;
      expect(e.action).toBe('copy');
    });
    view.activate();
    article._form._copy.triggerEvent({ type: 'click' });
    dialog.triggerEvent({ target: dialog, type: 'close' });
    expect(dialog.close).toHaveBeenCalled.once().with('true');
    expect(notified).toBe(true);
  });

  it('stänger dialog vid avbruten kopiering', async () => {
    const dialog = article._copyDialog;
    await view.open();
    view.activate();
    article._form._cancel.triggerEvent({ type: 'click' });
    expect(dialog.close).toHaveBeenCalled.once().with('false');
  });
});

// Importera beroenden.
import { SampleDisplayView } from '../../js/view/SampleDisplayView.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

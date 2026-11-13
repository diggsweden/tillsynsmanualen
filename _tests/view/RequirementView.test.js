/**
 * Enhetstestfall för kravgranskningsvyn.
 *
 * @license CC-BY 4.0
 * @see RquirementView
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

describe('Åtkomstmetoder', () => {
  let doc;
  let view;

  beforeEach(() => {
    // Formuläret.
    const form = mock.eventTarget(
      'form',
      {},
      {
        querySelector: (s) =>
          ({
            'button[value="next"]': article._next,
            'button[value="prev"]': article._prev,
            'button[value="skip"]': article._skip,
            'button[value="up"]': article._up,
          })[s] ?? null,
        querySelectorAll: () => [],
      }
    );

    // Komplettera artikelelementet.
    const button = () =>
      mock.element(
        'button',
        {
          children: [mock.element('span'), mock.element('span')],
        },
        {}
      );

    article._audit = mock.element('a');
    article._h1 = mock.element('h1');
    article._info = mock.element('p', { innerText: 'Sample: ' }, {});
    article._next = button();
    article._prev = button();
    article._progress = mock.element('progress', { max: 0, value: 0 }, {});
    article._skip = button();
    article._up = button();
    article.querySelector = (s) =>
      ({
        form,
        h1: article._h1,
        'h1 + p + p': article._info,
        progress: article._progress,
      })[s] ?? null;

    // DOM-dokumentet.
    doc = {
      body: mock.eventTarget('body'),
      head: mock.element('head'),
      createElement: (t) => mock.element(t),
      getElementById: (s) =>
        ({
          audit: article._audit,
        })[s] ?? null,
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Skapa en vyinstans.
    view = new RequirementView(
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
    expect(link.href).toBe('../css/requirement.css');
  });

  it('tar bort den tillagda stilmallen', async () => {
    await view.open();
    view.close();
    const [link] = doc.head.children;
    expect(link.remove).toHaveBeenCalled.once();
  });

  it('sätter sidrubriken', async () => {
    const text = 'Test';
    await view.open();
    view.heading = text;
    expect(article._h1.textContent).toBe(text);
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

  it('sätter adress till föregående krav', async () => {
    const title = 'Test';
    const url = '?page=test';
    await view.open();
    view.setPrevious(url, title);
    const prev = article._prev;
    const [, span] = prev.children;
    expect(prev.disabled).toBe(false);
    expect(prev.getAttribute('formaction')).toBe(url);
    expect(span.textContent).toBe(title);
  });

  it('avaktiverar knapp för föregående krav', async () => {
    await view.open();
    view.setPrevious(null, null);
    const prev = article._prev;
    const [, span] = prev.children;
    expect(prev.disabled).toBe(true);
    expect(prev.getAttribute('formaction')).toBe('');
    expect(span.textContent).toBe('');
  });

  it('sätter adress till nästa krav', async () => {
    const title = 'Test';
    const url = '?page=test';
    await view.open();
    view.setNext(url, title);
    const next = article._next;
    const [, span] = next.children;
    expect(next.disabled).toBe(false);
    expect(next.getAttribute('formaction')).toBe(url);
    expect(span.textContent).toBe(title);
  });

  it('avaktiverar knapp för nästa krav', async () => {
    await view.open();
    view.setNext(null, null);
    const next = article._next;
    const [, span] = next.children;
    expect(next.disabled).toBe(true);
    expect(next.getAttribute('formaction')).toBe('');
    expect(span.textContent).toBe('');
  });

  it('sätter adress till nästa ogranskade krav', async () => {
    const title = 'Test';
    const url = '?page=test';
    await view.open();
    view.setSkip(url, title);
    const skip = article._skip;
    const [, span] = skip.children;
    expect(skip.disabled).toBe(false);
    expect(skip.getAttribute('formaction')).toBe(url);
    expect(span.textContent).toBe(title);
  });

  it('avaktiverar knapp för nästa ogranskade krav', async () => {
    await view.open();
    view.setSkip(null, null);
    const skip = article._skip;
    const [, span] = skip.children;
    expect(skip.disabled).toBe(true);
    expect(skip.getAttribute('formaction')).toBe('');
    expect(span.textContent).toBe('');
  });

  it('sätter adress till kravöversikten', async () => {
    const title = 'Test';
    const url = '?page=test';
    await view.open();
    view.setSample(url, title);
    const up = article._up;
    const [, span] = up.children;
    expect(up.getAttribute('formaction')).toBe(url);
    expect(span.textContent).toBe(title);
  });

  it('sätter sidtitel (olänkad)', async () => {
    const title = 'Test';
    await view.open();
    view.setSampleInfo(title, null);
    const info = article._info;
    expect(info.innerText).toBe(`Sample:  ${title}`);
  });

  it('sätter sidtitel (länkad)', async () => {
    const title = 'Test';
    const url = 'https://example.com/';
    await view.open();
    view.setSampleInfo(title, url);
    const info = article._info;
    const [link] = info.children;
    expect(link.getAttribute('href')).toBe(url);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.textContent).toBe(title);
  });

  it('uppdaterar förloppsindikatorn', async () => {
    const label = 'Test';
    const max = 42;
    const value = 13;
    await view.open();
    view.setProgress(value, max, label);
    const progress = article._progress;
    expect(progress.getAttribute('aria-label')).toBe(label);
    expect(progress.max).toBe(max);
    expect(progress.value).toBe(value);
  });

  it('lägger till en filterklass på artikelelementet', async () => {
    const name = 'test';
    await view.open();
    expect(article.classList.contains(name)).toBe(false);
    view.addFilter(name);
    expect(article.classList.contains(name)).toBe(true);
  });
});

describe('Kontroller', () => {
  let doc;
  let view;

  beforeEach(() => {
    // Formuläret.
    const form = mock.eventTarget(
      'form',
      {
        externalNote: mock.element(
          'textarea',
          {
            parentNode: mock.element('p'),
            value: '',
          },
          {}
        ),
        internalNote: mock.textarea('internalNote'),
        'test.check': mock.radioGroup('test.check', 'ok', 'ok', 'fail'),
      },
      {
        querySelectorAll: () => [],
      }
    );

    // Komplettera artikelelementet.
    const child = (t, p) => mock.element(t, { parentNode: p }, {});

    article._form = form;
    article._secReqs = mock.element('section');
    article._secChecks = child('section', article._secReqs);
    article._notes = child('fieldset', article._secChecks);
    article.querySelector = (s) =>
      ({
        '.checks .notes': article._notes,
        form,
        'section.checks': article._secChecks,
      })[s] ?? null;

    // Mallelement som klonas.
    const element = (t, c) => mock.element(t, { children: c }, {});

    const fragments = {};

    fragments.check = () => {
      const check = {
        _fieldset: mock.element(
          'fieldset',
          {},
          {
            get children() {
              return [check._legend, check._p];
            },
          }
        ),
        _legend: element('legend', [mock.element('span')]),
        _p: element('p', [
          element('label', [
            mock.input('radio', '', 'ok'),
            element('svg', [mock.element('use')]),
          ]),
          element('label', [
            mock.input('radio', '', 'fail'),
            element('svg', [mock.element('use')]),
          ]),
        ]),
        get children() {
          return [check._fieldset];
        },
      };
      return check;
    };

    fragments.condition = {
      _fieldset: mock.element(
        'fieldset',
        {},
        {
          get children() {
            return [fragments.condition._legend, fragments.condition._p];
          },
        }
      ),
      _legend: element('legend', [mock.element('span')]),
      _p: element('p', [
        element('label', [
          mock.input('radio', '', 'yes'),
          mock.element('span'),
        ]),
        element('label', [mock.input('radio', '', 'no'), mock.element('span')]),
      ]),
      get children() {
        return [fragments.condition._fieldset];
      },
    };

    fragments.observation = {
      children: [
        element('div', [
          element('p', [element('label', [mock.textarea('')])]),
          mock.element('details', {
            children: [element('summary')],
            nextElementSibling: null,
          }),
          element('p', [
            element('label', [mock.input('text', '')]),
            element('label', [mock.textarea('')]),
          ]),
        ]),
      ],
    };
    const c = fragments.observation.children[0].children;
    c[1].nextElementSibling = c[2];

    // DOM-dokumentet.
    doc = {
      body: mock.eventTarget('body'),
      head: mock.element('head'),
      _ids: {},
      createElement: (t) => mock.element(t),
      getElementById: (s) =>
        ({
          'check-template': mock.template(fragments.check),
          'condition-template': mock.template(() => fragments.condition),
          'observation-template': mock.template(() => fragments.observation),
        })[s] ??
        doc._ids[s] ??
        null,
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Skapa en vyinstans.
    view = new RequirementView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      doc
    );
  });

  it('lägger till en ensam metod', async () => {
    const methods = ['Single method'];
    await view.open();
    view.methods(methods);
    expect(article._secReqs.children.length).toBe(1);
    const section = article._secReqs.children[0];
    expect(section.children.length).toBe(2);
    const [h2, p] = section.children;
    expect(h2.tagName).toBe('H2');
    expect(h2.textContent).toBe('Metod');
    expect(p.tagName).toBe('P');
    expect(p.innerHTML).toBe(methods[0]);
  });

  it('lägger till en sektion per metod', async () => {
    const methods = ['First method', 'Second method'];
    await view.open();
    view.methods(methods);
    expect(article._secReqs.children.length).toBe(methods.length);
    let i = 0;
    for (const section of article._secReqs.children) {
      expect(section.children.length).toBe(2);
      const [h2, p] = section.children;
      expect(h2.tagName).toBe('H2');
      expect(h2.textContent).toBe(`Metod ${i + 1}`);
      expect(p.tagName).toBe('P');
      expect(p.innerHTML).toBe(methods[i]);
      ++i;
    }
  });

  it('lägger inte till metoder vid tom lista', async () => {
    await view.open();
    view.methods([]);
    expect(article._secReqs.children.length).toBe(0);
  });

  it('lägger till en lista med steg', async () => {
    const steps = ['First step', 'Second step'];
    await view.open();
    view.steps(steps);
    expect(article._secReqs.children.length).toBe(1);
    const section = article._secReqs.children[0];
    const [h2, ol] = section.children;
    expect(h2.tagName).toBe('H2');
    expect(h2.textContent).toBe('Metod');
    expect(ol.tagName).toBe('OL');
    expect(ol.children.length).toBe(steps.length);
    let i = 0;
    for (const li of ol.children) {
      expect(li.innerHTML).toBe(steps[i++]);
    }
  });

  it('lägger inte till steg vid tom lista', async () => {
    await view.open();
    view.steps([]);
    expect(article._secReqs.children.length).toBe(0);
  });

  it('lägger till en lista med undantag', async () => {
    const exceptions = ['First', 'Second'];
    await view.open();
    view.exceptions(exceptions);
    expect(article._secReqs.children.length).toBe(1);
    const section = article._secReqs.children[0];
    const [h2, ul] = section.children;
    expect(h2.tagName).toBe('H2');
    expect(h2.textContent).toBe('Undantag');
    expect(ul.tagName).toBe('UL');
    expect(ul.children.length).toBe(exceptions.length);
    let i = 0;
    for (const li of ul.children) {
      expect(li.innerHTML).toBe(exceptions[i++]);
    }
  });

  it('lägger inte till undantag vid tom lista', async () => {
    await view.open();
    view.exceptions([]);
    expect(article._secReqs.children.length).toBe(0);
  });

  it('lägger till en lista med exempel', async () => {
    const examples = {
      bad: ['Bad'],
      better: ['Better'],
      good: ['Good'],
      neutral: ['Neutral'],
    };
    await view.open();
    view.examples(examples);
    expect(article._secReqs.children.length).toBe(1);
    const section = article._secReqs.children[0];
    const [h2, ul] = section.children;
    expect(h2.tagName).toBe('H2');
    expect(h2.textContent).toBe('Exempel');
    expect(ul.tagName).toBe('UL');
    let i = 0;
    const items = ul.children;
    expect(items.length).toBe(4);
    for (const [value] of Object.values(examples)) {
      expect(items[i++].innerHTML).toBe(value);
    }
  });

  it('lägger inte till exempel vid tomt objekt', async () => {
    await view.open();
    view.examples({});
    expect(article._secReqs.children.length).toBe(0);
  });

  it('lägger till en pseudokontroll', async () => {
    const id = 'pseudo-check';
    const states = [[undefined, 'Pseudo-check']];
    await view.open();
    view.check(id, states, [], '', [], '', '', null, null);
    expect(article._secChecks.children.length).toBe(1);
    const [fieldset] = article._secChecks.children[0].children;
    const [legend, p] = fieldset.children;
    const radio = (i) => p.children[i].children[0];
    const [span] = legend.children;
    expect(span.innerHTML).toBe('Pseudo-check');
    expect(radio(0).checked).toBe(false);
    expect(radio(0).disabled).toBe(false);
    expect(radio(0).name).toBe('pseudoCheck.check');
    expect(radio(1).checked).toBe(false);
    expect(radio(1).disabled).toBe(false);
    expect(radio(1).name).toBe('pseudoCheck.check');
  });

  it.with(
    [undefined, false, 'ogranskad', 'redigerbar'],
    [true, false, 'godkänd', 'redigerbar'],
    [false, false, 'underkänd', 'redigerbar'],
    [true, false, 'godkänd', 'skrivskyddad']
  )('lägger till en {2} {3} singelkontroll', async (state, readOnly) => {
    const id = 'single-check';
    const observation = 'Observation';
    const reuse = false === state ? ['Previous'] : [];
    const states = [[state, 'Visible text']];
    await view.open();
    view.readOnly = readOnly;
    view.check(id, states, [], observation, reuse, '', '', null, null);
    expect(article._secChecks.children.length).toBe(2);
    const [fieldset] = article._secChecks.children[0].children;
    const [legend, p] = fieldset.children;
    const radio = (i) => p.children[i].children[0];
    const [span] = legend.children;
    expect(span.innerHTML).toBe('Visible text');
    expect(radio(0).checked).toBe(true === state);
    expect(radio(0).disabled).toBe(readOnly);
    expect(radio(0).name).toBe('singleCheck.check');
    expect(radio(1).checked).toBe(false === state);
    expect(radio(1).disabled).toBe(readOnly);
    expect(radio(1).name).toBe('singleCheck.check');
    const [divObs] = article._secChecks.children[1].children;
    const pObs = divObs.children;
    let [label] = pObs[0].children;
    let [textArea] = label.children;
    expect(divObs.hidden).toBe(false !== state);
    expect(textArea.disabled).toBe(readOnly || false !== state);
    expect(textArea.id).toBe('single-check-obs');
    expect(textArea.name).toBe('singleCheck.obs');
    expect(textArea.value).toBe(observation);
    if (false === state) {
      expect(pObs[1].appendChild).toHaveBeenCalled.once();
    } else {
      expect(pObs[1].remove).toHaveBeenCalled.once();
    }
    const [path] = pObs[2].children[0].children;
    [textArea] = pObs[2].children[1].children;
    expect(path.name).toBe('singleCheck.path');
    expect(textArea.name).toBe('singleCheck.alt');
  });

  it('uppdaterar en singelkontrolls tillstånd', async () => {
    const id = 'test';
    await view.open();
    view.check(id, [[true, 'Text']], [], 'Obs', [], '', '', null, null);
    view.setCheck(id, false);
    expect(article._form['test.check'].value).toBe('fail');
  });

  it('lägger till en singelkontroll med undantag', async () => {
    const exceptions = ['First', 'Second'];
    const id = 'single-check';
    const observation = 'Observation';
    const states = [[undefined, 'Visible text']];
    await view.open();
    view.check(id, states, exceptions, observation, [], '', '', null, null);
    expect(article._secChecks.children.length).toBe(3);
    const section = article._secChecks.children[2];
    const [h3, ul] = section.children;
    expect(h3.textContent).toBe('Undantag');
    let i = 0;
    for (const li of ul.children) {
      expect(li.innerHTML).toBe(exceptions[i++]);
    }
  });

  it.with([false, 'redigerbar'], [true, 'skrivskyddad'])(
    'lägger till en {1} multipelkontroll',
    async (readOnly) => {
      const id = 'multi-check';
      const observation = 'Observation';
      const states = [
        [false, 'First'],
        [true, 'Second'],
        [undefined, 'Third'],
      ];
      await view.open();
      view.readOnly = readOnly;
      view.check(id, states, [], observation, [], '', '', null, null);
      expect(article._secChecks.children.length).toBe(5);
      for (const [index, [state, text]] of states.entries()) {
        const [fieldset] = article._secChecks.children[index + 1].children;
        const [legend, p] = fieldset.children;
        const radio = (i) => p.children[i].children[0];
        const [span] = legend.children;
        expect(span.innerHTML).toBe(text);
        expect(radio(0).checked).toBe(true === state);
        expect(radio(0).disabled).toBe(readOnly);
        expect(radio(0).name).toBe(`multiCheck[${index}].check`);
        expect(radio(1).checked).toBe(false === state);
        expect(radio(1).disabled).toBe(readOnly);
        expect(radio(1).name).toBe(`multiCheck[${index}].check`);
      }
      const [divObs] = article._secChecks.children[4].children;
      const pObs = divObs.children[0];
      const [label] = pObs.children;
      const [textArea] = label.children;
      expect(divObs.hidden).toBe(true);
      expect(textArea.disabled).toBe(true);
      expect(textArea.id).toBe('multi-check-obs');
      expect(textArea.name).toBe('multiCheck.obs');
      expect(textArea.value).toBe(observation);
    }
  );

  it.with(
    [undefined, 'ogranskad'],
    [true, 'godkänd'],
    [false, 'underkänd']
  )('lägger till en {1} härledd kontroll', async (state) => {
    const id = 'derived-check';
    const observation = 'Observation';
    const states = [[state, 'Visible text']];
    await view.open();
    view.check(id, states, [], observation, [], '', '', null, []);
    expect(article._secChecks.children.length).toBe(3);
    const [fieldset] = article._secChecks.children[0].children;
    const [legend, p] = fieldset.children;
    const radio = (i) => p.children[i].children[0];
    const [span] = legend.children;
    expect(span.innerHTML).toBe('Visible text');
    expect(radio(0).checked).toBe(true === state);
    expect(radio(0).disabled).toBe(true);
    expect(radio(0).name).toBe('derivedCheck.check');
    expect(radio(1).checked).toBe(false === state);
    expect(radio(1).disabled).toBe(true);
    expect(radio(1).name).toBe('derivedCheck.check');
    const [divObs] = article._secChecks.children[2].children;
    const pObs = divObs.children[0];
    const [label] = pObs.children;
    const [textArea] = label.children;
    expect(divObs.hidden).toBe(false !== state);
    expect(textArea.disabled).toBe(false !== state);
    expect(textArea.id).toBe('derived-check-obs');
    expect(textArea.name).toBe('derivedCheck.obs');
    expect(textArea.value).toBe(observation);
  });

  it.with(
    [undefined, false, 'ogranskat', 'redigerbart'],
    [true, false, 'uppfyllt', 'redigerbart'],
    [false, false, 'ej uppfyllt', 'redigerbart'],
    [true, false, 'uppfyllt', 'skrivskyddat']
  )('lägger till ett {2} {3} villkor', async (state, readOnly) => {
    const id = 'test-cond';
    const text = 'Test condition';
    await view.open();
    view.condition(id, state, text, null);
    expect(article._secChecks.children.length).toBe(1);
    const [fieldset] = article._secChecks.children[0].children;
    const [legend, p] = fieldset.children;
    const radio = (i) => p.children[i].children[0];
    const [span] = legend.children;
    expect(span.innerHTML).toBe(text);
    expect(radio(0).checked).toBe(true === state);
    expect(radio(0).disabled).toBe(readOnly);
    expect(radio(0).name).toBe('testCond.cond');
    expect(radio(1).checked).toBe(false === state);
    expect(radio(1).disabled).toBe(readOnly);
    expect(radio(1).name).toBe('testCond.cond');
  });

  it.with([true, 'synlig'], [false, 'dold'])(
    'lägger till en {1} villkorsgrupp',
    async (visible) => {
      const id = 'test-group';
      await view.open();
      const group = view.group(id, visible, null);
      expect(group).not.toBe(undefined);
      expect(group.hidden).toBe(!visible);
      expect(group.getAttribute('id')).toBe(id);
      expect(article._secChecks.children.length).toBe(1);
    }
  );

  it('tar bort fältet för extern notering', async () => {
    await view.open();
    view.removeExternalNote();
    const parent = article._form.externalNote.parentNode;
    expect(parent.remove).toHaveBeenCalled.once();
  });

  it('visar extern notering för ett krav', async () => {
    const text = 'External note';
    await view.open();
    view.externalNote = text;
    expect(article._form.externalNote.value).toBe(text);
  });

  it('visar intern notering för ett krav', async () => {
    const text = 'Internal note';
    await view.open();
    view.internalNote = text;
    expect(article._form.internalNote.value).toBe(text);
  });

  it.with([true, 'visar'], [false, 'döljer'])(
    '{1} en villkorsgrupp',
    async (show) => {
      const id = 'test';
      await view.open();
      const group = view.group(id, !show, null);
      view.check(id, [[undefined, 'Test']], [], '', [], '', '', group);
      expect(group.hidden).toBe(show);
      doc._ids[id] = group;
      view.showGroup(id, show);
      expect(group.hidden).toBe(!show);
    }
  );

  it.with([true, 'visar'], [false, 'döljer'])(
    '{1} observation',
    async (show) => {
      const id = 'test-check';
      const name = 'testCheck';
      const observation = 'Observation';
      const states = [[show, 'Text']];
      await view.open();
      view.check(id, states, [], observation, [], '', '', null, null);
      const [p] = article._secChecks.children[1].children;
      const [label] = p.children;
      const [textArea] = label.children;
      const section = { hidden: show };
      textArea.parentNode = { parentNode: { parentNode: section } };
      doc._ids[`${id}-obs`] = textArea;
      view.showFail(id, show);
      expect(section.hidden).toBe(!show);
      expect(textArea.disabled).toBe(!show);
    }
  );
});

describe('Relaterad information', () => {
  const strip = (t) => t.replace(/<.*?>/g, '');

  let view;

  beforeEach(() => {
    // Komplettera artikelelementet.
    article._aside = mock.element('aside');
    article.querySelector = (s) =>
      ({
        'form aside': article._aside,
      })[s] ?? null;

    // DOM-dokumentet.
    const doc = {
      body: mock.eventTarget('body'),
      head: mock.element('head'),
      createElement: (t) =>
        ({
          table: () => mock.table(),
        })[t]?.() ?? mock.element(t),
      createElementNS: (n, t) => mock.element(t),
      createTextNode: (t) => t,
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Skapa en vyinstans.
    view = new RequirementView(
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      doc,
      { language: 'en-US', userAgent: ' Chrome/' }
    );
  });

  it('lägger till verktyg Inspektör med flik/panel/egenskaper/hjälp', async () => {
    const help = 'help';
    const pane = 'Style';
    const properties = ['font', 'outline'];
    const tab = 'Elements';
    await view.open();
    view.devTool(tab, pane, properties, undefined, help);
    const [section] = article._aside.children;
    const [, h4, dl, p] = section.children;
    const [cite] = h4.children;
    const checkDef = (i, t, d) => {
      expect(dl.children[2 * i].textContent).toBe(t);
      expect(dl.children[2 * i + 1].textContent).toBe(d);
    };
    expect(cite.textContent).toBe('Inspektör');
    checkDef(0, 'Flik', 'Elements');
    checkDef(1, 'Panel', 'Style');
    expect(dl.children[4].textContent).toBe('Egenskaper');
    expect(strip(dl.children[5].innerHTML)).toBe('font, outline');
    expect(p.innerHTML).toBe(help);
  });

  it('lägger till verktyg Inspektör med funktion', async () => {
    await view.open();
    view.devTool(undefined, undefined, undefined, 'Device', undefined);
    const [section] = article._aside.children;
    const [, h4, p] = section.children;
    const [cite] = h4.children;
    expect(cite.textContent).toBe('Inspektör');
    expect(strip(p.innerHTML)).toBe('Funktionen Toggle Device Toolbar.');
  });

  it('lägger till bookmarklet', async () => {
    const code = 'CODE';
    const title = 'My bookmarklet';
    await view.open();
    view.bookmarklet(title, code);
    const [section] = article._aside.children;
    const [, , p] = section.children;
    const [link] = p.children;
    expect(link.getAttribute('href')).toBe('javascript:CODE');
    expect(link.textContent).toBe(title);
  });

  it('lägger till externt verktygsnamn', async () => {
    const text = 'Test';
    await view.open();
    view.externalTool(text);
    const [section] = article._aside.children;
    const [, p] = section.children;
    expect(p.textContent).toBe(text);
  });

  it('lägger till verktygsmodul', async () => {
    const module = mock({ default: () => {} });
    const params = {};
    await view.open();
    view.moduleTool(module, params);
    const [section] = article._aside.children;
    expect(module.default).toHaveBeenCalled.once().with(section, params);
  });

  it('lägger till verktyg: WAVE (flik)', async () => {
    await view.open();
    const wave = view.createWAVE();
    const result = wave.tab('Structure');
    expect(result).toBe(wave);
    const [section] = article._aside.children;
    const [, h4, p] = section.children;
    expect(strip(h4.innerHTML)).toBe('WAVE');
    expect(strip(p.innerHTML)).toBe('Fliken Structure.');
  });

  it('lägger till verktyg: WAVE (ikoner)', async () => {
    await view.open();
    const wave = view.createWAVE();
    wave
      .absent('Wrong', 'No', ['Bad'], { src: 'bad.png', alt: 'Bad' })
      .present('Right', 'Yes', ['Fine', 'OK'], {
        src: 'good.png',
        alt: 'Good',
      });
    const [section] = article._aside.children;
    const [, h4, absent, present] = section.children;
    expect(strip(h4.innerHTML)).toBe('WAVE');
    expect(absent.children[0].tagName).toBe('SVG');
    expect(absent.children[1].tagName).toBe('IMG');
    expect(absent.children[1].src).toBe('../img/bad.png');
    expect(absent.children[1].alt).toBe('Bad');
    expect(absent.children[3].tagName).toBe('SAMP');
    expect(absent.children[3].innerHTML).toBe('Bad');
    expect(absent.children[5].tagName).toBe('SAMP');
    expect(absent.children[5].innerHTML).toBe('No');
    expect(absent.children[7].tagName).toBe('SAMP');
    expect(absent.children[7].innerHTML).toBe('Wrong');
    expect(present.children[0].tagName).toBe('SVG');
    expect(present.children[1].tagName).toBe('IMG');
    expect(present.children[1].src).toBe('../img/good.png');
    expect(present.children[1].alt).toBe('Good');
    expect(present.children[3].tagName).toBe('SAMP');
    expect(present.children[3].innerHTML).toBe('Fine');
    expect(present.children[5].tagName).toBe('SAMP');
    expect(present.children[5].innerHTML).toBe('OK');
    expect(present.children[7].tagName).toBe('SAMP');
    expect(present.children[7].innerHTML).toBe('Yes');
    expect(present.children[9].tagName).toBe('SAMP');
    expect(present.children[9].innerHTML).toBe('Right');
  });

  it('lägger till verktyg: WebDeveloper', async () => {
    const func = 'Function';
    const tab = 'Tab';
    const expected = `Web Developer, fliken ${tab}, funktionen ${func}.`;
    await view.open();
    view.webDeveloper(tab, func);
    const [section] = article._aside.children;
    const [, p] = section.children;
    expect(strip(p.innerHTML)).toBe(expected);
  });

  it('lägger till en relaterad länk', async () => {
    const title = 'Test';
    const url = 'https://example.com';
    await view.open();
    view.link(url, title);
    const [section] = article._aside.children;
    const [h3, ul] = section.children;
    const [li] = ul.children;
    const [link] = li.children;
    expect(h3.textContent).toBe('Länkar');
    expect(link.getAttribute('href')).toBe(url);
    expect(link.textContent).toBe(title);
  });

  it.with([false, 'utan'], [true, 'med'])(
    'lägger till detaljinformation: åtgärd ({1} filter)',
    async (filter) => {
      const expected = filter ? `action only-if ${filter}` : 'action';
      const text = 'Test action';
      await view.open();
      filter && view.pushFilter(filter);
      view.action(text);
      const [section] = article._aside.children;
      const [, p] = section.children;
      expect(p.getAttribute('class')).toBe(expected);
      expect(p.innerHTML).toBe(text);
    }
  );

  it('lägger till detaljinformation: definition', async () => {
    const descr = 'Test description';
    const term = 'Test term';
    await view.open();
    view.definition(term, descr);
    const [section] = article._aside.children;
    const [, p] = section.children;
    expect(p.innerHTML).toBe(`<dfn>${term}</dfn>: ${descr}`);
  });

  it('lägger till detaljinformation: utfällbart avsnitt', async () => {
    const summaryText = 'Test summary';
    const text = 'Test action';
    await view.open();
    const container = view.createDetails(summaryText);
    container.action(text);
    const [section] = article._aside.children;
    const [, details] = section.children;
    const [summary, p] = details.children;
    expect(summary.innerHTML).toBe(summaryText);
    expect(p.innerHTML).toBe(text);
  });

  it('lägger till figur', async () => {
    const alt = 'Alt text';
    const captionText = 'Test caption';
    const path = 'image.png';
    await view.open();
    const container = view.createFigure();
    container.image(path, alt);
    container.caption(captionText);
    const [section] = article._aside.children;
    const [, figure] = section.children;
    const [img, caption] = figure.children;
    expect(img.getAttribute('alt')).toBe(alt);
    expect(img.getAttribute('src')).toBe(`../img/${path}`);
    expect(caption.tagName).toBe('FIGCAPTION');
    expect(caption.innerHTML).toBe(captionText);
  });

  it('lägger till detaljinformation: bild', async () => {
    const alt = 'Test alt';
    const path = 'test.png';
    await view.open();
    view.image(path, alt);
    const [section] = article._aside.children;
    const [, img] = section.children;
    expect(img.getAttribute('alt')).toBe(alt);
    expect(img.getAttribute('src')).toBe(`../img/${path}`);
  });

  it('lägger till detaljinformation: notera', async () => {
    const text = 'Test note';
    await view.open();
    view.note(text);
    const [section] = article._aside.children;
    const [, p] = section.children;
    expect(p.innerHTML).toBe(text);
  });

  it('lägger till detaljinformation: numrerad lista', async () => {
    const items = ['First', 'Second'];
    await view.open();
    view.oList(items);
    const [section] = article._aside.children;
    const [, ol] = section.children;
    let i = 0;
    for (const li of ol.children) {
      expect(li.innerHTML).toBe(items[i++]);
    }
  });

  it('lägger till detaljinformation: tabell', async () => {
    const captionText = 'Test caption';
    const headers = ['First', 'Second'];
    const rows = [['One', 'Two']];
    await view.open();
    view.table(headers, rows, captionText);
    const [section] = article._aside.children;
    const [, table] = section.children;
    const [caption, thead, tbody] = table.children;
    const [headRow] = thead.rows;
    const [bodyRow] = tbody.rows;
    expect(caption.innerHTML).toBe(captionText);
    expect(headRow.children[0].innerHTML).toBe(headers[0]);
    expect(headRow.children[1].innerHTML).toBe(headers[1]);
    expect(bodyRow.cells[0].innerHTML).toBe(rows[0][0]);
    expect(bodyRow.cells[1].innerHTML).toBe(rows[0][1]);
  });

  it('lägger till detaljinformation: stycke', async () => {
    const text = 'Test paragraph.';
    await view.open();
    view.text(text);
    const [section] = article._aside.children;
    const [, p] = section.children;
    expect(p.innerHTML).toBe(text);
  });

  it('lägger till detaljinformation: tips', async () => {
    const text = 'Test tip.';
    await view.open();
    view.tip(text);
    const [section] = article._aside.children;
    const [, p] = section.children;
    expect(p.innerHTML).toBe(text);
  });

  it('lägger till detaljinformation: punktlista', async () => {
    const items = ['First', 'Second'];
    await view.open();
    view.uList(items);
    const [section] = article._aside.children;
    const [, ul] = section.children;
    let i = 0;
    for (const li of ul.children) {
      expect(li.innerHTML).toBe(items[i++]);
    }
  });

  it('lägger till detaljinformation: varning', async () => {
    const text = 'Test warning.';
    await view.open();
    view.warning(text);
    const [section] = article._aside.children;
    const [, p] = section.children;
    expect(p.innerHTML).toBe(text);
  });

  it('lägger till tillämpningsanvisning', async () => {
    const id = 'test';
    const title = 'Test title.';
    const url = `../granskning/tillampning.html#${id}`;
    await view.open();
    view.instruction(id, title);
    const [section] = article._aside.children;
    const [h3, p] = section.children;
    const [link] = p.children;
    expect(h3.textContent).toBe('Tillämpning');
    expect(p.getAttribute('class')).toBe('instruction');
    expect(link.getAttribute('href')).toBe(url);
    expect(link.textContent).toBe(title);
  });

  it('lägger till referens till EN 301 549', async () => {
    const reference = '5.3';
    const text = 'EN\u00a0301\u00a0549 5.3 ';
    const url =
      'https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf#page=28';
    await view.open();
    view.reference(reference);
    const [section] = article._aside.children;
    const [h3, p] = section.children;
    const [link] = p.children;
    expect(h3.textContent).toBe('Referens');
    expect(p.textContent).toBe(text);
    expect(link.getAttribute('href')).toBe(url);
    expect(link.getAttribute('lang')).toBe('en');
    expect(link.textContent).toBe('Biometrics');
  });

  it('lägger till referens till EN301549 för app', async () => {
    const reference = '11.1.2.3.2';
    const text = 'EN\u00a0301\u00a0549 11.1.2.3.2 ';
    const title =
      'Audio description or media alternative (prerecorded - closed functionality)';
    const url =
      'https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf#page=66';
    await view.open();
    view.reference(reference);
    const [section] = article._aside.children;
    const [h3, p] = section.children;
    const [link] = p.children;
    expect(h3.textContent).toBe('Referens');
    expect(p.textContent).toBe(text);
    expect(link.getAttribute('href')).toBe(url);
    expect(link.getAttribute('lang')).toBe('en');
    expect(link.textContent).toBe(title);
  });

  it.with(
    ['9.1.2.2'],
    ['10.1.2.2'],
    ['11.1.2.2']
  )('lägger till {0} som referens till WCAG 2.1', async (clause) => {
    const text = 'WCAG\u00a02.1, kriterium 1.2.2 ';
    const url = 'https://www.w3.org/TR/WCAG21/#captions-prerecorded';
    await view.open();
    view.reference(clause);
    const [section] = article._aside.children;
    const [h3, p] = section.children;
    const [link] = p.children;
    expect(h3.textContent).toBe('Referens');
    expect(p.textContent).toBe(text);
    expect(link.getAttribute('href')).toBe(url);
    expect(link.getAttribute('lang')).toBe('en');
    expect(link.textContent).toBe('Captions (Prerecorded)');
  });

  it('lägger till en referens till DIGG:s föreskrifter', async () => {
    const text = '6 § ';
    const url =
      'https://www.digg.se/om-oss/forfattningssamling/foreskrifter-om-tillganglighet-till-digital-offentlig-service-mdffs-20192/grundforfattning-mdffs-20192';
    await view.open();
    view.reference('6 § MDFFS2019:2');
    const [section] = article._aside.children;
    const [h3, p] = section.children;
    const [link] = p.children;
    expect(h3.textContent).toBe('Referens');
    expect(p.textContent).toBe(text);
    expect(link.getAttribute('href')).toBe(url);
    expect(link.textContent).toBe('MDFFS\u00a02019:2');
  });
});

// Importera beroenden.
import { RequirementView } from '../../js/view/RequirementView.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

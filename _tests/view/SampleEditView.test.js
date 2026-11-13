/**
 * Enhetstestfall för stickprovsredigeringsvyn.
 *
 * @license CC-BY 4.0
 * @see SampleEditView
 */

let article;
let form;
let status;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Artikelelementet: basklassen sätter och tar bort klasser samt
  // populerar det med sidinnehåll.
  article = {
    classList: mock.domTokenList(),
    innerHTML: '',
    _qs: { form: () => form },
    _qsa: {},
    querySelector: (s) => article._qs[s]?.() ?? null,
    querySelectorAll: (s) => article._qsa[s]?.() ?? [],
  };

  // Statusbehållaren: några attribut ska uppdateras av basklassen.
  status = mock.element('div');
});

describe('Åtkomst till formulärfält', () => {
  let doc;
  let listbox;
  let view;

  beforeEach(() => {
    // Formuläret.
    form = mock.eventTarget(
      'form',
      {
        category: mock.select('category'),
        component: mock.input('text', 'component'),
        defaultEdit: mock.checkbox(false, { name: 'defaultEdit' }),
        follows: mock.select('follows', ['']),
        format: mock.input('text', 'format'),
        name: mock.input('text', 'name'),
        note: mock.input('text', 'note'),
        parentType: mock.input('hidden', 'parentType'),
        serviceType: mock.input('text', 'serviceType'),
        srSupport: mock.checkbox(true, { name: 'srSupport' }),
        type: mock.radioGroup(
          'type',
          'webpage',
          'document',
          'screen',
          'webpage'
        ),
        url: mock.input('url', 'url'),
      },
      {
        querySelectorAll: () => [],
        reportValidity: () => {},
      }
    );

    // Lista med innehållstyper för stickprovet.
    listbox = mock(
      {
        _observers: [],
        triggerEvent: (e) => listbox._observers.forEach((o) => o(e)),
      },
      {
        attach: () => {},
        subscribe: (o) => listbox._observers.push(o),
      }
    );

    // DOM-dokumentet.
    doc = {
      body: mock.eventTarget('body'),
      _ids: {},
      createElement: (t) => mock.element(t),
      getElementById: (s) => doc._ids[s] ?? null,
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Villkorsstyrning.
    const fakeViewCondition = {
      apply: () => {},
      disconnect: () => {},
      observe: () => {},
    };

    // Skapa en vyinstans.
    view = new SampleEditView(
      '',
      '',
      null,
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      listbox,
      null,
      fakeViewCondition,
      doc
    );
  });

  it("sätter typ av stickprov till 'komponent'", async () => {
    await view.open();
    expect(article.classList.contains('component')).toBe(false);
    view.type = 'component';
    expect(view.type).toBe('component');
    expect(article.classList.contains('component')).toBe(true);
  });

  it.with(
    ['component', 'Test'],
    ['follows', 'test'],
    ['format', 'pdf'],
    ['name', 'Test'],
    ['note', 'test'],
    ['parentType', 'test'],
    ['serviceType', 'test'],
    ['url', 'https://digg.se']
  )("skriver och läser värde i fältet '{0}'", async (field, value) => {
    await view.open();
    view[field] = value;
    expect(form[field].value).toBe(value);
    expect(view[field]).toBe(value);
  });

  it('sätter och returnerar flagga för skärmläsarstöd', async () => {
    await view.open();
    expect(view.srSupport).toBe(true);
    expect(form.srSupport.checked).toBe(true);
    view.srSupport = false;
    expect(view.srSupport).toBe(false);
    expect(form.srSupport.checked).toBe(false);
  });

  it('returnerar förvalsmarkering för redigering av komponent', async () => {
    await view.open();
    expect(form.defaultEdit.checked).toBe(false);
    expect(view.defaultEdit).toBe(false);
    view.defaultEdit = true;
    expect(form.defaultEdit.checked).toBe(true);
    expect(view.defaultEdit).toBe(true);
  });

  it.with(['component', ''], ['name', 'test'])(
    "sätter felmeddelande i fältet '{0}'",
    async (field, value) => {
      const msg = 'error';
      const err = new ValidationError(msg, value);
      await view.open();
      view[field] = err;
      expect(form[field].setCustomValidity).toHaveBeenCalled.once().with(msg);
      expect(form[field].value).toBe(value);
    }
  );

  it('visar felmeddelande för komponentnamn', async () => {
    await view.open();
    let ok = view.testComponentValidity();
    expect(ok).toBe(true);
    form.component._valid = false;
    ok = view.testComponentValidity();
    expect(ok).toBe(false);
  });

  it('populerar listan med föregående stickprov', async () => {
    form.follows.children = ['', 'quux'];
    await view.open();
    view.predecessors = ['foo', 'bar'];
    expect(form.follows.length).toBe(3);
    expect(form.follows.options[1].value).toBe('foo');
    expect(form.follows.options[2].value).toBe('bar');
  });

  it('lägger till innehållstyper för stickprov', async () => {
    const attr = (i, n) => ct.children[i].getAttribute(n);
    const ct = mock.element('ul');
    const types = [
      ['foo', 'Foo', true],
      ['bar', 'Bar', false],
    ];
    article._qsa['button[data-handler="component"]'] = () => [
      mock.element('button'),
      mock.element('button'),
    ];
    doc._ids['sample-content-types'] = ct;
    await view.open();
    view.setSampleContentTypes(types);
    const items = ct.children;
    expect(items.length).toBe(types.length);
    for (const [index, arr] of types.entries()) {
      const [id, title, selected] = arr;
      expect(attr(index, 'aria-selected')).toBe(String(selected));
      expect(attr(index, 'id')).toBe(`ct-${id}`);
      expect(attr(index, 'role')).toBe('option');
      expect(items[index].dataset.value).toBe(id);
      expect(items[index].textContent).toBe(title);
    }
    expect(listbox.attach).toHaveBeenCalled.once().with(ct);
  });

  it('visar formulärfel vid felmeddelande', async () => {
    await view.open();
    view.showError('test');
    expect(form.reportValidity).toHaveBeenCalled.once();
  });

  it.with(
    ['follows', 'test'],
    ['format', 'pdf'],
    ['name', 'Test'],
    ['note', 'test'],
    ['serviceType', 'test'],
    ['type', 'document'],
    ['url', 'https://digg.se']
  )(
    "meddelar observatörer vid ändring i fältet '{0}'",
    async (field, value) => {
      let notified = false;
      await view.open();
      view.activate();
      view.subscribe((e) => {
        notified = true;
        expect(e.state).toBe(undefined);
        expect(e.target).toBe(field);
        expect(e.value).toBe(value);
      });
      form[field].value = value;
      form.triggerEvent({
        target: form[field],
        type: 'change',
      });
      expect(notified).toBe(true);
    }
  );

  it('meddelar observatörer om ändring av skärmläsarstöd', async () => {
    let notified = false;
    await view.open();
    view.activate();
    view.subscribe((e) => {
      notified = true;
      expect(e.state).toBe(false);
      expect(e.target).toBe('srSupport');
    });
    form.srSupport.checked = false;
    form.triggerEvent({
      target: form.srSupport,
      type: 'change',
    });
    expect(notified).toBe(true);
  });

  it('meddelar observatörer om markering av innehållstyper', async () => {
    const types = { foo: true, bar: false };
    await view.open();
    view.activate();
    view.subscribe((e) => (types[e.value] = e.state));
    listbox.triggerEvent({
      state: false,
      target: { dataset: { value: 'foo' }, id: 'ct-foo' },
    });
    listbox.triggerEvent({
      state: true,
      target: { dataset: { value: 'bar' }, id: 'ct-bar' },
    });
    expect(types.foo).toBe(false);
    expect(types.bar).toBe(true);
  });
});

describe('Sidinnehåll', () => {
  let doc;
  let listbox;
  let view;

  beforeEach(() => {
    // Formuläret.
    form = mock.element(
      'form',
      {
        random: mock.element('span'),
        type: mock.radioGroup(
          'type',
          'webpage',
          'document',
          'screen',
          'webpage',
          'component'
        ),
        _connections: mock.element('ul'),
        _sct: mock.element('ul'),
      },
      {
        querySelectorAll: () => [],
      }
    );

    // Lista med innehållstyper för stickprovet.
    listbox = mock({
      attach: () => {},
      detach: () => {},
      subscribe: () => {},
    });

    // DOM-dokumentet.
    doc = {
      body: mock.eventTarget('body'),
      _ids: {
        connections: form._connections,
        random: form.random,
        'sample-content-types': form._sct,
      },
      createElement: (t) => mock.element(t),
      getElementById: (s) => doc._ids[s] ?? null,
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Villkorsstyrning.
    const fakeViewCondition = {
      apply: () => {},
      disconnect: () => {},
      observe: () => {},
    };

    // Skapa en vyinstans.
    view = new SampleEditView(
      '',
      '',
      null,
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      listbox,
      null,
      fakeViewCondition,
      doc
    );
  });

  it('sätter sidrubriken', async () => {
    const h1 = mock.element('h1');
    const heading = 'Test Heading';
    article._qs.h1 = () => h1;
    await view.open();
    view.heading = heading;
    expect(h1.textContent).toBe(heading);
  });

  it.with(['app'], ['website'])(
    "sätter typ av digital service till '{0}'",
    async (service) => {
      const chkClass = (t) => expect(has(t)).toBe(t === service);
      const has = (t) => article.classList.contains(t);
      const sel = (c) => `${c} button, ${c} input, ${c} select`;
      await view.open();
      view.service = service;
      expect(view.service).toBe(service);
      chkClass('app');
      chkClass('website');
    }
  );

  it('populerar listan med urvalskategorier', async () => {
    const data = [
      { id: 'foo', name: 'Foo', count: 13 },
      { id: 'bar', name: 'Bar', count: 0 },
    ];
    const select = mock.select('category', [
      mock.element('option'),
      mock.element('option'),
    ]);
    form.category = select;
    await view.open();
    view.setCategories(data);
    expect(select.children.length).toBe(3);
    const opt = (i) => select.children[i];
    expect(opt(1).value).toBe(data[0].id);
    expect(opt(1).label).toBe(`${data[0].name} (${data[0].count})`);
    expect(opt(2).value).toBe(data[1].id);
    expect(opt(2).label).toBe(data[1].name);
  });

  it('sätter återstående slumpurval', async () => {
    const text = '2 pages';
    await view.open();
    view.randomCount = text;
    expect(form.random.textContent).toBe(text);
  });

  it('avaktiverar Ta bort-knappen', async () => {
    const btn = mock.element('button', { disabled: false }, {});
    form.querySelector = (s) => ({ 'button[value="delete"]': btn })[s] ?? null;
    await view.open();
    view.deleteAction = null;
    expect(btn.disabled).toBe(true);
  });

  it('sätter åtgärdssökväg för Ta bort-knappen', async () => {
    const action = '?afterDelete';
    const btn = mock.element('button', { disabled: true }, {});
    form.querySelector = (s) => ({ 'button[value="delete"]': btn })[s] ?? null;
    await view.open();
    view.deleteAction = action;
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute('formaction')).toBe(action);
  });

  it('uppdaterar förloppsindikatorn', async () => {
    const progress = mock.element('progress', { max: '', value: '' }, {});
    const max = 42;
    const value = 13;
    article._qs.progress = () => progress;
    await view.open();
    view.setProgress(value, max);
    expect(progress.value).toBe(value);
    expect(progress.max).toBe(max);
  });

  it('lägger till kryssrutor för komponenter', async () => {
    const fragment = () => ({
      children: [
        mock.element(
          'li',
          {
            children: [
              mock.element('label', { children: [mock.checkbox(false)] }, {}),
            ],
          },
          {}
        ),
      ],
    });
    const ul = mock.element('ul');
    doc._ids['components'] = ul;
    doc._ids['component-template'] = mock.template(fragment);
    await view.open();
    view.addComponent(1, 'first', true);
    view.addComponent(2, 'second', false);
    expect(ul.children.length).toBe(2);
    const cb = (i) => label(i).children[0];
    const frag = (i) => ul.children[i];
    const label = (i) => li(i).children[0];
    const li = (i) => frag(i).children[0];
    const text = (i) => label(i).children[1];
    expect(cb(0).checked).toBe(true);
    expect(cb(0).value).toBe('1');
    expect(text(0)).toBe(' first');
    expect(cb(1).checked).toBe(false);
    expect(cb(1).value).toBe('2');
    expect(text(1)).toBe(' second');
  });

  it('rensar komponentlistan', async () => {
    const ul = mock.element('ul', { innerHTML: 'content' }, {});
    doc._ids['components'] = ul;
    await view.open();
    view.clearComponentList();
    expect(ul.innerHTML).toBe('');
  });

  it('kopplar och frikopplar listrutan', async () => {
    await view.open();
    view.setSampleContentTypes([['foo', 'Foo', false]]);
    view.activate();
    expect(listbox.attach).toHaveBeenCalled.once();
    view.deactivate();
    expect(listbox.detach).toHaveBeenCalled.once();
  });

  it('lägger till kryssrutor för kopplingar', async () => {
    const fragment = () => ({
      children: [
        mock.element(
          'li',
          {
            children: [
              mock.element('label', { children: [mock.checkbox(false)] }, {}),
            ],
          },
          {}
        ),
      ],
    });
    const ul = mock.element('ul');
    doc._ids['connections'] = ul;
    doc._ids['connection-template'] = mock.template(fragment);
    await view.open();
    view.addConnection(1, 'first', true);
    view.addConnection(2, 'second', false);
    expect(ul.children.length).toBe(2);
    const cb = (i) => label(i).children[0];
    const frag = (i) => ul.children[i];
    const label = (i) => li(i).children[0];
    const li = (i) => frag(i).children[0];
    const text = (i) => label(i).children[1];
    expect(cb(0).checked).toBe(true);
    expect(cb(0).value).toBe('1');
    expect(text(0)).toBe(' first');
    expect(cb(1).checked).toBe(false);
    expect(cb(1).value).toBe('2');
    expect(text(1)).toBe(' second');
  });

  it('rensar kopplingslistan', async () => {
    await view.open();
    view.clearConnectionList();
    expect(form._connections.innerHTML).toBe('');
  });
});

describe('Komponenter och kopplingar', () => {
  let compDlg;
  let contentTypes;
  let doc;
  let dropdown;
  let view;

  beforeEach(() => {
    article._qsa['button[data-handler="component"]'] = () => [
      mock.element('button'),
      mock.element('button'),
    ];

    // Formuläret.
    form = mock.element(
      'form',
      {
        component: mock.input('text', 'component'),
        default: mock.checkbox(false, { name: 'default' }),
      },
      {
        querySelectorAll: () => [],
      }
    );

    // Rullgardinslista med innehållstyper för komponenter.
    dropdown = mock(
      {
        buttonText: '',
        _observers: [],
        triggerEvent: (e) => dropdown._observers.forEach((o) => o(e)),
      },
      {
        attach: () => {},
        detach: () => {},
        reset: () => {},
        subscribe: (o) => dropdown._observers.push(o),
      }
    );

    // Dialogrutan för tillägg av komponenter.
    compDlg = mock.eventTarget(
      'dialog',
      {
        _close: mock.eventTarget('button'),
        _status: mock.element('div'),
      },
      {
        close: () => compDlg.triggerEvent({ type: 'close' }),
        querySelector: () => compDlg._status,
        showModal: () => {},
      }
    );

    // Elementet som rullgardinslistan kopplas till.
    contentTypes = mock.element(
      'div',
      {
        children: [
          mock.element('button'),
          mock.element('ul'),
          mock.element('button'),
        ],
      },
      {
        querySelector: (s) => ({ ul: contentTypes.children[1] })[s] ?? null,
      }
    );

    // DOM-dokumentet.
    doc = {
      body: mock.eventTarget('body'),
      _ids: {
        'component-content-types': contentTypes,
        'component-dialog': compDlg,
        components: mock.eventTarget('ul'),
        connections: mock.eventTarget('ul'),
      },
      createElement: (t) => mock.element(t),
      getElementById: (s) => doc._ids[s] ?? null,
      querySelector: mock.defaultQuerySelector(article, status),
    };

    // Villkorsstyrning.
    const fakeViewCondition = {
      apply: () => {},
      disconnect: () => {},
      observe: () => {},
    };

    // Skapa en vyinstans.
    view = new SampleEditView(
      '',
      '',
      null,
      mock.breadcrumbTrail(),
      mock.eventListenerList(),
      mock.pageContentLoader(),
      null,
      dropdown,
      fakeViewCondition,
      doc
    );
  });

  it('kopplar och frikopplar rullgardinslistan', async () => {
    await view.open();
    view.setComponentContentTypes([['foo', 'Foo', false]]);
    view.activate();
    expect(dropdown.attach).toHaveBeenCalled.once();
    view.deactivate();
    expect(dropdown.detach).toHaveBeenCalled.once();
  });

  it('lägger till innehållstyper för komponenter', async () => {
    const contentTypes = mock.element(
      'div',
      {
        children: [mock.element('button'), mock.element('ul')],
      },
      {
        querySelector: (s) => ({ ul: contentTypes.children[1] })[s] ?? null,
      }
    );
    const types = [
      ['foo', 'Foo', true],
      ['bar', 'Bar', false],
    ];
    doc._ids['component-content-types'] = contentTypes;
    await view.open();
    view.setComponentContentTypes(types);
    const attr = (i, n) => items[i].getAttribute(n);
    const items = contentTypes.children[1].children;
    expect(items.length).toBe(types.length);
    for (const [index, arr] of types.entries()) {
      const [id, title, selected] = arr;
      expect(attr(index, 'aria-selected')).toBe(String(selected));
      expect(attr(index, 'id')).toBe(`cct-${id}`);
      expect(attr(index, 'role')).toBe('option');
      expect(items[index].dataset.value).toBe(id);
      expect(items[index].textContent).toBe(title);
    }
    const [btn, ul] = contentTypes.children;
    expect(dropdown.attach).toHaveBeenCalled.once().with(btn, ul);
  });

  it('öppnar modal dialog för tillägg av komponenter', async () => {
    await view.open();
    expect(form.default.checked).toBe(false);
    expect(view.default).toBe(false);
    view.default = true;
    expect(form.default.checked).toBe(true);
    expect(view.default).toBe(true);
  });

  it('returnerar förvalsmarkering för tillägg av komponent', async () => {
    await view.open();
    view.default = true;
    expect(form.default.checked).toBe(true);
    expect(view.default).toBe(true);
  });

  it('returnerar valda innehållstyper för komponent', async () => {
    const change = (id) => ({ state: true, target: { id: `cct-${id}` } });
    const types = [
      ['foo', 'Foo', false],
      ['bar', 'Bar', false],
    ];
    await view.open();
    view.setComponentContentTypes(types);
    view.activate();
    dropdown.triggerEvent(change('foo'));
    dropdown.triggerEvent(change('bar'));
    const actual = view.contentTypes;
    expect(actual.length).toBe(types.length);
    types.forEach(([t]) => expect(actual.includes(t)).toBe(true));
  });

  it('rensar komponentfälten', async () => {
    const types = [
      ['foo', 'Foo', true],
      ['bar', 'Bar', false],
    ];
    await view.open();
    form.component.value = 'test';
    form.default.checked = true;
    view.setComponentContentTypes(types);
    view.clearComponentFields();
    expect(form.component.value).toBe('');
    expect(form.default.checked).toBe(false);
    expect(dropdown.reset).toHaveBeenCalled.once().with(['cct-foo']);
  });

  it('visar statusmeddelande i komponentdialogen', async () => {
    const msg = 'Test status';
    await view.open();
    view.activate();
    view.showComponentStatus(msg);
    expect(compDlg._status.textContent).toBe(msg);
  });

  it('uppdaterar knapptext vid val av innehållstyper', async () => {
    const change = (id, state) => ({ state, target: { id: `cct-${id}` } });
    const types = [
      ['foo', 'Foo', false],
      ['bar', 'Bar', false],
    ];
    await view.open();
    view.setComponentContentTypes(types);
    view.activate();
    dropdown.triggerEvent(change('foo', true));
    expect(dropdown.buttonText).toBe('1 innehållstyp');
    expect(view.contentTypes).toEqual(['foo']);
    dropdown.triggerEvent(change('foo', false));
    expect(dropdown.buttonText).toBe('0 innehållstyper');
    expect(view.contentTypes.length).toBe(0);
  });

  it('uppdaterar knapptext vid återställning', async () => {
    const types = [
      ['foo', 'Foo', true],
      ['bar', 'Bar', true],
    ];
    await view.open();
    view.setComponentContentTypes(types);
    expect(dropdown.buttonText).toBe('2 innehållstyper');
    view.activate();
    expect(view.contentTypes).toEqual(['foo', 'bar']);
    dropdown.triggerEvent({ state: true, target: null });
    expect(dropdown.buttonText).toBe('0 innehållstyper');
    expect(view.contentTypes.length).toBe(0);
  });

  it('meddelar observatörer om markering av komponenter', async () => {
    let notified = false;
    await view.open();
    view.subscribe((e) => {
      notified = true;
      expect(e.state).toBe(true);
      expect(e.target).toBe('foo');
      expect(e.type).toBe('change');
      expect(e.value).toBe('bar');
    });
    view.activate();
    doc.getElementById('components').triggerEvent({
      target: { checked: true, id: 'foo', value: 'bar' },
      type: 'input',
    });
    expect(notified).toBe(true);
  });

  it('meddelar observatörer om tillägg av komponent', async () => {
    const add = mock.eventTarget('button', { value: 'component' }, {});
    article._qsa['button[type="button"]'] = () => [add];
    let notified = false;
    await view.open();
    view.subscribe((e) => {
      notified = true;
      expect(e.action).toBe('component');
    });
    view.activate();
    add.triggerEvent({ type: 'click' });
    expect(notified).toBe(true);
  });

  it('meddelar observatörer om markering av kopplingar', async () => {
    let notified = false;
    await view.open();
    view.subscribe((e) => {
      notified = true;
      expect(e.state).toBe(true);
      expect(e.target).toBe('foo');
      expect(e.type).toBe('change');
      expect(e.value).toBe('bar');
    });
    view.activate();
    doc.getElementById('connections').triggerEvent({
      target: { checked: true, id: 'foo', value: 'bar' },
      type: 'input',
    });
    expect(notified).toBe(true);
  });

  describe('Bekräftelsedialog', () => {
    let dialog;

    beforeEach(() => {
      const components = doc.getElementById('components');
      for (let i = 1; i < 5; ++i) {
        const li = mock.element('li');
        const label = mock.element(
          'label',
          { lastChild: { data: `${i}` } },
          {}
        );
        const cb = mock.checkbox(i & (1 === 1), { value: `${i}` });
        label.append(cb);
        li.append(label);
        components.append(li);
      }

      // Dialogruta för att bekräfta komponentkopplingar.
      dialog = mock.eventTarget(
        'dialog',
        {
          _cancel: mock.element('button'),
          _cb: mock.checkbox(true),
          _confirm: mock.element('button'),
          _list: mock.element('ul'),
          returnValue: null,
        },
        {
          close: () => dialog.triggerEvent({ type: 'close' }),
          querySelectorAll: (s) =>
            ({
              'li input[type="checkbox"]': dialog._list.children.map(
                (li) => li.children[0].children[0]
              ),
              button: [dialog._confirm, dialog._cancel],
            })[s] ?? [],
          showModal: () => {},
        }
      );

      doc._ids['ccd-confirm'] = dialog._cb;
      doc._ids['ccd-list'] = dialog._list;
      doc._ids['confirm-component-dialog'] = dialog;
    });

    it('returnerar bekräftade komponenter', async () => {
      await view.open();
      view.activate();
      dialog.returnValue = 'confirm';
      setTimeout(() => dialog.close(), 0);
      const ok = await view.confirmComponents();
      expect(ok).toBe(true);
      expect(view.components).toEqual([
        { id: 1, inc: true },
        { id: 2, inc: false },
        { id: 3, inc: true },
        { id: 4, inc: false },
      ]);
      expect(view.confirmOnSave).toBe(true);
    });

    it('indikerar avbruten komponentbekräftelse', async () => {
      await view.open();
      view.activate();
      setTimeout(() => dialog.triggerEvent({ type: 'cancel' }), 0);
      const ok = await view.confirmComponents();
      expect(ok).toBe(false);
    });
  });
});

// Importera beroenden.
import { SampleEditView } from '../../js/view/SampleEditView.js';
import { ValidationError } from '../../js/model/ValidationError.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

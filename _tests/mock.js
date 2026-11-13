/**
 * Skapa en ersättare för ett objekt vid enhetstestning.
 *
 * För att slippa beroenden till andra klasser vid enhetstestning och också för
 * att möjliggöra enhetstest av enheter som är beroende av ännu inte existerande
 * klasser, behöver man kunna skapa ersättare ("mocks").
 *
 * Funktionen skapar ett ombud (proxy) som fasad för antingen ett tomt objekt
 * eller ett befinligt objekt där man exempelvis vill förhindra vissa metod-
 * anrop. Ombudet loggar också varje anrop till metoder i ersättningsobjektet,
 * så att man kan verifiera dem i efterhand med {@link Expectation.js expect()}.
 *
 * @license CC-BY 4.0
 * @param {object} [obj] Eventuellt källobjekt att bygga en fasad framför.
 * @param {object} dummy Objekt vars fält och metoder ersätter sina motsvarig-
 *                       heter i källobjektet.
 * @return {Proxy}
 */
export function mock(obj, dummy) {
  // Om funktionen anropas med ett argument (dummy), använd ett tomt objekt
  // som källobjekt.
  if (undefined === dummy) {
    dummy = obj;
    obj = {};
  }

  // Skapa och returnera ett ombud.
  return new Proxy(obj, {
    // Läsning av fältvärden eller hämtning av metoder.
    get(target, prop) {
      if (prop in dummy) {
        // Fältet finns i ersättaren; använd det.
        if ('function' !== typeof dummy[prop]) {
          return dummy[prop];
        }

        // Om det är en metod, logga anropet med ännu ett ombud.
        dummy[prop]._calls ??= [];
        dummy[prop]._name = prop;
        return new Proxy(dummy[prop], {
          apply(method, thisArg, argList) {
            dummy[prop]._calls.push(argList);
            return dummy[prop](...argList);
          },
        });
      } else {
        // Fältet finns inte i ersättaren; spegla källobjektet.
        return Reflect.get(target, prop);
      }
    },

    // Skrivning av fältvärden.
    set(target, prop, value) {
      if (prop in dummy) {
        // Fältet finns i ersättaren; använd det.
        dummy[prop] = value;
        return true;
      } else {
        // Fältet finns inte i ersättaren; spegla källobjektet.
        return Reflect.set(target, prop, value);
      }
    },
  });
}

/**
 * Skapa en dummy-applikationskontext.
 *
 * @param {object} [obj] Eventuella fält.
 * @return {Proxy}
 */
mock.appContext = (obj = {}) => {
  obj.advanced ??= true;
  obj.audit ??= NaN;
  obj.case ??= NaN;
  obj.error ??= '';
  obj.history ??= false;
  obj.modified ??= false;
  obj.page ??= '';
  obj.params ??= {};
  obj.requirement ??= '';
  obj.sample ??= NaN;
  obj.status ??= '';
  obj.target ??= '';

  return mock(obj, {
    hasParam: (n) => n in obj.params,
    param: (n) => obj.params[n] ?? '',
    serialize: () => {},
    unserialize: () => {},
  });
};

/**
 * Skapa en dummy-länkstig.
 *
 * @return {object}
 */
mock.breadcrumbTrail = () =>
  mock(
    {
      current: '',
    },
    {
      audit: () => {},
      case: () => {},
      completed: async () => ({}),
      deleteRoot: () => {},
      list: () => {},
      log: () => {},
      requirement: () => {},
      sample: () => {},
    }
  );

/**
 * Skapa en dummy-kryssruta.
 *
 * @see mock.element
 * @param {boolean} checked Ikryssad?
 * @param {object}  [obj]   Eventuella fält.
 * @return {Proxy}
 */
mock.checkbox = (checked, obj = {}) => {
  obj.checked = Boolean(checked);
  obj.type = 'checkbox';
  obj.value ??= '';
  return mock.element('input', obj, {
    checkValidity: () => true,
    reportValidity: () => {},
    setCustomValidity: () => {},
  });
};

/**
 * Skapa ett element som kan användas som bekräftelsedialog i en vy.
 *
 * @return {Proxy}
 */
mock.confirmDialog = () => {
  const button = (text, value) =>
    mock.eventTarget('button', { lastChild: { textContent: text }, value }, {});
  const dialog = mock.eventTarget(
    'dialog',
    {
      cancel: button('Cancel', 'false'),
      ok: button('OK', 'true'),
      prompt: {},
      returnValue: '',
    },
    {
      querySelector: () => dialog.prompt,
      querySelectorAll: () => [dialog.cancel, dialog.ok],
      showModal: async () => dialog.returnValue,
    }
  );
  return dialog;
};

/**
 * Ersätter `querySelector()` för DOM-dokument i vyer.
 *
 * @param {*} article Artikelelement.
 * @param {*} status  Statusbehållare.
 * @return {function}
 */
mock.defaultQuerySelector = (article, status) => (sel) =>
  ({
    'main > article[aria-live]': article,
    'main > [role="status"]': status,
  })[sel] ?? null;

/**
 * Skapa en dummy-DOMTokenList-ersättare.
 *
 * @param {string[]} [initial] Initial set.
 * @return {object}
 */
mock.domTokenList = (initial = null) => {
  const list = mock(
    {
      _tokens: new Set(initial),
    },
    {
      add: (c) => list._tokens.add(c),
      contains: (c) => list._tokens.has(c),
      remove: (c) => list._tokens.delete(c),
      replace: (o, n) => {
        list._tokens.delete(o);
        list._tokens.add(n);
      },
      toggle: (c, f) => {
        const flag = f ?? !list._tokens.has(c);
        list._tokens[flag ? 'add' : 'delete'](c);
        return flag;
      },
    }
  );
  return list;
};

/**
 * Skapa en dummy-Element-nod.
 *
 * @param {string} tag     Taggnamn.
 * @param {object} [obj]   Eventuella fält.
 * @param {object} [dummy] Eventuellt hanterarobjekt att utöka.
 * @return {Proxy}
 */
mock.element = (tag, obj = {}, dummy) => {
  if (undefined === dummy) {
    dummy = obj;
    obj = {};
  }

  obj._attrs ??= {};
  obj.children ??= [];
  obj.classList = mock.domTokenList();
  obj.dataset ??= {};
  obj.disabled ??= false;
  obj.hidden ??= false;
  obj.id ??= '';
  obj.innerHTML ??= '';
  obj.innerText ??= '';
  obj.nodeType ??= 1;
  obj.parentNode ??= mock(
    { children: [] },
    {
      insertBefore: (n, c) => {
        obj.parentNode.children.push(n);
      },
    }
  );
  obj.tabIndex ??= -1;
  obj.tagName = (tag ?? '').toUpperCase();
  obj.textContent ??= '';

  (dummy.addEventListener ??= () => {}),
    (dummy.append = (...c) => obj.children.push(...c));
  dummy.appendChild = (n) => (obj.children.push(n), n);
  (dummy.focus = () => {}), (dummy.getAttribute = (n) => obj._attrs[n] ?? '');
  (dummy.hasAttribute = (n) => n in obj._attrs),
    (dummy.insertBefore = (n, c) => {
      const i = obj.children.indexOf(c);
      -1 === i ? obj.children.push(n) : obj.children.splice(i, 0, n);
      return n;
    });
  dummy.remove ??= () => {};
  dummy.removeAttribute = (n) => delete obj._attrs[n];
  (dummy.removeChild = (c) => {
    const i = obj.children.indexOf(c);
    -1 !== i && obj.children.splice(i, 1);
    return c;
  }),
    (dummy.removeEventListener ??= () => {}),
    (dummy.replaceChild = (n, c) => {
      const i = obj.children.indexOf(c);
      -1 !== i && (obj.children[i] = n);
      return c;
    }),
    (dummy.setAttribute = (n, v) => (obj._attrs[n] = v));
  dummy.setAttributeNS = (s, n, v) => (obj._attrs[n] = v);

  return mock(obj, dummy);
};

/**
 * Skapa en ersättare för en händelselyssnarlista.
 *
 * @return {Proxy}
 */
mock.eventListenerList = () =>
  mock({
    add: (e, t, l, c = false) => e.addEventListener(t, l, c),
    removeAll: () => {},
  });

/**
 * Skapa en ersättare som simulerar ett HTML-element som kan ha händelsehantera-
 * re. Ersättaren implementerar metoderna `addEventListener()` och
 * `removeEventListener()` och tillhandahåller också en egen metod för aa simu-
 * lera att en hanterad händelse inträffar för objektet.
 *
 * Observera att ersättaren bara har stöd för en händelselyssnare per typ.
 *
 * @example
 * const button = mock.eventTarget("div");
 * button.triggerEvent({type: "keypress", key: "x"})
 *
 * @see mock.eleement
 * @param {string} tag     Taggnamn.
 * @param {object} [obj]   Eventuella fält.
 * @param {object} [dummy] Eventuellt hanterarobjekt att utöka.
 * @return {Proxy}
 */
mock.eventTarget = (tag, obj = {}, dummy) => {
  if (undefined === dummy) {
    dummy = obj;
    obj = {};
  }

  // Spara tillagda händelselyssnare.
  dummy.listeners = {};
  dummy.addEventListener = (type, listener, capture = false) => {
    dummy.listeners[type] = listener;
  };
  dummy.removeEventListener = (type, listener, capture = false) => {
    delete dummy.listeners[type];
  };

  // Simulera händelse.
  dummy.triggerEvent = (event) => {
    if (!event.type) {
      throw new TypeError("Simulerad händelse måste innehålla 'type'.");
    }

    if (!(event.type in dummy.listeners)) {
      throw new TypeError(`Ingen lyssnare registrerad för '${event.type}'.`);
    }

    event.currentTarget ||= obj;
    event.target ||= dummy;
    event.preventDefault = () => {};
    event.stopPropagation = () => {};

    dummy.listeners[event.type](event);
  };

  return mock.element(tag, obj, dummy);
};

/**
 * Skapa ett objekt med ersättare för diverse globala objekt.
 *
 * @return {object}
 */
mock.globals = () => {
  const globals = {
    history: mock({ pushState: () => {} }),
    window: mock.eventTarget(),
  };
  return globals;
};

/**
 * Skapa ett dummy-formulärfält.
 *
 * @see mock.element
 * @param {string} type    Fälttyp.
 * @param {string} name    Fältnamn.
 * @param {string} [value] Värde.
 * @param {object} [obj]   Eventuella fält.
 * @return {Proxy}
 */
mock.input = (type, name, value = '', obj = {}) => {
  const inp = mock.element(
    'input',
    Object.assign(
      {
        checked: false,
        list: {},
        max: '',
        maxlength: '',
        min: '',
        minlength: '',
        name,
        pattern: '',
        readOnly: false,
        required: false,
        step: '',
        tabIndex: 0,
        type,
        value,
        _valid: true,
      },
      obj
    ),
    {
      get valueAsDate() {
        const date = new Date(inp.value);
        return 'Invalid Date' === date.toString() ? null : date;
      },
      get valueAsNumber() {
        const date = new Date(inp.value);
        return 'Invalid Date' === date.toString()
          ? Number(inp.value)
          : date.getTime();
      },
      checkValidity: () => inp._valid,
      reportValidity: () => inp._valid,
      setCustomValidity: () => {},
    }
  );
  return inp;
};

/**
 * Skapa en dummylänk.
 *
 * @see mock.element
 * @param {string} [href] Länkadress.
 * @return {Proxy}
 */
mock.link = (href = '', obj = {}) => {
  obj.href = href;
  obj.tabIndex ??= 0;
  return mock.element('a', obj, {});
};

/**
 * Skapa en ersättare för modellobjektet.
 *
 * @param {object} [obj]   Eventuella fält.
 * @param {object} [dummy] Metoder att lägga till utöver mockobjektets.
 */
mock.model = (obj = {}, dummy) => {
  if (undefined === dummy) {
    dummy = obj;
    obj = {};
  }

  obj.advancedMode ??= true;
  obj.caseDirectory ??= null;
  obj.lastPath ??= null;

  return mock(obj, dummy);
};

/**
 * Skapa en ersättare för en resursladdare som bara hämtar sidinnehåll.
 *
 * @param {string} [content] Innehåll att returnera.
 * @return {object}
 */
mock.pageContentLoader = (content = '') => ({
  pageContent: async () => content,
});

/**
 * Skapa en dummy-radiogrupp.
 *
 * @param {string}    name   Fältnamn.
 * @param {string}    value  Aktuellt värde.
 * @param {...string} values Värden i gruppen.
 * @return {Proxy}
 */
mock.radioGroup = (name, value, ...values) => {
  const group = {
    entries: values.map((value) => mock.input('radio', name, value)),
    name,
    value,
    [Symbol.iterator]: () => group.entries.values(),
  };
  return group;
};

/**
 * Skapa en dummy-rullgardinslista.
 *
 * @see mock.element
 * @param {string}  name       Fältnamn.
 * @param {array}   [children] Listelement.
 * @param {object}, [obj]      Eventuella fält.
 * @return {Proxy}
 */
mock.select = (name, children = [], obj = {}) => {
  const select = mock.element(
    'select',
    Object.assign(
      {
        children,
        name,
        value: '',
        get length() {
          return select.children.length;
        },
        get options() {
          return select.children;
        },
      },
      obj
    ),
    {
      add: (o) => (select.children.push(o), o),
      checkValidity: () => true,
      remove: (i) => select.children.splice(i, 1),
      reportValidity: () => {},
      setCustomValidity: () => {},
    }
  );
  return select;
};

/**
 * Skapa en dummy-tabell.
 *
 * @see mock.element
 * @return {Proxy}
 */
mock.table = () => {
  const tbl = {
    caption: null,
    rows: [],
    tBodies: [],
    tHead: null,
  };

  const push = (p, c) => (p.push(c), c);

  const section = (tag) => {
    const sec = mock.element(
      tag,
      { rows: [] },
      {
        insertRow: () => {
          const tr = mock.element(
            'tr',
            { cells: [] },
            {
              insertCell: () => {
                const td = mock.element('td');
                tr.cells.push(td);
                return td;
              },
            }
          );
          sec.rows.push(tr);
          tbl.rows.push(tr);
          return tr;
        },
      }
    );
    return sec;
  };

  const dummy = {
    createCaption: () => (tbl.caption = mock.element('caption')),
    createTBody: () => push(tbl.tBodies, section('tbody')),
    createTHead: () => (tbl.tHead = section('thead')),
    get children() {
      const children = [];
      tbl.caption && children.push(tbl.caption);
      tbl.tHead && children.push(tbl.tHead);
      return children.concat(tbl.tBodies);
    },
  };

  return mock.element('table', tbl, dummy);
};

/**
 * Skapa ett dummt-mallelement.
 *
 * @param {function} fragment Klonfunktion som returnerar ett dokumentfragment.
 * @param {object}   [parent] Föräldraelement.
 * @return {object}
 */
mock.template = (fragment, parent = null) => {
  const template = {
    content: { cloneNode: () => fragment() },
  };
  parent && (template.parentNode = parent);
  parent ?? (template.parentNode = { insertBefore: () => {} });
  return template;
};

/**
 * Skapa en dummy-textruta..
 *
 * @see mock.element
 * @param {string} name Fältnamn.
 * @return {Proxy}
 */
mock.textarea = (name) =>
  mock.element(
    'textarea',
    {
      name,
      maxlength: '',
      minlength: '',
      required: false,
      value: '',
    },
    {
      checkValidity: () => true,
      reportValidity: () => {},
      setCustomValidity: () => {},
    }
  );

/**
 * Skapa en ersättare för en vy härledd från `ViewBase`.
 *
 * @param {object} [obj]   Eventuella fält.
 * @param {object} [dummy] Metoder att lägga till utöver mockobjektets.
 */
mock.view = (obj = {}, dummy) => {
  if (undefined === dummy) {
    dummy = obj;
    obj = {};
  }

  obj.action ??= '';
  obj.advancedMode ??= true;
  obj.breadcrumbs ??= { current: '' };
  obj.observers ??= [];
  obj.title ??= '';
  obj._confirm ??= true;
  obj._logErrors ??= false;

  dummy.autoFocus ??= () => {};
  (dummy.confirm ??= async () => obj._confirm), (dummy.hideStatus ??= () => {});
  (dummy.showError ??= (e) => obj._logErrors && console.error(e)),
    (dummy.showSuccess ??= () => {});
  dummy.subscribe ??= (o) => obj.observers.push(o);
  dummy.unsubscribe ??= (o) =>
    obj.observers.splice(obj.observers.indexOf(o), 1);

  dummy.notify = (...events) =>
    setTimeout(() => {
      events.forEach((e) => obj.observers.forEach((o) => o(e)));
    }, 0);

  return mock(obj, dummy);
};

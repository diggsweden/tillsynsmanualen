/**
 * Enhetstestfall för listruta.
 *
 * @license CC-BY 4.0
 * @see Listbox
 */

// Gör det mockade listelementet till en flervalslista.
function makeMultiselectable(list) {
  list.setAttribute('aria-multiselectable', 'true');
  for (const option of list.children) {
    option['aria-selected'] = 'false';
  }
}

let doc;
let fixture;
let listeners;
let observer;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Händelselyssnarlistan.
  listeners = mock.eventListenerList();

  // DOM-dokumentet.
  const option = (id, text) =>
    mock.element(
      'option',
      {
        id,
        textContent: text,
      },
      {}
    );

  doc = {
    body: mock.eventTarget('body'),
    list: mock.eventTarget(
      'ul',
      {
        children: [
          option('cct-one', 'First'),
          option('cct-two', 'Second'),
          option('cct-three', 'Third'),
          option('cct-four', 'Fourth'),
          option('cct-five', 'Fifth'),
        ],
      },
      {
        contains: () => false,
      }
    ),
    getElementById: (id) => doc.list.children.find((o) => o.id === id),
  };

  // Tangentmapparen.
  const key = (e) =>
    ['alt', 'ctrl', 'meta', 'shift']
      .filter((m) => e[`${m}Key`])
      .concat(e.key)
      .join('+');
  const mod = (k, m) => [m, k].filter((e) => !!e).join('+');
  const keyMap = {
    _map: {},
    action: (e) => (keyMap._map[key(e)] ?? keyMap._map['*'])(e.key),
    map: (k, a, m) => (keyMap._map[mod(k, m)] = a),
  };

  // Skapa en instans av listrutan.
  fixture = new Listbox(listeners, keyMap, doc);

  // Registrera en observatör.
  observer = mock({ notify: () => {} });
  fixture.subscribe(() => observer.notify());
});

it.with([false, 'enkelval'], [true, 'flerval'])(
  'kopplar listrutan till ett listelement ({1})',
  (multi) => {
    multi && makeMultiselectable(doc.list);
    multi || (doc.list.children[0]['aria-selected'] = 'true');
    fixture.attach(doc.list);
    expect(doc.list.addEventListener).toHaveBeenCalled.times(2);
    expect(doc.list.getAttribute('aria-activedescendant')).toBe(
      doc.list.children[0].id
    );
  }
);

it('städar bort kopplade händelselyssnare', () => {
  fixture.attach(doc.list);
  fixture.detach();
  expect(listeners.removeAll).toHaveBeenCalled.once();
});

it('återställer valdmarkeringar (enkelval)', () => {
  const options = doc.list.children;

  // Simulera att ett element är valt.
  options[1].setAttribute('aria-selected', 'true');

  fixture.attach(doc.list);
  fixture.reset(['cct-one', 'cct-two']);

  // Ska ha återställt markeringen och ignorerat arguemntet.
  let selected = 'true';
  for (const [index, option] of options.entries()) {
    expect(option.getAttribute('aria-selected')).toBe(selected);
    selected = '';
  }

  // Ska ha satt första elementet som aktivt element.
  expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[0].id);

  // Ska ha meddelat observatörer.
  expect(observer.notify).toHaveBeenCalled.once();
});

it('återställer valdmarkeringar (flerval)', () => {
  makeMultiselectable(doc.list);
  const options = doc.list.children;

  // Simulera att element är valda.
  options[1].setAttribute('aria-selected', 'true');
  options[2].setAttribute('aria-selected', 'true');
  options[4].setAttribute('aria-selected', 'true');

  fixture.attach(doc.list);
  fixture.reset(['cct-one', 'cct-two']);

  // Ska ha återställt markeringarna.
  for (const [index, option] of options.entries()) {
    expect(option.getAttribute('aria-selected')).toBe(String(index < 2));
  }

  // Ska ha satt första elementet som aktivt element.
  expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[0].id);

  // Ska ha meddelat observatörer.
  expect(observer.notify).toHaveBeenCalled.times(5);
});

it.with(
  [undefined, false, 2, 'det element som är valt (enkelval)'],
  [0, false, 0, 'första elementet (enkelval)'],
  [-1, false, 4, 'sista elementet (enkelval)'],
  [undefined, true, 2, 'det element som är valt (flerval)'],
  [0, true, 0, 'första elementet (flerval)'],
  [-1, true, 4, 'sista elementet (flerval)']
)('fokuserar listan och fokuserar {3}', (arg, multi, index) => {
  const options = doc.list.children;
  multi && makeMultiselectable(doc.list);
  options[2].setAttribute('aria-selected', 'true');
  fixture.attach(doc.list);
  fixture.focus(arg);

  // Ska ha gjort listelementet navigeringsbart.
  expect(doc.list.tabIndex).toBe(0);

  // Ska ha satt fokus till listelementet.
  expect(doc.list.focus).toHaveBeenCalled.once();

  // Förväntat element ska vara aktivt.
  expect(doc.list.getAttribute('aria-activedescendant')).toBe(
    options[index].id
  );
});

it('avfokuserar listan', () => {
  fixture.attach(doc.list);
  fixture.focus();
  fixture.unfocus();

  // Ska ha gjort listelementet icke navigeringsbart.
  expect(doc.list.tabIndex).toBe(-1);
});

describe('Mushändelser', () => {
  it('fokuserar och väljer elementet vid klick (enkelval)', () => {
    const options = doc.list.children;
    options[0]['aria-selected'] = 'true';
    fixture.attach(doc.list);

    // Simulera att användaren klickar på ett element som inte har
    // fokus.
    doc.list.triggerEvent({
      button: 0,
      currentTarget: doc.list,
      shiftKey: false,
      target: options[1],
      type: 'click',
    });

    // Ska ha satt det klickade elementet som aktivt och flyttat fokus-
    // markeringen dit.
    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[1].id);

    expect(options[0].classList.remove).toHaveBeenCalled.once();
    expect(options[1].classList.add).toHaveBeenCalled.once();

    expect(options[0].getAttribute('aria-selected')).toBe('');
    expect(options[1].getAttribute('aria-selected')).toBe('true');

    // Ska ha meddelat observatörer.
    expect(observer.notify).toHaveBeenCalled.once();
  });

  it('fokuserar elementet och växlar valdmarkering vid klick (flerval)', () => {
    const options = doc.list.children;
    makeMultiselectable(doc.list);
    fixture.attach(doc.list);

    // Simulera att användaren klickar på två olika element och sedan en
    // gång till på det första.
    const event = (index) =>
      doc.list.triggerEvent({
        button: 0,
        currentTarget: doc.list,
        shiftKey: false,
        target: options[index],
        type: 'click',
      });
    event(1);
    event(3);
    event(1);

    // Det andra elementet ska ha fått fokus två gånger och förlorat
    // fokus en gång. Det ska inte vara valt.
    expect(options[1].classList.add).toHaveBeenCalled.times(2);
    expect(options[3].classList.remove).toHaveBeenCalled.once();

    expect(options[1]['aria-selected']).toBe('false');

    // Det fjärde elementet ska ha fått och förlorat fokus och ska vara
    // valt.
    expect(options[3].classList.add).toHaveBeenCalled.once();
    expect(options[3].classList.remove).toHaveBeenCalled.once();

    expect(options[1]['aria-selected']).toBe('false');

    // Det andra elementet ska vara aktivt element.
    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[1].id);

    // Ska ha meddelat observatörer tre gånger.
    expect(observer.notify).toHaveBeenCalled.times(3);
  });

  it('väljer ett intervall vid skift+klick (flerval)', () => {
    const options = doc.list.children;
    makeMultiselectable(doc.list);
    fixture.attach(doc.list);

    // Simulera att användaren klickar på ett element och sedan skift-
    // klickar pa ett annat.
    const event = (index, shift) =>
      doc.list.triggerEvent({
        button: 0,
        currentTarget: doc.list,
        shiftKey: shift,
        target: options[index],
        type: 'click',
      });
    event(1, false);
    event(3, true);

    // Ska ha satt valdmarkeringen på elementen 2-4.
    expect(options[1].getAttribute('aria-selected')).toBe('true');
    expect(options[2].getAttribute('aria-selected')).toBe('true');
    expect(options[3].getAttribute('aria-selected')).toBe('true');

    // Andra elementet ska ha fått och förlorat fokus.
    expect(options[1].classList.add).toHaveBeenCalled.once();
    expect(options[1].classList.remove).toHaveBeenCalled.once();

    // Fjärde elementet ska vara aktivt element och ha fokus.
    expect(options[3].classList.add).toHaveBeenCalled.once();
    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[3].id);
  });
});

describe('Tangentbordshändelser, enkelval', () => {
  it('fokuserar och väljer nästa element vid nedåtpil (enkelval)', () => {
    const options = doc.list.children;
    options[0]['aria-selected'] = 'true';
    fixture.attach(doc.list);

    let i = 1;
    for (let i = 1; i < options.length; ++i) {
      // Simulera att användaren trycker på nedåtpil.
      doc.list.triggerEvent({ key: 'ArrowDown', type: 'keydown' });

      // Ska ha flyttat fokusmarkeringen.
      expect(options[i - 1].classList.remove).toHaveBeenCalled.once();
      expect(options[i].classList.add).toHaveBeenCalled.once();

      // Ska ha flyttat valdmarkeringen och aktivt element.
      expect(options[i - 1].getAttribute('aria-selected')).toBe('');
      expect(options[i].getAttribute('aria-selected')).toBe('true');

      expect(doc.list.getAttribute('aria-activedescendant')).toBe(
        options[i].id
      );
    }
  });

  it('fokuserar och väljer föregående element vid uppåtpil (enkelval)', () => {
    const options = doc.list.children;
    options[4].setAttribute('aria-selected', 'true');
    fixture.attach(doc.list);

    for (let i = options.length - 2; i >= 0; --i) {
      // Simulera att användaren trycker på uppåtpil.
      doc.list.triggerEvent({ key: 'ArrowUp', type: 'keydown' });

      // Ska ha flyttat fokusmarkeringen.
      expect(options[i + 1].classList.remove).toHaveBeenCalled.once();
      expect(options[i].classList.add).toHaveBeenCalled.once();

      // Ska ha flyttat valdmarkeringen och aktivt element.
      expect(options[i + 1].getAttribute('aria-selected')).toBe('');
      expect(options[i].getAttribute('aria-selected')).toBe('true');

      expect(doc.list.getAttribute('aria-activedescendant')).toBe(
        options[i].id
      );
    }
  });

  it('fokuserar och väljer första elementet vid Home (enkelval)', () => {
    const options = doc.list.children;
    options[2].setAttribute('aria-selected', 'true');
    fixture.attach(doc.list);

    // Simulera att användaren trycker på Home-tangenten.
    doc.list.triggerEvent({ key: 'Home', type: 'keydown' });

    // Ska ha flyttat fokusmarkeringen.
    expect(options[2].classList.remove).toHaveBeenCalled.once();
    expect(options[0].classList.add).toHaveBeenCalled.once();

    // Ska ha flyttat valdmarkeringen och aktivt element.
    expect(options[2].getAttribute('aria-selected')).toBe('');
    expect(options[0].getAttribute('aria-selected')).toBe('true');

    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[0].id);
  });

  it('fokuserar och väljer sista elementet vid End (enkelval)', () => {
    const options = doc.list.children;
    options[2].setAttribute('aria-selected', 'true');
    fixture.attach(doc.list);

    // Simulera att användaren trycker på End-tangenten.
    doc.list.triggerEvent({ key: 'End', type: 'keydown' });

    // Ska ha flyttat fokusmarkeringen.
    const last = options.length - 1;
    expect(options[2].classList.remove).toHaveBeenCalled.once();
    expect(options[last].classList.add).toHaveBeenCalled.once();

    // Ska ha flyttat valdmarkeringen och aktivt element.
    expect(options[2].getAttribute('aria-selected')).toBe('');
    expect(options[last].getAttribute('aria-selected')).toBe('true');

    expect(doc.list.getAttribute('aria-activedescendant')).toBe(
      options[last].id
    );
  });

  it('fokuserar och väljer nästa element som matchar type-ahead (enkelval)', () => {
    const options = doc.list.children;
    options[0].setAttribute('aria-selected', 'true');
    fixture.attach(doc.list);

    // Simulera att användaren trycker på T-tangenten.
    // Ska sätta tredje elementet ("Third") som aktivt och valt element.
    doc.list.triggerEvent({ key: 't', type: 'keydown' });

    expect('aria-selected' in options[0]).toBe(false);
    expect(options[0].classList.remove).toHaveBeenCalled.once();

    expect(options[2].getAttribute('aria-selected')).toBe('true');
    expect(options[2].classList.add).toHaveBeenCalled.once();

    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[2].id);

    // Simulera att användaren trycker på S-tangenten.
    // Ska sätta andra elementet ("Second") som aktivt och valt element,
    // då inget element börjar med "ts".
    doc.list.triggerEvent({ key: 's', type: 'keydown' });

    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[1].id);

    // Simulera att användaren trycker på X-tangenten.
    // Ska inte flytta fokus (inget element börar med vare sig "sx"
    // eller "x").
    doc.list.triggerEvent({ key: 'x', type: 'keydown' });

    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[1].id);

    // Simulera att användaren nu trycker på "F" och "I" i snabb följd.
    // Ska ha satt femte elementet ("Fifth") som aktivt element.
    doc.list.triggerEvent({ key: 'f', type: 'keydown' });
    doc.list.triggerEvent({ key: 'i', type: 'keydown' });

    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[4].id);

    // Simulera att användaren trycker på R-tangenten.
    // Ska ha börjat om från listans start och satt första elementet
    // ("First") som aktivt element.
    doc.list.triggerEvent({ key: 'r', type: 'keydown' });
    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[0].id);
  });

  it('ignorerar mellanslag (enkelval)', () => {
    const options = doc.list.children;
    options[0].setAttribute('aria-selected', 'true');
    fixture.attach(doc.list);

    // Simulera att användaren trycker på mellanslagstangenten.
    doc.list.triggerEvent({ key: ' ', type: 'keydown' });

    // Ska inte ha ändrat valdmarkeringen.
    expect(options[0].getAttribute('aria-selected')).toBe('true');
  });

  it('hanterar Skift+nedåtpil som nedåtpil (enkelval)', () => {
    const options = doc.list.children;
    options[0].setAttribute('aria-selected', 'true');
    fixture.attach(doc.list);

    let i = 1;
    for (let i = 1; i < options.length; ++i) {
      // Simulera att användaren trycker på Skift+nedåtpil.
      doc.list.triggerEvent({
        key: 'ArrowDown',
        shiftKey: true,
        type: 'keydown',
      });

      // Ska ha flyttat fokusmarkeringen.
      expect(options[i - 1].classList.remove).toHaveBeenCalled.once();
      expect(options[i].classList.add).toHaveBeenCalled.once();

      // Ska ha flyttat valdmarkeringen och aktivt element.
      expect(options[i - 1].getAttribute('aria-selected')).toBe('');
      expect(options[i].getAttribute('aria-selected')).toBe('true');

      expect(doc.list.getAttribute('aria-activedescendant')).toBe(
        options[i].id
      );
    }
  });

  it('hanterar Skift+uppåtpil som uppåtpil (enkelval)', () => {
    const options = doc.list.children;
    options[4].setAttribute('aria-selected', 'true');
    fixture.attach(doc.list);

    for (let i = options.length - 2; i >= 0; --i) {
      // Simulera att användaren trycker på Skift+uppåtpil.
      doc.list.triggerEvent({
        key: 'ArrowUp',
        shiftKey: true,
        type: 'keydown',
      });

      // Ska ha flyttat fokusmarkeringen.
      expect(options[i + 1].classList.remove).toHaveBeenCalled.once();
      expect(options[i].classList.add).toHaveBeenCalled.once();

      // Ska ha flyttat valdmarkeringen och aktivt element.
      expect(options[i + 1].getAttribute('aria-selected')).toBe('');
      expect(options[i].getAttribute('aria-selected')).toBe('true');

      expect(doc.list.getAttribute('aria-activedescendant')).toBe(
        options[i].id
      );
    }
  });

  it('ignorerar Skift+mellanslag (enkelval)', () => {
    const options = doc.list.children;
    options[0].setAttribute('aria-selected', 'true');
    fixture.attach(doc.list);

    // Simulera att användaren trycker på mellanslagstangenten.
    doc.list.triggerEvent({ key: ' ', shiftKey: true, type: 'keydown' });

    // Ska inte ha ändrat valdmarkeringen.
    expect(options[0].getAttribute('aria-selected')).toBe('true');
  });

  it('hanterar Ctrl+SkiftHome som Home (enkelval)', () => {
    const options = doc.list.children;
    options[2].setAttribute('aria-selected', 'true');
    fixture.attach(doc.list);

    // Simulera att användaren trycker Ctrl+Skift+Home.
    doc.list.triggerEvent({
      ctrlKey: true,
      key: 'Home',
      shiftKey: true,
      type: 'keydown',
    });

    // Ska ha flyttat fokusmarkeringen.
    expect(options[2].classList.remove).toHaveBeenCalled.once();
    expect(options[0].classList.add).toHaveBeenCalled.once();

    // Ska ha flyttat valdmarkeringen och aktivt element.
    expect(options[2].getAttribute('aria-selected')).toBe('');
    expect(options[0].getAttribute('aria-selected')).toBe('true');

    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[0].id);
  });

  it('hanterar Ctrl+SkiftEnd som End (enkelval)', () => {
    const options = doc.list.children;
    options[2].setAttribute('aria-selected', 'true');
    fixture.attach(doc.list);

    // Simulera att användaren trycker Ctrl+Skift+End.
    doc.list.triggerEvent({
      ctrlKey: true,
      key: 'End',
      shiftKey: true,
      type: 'keydown',
    });

    // Ska ha flyttat fokusmarkeringen.
    const last = options.length - 1;
    expect(options[2].classList.remove).toHaveBeenCalled.once();
    expect(options[last].classList.add).toHaveBeenCalled.once();

    // Ska ha flyttat valdmarkeringen och aktivt element.
    expect(options[2].getAttribute('aria-selected')).toBe('');
    expect(options[last].getAttribute('aria-selected')).toBe('true');

    expect(doc.list.getAttribute('aria-activedescendant')).toBe(
      options[last].id
    );
  });

  it('ignorerar Ctrl+A (enkelval)', () => {
    const options = doc.list.children;
    options[2].setAttribute('aria-selected', 'true');
    fixture.attach(doc.list);

    // Simulera att användaren trycker Ctrl+A.
    doc.list.triggerEvent({ ctrlKey: true, key: 'a', type: 'keydown' });

    // Ska inte ha ändrat någon valdmarkering.
    expect(options[2].getAttribute('aria-selected')).toBe('true');

    expect(options[0].getAttribute('aria-selected')).toBe('');
    expect(options[1].getAttribute('aria-selected')).toBe('');
    expect(options[3].getAttribute('aria-selected')).toBe('');
    expect(options[4].getAttribute('aria-selected')).toBe('');
  });
});

describe('Tangentbordshändelser, flerval', () => {
  it('fokuserar nästa element vid nedåtpil (flerval)', () => {
    const options = doc.list.children;
    makeMultiselectable(doc.list);
    fixture.attach(doc.list);

    for (let i = 1; i < options.length; ++i) {
      // Simulera att användaren trycker på nedåtpil.
      doc.list.triggerEvent({ key: 'ArrowDown', type: 'keydown' });

      // Ska ha flyttat fokusmarkeringen och aktivt element.
      expect(options[i - 1].classList.remove).toHaveBeenCalled.once();
      expect(options[i].classList.add).toHaveBeenCalled.once();

      expect(doc.list.getAttribute('aria-activedescendant')).toBe(
        options[i].id
      );

      // Ska inte ha ändrat valdmarkeringen.
      expect(options[i]['aria-selected']).toBe('false');
    }
  });

  it('fokuserar föregående element vid uppåtpil (flerval)', () => {
    const options = doc.list.children;
    makeMultiselectable(doc.list);
    options[4].setAttribute('aria-selected', 'true');
    fixture.attach(doc.list);

    for (let i = options.length - 2; i >= 0; --i) {
      // Simulera att användaren trycker på uppåtpil.
      doc.list.triggerEvent({ key: 'ArrowUp', type: 'keydown' });

      // Ska ha flyttat fokusmarkeringen och aktivt element.
      expect(options[i + 1].classList.remove).toHaveBeenCalled.once();
      expect(options[i].classList.add).toHaveBeenCalled.once();

      expect(doc.list.getAttribute('aria-activedescendant')).toBe(
        options[i].id
      );

      // Ska inte ha ändrat valdmarkeringen.
      expect(options[i].getAttribute('aria-selected')).toBe('');
    }
    expect(options[4].getAttribute('aria-selected')).toBe('true');
  });

  it('fokuserar första elementet vid Home (flerval)', () => {
    const options = doc.list.children;
    makeMultiselectable(doc.list);
    options[2].setAttribute('aria-selected', 'true');
    fixture.attach(doc.list);

    // Simulera att användaren trycker på Home-tangenten.
    doc.list.triggerEvent({ key: 'Home', type: 'keydown' });

    // Ska ha flyttat fokusmarkeringen och aktivt element.
    expect(options[2].classList.remove).toHaveBeenCalled.once();
    expect(options[0].classList.add).toHaveBeenCalled.once();

    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[0].id);

    // Ska inte ha ändrat valdmarkeringen.
    expect(options[0].getAttribute('aria-selected')).toBe('');
    expect(options[2].getAttribute('aria-selected')).toBe('true');
  });

  it('fokuserar sista elementet vid End (flerval)', () => {
    const options = doc.list.children;
    makeMultiselectable(doc.list);
    options[2].setAttribute('aria-selected', 'true');
    fixture.attach(doc.list);

    // Simulera att användaren trycker på End-tangenten.
    doc.list.triggerEvent({ key: 'End', type: 'keydown' });

    // Ska ha flyttat fokusmarkeringen och aktivt element..
    const last = options.length - 1;
    expect(options[2].classList.remove).toHaveBeenCalled.once();
    expect(options[last].classList.add).toHaveBeenCalled.once();

    expect(doc.list.getAttribute('aria-activedescendant')).toBe(
      options[last].id
    );

    // Ska inte ha ändrat valdmarkeringen.
    expect(options[2].getAttribute('aria-selected')).toBe('true');
    expect(options[last].getAttribute('aria-selected')).toBe('');
  });

  it('fokuserar nästa element som matchar type-ahead (flerval)', () => {
    const options = doc.list.children;
    makeMultiselectable(doc.list);
    fixture.attach(doc.list);

    // Simulera att användaren trycker på T-tangenten.
    // Ska sätta tredje elementet ("Third") som aktivt element, men inte
    // valt.
    doc.list.triggerEvent({ key: 't', type: 'keydown' });

    expect(options[0].classList.remove).toHaveBeenCalled.once();
    expect(options[2].classList.add).toHaveBeenCalled.once();

    expect(options[2]['aria-selected']).toBe('false');

    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[2].id);

    // Simulera att användaren trycker på S-tangenten.
    // Ska sätta andra elementet ("Second") som aktivt element,
    // då inget element börjar med "ts".
    doc.list.triggerEvent({ key: 's', type: 'keydown' });

    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[1].id);

    // Simulera att användaren trycker på X-tangenten.
    // Ska inte flytta fokus (inget element börar med vare sig "sx"
    // eller "x").
    doc.list.triggerEvent({ key: 'x', type: 'keydown' });

    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[1].id);

    // Simulera att användaren nu trycker på "F" och "I" i snabb följd.
    // Ska ha satt femte elementet ("Fifth") som aktivt element.
    doc.list.triggerEvent({ key: 'f', type: 'keydown' });
    doc.list.triggerEvent({ key: 'i', type: 'keydown' });

    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[4].id);

    // Simulera att användaren trycker på R-tangenten.
    // Ska ha börjat om från listans start och satt första elementet
    // ("First") som aktivt element.
    doc.list.triggerEvent({ key: 'r', type: 'keydown' });
    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[0].id);
  });

  it('växlar valdmarkering vid mellanslag (flerval)', () => {
    const options = doc.list.children;
    makeMultiselectable(doc.list);
    fixture.attach(doc.list);

    // Simulera att användaren trycker på mellanslagtangenten.
    doc.list.triggerEvent({ key: ' ', type: 'keydown' });

    // Ska inte ha flyttat fokusmarkeringen eller aktivt element.
    expect(options[0].classList.remove).toHaveBeenCalled.never();

    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[0].id);

    // Ska ha växlat valdmarkeringen.
    expect(options[0].getAttribute('aria-selected')).toBe('true');

    // Simulera att användaren trycker på mellanslagtangenten igen.
    // Ska växla valdmarkeringen tillbaka till omarkerad.
    doc.list.triggerEvent({ key: ' ', type: 'keydown' });
    expect(options[0].getAttribute('aria-selected')).toBe('false');
  });

  it('fokuserar och växlar nästa element vid Skift+nedåtpil (flerval)', () => {
    const options = doc.list.children;
    makeMultiselectable(doc.list);
    fixture.attach(doc.list);

    // Simulera att användaren trycker på Skift+nedåtpil.
    doc.list.triggerEvent({
      key: 'ArrowDown',
      shiftKey: true,
      type: 'keydown',
    });

    // Ska ha flyttat fokusmarkeringen och aktivt element.
    expect(options[0].classList.remove).toHaveBeenCalled.once();
    expect(options[1].classList.add).toHaveBeenCalled.once();

    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[1].id);

    // Ska ha ändrat valdmarkeringen i andra elementet.
    expect(options[1].getAttribute('aria-selected')).toBe('true');
  });

  it('fokuserar och växlar föregående element vid Skift+uppåtpil (flerval)', () => {
    const options = doc.list.children;
    makeMultiselectable(doc.list);
    options[1].setAttribute('aria-selected', 'true');
    fixture.attach(doc.list);

    // Simulera att användaren trycker på Skift+uppåtpil.
    doc.list.triggerEvent({
      key: 'ArrowUp',
      shiftKey: true,
      type: 'keydown',
    });

    // Ska ha flyttat fokusmarkeringen och aktivt element.
    expect(options[1].classList.remove).toHaveBeenCalled.once();
    expect(options[0].classList.add).toHaveBeenCalled.once();

    expect(doc.list.getAttribute('aria-activedescendant')).toBe(options[0].id);

    // Ska ha ändrat valdmarkeringen i första elementet.
    expect(options[0].getAttribute('aria-selected')).toBe('true');
  });

  it('väljer serie av element vid Skift+mellanslag (flerval)', () => {
    const options = doc.list.children;
    makeMultiselectable(doc.list);
    options[1].setAttribute('aria-selected', 'true');
    fixture.attach(doc.list);

    // Simulera att användaren trycker på nedåtpil två gånger och sedan på
    // Skift+mellanslag.
    doc.list.triggerEvent({ key: 'ArrowDown', type: 'keydown' });
    doc.list.triggerEvent({ key: 'ArrowDown', type: 'keydown' });
    doc.list.triggerEvent({ key: ' ', shiftKey: true, type: 'keydown' });

    // Ska ha satt valdmarkeringen för tredje och fjärde elementet.
    expect(options[2].getAttribute('aria-selected')).toBe('true');
    expect(options[3].getAttribute('aria-selected')).toBe('true');

    expect(options[0].getAttribute('aria-selected')).toBe('');
    expect(options[4].getAttribute('aria-selected')).toBe('');
  });

  it('väljer serie av element vid Ctrl+Skift+Home (flerval)', () => {
    const options = doc.list.children;
    makeMultiselectable(doc.list);
    fixture.attach(doc.list);

    // Simulera att användaren trycker på nedåtpil två gånger och sedan på
    // Ctrl+Skift+Home.
    doc.list.triggerEvent({ key: 'ArrowDown', type: 'keydown' });
    doc.list.triggerEvent({ key: 'ArrowDown', type: 'keydown' });
    doc.list.triggerEvent({
      ctrlKey: true,
      key: 'Home',
      shiftKey: true,
      type: 'keydown',
    });

    // Ska ha satt valdmarkeringen för första till tredje elementet.
    expect(options[0].getAttribute('aria-selected')).toBe('true');
    expect(options[1].getAttribute('aria-selected')).toBe('true');
    expect(options[2].getAttribute('aria-selected')).toBe('true');

    expect(options[3].getAttribute('aria-selected')).toBe('');
    expect(options[4].getAttribute('aria-selected')).toBe('');
  });

  it('väljer serie av element vid Ctrl+Skift+End (flerval)', () => {
    const options = doc.list.children;
    makeMultiselectable(doc.list);
    fixture.attach(doc.list);

    // Simulera att användaren trycker på nedåtpil två gånger och sedan på
    // Ctrl+Skift+End.
    doc.list.triggerEvent({ key: 'ArrowDown', type: 'keydown' });
    doc.list.triggerEvent({ key: 'ArrowDown', type: 'keydown' });
    doc.list.triggerEvent({
      ctrlKey: true,
      key: 'End',
      shiftKey: true,
      type: 'keydown',
    });

    // Ska ha satt valdmarkeringen för tredje till femte elementet.
    expect(options[2].getAttribute('aria-selected')).toBe('true');
    expect(options[3].getAttribute('aria-selected')).toBe('true');
    expect(options[4].getAttribute('aria-selected')).toBe('true');

    expect(options[0].getAttribute('aria-selected')).toBe('');
    expect(options[1].getAttribute('aria-selected')).toBe('');
  });

  it('väljer alla/inga element vid Ctrl+A (flerval)', () => {
    const options = doc.list.children;
    const selected = (o, v) => v === o.getAttribute('aria-selected');
    makeMultiselectable(doc.list);
    fixture.attach(doc.list);

    // Simulera att användaren trycker på Ctrl+A.
    doc.list.triggerEvent({ ctrlKey: true, key: 'a', type: 'keydown' });

    // Ska ha satt valdmarkeringen på alla element.
    expect(options.every((o) => selected(o, 'true'))).toBe(true);

    // Simulera att användaren trycker på Ctrl+A igen.
    doc.list.triggerEvent({ ctrlKey: true, key: 'a', type: 'keydown' });

    // Ska ha tagit bort valdmarkeringen från alla element.
    expect(options.every((o) => selected(o, 'false'))).toBe(true);
  });
});

// Importera beroenden.
import { Listbox } from '../../js/view/Listbox.js';
import { beforeEach, describe, expect, mock, it } from '../functions.js';

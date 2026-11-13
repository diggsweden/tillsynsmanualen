/**
 * Enhetstestfall för villkorshantering i vyer.
 *
 * @license CC-BY 4.0
 * @see ViewCondition
 */

class FakeMutationObserver {
  #cb;
  #target;

  constructor(callback) {
    this.#cb = (list) => callback(list);
  }

  disconnect() {
    this.#target?.unsubscribe(this);
    this.#target = null;
  }

  observe(target, options) {
    this.#target = target;
    target.subscribe(this);
  }

  trigger(recs) {
    this.#cb(recs);
  }

  static attributes(attributeName, target) {
    return [{ attributeName, target, type: 'attributes' }];
  }

  static childList(target, addedNodes = null, removedNodes = null) {
    const recs = [];
    const type = 'childList';
    addedNodes && recs.push({ addedNodes, target, type });
    removedNodes && recs.push({ removedNodes, target, type });
    return recs;
  }
}

let classRef;
let condition;
let element;
let field;
let form;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  classRef = mock.element(
    'article',
    { obs: new Set() },
    {
      notify: (recs) => classRef.obs.forEach((o) => o.trigger(recs)),
      subscribe: (obs) => classRef.obs.add(obs),
      unsubscribe: (obs) => classRef.obs.delete(obs),
    }
  );

  element = mock.element('p');

  form = mock.eventTarget(
    'form',
    {
      bar: mock.input('text', 'bar'),
      foo: mock.input('text', 'foo'),
      obs: new Set(),
    },
    {
      notify: (recs) => form.obs.forEach((o) => o.trigger(recs)),
      querySelectorAll: () => [element],
      subscribe: (obs) => form.obs.add(obs),
      unsubscribe: (obs) => form.obs.delete(obs),
    }
  );

  field = mock.input('text');

  condition = new ViewCondition(FakeMutationObserver);
});

describe('Villkor baserade på refererade klasser', () => {
  it('döljer element om refererad klass är C1 eller C2', () => {
    classRef.classList.add('C1');
    element.dataset = { hidden: 'class=C1/C2' };
    condition.observe(form, classRef);
    expect(element.hidden).toBe(true);

    classRef.classList.replace('C1', 'C2');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.hidden).toBe(true);

    classRef.classList.remove('C2');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.hidden).toBe(false);

    classRef.classList.add('C3');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.hidden).toBe(false);

    condition.disconnect();
  });

  it('avaktiverar element om refererad klass är C1 eller C2', () => {
    classRef.classList.add('C1');
    element.dataset = { disabled: 'class=C1/C2' };
    condition.observe(form, classRef);
    expect(element.disabled).toBe(true);

    classRef.classList.replace('C1', 'C2');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.disabled).toBe(true);

    classRef.classList.remove('C2');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.disabled).toBe(false);

    classRef.classList.add('C3');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.disabled).toBe(false);

    condition.disconnect();
  });

  it('gör element obligatoriskt om refererad klass är C1 eller C2', () => {
    classRef.classList.add('C1');
    element.dataset = { required: 'class=C1/C2' };
    condition.observe(form, classRef);
    expect(element.required).toBe(true);

    classRef.classList.replace('C1', 'C2');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.required).toBe(true);

    classRef.classList.remove('C2');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.required).toBe(false);

    classRef.classList.add('C3');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.required).toBe(false);

    condition.disconnect();
  });

  it('döljer element om refererad klass inte är C1 eller C2', () => {
    classRef.classList.add('C1');
    element.dataset = { hidden: 'class!=C1,C2' };
    condition.observe(form, classRef);
    expect(element.hidden).toBe(false);

    classRef.classList.replace('C1', 'C2');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.hidden).toBe(false);

    classRef.classList.remove('C2');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.hidden).toBe(true);

    classRef.classList.add('C3');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.hidden).toBe(true);

    condition.disconnect();
  });

  it('avaktiverar element om refererad klass inte är C1 eller C2', () => {
    classRef.classList.add('C1');
    element.dataset = { disabled: 'class!=C1,C2' };
    condition.observe(form, classRef);
    expect(element.disabled).toBe(false);

    classRef.classList.replace('C1', 'C2');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.disabled).toBe(false);

    classRef.classList.remove('C2');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.disabled).toBe(true);

    classRef.classList.add('C3');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.disabled).toBe(true);

    condition.disconnect();
  });

  it('gör element obligatoriskt om refererad klass inte är C1 eller C2', () => {
    classRef.classList.add('C1');
    element.dataset = { required: 'class!=C1,C2' };
    condition.observe(form, classRef);
    expect(element.required).toBe(false);

    classRef.classList.replace('C1', 'C2');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.required).toBe(false);

    classRef.classList.remove('C2');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.required).toBe(true);

    classRef.classList.add('C3');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.required).toBe(true);

    condition.disconnect();
  });
});

describe('Villkor baserade på fältvärden', () => {
  // Testa med radiogrupper
  it('döljer element om styrande fältvärde är X eller Y', () => {
    form.foo.value = 'X';
    element.dataset = { hidden: 'field:foo=X/Y' };
    condition.observe(form);
    expect(element.hidden).toBe(true);

    form.foo.value = 'Y';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.hidden).toBe(true);

    form.foo.value = '';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.hidden).toBe(false);

    form.foo.value = 'Z';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.hidden).toBe(false);

    condition.disconnect();
  });

  it('avaktiverar element om styrande fältvärde är X eller Y', () => {
    form.foo.value = 'X';
    element.dataset = { disabled: 'field:foo=X/Y' };
    condition.observe(form);
    expect(element.disabled).toBe(true);

    form.foo.value = 'Y';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.disabled).toBe(true);

    form.foo.value = '';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.disabled).toBe(false);

    form.foo.value = 'Z';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.disabled).toBe(false);

    condition.disconnect();
  });

  it('gör element obligatoriskt om styrande fältvärde är X eller Y', () => {
    form.foo.value = 'X';
    element.dataset = { required: 'field:foo=X/Y' };
    condition.observe(form);
    expect(element.required).toBe(true);

    form.foo.value = 'Y';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.required).toBe(true);

    form.foo.value = '';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.required).toBe(false);

    form.foo.value = 'Z';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.required).toBe(false);

    condition.disconnect();
  });

  it('döljer element om styrande fältvärde inte är X eller Y', () => {
    form.foo.value = 'X';
    element.dataset = { hidden: 'field:foo!=X,Y' };
    condition.observe(form);
    expect(element.hidden).toBe(false);

    form.foo.value = 'Y';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.hidden).toBe(false);

    form.foo.value = '';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.hidden).toBe(true);

    form.foo.value = 'Z';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.hidden).toBe(true);

    condition.disconnect();
  });

  it('avaktiverar element om styrande fältvärde inte är X eller Y', () => {
    form.foo.value = 'X';
    element.dataset = { disabled: 'field:foo!=X,Y' };
    condition.observe(form);
    expect(element.disabled).toBe(false);

    form.foo.value = 'Y';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.disabled).toBe(false);

    form.foo.value = '';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.disabled).toBe(true);

    form.foo.value = 'Z';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.disabled).toBe(true);

    condition.disconnect();
  });

  it('gör element obligatoriskt om styrande fältvärde inte är X eller Y', () => {
    form.foo.value = 'X';
    element.dataset = { required: 'field:foo!=X,Y' };
    condition.observe(form);
    expect(element.required).toBe(false);

    form.foo.value = 'Y';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.required).toBe(false);

    form.foo.value = '';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.required).toBe(true);

    form.foo.value = 'Z';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.required).toBe(true);

    condition.disconnect();
  });
});

describe('Kombinerade villkor', () => {
  it('döljer element om klass är C1/C2 och värde 1 är X och värde 2 Y/Z', () => {
    classRef.classList.add('C1');
    classRef.classList.add('C2');
    form.foo.value = 'X';
    form.bar.value = 'Z';
    element.dataset = { hidden: 'class=C1/C2;field:foo=X;field:bar=Y/Z' };
    condition.observe(form, classRef);
    expect(element.hidden).toBe(true);
  });

  it('döljer element om klass är C1/C2 och värde 1 är X och värde 2 Y/Z', () => {
    element.dataset = { hidden: 'class=C1/C2;field:foo=X;field:bar=Y/Z' };
    condition.observe(form, classRef);
    expect(element.hidden).toBe(false);

    classRef.classList.add('C2');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.hidden).toBe(false);

    form.foo.value = 'X';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.hidden).toBe(false);

    form.bar.value = 'Y';
    form.triggerEvent({ type: 'change', target: form.bar });
    expect(element.hidden).toBe(true);
  });

  it("inverterar hela villkoret om det inleds med '!'", () => {
    classRef.classList.add('C');
    element.dataset = { hidden: '!class=C;field:foo=X/Y' };
    condition.observe(form, classRef);
    expect(element.hidden).toBe(true);

    form.foo.value = 'X';
    form.triggerEvent({ type: 'change', target: form.foo });
    expect(element.hidden).toBe(false);

    classRef.classList.remove('C');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.hidden).toBe(true);
  });
});

describe('Förändringar i DOM-trädet', () => {
  it('hanterar tillagt element med villkor', () => {
    classRef.classList.add('C');
    condition.observe(form, classRef);

    const attr = { dataset: { required: 'class=C' } };
    const added = mock.input('text', 'new', '', attr);
    form.notify(FakeMutationObserver.childList(form, [added]));
    expect(added.required).toBe(true);

    classRef.classList.remove('C');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(added.required).toBe(false);
  });

  it('ändrar inte borttaget element med villkor', () => {
    classRef.classList.add('C');
    element.dataset.hidden = 'class=C';
    condition.observe(form, classRef);
    expect(element.hidden).toBe(true);

    form.notify(FakeMutationObserver.childList(form, null, [element]));

    classRef.classList.remove('C');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.hidden).toBe(true);
  });

  it('hanterar tillägg av filter på befintligt element', () => {
    classRef.classList.add('C');
    form.foo.dataset.hidden = 'class=C';
    form.querySelectorAll = () => [form.foo];
    condition.observe(form, classRef);
    expect(form.foo.hidden).toBe(true);
    expect(form.foo.disabled).toBe(false);

    form.foo.dataset.disabled = 'class=C';
    form.notify(FakeMutationObserver.attributes('class', form.foo));
    expect(form.foo.disabled).toBe(true);
  });

  it('hanterar ändring av filter på befintligt element', () => {
    classRef.classList.add('C1');
    element.dataset.hidden = 'class=C1';
    condition.observe(form, classRef);
    expect(element.hidden).toBe(true);

    element.dataset.hidden = 'class=C2';
    form.notify(FakeMutationObserver.attributes('class', element));
    expect(element.hidden).toBe(false);

    classRef.classList.replace('C1', 'C2');
    classRef.notify(FakeMutationObserver.attributes('class', classRef));
    expect(element.hidden).toBe(true);
  });

  it('hanterar borttag av filter på befintligt element', () => {
    classRef.classList.add('C');
    element.dataset.hidden = 'class=C';
    condition.observe(form, classRef);
    expect(element.hidden).toBe(true);

    element.dataset.hidden = null;
    form.notify(FakeMutationObserver.attributes('class', element));
    expect(element.hidden).toBe(false);
  });

  it('forcerar tillämpning av filter', () => {
    element.dataset.hidden = 'field:foo=X';
    condition.observe(form, classRef);
    expect(element.hidden).toBe(false);

    form.foo.value = 'X';
    expect(element.hidden).toBe(false);

    condition.apply();
    expect(element.hidden).toBe(true);
  });
});

// Importera beroenden.
import { ViewCondition } from '../../js/view/ViewCondition.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

/**
 * Villkorsstyrning av element.
 *
 * Klassen hanterar en behållares underordnade element med något av följande
 * attribut:
 * - data-disabled: hanterar elementens `disabled`-attribut
 * - data-hidden:   hanterar elementens `hidden`-attribut
 * - data-required: hanterar elementens `required`-attribut.
 *
 * Data-attributets värde är en semikolonseparerad lista av villkor som styr
 * målattributet. Det finns två villkorstyper:
 * - class  matchar ett angivet elements `class`-attribut
 * - field  matchar ett angivet formulärfälts `value`-attribut.
 *
 * Villkorslistan kan innehålla högst ett `class`-villkor.
 *
 * Villkorsvärdena är alternativ åtskilda av '/', där varje alternativ är en
 * kommaseparerad lista av värden. Villkoret matchar om samtliga kommaseparerade
 * värden i något alternativ matchar.
 *
 * En operator mellan villkorstypen och villkorslistan styr matchningen:
 * - =  innebär att något alternativ ska vara lika med den styrande typen
 * - != innebär att inget värde ska vara lika med den styrande typen.
 *
 * Det är inte meningsfullt att ha multipla värden per alternativ med "=" för
 * `field`-villkor, eftersom klassen inte har stöd för `<select>` med attributet
 * `multiple`).
 *
 * Det är knappast heller meningsfullt att ha flera alternativ med "!=", då ett
 * sådant villkor alltid är uppfyllt. Villkoret "field:type!=A/B" är uppfyllt om
 * `type.value` är A (skilt från B), B (skilt från A) eller något annat (skilt
 * från A och B).
 *
 * @example
 * data-hidden="class=foo"      // dölj om refererat element har klass "foo"
 * data-hidden="class=foo/bar"  // dölj om r.e. har klass "foo" eller "bar"
 * data-hidden="class!=foo"     // dölj om r.e. inte har klass "foo"
 * data-hidden="class!=foo,bar" // dölj om r.e. varken har kl. "foo" eller "bar"
 *
 * data-disabled="field:foo=bar/baz"  // om foo:s värde är "bar" eller "baz"
 * data-disabled="field:foo!=bar,baz" // om värdet varken är "bar" eller "baz"
 *
 * data-required="class!=C;foo=X/Y;bar!=Y,Z"
 *   // obligatoriskt om refererat element inte har klass "C"
 *   // och foo:s värde är antingen "X" eller "Y"
 *   // och bar:s värde är varken "Y" eller "Z"
 *
 * @license CC-BY 4.0
 */
export class ViewCondition {
  // Privata fält.
  #classRef;
  #container;
  #fields = new Set();
  #form;
  #listener;
  #observerClass;
  #observers = {};
  #targets = new Map();

  /**
   * Konstruera en villkorsstyrningsinstans.
   *
   * @param {class} [obs] Observatörsklass vid emhetstester.
   */
  constructor(obs = MutationObserver) {
    this.#observerClass = obs;
  }

  /**
   * Forcerad tillämpning av villkoren.
   *
   * Används till exempel när en vy sätter ett fältvärde utan att det utlöser
   * en `change`-händelse.
   */
  apply() {
    const cl = this.#classRef?.classList;
    for (const [, conditions] of this.#targets) {
      conditions.forEach((c) => c.apply(cl, this.#form));
    }
  }

  /**
   * Frigör observatörer och händelselyssnare.
   */
  disconnect() {
    const obs = this.#observers;
    obs.container?.disconnect();
    obs.classRef?.disconnect();

    this.#listener && this.#form.removeEventListener('change', this.#listener);
  }

  /**
   * Börja observera förändringar som påverkar villkoren.
   *
   * Behållarelementet är det element i vilket klassen söker efter villkors-
   * styrda element. Om något villkor är av typen "field" måste antingen
   * behållaren vara ett `<form>`-element som innehåller de refererade fälten,
   * eller också måste formuläret anges i tredje parametern.
   *
   * Andra parametern måste vara ett element om något villkor är av typen
   * "class". Parametern anger då det element vars `class`-attribut villkoret
   * utvärderas mot.
   *
   * @param {HTMLElement}     container  Behållarelement.
   * @param {HTMLElement}     [classRef] Refererat element för `class`.
   * @param {HTMLFormElement} [form]     Formulär om ej behållaren.
   */
  observe(container, classRef = null, form = container) {
    this.#container = container;
    this.#classRef = classRef;
    this.#form = form;

    this.#setUp();
  }

  /**
   * Hantera villkorsstyrda dokument som läggs till i behållaren.
   *
   * @private
   * @param {NodeList} nodes Tillagda noder.
   */
  #addElements(nodes) {
    const attrs = ['disabled', 'hidden', 'required'];
    let cls = false;
    let field = false;
    const attr = (e, a, c) => e.dataset[a] && c.push(cond(e, a));
    const cond = (e, a) => new Condition(e, a);
    const data = (n, p) => n.dataset[p];
    const element = (n) => Node.ELEMENT_NODE === n.nodeType;
    const isCond = (n) => attrs.some((p) => data(n, p));

    for (const node of nodes ?? []) {
      if (element(node) && isCond(node)) {
        const conditions = [];
        attr(node, 'disabled', conditions);
        attr(node, 'hidden', conditions);
        attr(node, 'required', conditions);
        cls ||= conditions.some((c) => c.isClass);
        conditions.forEach((c) => {
          c.fields.forEach((t) => this.#fields.add(t));
          field = true;
        });
        this.#targets.set(node, conditions);

        for (const c of conditions) {
          c.apply(this.#classRef?.classList, this.#form);
        }
      }
    }

    const inst = (c) => new this.#observerClass(c);
    const obs = this.#observers;
    if (cls && !obs.classRef) {
      obs.classRef = inst((r) => this.#onAttributes(r));
      obs.classRef.observe(this.#classRef, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    if (field && !this.#listener) {
      this.#listener = (ev) => this.#onChange(ev);
      this.#form.addEventListener('change', this.#listener);
    }
  }

  /**
   * Hantera tillägg och borttag av noder i behållaren.
   *
   * @private
   * @param {MutationRecord} record Ändringsinformation.
   */
  #addOrRemoveElements(record) {
    this.#addElements(record.addedNodes);
    this.#removeElements(record.removedNodes);
  }

  /**
   * Hantera ändring av villkorsattribut på ett befintligt element.
   *
   * @private
   * @param {MutationRecord} record Ändringsinformation.
   */
  #changeAttribute(record) {
    this.#targets.delete(record.target);
    this.#addElements([record.target]);

    for (const attr of ['disabled', 'hidden', 'required']) {
      if (null == record.target.dataset[attr]) {
        record.target[attr] = false;
      }
    }
  }

  /**
   * Hantera förändringar av klassattributet på refererat element.
   *
   * @private
   * @param {MutationRecord[]} records Förändringar av attributvärde.
   * @throws {ReferenceError} Inget refererande element för `class` angivet.
   */
  #onAttributes(records) {
    const cl = this.#classRef.classList;
    for (const record of records) {
      if ('class' !== record.attributeName) continue;

      for (const [, conditions] of this.#targets) {
        conditions.forEach((c) => c.apply(cl, this.#form));
      }
    }
  }

  /**
   * Hantera ändrar av fältvärden i formuläret.
   *
   * @private
   * @param {Event} event Händelseinformation.
   */
  #onChange(event) {
    const cl = this.#classRef?.classList;
    for (const [, conditions] of this.#targets) {
      conditions.forEach((c) => c.apply(cl, this.#form));
    }
  }

  /**
   * Hantera förändringar i behållarens innehåll.
   *
   * Om ett befintligt element får, förlorar eller ändrar ett
   * villkorsattribut, hantera det.
   * Om ett tillagt elemment är villkorsstyrt, lägg till hantering av det.
   * Om ett borttaget element var villkorsstyrt, ta bort hanteringen.
   *
   * @private
   * @param {MutationRecord[]} records Förändringar i strukturen.
   */
  #onDOMChange(records) {
    const cl = this.#classRef.classList;
    for (const record of records) {
      ({
        attributes: (r) => this.#changeAttribute(r),
        childList: (r) => this.#addOrRemoveElements(r),
      })[record.type]?.(record);
    }
  }

  /**
   * Ta bort hantering av element som raderas ur behållaren.
   *
   * @private
   * @param {NodeList} nodes Borttagna noder.
   */
  #removeElements(nodes) {
    const attrs = ['disabled', 'hidden', 'required'];
    const data = (n, p) => n.dataset[p];
    const element = (n) => Node.ELEMENT_NODE === n.nodeType;
    const isCond = (n) => attrs.some((p) => data(n, p));

    for (const node of nodes ?? []) {
      if (element(node) && isCond(node)) {
        this.#targets.delete(node);
      }
    }
  }

  /**
   * Identifiera villkorsstyrda element och skapa bevakningar.
   *
   * @private
   */
  #setUp() {
    const attr = (e, a, c) => e.dataset[a] && c.push(cond(e, a));
    let cls = false;
    const cond = (e, a) => new Condition(e, a);
    const fields = this.#fields;
    const selector = '[data-disabled],[data-hidden],[data-required]';
    this.#container.querySelectorAll(selector).forEach((element) => {
      const conditions = [];
      attr(element, 'disabled', conditions);
      attr(element, 'hidden', conditions);
      attr(element, 'required', conditions);

      cls ||= conditions.some((c) => c.isClass);
      conditions.forEach((c) => c.fields.forEach((t) => fields.add(t)));
      conditions.length && this.#targets.set(element, conditions);

      for (const c of conditions) {
        c.apply(this.#classRef?.classList, this.#form);
      }
    });

    const inst = (c) => new this.#observerClass(c);
    const obs = this.#observers;
    obs.container = inst((r) => this.#onDOMChange(r));
    obs.container.observe(this.#container, {
      attributes: true,
      attributeFilter: ['data-disabled', 'data-hidden', 'data-required'],
      childList: true,
      subtree: true,
    });

    if (cls) {
      obs.classRef = inst((r) => this.#onAttributes(r));
      obs.classRef.observe(this.#classRef, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    if (fields.size) {
      this.#listener = (ev) => this.#onChange(ev);
      this.#form.addEventListener('change', this.#listener);
    }
  }
}

/**
 * Representerar ett villkor i ett data-attribut.
 *
 * @see ViewCondition
 * @property {boolean}  isClass Villkor för refererat elements `class`-attribut?
 * @property {string[]} fields  Refererade fältnamn.
 */
class Condition {
  // Privata fält.
  #class = false;
  #classes;
  #classCmp;
  #element;
  #fields = [];
  #invert;
  #property;

  /**
   * Konstruera en villkorsinstans.
   *
   * @param {HTMLElement} element  Villkorsstyrt element.
   * @param {string}      property Elementegenskap som styrs av villkoret.
   */
  constructor(element, property) {
    this.#element = element;
    this.#property = property;

    let condition = element.dataset[property];
    this.#invert = condition.startsWith('!');
    this.#invert && (condition = condition.slice(1));

    for (const cond of condition.split(';')) {
      this.#parseCondition(cond);
    }
  }

  /**
   * Tillämpa villkoren.
   *
   * @param {(DOMTokenList|null)} classList Refererat elements klasser.
   * @param {HTMLFormElement}     form      Formulär med refererade fält.
   */
  apply(classList, form) {
    let match = true;
    if (this.isClass && classList) {
      const compare = (c) => this.#classCmp(classList, c);
      match = this.#classes.some((arr) => arr.every(compare));
    }

    for (const { field, compare, values } of this.#fields) {
      if (!match) break;
      const cmp = (c) => compare(c, value);
      const value = form[field]?.value;
      match &&= values.some((arr) => arr.every(cmp));
    }

    this.#element[this.#property] = this.#invert ? !match : match;
  }

  // Åtkomstmetod för refererade fältnamn.
  get fields() {
    return this.#fields.map(({ field }) => field);
  }

  // Åtkomstmetod för flagga för refererat `class`-attribut.
  get isClass() {
    return this.#class;
  }

  /**
   * Tolka alternativa värden åtskilda av '/'.
   *
   * @example
   * #parseAlternatives("a,b/c") // [["a", "b"], ["c"]]
   *
   * @private
   * @param {string} values Värden.
   * @return {string[][]} En vektor med alternativ av värdevektorer.
   */
  #parseAlternatives(values) {
    return values.split('/').map((alt) => alt.split(','));
  }

  /**
   * Tolka ett klassvillkorsuttryck.
   *
   * @private
   * @param {string} oper     Jämförelseoperator ("=" eller "!=").
   * @param {string} valueStr Värden.
   */
  #parseClassCondition(oper, valueStr) {
    this.#class = true;
    this.#classCmp =
      {
        '=': (cl, c) => cl.contains(c),
        '!=': (cl, c) => !cl.contains(c),
      }[oper] ?? (() => false);
    this.#classes = this.#parseAlternatives(valueStr);
  }

  /**
   * Tolka ett villkorsuttryck.
   *
   * @private
   * @param {string} expr Villkorsuttryck att tolka.
   */
  #parseCondition(expr) {
    const matches = /^\s*(class|field:(\w+))\s*(!?=)(.+)*/.exec(expr);
    if (!matches) return;
    ({
      class: (m) => this.#parseClassCondition(m[3], m[4]),
      field: (m) => this.#parseFieldCondition(m[2], m[3], m[4]),
    })[matches[1].split(':', 1)]?.(matches);
  }

  /**
   * Tolka ett fältvillkorsuttryck.
   *
   * @private
   * @param {string} field    Refererat fältnamn.
   * @param {string} oper     Jämförelseoperator ("=" eller "!=").
   * @param {string} valueStr Värden.
   */
  #parseFieldCondition(field, oper, valueStr) {
    const compare =
      {
        '=': (a, b) => a === b,
        '!=': (a, b) => a !== b,
      }[oper] ?? (() => false);
    const values = this.#parseAlternatives(valueStr);
    this.#fields.push({ field, compare, values });
  }
}

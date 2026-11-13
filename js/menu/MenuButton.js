/**
 * En knapp som öppnar en meny.
 *
 * @license CC-BY 4.0
 */
export class MenuButton {
  // Privata fält.
  #button;
  #menu;

  /**
   * Konstruera en menyknappsinstans.
   *
   * @param {HTMLElement} parent Överordnat element i DOM-trädet.
   * @param {string}      label  Knapptext.
   * @param {Menu}        menu   Menyn som knappen ska visa/dölja.
   * @param {Document}    [doc]  DOM-dokument vid enhetstester.
   */
  constructor(parent, label, menu, doc = document) {
    const button = doc.createElement('button');
    this.#button = button;
    this.#menu = menu;
    button.id = `${menu.id ?? 'menu'}-button`;
    button.type = 'button';
    button.textContent = String(label);
    button.setAttribute('aria-haspopup', 'menu');
    menu.id && button.setAttribute('aria-controls', menu.id);
    parent.insertBefore(button, parent.firstChild);

    menu.labelledBy = button.id;

    const listen = (e, t, l) => e.addEventListener(t, l);
    listen(button, 'click', (event) => this.#onButtonMouse(event));
    listen(button, 'keydown', (event) => this.#onButtonKey(event));
    listen(doc.body, 'click', (event) => this.#close());
    menu.addObserver((event) => this.#onMenuEvent(event));
  }

  /**
   * Stäng menyn.
   *
   * @private
   * @return {boolean} `true` för att händelsen hanterats.
   */
  #close() {
    this.#button.removeAttribute('aria-expanded');
    return true;
  }

  /**
   * Hantera tangenttryck i knappelementet.
   *
   * @private
   * @param {Event} event Händelseinformation.
   */
  #onButtonKey(event) {
    const key = event.key.trim() || event.code;
    const handler = {
      ArrowDown: () => this.#open(() => this.#menu.firstItem),
      ArrowUp: () => this.#open(() => this.#menu.lastItem),
      Enter: () => this.#toggleExpandedState(true),
      Escape: () => this.#close(),
      Space: () => this.#toggleExpandedState(true),
    }[key];

    if (handler) {
      event.preventDefault();
      event.stopPropagation();
      handler();
    }
  }

  /**
   * Hantera musklick i knappelementet.
   *
   *
   * @private
   * @param {Event} event Händelseinformation.
   */
  #onButtonMouse(event) {
    event.preventDefault();
    event.stopPropagation();
    this.#toggleExpandedState();
  }

  /**
   * Hantera händelser i menyn.
   *
   * @private
   * @param {Event} event Händelseinformation.
   */
  #onMenuEvent(event) {
    const handler = {
      close: () => this.#close(),
    }[event.type];
    return handler?.() ?? false;
  }

  /**
   * Öppna menyn och fokusera angivet element.
   *
   * @private
   * @param {callback} focus Funktion som returnerar element att fokusera.
   */
  #open(focus) {
    if (!this.#button.hasAttribute('aria-expanded')) {
      this.#button.setAttribute('aria-expanded', 'true');
      focus()?.focus();
    }
  }

  /**
   * Växlar mellan utfällt och hopfällt tillstånd.
   *
   * @private
   * @param {boolean} [focusFirst] Fokusera första elementet vid utfällt?
   */
  #toggleExpandedState(focusFirst = false) {
    if (this.#button.hasAttribute('aria-expanded')) {
      this.#close();
    } else {
      this.#open(() => (focusFirst ? this.#menu.firstItem : null));
    }
  }
}

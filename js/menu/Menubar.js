/**
 * En horisontell menyrad.
 *
 * @license CC-BY 4.0
 */
export class Menubar extends Menu {
  // Privata fält.
  #id = Symbol();

  /**
   * Konstruera en menyradsinstans.
   *
   * @param {HTMLElement} element Underliggande HTML-element.
   */
  constructor(element) {
    super(element, null);
    this._orientation = 'horizontal';
    element.setAttribute('role', 'menubar');
  }

  // Ersatta åtkomstmetoder för aktivt menyelement.
  get current() {
    return super.current;
  }

  set current(item) {
    this.current && (this.current.focusable = false);
    super.current = item;
    this.current.focusable = true;
  }

  /**
   * @inheritDoc
   * @override
   */
  down(ref) {
    if (ref.submenu) {
      return ref.open().firstItem?.focus();
    }
    return this;
  }

  /**
   * @inheritDoc
   * @override
   */
  handleLeft(ref) {
    const top = ref.closeAll();
    const prev = this.previousItem(top);
    prev.submenu && prev.open();
    this.current = prev;
    return prev;
  }

  // Åtkomstmetod för unik identifierare.
  get id() {
    return this.#id;
  }

  /**
   * @inheritDoc
   * @override
   */
  left(ref) {
    ref.submenu && ref.close();
    const prev = this.previousItem(ref);
    this.current = prev;
    return prev;
  }

  /**
   * @inheritDoc
   * @override
   */
  right(ref) {
    ref.submenu && ref.close();
    const next = this.nextItem(ref);
    this.current = next;
    return next;
  }

  /**
   * @inheritDoc
   * @override
   */
  up(ref) {
    if (ref.submenu) {
      return ref.open().lastItem?.focus();
    }
    return this;
  }
}

// Importera beroenden.
import { Menu } from './Menu.js';

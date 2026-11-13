/**
 * Ett element i en meny.
 *
 * @license CC-BY 4.0
 * @property {string}   current    Aktualitet (aria-current).
 * @property {boolean}  focusable  Anger om elementet är fokuserbart med Tabb.
 * @property {string}   href       Underliggande länkelements `href`-attribut.
 * @property {MenuItem} parentItem Överordnat menyelement.
 * @property {Menu}     parentMenu Menyn som innehåller elementet.
 * @property {Menu}     submenu    Undermeny.
 */
export class MenuItem {
  // Privata fält.
  #element;
  #parentItem;
  #parentMenu;
  #submenu;

  /**
   * Konstruera en elementinstans.
   *
   * @param {HTMLElement} element Underliggande HMTL-element.
   * @throws {TypeError}
   */
  constructor(element) {
    element.tabIndex = -1;
    element.setAttribute('role', 'menuitem');
    element.setAttribute('tabindex', '-1');
    this.#element = element;
  }

  /**
   * Aktivera menyelementet.
   *
   * Om elementet är en lövnod, stäng alla överordnade menyer och returnera
   * `null` för att signalera att händelsen inte ska anses som hanterad utan
   * propageras så att den aktiverar länken.
   *
   * Om elementet har en undermeny, öppna den och fokusera och returnera
   * första elementet.
   *
   * @return {(MenuItem|null)} Första underelement om något.
   */
  activate() {
    if (this.#submenu) {
      return this.open().firstItem;
    }
    const item = this.#parentItem?.closeAll();
    return null;
  }

  /**
   * Stäng undermenyn.
   *
   * Stäng även alla eventuella öppna underordnade menyer.
   *
   * @return {MenuItem} Det anropade menyelementet.
   * @throws {TypeError} Elementet har ingen undermeny.
   */
  close() {
    if (this.#submenu) {
      this.#element.setAttribute('aria-expanded', 'false');
      this.#submenu.closeAll();
      return this;
    }
    throw new TypeError('Kan inte stänga: undermeny saknas.');
  }

  /**
   * Stäng undermenyn och överordnade menyer.
   *
   * @return {MenuItem} Det översta menyelementet.
   */
  closeAll() {
    if (this.#submenu) {
      this.#element.setAttribute('aria-expanded', 'false');
      this.#submenu.closeAll();
    }
    if (this.#parentItem) {
      return this.#parentItem.closeAll();
    }
    return this;
  }

  // Åtkomstmetoder för aktualitet.
  get current() {
    return this.#element.hasAttribute('aria-current')
      ? this.#element.getAttribute('aria-current')
      : null;
  }

  set current(value) {
    if (null === value) {
      this.#element.removeAttribute('aria-current');
    } else {
      this.#element.setAttribute('aria-current', String(value));
    }
  }

  /**
   * Sätt tangentbordsfokus till elementet.
   *
   * @return {MenuItem} Det anropade menyelementet.
   */
  focus() {
    this.#element.focus();
    return this;
  }

  // Åtkomstmetoder för fokuserbarhet.
  get focusable() {
    return -1 !== this.#element.tabIndex;
  }

  set focusable(flag) {
    this.#element.tabIndex = flag ? 0 : -1;
    this.#element.setAttribute('tabindex', flag ? '0' : '-1');
  }

  // Åtkomstmetod för underliggande länkelements `href`-attribut.
  get href() {
    return this.#element.getAttribute('href');
  }

  /**
   * Jämför angiven nod med elementets underliggande nod.
   *
   * @param {Node} node Nod att jämföra med.
   * @return {boolean}
   */
  is(node) {
    return node === this.#element;
  }

  /**
   * Öppna och returnera undermenyn.
   *
   * @return {Menu} Undermenyn.
   * @throws {TypeError} Undermeny saknas.
   */
  open() {
    if (this.#submenu) {
      this.#element.setAttribute('aria-expanded', 'true');
      return this.#submenu;
    }
    throw new TypeError('Kan inte öppna: undermeny saknas.');
  }

  // Åtkomstmetoder för överordnat element.
  get parentItem() {
    return this.#parentItem;
  }

  set parentItem(item) {
    this.#parentItem = item;
  }

  // Åtkomstmetoder för föräldramenyn som innehåller elementet.
  get parentMenu() {
    return this.#parentMenu;
  }

  set parentMenu(menu) {
    this.#parentMenu = menu;
    this.#submenu && (this.#submenu.parentMenu = menu);
  }

  /**
   * Returnera om elementets textinnehåll börjar med angiven bokstav.
   *
   * @param {string} char Bokstav att testa mot.
   * @return {boolean}
   */
  startsWith(char) {
    return this.#element.textContent
      .toLowerCase()
      .startsWith(char.toLowerCase());
  }

  // Åtkomstmetoder för undermeny.
  get submenu() {
    return this.#submenu;
  }

  set submenu(menu) {
    this.#submenu = menu;
    if (menu) {
      this.#element.setAttribute('aria-haspopup', 'menu');
      this.#element.setAttribute('aria-expanded', 'false');
      menu.parentItem = this;
      menu.parentMenu = this.#parentMenu;
    } else {
      this.#element.removeAttribute('aria-haspopup');
      this.#element.removeAttribute('aria-expanded');
    }
  }

  /**
   * Växla synlighet på eventuell undermeny.
   *
   * @return {boolean} `true` om elementet har en undermeny, annars `false`.
   */
  toggle() {
    if (this.#submenu) {
      if ('false' === this.#element.getAttribute('aria-expanded')) {
        this.#element.setAttribute('aria-expanded', 'true');
      } else {
        this.#element.setAttribute('aria-expanded', 'false');
        this.#submenu.closeAll();
      }
      return true;
    }
    return false;
  }
}

/**
 * En meny med element.
 *
 * @license CC-BY 4.0
 * @property {MenuItem} current     Aktivt (fokuserat) menyelement.
 * @property {MenuItem} firstItem   Första elementet i menyn.
 * @property {string}   id          `id`-attribut för underliggande element.
 * @property {string}   labelledBy  ID för beskrivande element.
 * @property {MenuItem} lastItem    Sista elementet i menyn.
 * @property {string}   orientation Orientering (vertical/horizontal).
 * @property {MenuItem} parentItem  Föräldraelement.
 * @property {Menu}     parentMenu  Föräldrameny.
 * @property {Menu}     root        Rotmeny.
 */
export class Menu {
  // Skyddade fält.
  _orientation = 'vertical';

  // Privata fält.
  #current = -1;
  #element;
  #id;
  #items = [];
  #observers = [];
  #parentItem;
  #parentMenu;

  /**
   * Konstruera en menyinstans.
   *
   * @param {HTMLElement} element Underliggande HTML-element.
   * @param {string}      label   Maskinläsbar etikett.
   */
  constructor(element, label) {
    element.setAttribute('role', 'menu');
    label && element.setAttribute('aria-label', label);
    this.#element = element;
  }

  /**
   * Lägg till ett menyelement i menyn.
   *
   *
   * @param {MenuItem} item Menyelement att lägga till.
   */
  add(item) {
    this.#items.push(item);
    item.parentItem = this.#parentItem;
    item.parentMenu = this;
    if (-1 === this.#current) {
      this.current = item;
    }
  }

  /**
   * Registrerar en observatör på menyn.
   *
   * Lägg till händelselyssnare på menyelementet och meddela alla registrera-
   * de observatörer när händelser inträffar.
   *
   * @param {callback} observer Observatör att lägga till.
   */
  addObserver(observer) {
    if (0 === this.#observers.length) {
      this.#element.addEventListener('click', (event) => {
        const target = this.#target(event.target);
        const info = { source: this, target, type: 'click' };
        if (this.#notifyObservers(info)) {
          event.preventDefault();
          event.stopPropagation();
        }
      });
      this.#element.addEventListener('keydown', (event) => {
        const key = event.key.trim() || event.code;
        const target = this.#target(event.target);
        const info = { source: this, target, type: 'key', key };
        if (this.#notifyObservers(info)) {
          event.preventDefault();
          event.stopPropagation();
        }
      });
    }
    this.#observers.push(observer);
  }

  /**
   * Stäng alla underordnade menyer.
   *
   * Meddela observatörer om att menyn stängts.
   *
   * @return {MenuItem} Aktuellt element.
   */
  closeAll() {
    this.#items.filter((item) => item.submenu).forEach((item) => item.close());
    this.#notifyObservers({ source: this, type: 'close' });
    return this.#items[this.#current];
  }

  // Åtkomstmetoder för aktivt menyelement.
  get current() {
    return this.#items[this.#current];
  }

  set current(item) {
    if (!this.#parentItem) {
      const index = this.#items.indexOf(item);
      if (-1 !== index) {
        this.#current = index;
      }
    }
  }

  /**
   * Returnera menyelement nedanför det angivna referenselementet.
   *
   * I en vanlig meny är `down()` detsamma som `nextItem()`. Härledda klasser
   * kan dock differentiera dem.
   *
   * @param {MenuItem} ref Referenselement.
   * @return {MenuItem} Nästa element efter referenselementet.
   * @throws {TypeError} Referenselementet ingår inte i menyn.
   */
  down(ref) {
    return this.nextItem(ref);
  }

  // Åtkomstmetod för första menyelementet.
  get firstItem() {
    return this.#items[0];
  }

  /**
   * Hantera navigering med vänsterpil.
   *
   * I en undermeny stängs undermenyn. I en meny under ett element i en meny-
   * rad överlåter basklassen åt menyraden att hantera händelsen.
   *
   * @param {MenuItem} ref Referenselement.
   * @return {MenuItem} Undermenyns förälder, eller föregående rotelement.
   */
  handleLeft(ref) {
    if ('horizontal' === ref.parentItem.parentMenu?.orientation) {
      return ref.parentItem.parentMenu.handleLeft(ref);
    }
    return ref.parentItem.close();
  }

  // Åtkomstmetoder för elementidentitet.
  get id() {
    return this.#element.id;
  }

  set id(value) {
    this.#element.id = String(value);
  }

  // Åtkomstmetoder för ID för beskrivande element.
  get labelledBy() {
    return this.#element.getAttribute('aria-labelledby');
  }

  set labelledBy(id) {
    this.#element.removeAttribute('aria-label');
    this.#element.setAttribute('aria-labelledby', String(id));
  }

  // Åtkomstmetod för sista menyelementet.
  get lastItem() {
    return this.#items[this.#items.length - 1];
  }

  /**
   * Hantera navigering åt vänster från det angivna referenselementet.
   *
   * I en vanlig meny är `left()` detsamma som `handleLeft()`. Härledda
   * klasser kan dock differentiera dem.
   *
   * @param {MenuItem} ref Referenselement.
   * @return {MenuItem} Nytt aktuellt element.
   */
  left(ref) {
    return this.handleLeft(ref);
  }

  /**
   * Returnera nästa menyelement vars textinnehåll börjar med angivet tecken.
   *
   * @param {MenuItem} ref  Referenselement.
   * @param {string}   char Tecken att matcha.
   * @return {(MenuItem|undefined)} Matchande element, om något.
   * @throws {TypeError} Referenselementet ingår inte i menyn.
   */
  matchNextItem(ref, char) {
    const start = this.#items.indexOf(ref);
    if (-1 === start) {
      console.error('Referenselementet ingår inte i menyn', ref);
      throw new TypeError('Referenselementet ingår inte i menyn.');
    }
    let index = start + 1;
    index %= this.#items.length;
    while (index !== start) {
      if (this.#items[index].startsWith(char)) {
        return this.#items[index];
      }
      ++index;
      index %= this.#items.length;
    }
    if (this.#items[start].startsWith(char)) {
      return this.#items[start];
    }
  }

  /**
   * Returnera nästa menyelement efter det angivna referenselementet.
   *
   * Om referenselementet är det sista elementet i menyn, börja om från
   * början.
   *
   * @param {MenuItem} ref Referenselement.
   * @return {MenuItem} Nästa element efter referenselementet.
   * @throws {TypeError} Referenselementet ingår inte i menyn.
   */
  nextItem(ref) {
    let index = this.#items.indexOf(ref);
    if (-1 === index) {
      console.error('Referenselementet ingår inte i menyn', ref);
      throw new TypeError('Referenselementet ingår inte i menyn.');
    }
    ++index;
    index %= this.#items.length;
    return this.#items[index];
  }

  // Åtkomstmetod för orientering.
  get orientation() {
    return this._orientation;
  }

  // Åtkomstmetoder för föräldraelement.
  get parentItem() {
    return this.#parentItem;
  }

  set parentItem(item) {
    this.#parentItem = item;
  }

  // Åtkomstmetoder för föräldrameny.
  get parentMenu() {
    return this.#parentMenu;
  }

  set parentMenu(menu) {
    this.#parentMenu = menu;
  }

  /**
   * Returnera menyelementet före det angivna referenselementet.
   *
   * Om referenselementet är det förta elementet i menyn, börja om från
   * slutet.
   *
   * @param {MenuItem} ref Referenselement.
   * @return {MenuItem} Föregående element från referenselementet.
   * @throws {TypeError} Referenselementet ingår inte i menyn.
   */
  previousItem(ref) {
    let index = this.#items.indexOf(ref);
    if (-1 === index) {
      console.error('Referenselementet ingår inte i menyn', ref);
      throw new TypeError('Referenselementet ingår inte i menyn.');
    }
    --index;
    index += this.#items.length;
    index %= this.#items.length;
    return this.#items[index];
  }

  /**
   * Hantera navigering med högerpil från angivet referenselement.
   *
   * Om referenselementet har en undermeny, öppna den och fokusera första
   * elementet.
   *
   * I annat fall, om rotmenyn är horisontellt orienterad, stäng alla över-
   * och underordnade menyer, navigera till följande element i rotmenyn och
   * öppna dess undermeny (utan att fokusera den).
   *
   * @param {MenuItem} ref Referenselement.
   * @return {MenuItem} Första element i undermeny, eller nästa rotelement.
   * @throws {TypeError} Referenselementet ingår inte i menyn.
   */
  right(ref) {
    let index = this.#items.indexOf(ref);
    if (-1 === index) {
      console.error('Referenselementet ingår inte i menyn', ref);
      throw new TypeError('Referenselementet ingår inte i menyn.');
    }
    if (ref.submenu) {
      return ref.open().firstItem;
    } else {
      if ('horizontal' === this.root.orientation) {
        const top = ref.closeAll();
        const next = top.parentMenu.nextItem(top);
        next.submenu && next.open();
        return next;
      }
    }
    return ref;
  }

  // Åtkomstmetod för rotmeny.
  get root() {
    return this.#parentMenu?.root ?? this;
  }

  /**
   * Returnera menyelement ovanför det angivna referenselementet.
   *
   * I en vanlig meny är `up()` detsamma som `previousItem()`. Härledda
   * klasser kan dock differentiera dem.
   *
   * @param {MenuItem} ref Referenselement.
   * @return {MenuItem} Föregående element från referenselementet.
   * @throws {TypeError} Referenselementet ingår inte i menyn.
   */
  up(ref) {
    return this.previousItem(ref);
  }

  /**
   * Meddela alla registrerade observatörer om en inträffad händelse.
   *
   * Returnerar
   *
   * @private
   * @param {object} event Händelseinformation.
   * @return {boolean} `true` om någon observatör returnerar `true`, annars
   *                   `false`.
   */
  #notifyObservers(event) {
    let result = false;
    for (const observer of this.#observers) {
      result ||= observer(event);
    }
    return result;
  }

  /**
   * Översätt en DOM-nod till underordnat omslutande menyelement.
   *
   * @private
   * @param {Node} node Nod att söka efter.
   * @return {(MenuItem|undefined)} Motsvarande element, om något.
   */
  #target(node) {
    let search;
    for (const item of this.#items) {
      if (item.is(node)) {
        return item;
      } else if ((search = item.submenu?.#target(node))) {
        return search;
      }
    }
  }
}

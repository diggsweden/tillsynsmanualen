/**
 * Automatisk innehållsmeny.
 *
 * Klassen skapar en menyknapp med en innehållsmeny som innehåller länkar till
 * alla H2-rubriker som har ett id-attribut.
 *
 * @license CC-BY 4.0
 * @see ContentMenu
 * @see MenuButton
 */
export class AutoContentMenu {
  // Privata fält.
  #doc;
  #navElement;
  #win;

  /**
   * Konstruera en automatisk innehållsmenyinstans.
   *
   * @param {Window} [win] Fönsterobjekt vid enhetstester.
   */
  constructor(win = window) {
    this.#doc = win.document;
    this.#win = win;
  }

  /**
   * Bygg en innehållsmeny.
   *
   * @param {HTMLElement} sibling   Element att infoga menyn före.
   * @param {HTMLElement} container Behållare att leta H2-element i.
   */
  build(sibling, container) {
    const headings = container.querySelectorAll('h2[id]');
    if (0 === headings.length) return;

    const listener = (event) => this.#goToTarget(event);
    const nav = this.#nav(sibling);
    const [menu, list] = this.#menu(nav);
    for (const h2 of headings) {
      this.#item(menu, list, h2, listener);
      h2.tabIndex = -1;
    }

    const button = new MenuButton(nav, 'Innehåll', menu, this.#doc);
    const controller = new MenuController(this.#doc);
    controller.handle(menu);
  }

  /**
   * Ta bort den automatiska innehållsmenyn från sidan.
   */
  remove() {
    this.#navElement?.remove();
  }

  /**
   * Händelselyssnare för länkklick i menyn.
   *
   * @param {PointerEvent} event Händelseinformation.
   */
  #goToTarget(event) {
    event.preventDefault();
    event.stopPropagation();
    const a = event.currentTarget;
    const id = a.hash?.slice(1);
    const target = this.#doc.getElementById(id);
    target?.focus();
    target?.scrollIntoView();
  }

  /**
   * Skapa ett menyelement och ett listelement.
   *
   * Listelementet innehåller en länk med ett `span`-element. Länken är en
   * ankarlänk till den angivna rubriken.
   *
   * @private
   * @param {Menu}               menu     Meny att infoga menyelementet i.
   * @param {HTMLUListElement}   list     Lista att infoga listelementet i.
   * @param {HTMLHeadingElement} heading  Rubrik att länka till.
   * @param {callback}           listener Händelselyssnare för länkklick.
   */
  #item(menu, list, heading, listener) {
    const li = list.appendChild(this.#doc.createElement('li'));
    const a = li.appendChild(this.#doc.createElement('a'));
    const span = a.appendChild(this.#doc.createElement('span'));

    li.setAttribute('role', 'none');
    a.setAttribute('href', `#${heading.id}`);
    span.textContent = heading.textContent;

    a.addEventListener('click', listener);

    menu.add(new MenuItem(a));
  }

  /**
   * Skapa menyn och det underliggande listelementet.
   *
   * @private
   * @param {HTMLElement} parent Förälder att infoga listan i.
   * @return {array} Meny och listelement.
   */
  #menu(parent) {
    const ul = parent.appendChild(this.#doc.createElement('ul'));
    ul.id = 'content-menu';
    const menu = new ContentMenu(ul, 'Innehåll', this.#win);
    return [menu, ul];
  }

  /**
   * Skapa och infoga ett `nav`-element.
   *
   * @private
   * @param {HTMLElement} sibling Element att infoga före.
   * @return {HTMLElement}
   */
  #nav(sibling) {
    const nav = sibling.parentNode.insertBefore(
      this.#doc.createElement('nav'),
      sibling
    );
    nav.classList.add('page-menu');
    nav.setAttribute('aria-label', 'Innehåll');
    return (this.#navElement = nav);
  }
}

// Importera beroenden.
import { ContentMenu } from '../menu/ContentMenu.js';
import { MenuButton } from '../menu/MenuButton.js';
import { MenuController } from '../menu/MenuController.js';
import { MenuItem } from '../menu/MenuItem.js';

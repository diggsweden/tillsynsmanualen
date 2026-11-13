/**
 * Konstruktionsklass för navigeringsmenyn.
 *
 * Skapar en menystruktur utifrån en konfiguration i JSON-format. Strukturen
 * utgör en hierarki av oordnade listor. En platshållare i DOM-trädet ersätts av
 * den överordnade listan.
 *
 * @license CC-BY 4.0
 */
export class MenuBuilder {
  // Privata fält.
  #doc;
  #load;

  /**
   * Konstruera en byggarinstans.
   *
   * @param {Document} [doc]    DOM-dokument vid enhetstester.
   * @param {callback} [loader] Resursladdare vid enhetstester.
   */
  constructor(doc = document, loader = fetch) {
    this.#doc = doc;
    this.#load = (url) => loader(url);
  }

  /**
   * Skapa liststrukturen för menyn.
   *
   * Hämta konfigurationen och generera menyn utitfrån den.
   *
   * @param {string}      pathname    Absolut sökväg till aktuell sida.
   * @param {string}      label       Etikett för hjälpmedel.
   * @param {HTMLElement} placeholder Platshållare för menyn.
   * @return {Menubar} Menyrad som är kopplad till den skapade liststrukturen.
   */
  async build(pathname, label, placeholder) {
    // Skapa en relativ rotsökväg.
    const base = Array.from(this.#doc.scripts)
      .map((s) => new URL(s.src).pathname)
      .filter((p) => p.endsWith('/menu.module.js'))[0]
      .replace(/\/js\/.*/, '');

    const root =
      pathname
        .replace(base, '')
        .replace(/\/[^\/]*$/, '')
        .split('/')
        .slice(1)
        .map((d) => '..')
        .join('/') || '.';

    // Hämta menystrukturdefinitionen, skapa lista och ersätt platshållaren.
    try {
      const response = await this.#load(`${root}/js/config/menu.json`);
      const json = await response.json();
      const nav = this.#createNav(label);
      const menubar = this.#buildMenubar(json, nav, root);

      placeholder.parentNode.replaceChild(nav, placeholder);
      return menubar;
    } catch (err) {
      console.error('Kan inte hämta menu.json', err);
      throw err;
    }
  }

  /**
   * Skapa en hierarki av oordnade listor från menykonfigurationen.
   *
   * @param {object}      menuCfg Menykonfigurationsbehållare.
   * @param {HTMLElement} parent  Element att infoga lista i.
   * @param {string}      root    Rotsökväg.
   * @return {Menubar}
   */
  #buildMenubar(menuCfg, nav, root) {
    const config = menuCfg.menu;
    const list = nav.appendChild(this.#doc.createElement('ul'));
    const menubar = new Menubar(list);

    config
      .map(({ label, content }) => this.#menuItem(label, content, root))
      .forEach(([item, li]) => {
        list.appendChild(li);
        menubar.add(item);
      });

    return menubar;
  }

  /**
   * Skapa `nav`-elementet som omsluter menyn.
   *
   * @private
   * @param {string} label Etikett för hjälpmedel.
   * @return {HTMLElement}
   */
  #createNav(label, list) {
    const nav = this.#doc.createElement('nav');
    nav.className = 'menu';
    nav.setAttribute('aria-label', label);
    return nav;
  }

  /**
   * Skapa menyelement och listelemen.
   *
   * Skapa ett listelement med en underordnad lista.
   * Skapa också ett menyelement som representerar innehållet i listelementet.
   *
   * @private
   * @param {string}   label   Listelementets text.
   * @param {object[]} content Innehåll att skapa underordnad lista av.
   * @param {string}   root    Rotsökväg.
   * @return {array} Vektor med menyelement och listelement.
   */
  #menuItem(label, content, root) {
    // Menyelement.
    const li = this.#doc.createElement('li');
    li.setAttribute('role', 'none');
    const a = li.appendChild(this.#doc.createElement('a'));
    a.href = '#';
    a.textContent = label;
    const item = new MenuItem(a);

    const list = li.appendChild(this.#doc.createElement('ul'));
    const menu = new Menu(list, label);
    item.submenu = menu;

    content
      .map((config) => {
        if ('content' in config) {
          // Undermeny.
          const { label, content } = config;
          return this.#menuItem(label, content, root);
        } else {
          // Lövnod i menyträdet.
          const li = this.#doc.createElement('li');
          li.setAttribute('role', 'none');
          const { label, url } = config;
          const a = li.appendChild(this.#doc.createElement('a'));
          a.href = `${root}/${url}`;
          a.textContent = label;
          return [new MenuItem(a), li];
        }
      })
      .forEach(([item, li]) => {
        list.appendChild(li);
        menu.add(item);
      });

    return [item, li];
  }
}

// Importera beroenden.
import { Menu } from './Menu.js';
import { Menubar } from './Menubar.js';
import { MenuItem } from './MenuItem.js';

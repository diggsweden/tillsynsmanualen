/**
 * En meny med ankarlänkar till avsnitt i aktuell sida.
 *
 * @license CC-BY 4.0
 * @see Menu
 */
export class ContentMenu extends Menu {
  // Privata fält.
  #doc;
  #location;
  #mainOffset;
  #offsets = [];
  #win;

  /**
   * Konstruera en innehållsmenyinstans.
   *
   * @param {HTMLElement} element Underliggande HTML-element.
   * @param {string}      [label] Maskinläsbar etikett.
   * @param {Window}      [win]   Fönsterobjekt vid enhetstester.
   */
  constructor(element, label = 'Innehåll', win = window) {
    super(element, label);
    this.#doc = win.document;
    this.#mainOffset = this.#doc.querySelector('main').offsetTop + 54;
    this.#win = win;
    this.#doc.addEventListener('scroll', () => this.#highlightCurrent());
  }

  /**
   * @inheritDoc
   */
  add(item) {
    super.add(item);

    const id = item.href.replace(/^.*#/, '');
    const target = this.#doc.getElementById(id);
    target && this.#offsets.push([target.offsetTop, item]);
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
   */
  down(ref) {
    return (this.current = super.down(ref));
  }

  /**
   * @inheritDoc
   * @override
   */
  handleLeft(ref) {
    return ref;
  }

  /**
   * @inheritDoc
   */
  up(ref) {
    return (this.current = super.up(ref));
  }

  /**
   * Markera det första listelement som är synligt i vyn.
   *
   * Hitta det sista elementet i innehållsmenyn vars mål har ett offset som är
   * större än dokumentets skrollposition men mindre än skrollpositionen plus
   * fönsterhöjden, och markera det för att göra det möjligt att ge elementet
   * en visuell formgivning.
   *
   * @private
   */
  #highlightCurrent() {
    // Sök sista synliga H2-rubriken.
    let match = null;
    const top = this.#doc.documentElement.scrollTop - this.#mainOffset;
    const bottom = top + this.#win.innerHeight;
    for (const [offset, item] of this.#offsets) {
      if (offset > bottom) {
        break;
      }
      match = item;
    }

    if (this.#location && match !== this.#location) {
      // Ta bort markering från nuvarande element.
      this.#location.current = null;
    }

    if (match) {
      this.#location = match;
      this.#location.current = 'location';
    }
  }
}

// Importera beroenden.
import { Menu } from './Menu.js';

/**
 * Rullgardinslista.
 *
 * Består av en knapp och en listruta. Tryck på knappen växlar listrutans syn-
 * lighet.
 *
 * Tangentmappning för knappen:
 * - Enter    drar ned rullgardinen och fokuserar första valda element
 * - Escape   drar upp rullgardinnen
 * - nedåtpil drar ned rullgardinen och fokuserar första elementet
 * - uppåtpil drar ned rullgardinen och fokuserar sista elementet
 *
 * Tangentmappning för listboxen: se {@link Listbox}.
 *
 * Interaktionen baseras på ett designmönster i WAI-ARIA Authoring Practices 1.1
 * som nu avråds ifrån i ARIA Authoring Practices Guide. Eftersom inget funge-
 * rande alternativ för flerval erbjuds får komponenten vara kvar i befintligt
 * skick.
 *
 * @license CC-BY 4.0
 * @see Listbox
 * @property {string} buttonText Knappens textinnehåll.
 */
export class Dropdown {
  // Privata fält.
  #button;
  #doc;
  #keys;
  #listbox;
  #listeners;

  /**
   * Konstruera en listinstans.
   *
   * @param {Listbox}           listbox   Listruta.
   * @param {EventListenerList} listeners Händelselyssnarlista.
   * @param {KeyMap}            keyMap    Tangentmappare.
   * @param {Document}          [doc]     DOM-dokument.
   */
  constructor(listbox, listeners, keyMap, doc = document) {
    this.#doc = doc;
    this.#listbox = listbox;
    this.#listeners = listeners;

    this.#setUpKeyMap(keyMap);
  }

  /**
   * Koppla rullgardinslistan till element i dokumentet.
   *
   * Metoden anropas med de underliggande HTML-elementen: en knapp (`button`)
   * och en lista (`ul`).
   *
   * @param {HTMLButtonElement} button Knapp.
   * @param {HTMLUListElement}  list   Lista.
   */
  attach(button, list) {
    this.#button && this.detach();
    this.#button = button;

    this.#listbox.attach(list);
    this.#toggleDropdownOnClick(button);
    this.#handleKeys(button);
    this.#closeDropdownOnClick(button, list);
  }

  // Åtkomstmetoder för knappens textinnehåll.
  get buttonText() {
    return this.#button.textContent;
  }

  set buttonText(text) {
    this.#button.textContent = String(text);
  }

  /**
   * Koppla ifrån rullgardinslistan.
   *
   * Ta bort registrerade händelselyssnare.
   */
  detach() {
    this.#listbox.detach();
    this.#listeners.removeAll();
  }

  /**
   * Återställ alla valdmarkeringar.
   *
   * @param {string[]} [selected] Förvalda element-id vid flerval.
   */
  reset(selected) {
    this.#listbox.reset(selected);
  }

  /**
   * Lägg till en observatör.
   *
   * Tillagda observatörer anropas med ett händelseobjekt när valdstatus för-
   * ändras för ett element i listan.
   *
   * @param {callback} notify Meddelandefunktion att anropa.
   */
  subscribe(notify) {
    this.#listbox.subscribe(notify);
  }

  /**
   * Dra upp rullgardinen.
   *
   * @private
   * @param {boolean} [focusButton] Fokusera knappen?
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #close(focusButton = true) {
    focusButton && this.#button.focus();
    this.#listbox.unfocus();
    this.#button.removeAttribute('aria-expanded');
    return true;
  }

  /**
   * Dra upp rullgardinen vid klick utanför knappen och listan.
   *
   * Lägg till en händelselyssnare på `body`.
   *
   * @private
   * @param {HTMLButtonElement} button Knapp.
   * @param {HTMLUListElement}  list   Lista.
   */
  #closeDropdownOnClick(button, list) {
    const contains = (t) => button.contains(t) || list.contains(t);
    this.#listeners.add(this.#doc.body, 'mousedown', (event) => {
      if (!contains(event.target)) {
        this.#close(false);
      }
    });
  }

  /**
   * Hantera tangenttryckningar.
   *
   * Lägg till en händelselyssnare för tangenttryckningar på knappen.
   *
   * @private
   * @param {HTMLButtonElement} button Knapp.
   */
  #handleKeys(button) {
    this.#listeners.add(button, 'keydown', (event) => {
      if (this.#keys.action(event)) {
        event.stopPropagation();
        event.preventDefault();
      }
    });
  }

  /**
   * Dra ned rullgardinen.
   *
   * Sätt fokus till listan och sätt angivet listelementet som aktivt element
   * (eller första valda elementet om inget angivits).
   *
   * @private
   * @param {number} [focus] Index för element att fokusera (-1=sista).
   */
  #open(focus) {
    this.#button.setAttribute('aria-expanded', 'true');
    this.#listbox.focus(focus);
  }

  /**
   * Skapa tangentmappning.
   *
   * @private
   * @param {KeyMap} keyMap Tangentmappare.
   */
  #setUpKeyMap(keyMap) {
    keyMap.map('ArrowDown', () => this.#open(0));
    keyMap.map('ArrowUp', () => this.#open(-1));
    keyMap.map('Enter', () => this.#toggleDropdown());
    keyMap.map('Escape', () => this.#close());

    this.#keys = keyMap;
  }

  /**
   * Växla rullgardinens tillstånd mellan uppdragen och neddragen.
   *
   * @private
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #toggleDropdown() {
    if (this.#button.hasAttribute('aria-expanded')) {
      this.#close();
      this.#button.focus();
    } else {
      this.#open();
    }

    return true;
  }

  /**
   * Dra ned/upp rullgardinen vid klick på knappen.
   *
   * Lägg till en händelselyssnare för att växla rullgardinens synlighet vid
   * klick.
   *
   * @private
   * @param {HTMLButtonElement} button Knappelement.
   */
  #toggleDropdownOnClick(button) {
    this.#listeners.add(button, 'click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.#toggleDropdown();
    });
  }
}

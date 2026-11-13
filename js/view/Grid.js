/**
 * Rutnät.
 *
 * En komponent som presenterar innehåll i rader och kolumner.
 *
 * Hela rutnätet utgör ett enda tabbstopp i sidans navigeringssekvens. Navige-
 * ring inom rutnätet sker med piltangenter och Home/End.
 *
 * Tangentmappning:
 * nedåtpil   fokuserar samma kolumn i nästa rad
 * uppåtpil   fokuserar samma kolumn i föregående rad
 * vänsterpil fokuserar föregående kolumn i samma rad
 * högerpil   fokuserar nästa kolumn i samma rad
 * Home       fokuserar första kolumnen i samma rad
 * End        fokuserar sista kolumnen i samma rad
 * Ctrl+Home  fokuserar första cellen i rutnätet
 * Ctrl+End   fokuserar sista cellen i rutnätet.
 *
 * @license CC-BY 4.0
 * @see {@link https://www.w3.org/WAI/ARIA/apg/patterns/grid/|Grid}
 */
export class Grid {
  // Privata fält.
  #column = -1;
  #doc;
  #grid;
  #keys;
  #listeners;
  #observer;
  #row = -1;
  #unfocused = [];

  /**
   * Konstruera en listinstans.
   *
   * @param {EventListenerList} listeners Händelselyssnarlista.
   * @param {KeyMap}            keyMap    Tangentmappare.
   * @param {Document}          [doc]     DOM-dokument.
   */
  constructor(listeners, keyMap, doc = document) {
    this.#doc = doc;
    this.#listeners = listeners;

    this.#setUpKeyMap(keyMap);
  }

  /**
   * Koppla rutnätet till ett element i dokumentet.
   *
   *
   * @param {HTMLElement} element HTML-element.
   */
  attach(element) {
    this.#grid = element;
    this.#initFocusHandling(this.#grid);
    this.#listeners.add(this.#grid, 'keydown', (e) => this.#keyAction(e));

    if ($length(this.#grid) > 0) {
      this.#row = this.#column = 0;
      $cell(this.#grid, 0, 0).tabIndex = 0;
    }

    if (this.#grid instanceof Node) {
      this.#addMutationObserver();
    }
  }

  /**
   * Koppla bort rutnätet från elementet.
   *
   * Ta bort registrerade händelselyssnare.
   */
  detach() {
    if (this.#observer) {
      this.#observer.disconnect();
    }
    this.#listeners.removeAll();
    this.#restoreFocusHandling();
  }

  /**
   * Lägg till en observatör för muteringar av DOM-trädet.
   *
   * Hanterar tillägg av rader i elementet som rutnätet är kopplat till.
   *
   * @private
   */
  #addMutationObserver() {
    this.#observer = new MutationObserver((list) => this.#onMutation(list));
    this.#observer.observe(this.#grid, {
      attributes: false,
      characterData: false,
      childList: true,
      subtree: false,
    });
  }

  /**
   * Fokuserar sista cellen på sista raden.
   *
   * @private
   * @see #focus
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #endOfGrid() {
    const row = $length(this.#grid) - 1;
    const column = $length($row(this.#grid, row)) - 1;
    this.#focus(row, column);
    return true;
  }

  /**
   * Fokuserar sista cellen på samma rad.
   *
   * @private
   * @see #focus
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #endOfRow() {
    const column = $length($row(this.#grid, this.#row)) - 1;
    this.#focus(this.#row, column);
    return true;
  }

  /**
   * Sätt fokus till cellen i angiven rad och kolumn.
   *
   * Om koordinaten hamnar utanför rutnätet, gör ingenting.
   *
   * @private
   * @param {number} row    Rad (0-baserad).
   * @param {number} column Kolumn (0-baserad).
   * @return {boolean} `true` om händelsen hanteras, annars `false`.
   */
  #focus(row, column) {
    if (
      row < 0 ||
      row >= $length(this.#grid) ||
      column < 0 ||
      column >= $length($row(this.#grid, row))
    ) {
      return false;
    }

    if (row !== this.#row || column !== this.#column) {
      $cell(this.#grid, this.#row, this.#column).tabIndex = -1;
      this.#column = column;
      this.#row = row;
      $cell(this.#grid, this.#row, this.#column).tabIndex = 0;
      $cell(this.#grid, this.#row, this.#column).focus();
      return true;
    }

    return false;
  }

  /**
   * Initiera fokushanteringen.
   *
   * Ta bort tabbfokus från alla fokuserbara underelement, eftersom rutnätet
   * sköter sin egen interna tangentbordsnavigering. Spara förändrade element
   * för att kunna återställa ursprungsläget.
   *
   * @private
   * @param {HTMLElement} container Behållare med underelement.
   */
  #initFocusHandling(container) {
    container.querySelectorAll('*').forEach((element) => {
      if (-1 !== element.tabIndex) {
        this.#unfocused.push([element, element.tabIndex]);
        element.tabIndex = -1;
      }
    });
  }

  /**
   * Hantera tangentbordshändelser.
   *
   * @private
   * @param {KeyboardEvent} event Händelseinformation.
   */
  #keyAction(event) {
    if (this.#keys.action(event)) {
      event.stopPropagation();
      event.preventDefault();
    }
  }

  /**
   * Fokuserar nästa cell på samma rad.
   *
   * @private
   * @see #focus
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #nextCell() {
    this.#focus(this.#row, this.#column + 1);
    return true;
  }

  /**
   * Fokuserar cellen i samma kolumn på nästa rad.
   *
   * @private
   * @see #focus
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #nextRow() {
    this.#focus(this.#row + 1, this.#column);
    return true;
  }

  /**
   * Observatör som anropas när elementinnehållet förändras.
   *
   * @private
   * @param {MutationRecord[]} mutations Förändringar.
   */
  #onMutation(mutations) {
    mutations.forEach((mutation) => {
      Array.from(mutation.addedNodes)
        .filter((n) => 1 === n.nodeType)
        .forEach((element) => this.#initFocusHandling(element));
    });

    if (this.#row < 0) {
      this.#row = this.#column = 0;
      this.#grid.children[0].children[0].tabIndex = 0;
    }
  }

  /**
   * Fokuserar föregående cell på samma rad.
   *
   * @private
   * @see #focus
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #previousCell() {
    this.#focus(this.#row, this.#column - 1);
    return true;
  }

  /**
   * Fokuserar cellen i samma kolumn på föregående rad.
   *
   * @private
   * @see #focus
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #previousRow() {
    this.#focus(this.#row - 1, this.#column);
    return true;
  }

  /**
   * Återställ fokushanteringen.
   *
   * Återställ tabbindex för varje element som förändrats i `attach()`.
   *
   * @private
   */
  #restoreFocusHandling() {
    this.#unfocused.forEach(([element, index]) => (element.tabIndex = index));
  }

  /**
   * Skapa tangentmappning.
   *
   * @private
   * @param {KeyMap} keyMap Tangentmappare.
   */
  #setUpKeyMap(keyMap) {
    keyMap.map('ArrowDown', () => this.#nextRow());
    keyMap.map('ArrowLeft', () => this.#previousCell());
    keyMap.map('ArrowRight', () => this.#nextCell());
    keyMap.map('ArrowUp', () => this.#previousRow());
    keyMap.map('End', () => this.#endOfRow());
    keyMap.map('End', () => this.#endOfGrid(), 'ctrl');
    keyMap.map('Home', () => this.#startOfRow());
    keyMap.map('Home', () => this.#startOfGrid(), 'ctrl');

    this.#keys = keyMap;
  }

  /**
   * Fokuserar första cellen på första raden.
   *
   * @private
   * @see #focus
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #startOfGrid() {
    this.#focus(0, 0);
    return true;
  }

  /**
   * Fokuserar första cellen på samma rad.
   *
   * @private
   * @see #focus
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #startOfRow() {
    this.#focus(this.#row, 0);
    return true;
  }
}

// Hjälpfunktioner.
const $cell = (g, r, c) => $row(g, r).children[c];
const $length = (p) => p.children.length;
const $row = (g, r) => g.children[r];

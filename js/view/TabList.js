/**
 * Tabbflikslista.
 *
 * @license CC-BY 4.0
 * @see {@link https://www.w3.org/WAI/ARIA/apg/patterns/tabpanel/|TabList}
 */
export class TabList {
  // Privata fält.
  #current = 0;
  #doc;
  #keys;
  #links = [];
  #listeners;
  #panels;
  #tabs;

  /**
   * Konstruera en listinstans.
   *
   * @param {EventListenerList} listeners Händelselyssnarlista.
   * @param {KeyMap}            keyMap    Tangentmappare.
   * @param {Document}          [doc]     DOM-dokument vid enhetstester.
   */
  constructor(listeners, keyMap, doc = document) {
    this.#doc = doc;
    this.#listeners = listeners;

    this.#setUpKeyMap(keyMap);
  }

  /**
   * Koppla tabbfilkslistan till element i dokumentet.
   *
   * @param {NodeList} tabs Tabbflikar.
   * @throws {TypeError}
   */
  attach(tabs) {
    this.#tabs = Array.from(tabs);
    this.#panels = this.#tabs.map((button) =>
      this.#doc.getElementById(button.getAttribute('aria-controls'))
    );

    this.#showPanelOnClickOrKey();
    this.#addShortcutsToPanels();
  }

  /**
   * Koppla ifrån tabbflikslistan.
   *
   * Ta bort registrerade händelselyssnare.
   */
  detach() {
    this.#listeners.removeAll();
  }

  /**
   * Gör angiven panel till den aktiva panelen.
   *
   * @param {HTMLElement} panel Panel att aktivera.
   */
  selectPanel(panel) {
    const index = this.#panels.indexOf(panel);
    if (-1 !== index) {
      this.#activate(index);
    }
  }

  /**
   * Aktivera tabbfliken med angivet index.
   *
   * @private
   * @param {number} index Index (0-baserat).
   */
  #activate(index) {
    const panel = () => this.#panels[this.#current];
    const tab = () => this.#tabs[this.#current];

    tab().setAttribute('aria-selected', 'false');
    tab().tabIndex = -1;
    panel().dataset.visible = 'false';

    this.#current = index;

    tab().setAttribute('aria-selected', 'true');
    tab().tabIndex = 0;
    panel().dataset.visible = 'true';
    tab().focus();
  }

  /**
   * Lägg till en genväg till tabbflikarna sist i varje panel.
   *
   * @private
   */
  #addShortcutsToPanels() {
    const focusTabs = (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.#doc.getElementById(event.currentTarget.hash.slice(1)).focus();
    };

    this.#panels.forEach((panel) => {
      const a = panel.appendChild(this.#doc.createElement('a'));
      a.setAttribute('href', `#${panel.getAttribute('aria-labelledby')}`);
      a.textContent = 'Tabbflikar';
      this.#listeners.add(a, 'click', focusTabs);
    });
  }

  /**
   * Aktivera första tabbfliken.
   *
   * @private
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #firstTab() {
    this.#activate(0);
    return true;
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
   * Aktivera sista tabbfliken.
   *
   * @private
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #lastTab() {
    this.#activate(this.#tabs.length - 1);
    return true;
  }

  /**
   * Aktivera nästa tabbflik.
   *
   * @private
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #nextTab() {
    this.#activate((this.#current + 1) % this.#tabs.length);
    return true;
  }

  /**
   * Aktivera föregående tabbflik.
   *
   * @private
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #prevTab() {
    const length = this.#tabs.length;
    this.#activate((this.#current - 1 + length) % length);
    return true;
  }

  /**
   * Hantera klickhändelse.
   *
   * @private
   * @param {MouseEvent} event Händelseinformation.
   */
  #setTab(event) {
    if (
      0 === event.button &&
      !(event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
    ) {
      this.#activate(this.#tabs.indexOf(event.target));
    }
  }

  /**
   * Skapa tangentmappning.
   *
   * @private
   * @param {KeyMap} keyMap Tangentmappare.
   */
  #setUpKeyMap(keyMap) {
    keyMap.map('ArrowLeft', () => this.#prevTab());
    keyMap.map('ArrowRight', () => this.#nextTab());
    keyMap.map('End', () => this.#lastTab());
    keyMap.map('Home', () => this.#firstTab());

    this.#keys = keyMap;
  }

  /**
   * Visa tillhörande panel då en tabbflik aktiveras.
   *
   * Lägg till händelselyssnare för klick och tangenttryckningar.
   *
   * @private
   */
  #showPanelOnClickOrKey() {
    this.#tabs.forEach((button) => {
      this.#listeners.add(button, 'click', (e) => this.#setTab(e));
      this.#listeners.add(button, 'keydown', (e) => this.#keyAction(e));
    }, this);
  }
}

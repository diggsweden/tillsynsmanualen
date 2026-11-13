/**
 * Listruta.
 *
 * En komponent som presenterar en lista med alternativ och låter användaren
 * välja ett eller flera av dem.
 *
 * En instans av klassen kopplas till ett listelement (`ul`) som ska ha rollen
 * "listbox" och kan ha attributet `aria-multiselectable`. Listelementen ska ha
 * rollen "option". Vid enkelval ska det valda elementet ha
 * `aria-selected="true"`; vid flerval ska alla element ha `aria-selected`, med
 * värdet antingen "true" eller "false".
 *
 * Tangentmappning, enkelval:
 * - nedåtpil flyttar fokus och valdmarkering till nästa element
 * - uppåtpil flyttar fokus och valdmarkering till föregående element
 * - Home     flyttar fokus och valdmarkering till första elementet
 * - End      flyttar fokus och valdmarkering till sista elementet
 *
 * Tangentmappning, flerval (`aria-multiselectable="true"`):
 * - nedåtpil         flyttar fokus till nästa element
 * - uppåtpil         flyttar fokus till föregående element
 * - Home             flyttar fokus till första elementet
 * - End              flyttar fokus till sista elementet
 * - mellanslag       växlar valdmarkering på aktivt element
 * - Skift+mellanslag väljer alla element från senast valda till aktivt element
 * - Skift+nedåtpil   flyttar fokus till nästa element och växlar markering
 * - Skift+uppåtpil   flyttar fokus till föregående element och växlar markering
 * - Ctrl+Skift+Home  väljer alla element från första till aktivt element
 * - Ctrl+Skift+End   väljer alla element från aktivt element till sista
 * - Ctrl+A           väljer/avmarkerar alla element
 *
 * Övriga knappar (type-ahead) flyttar fokus till det element vars textinnehåll
 * inleds med den tryckta bokstaven. Om flera bokstäver skrivs in i snabb följd
 * konkaterneras de till en söksträng. Vid enkelval följer valdmarkeringen med
 * fokus.
 *
 * @license CC-BY 4.0
 * @see {@link https://www.w3.org/WAI/ARIA/apg/patterns/listbox/|Listbox}
 * @property {boolean} active Anger om listan ska reagera på händelser.
 */
export class Listbox {
  // Privata fält.
  #active = true;
  #doc;
  #focused;
  #keys;
  #list;
  #listeners;
  #multi = false;
  #observers = [];
  #origin;
  #search = '';
  #timer;

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

  // Åtkomstmetoder för aktivflaggan.
  get active() {
    return this.#active;
  }

  set active(flag) {
    this.#active = Boolean(flag);
  }

  /**
   * Koppla listrutan till ett listelement i dokumentet.
   *
   * Sätt första valda elementet till aktivt element eller, om inget är valt,
   * fösta elementet.
   *
   * @param {HTMLUListElement} list Listelement.
   */
  attach(list) {
    this.#list && this.detach();

    this.#list = list;
    this.#multi = 'true' === list.getAttribute('aria-multiselectable');

    this.#setActiveOption(list);
    this.#selectOnClick(list);
    this.#handleKeys(list);
  }

  /**
   * Koppla bort listrutan från listelementet.
   *
   * Ta bort registrerade händelselyssnare.
   */
  detach() {
    this.#listeners.removeAll();
  }

  /**
   * Sätt tangentbordsfokus till listelementet.
   *
   * @param {number} [index] Index för element att fokusera (-1=sista).
   */
  focus(index) {
    this.#list.tabIndex = 0;
    this.#list.focus();
    if (undefined !== index) {
      const options = this.#list.children;
      const length = options.length;
      this.#makeActive(options[(index + length) % length]);
    }
  }

  /**
   * Återställ alla valdmarkeringar.
   *
   * Vid enkelval: gör första elementet till dat valda elementet.
   * Vid flerval: ta bort alla valdmarkeringar utom de angivna.
   *
   * Gör första elementet till aktivt element, oavsett listtyp.
   * Meddela alla registrerade observatörer.
   *
   * @param {string[]} [selected] Förvalda element-id vid flerval.
   */
  reset(selected = []) {
    if (this.#multi) {
      for (const option of this.#list.children) {
        this.#select(option, selected.includes(option.id));
      }
    } else {
      this.#select(this.#currentOption(), false);
      this.#select(this.#list.children[0], true);
    }
    this.#makeActive(this.#list.children[0]);
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
    this.#observers.push(notify);
  }

  /**
   * Ta bort listan ur tangentbordsfokusordningen.
   */
  unfocus() {
    this.#list.tabIndex = -1;
  }

  /**
   * Återställ söksträngen som konkateneras vid snabb följd av tangentttryck.
   *
   * Type-ahead-sökning i listan är kumulativ: tecken som matas in snabbt (med
   * mindre än 500 ms emellan) konkateneras till en söksträng. 500 ms efter
   * det senast inmatade tecknet anropas denna metod, som raderar söksträngen
   * så att nästa tecken som matas in blir början på en ny söksträng.
   *
   * @private
   */
  #clearSearch() {
    this.#timer = undefined;
    this.#origin = undefined;
    this.#search = '';
  }

  /**
   * Returnera det aktiva elementets identitet.
   *
   * @private
   * @return {string}
   */
  #currentID() {
    return this.#list.getAttribute('aria-activedescendant');
  }

  /**
   * Returnera det aktiva elementet.
   *
   * @private
   * @see #currentID
   * @return {HTMLLIElement}
   */
  #currentOption() {
    return this.#doc.getElementById(this.#currentID());
  }

  /**
   * Hitta nästa element som inleds med angiven sträng.
   *
   * Sök bland listelementen efter nästa element, efter det angivna start-
   * indexet, vars textinnehåll inleds med den angivna strängen.
   *
   * Returnera det matchande elementets index, eller -1 om inget element mot-
   * svarar villkoret.
   *
   * @private
   * @param {string} search Söksträng.
   * @param {number} start  Startindex (0-baserat).
   * @return {number}
   */
  #findMatch(search, start) {
    // Starta på elementet efter `start`, med wrap-around.
    const options = this.#list.children;
    const length = options.length;
    let index = start;
    let found = false;

    while (!found) {
      index = ++index % length;
      if (index === start) {
        return -1;
      }

      // Filtrera bort inledande och avslutande blanktecken och omvandla
      // till gemener före jämförelse.
      found = options[index].textContent
        .trim()
        .toLowerCase()
        .startsWith(search);
    }

    return index;
  }

  /**
   * Sätt fokusmarkeringen till angivet element.
   *
   * Ta bort eventuell fokusmarkering på tidigare element.
   *
   * @private
   * @param {HTMLLIElement} option Listelement.
   */
  #focus(option) {
    const cls = 'focused';
    this.#focused?.classList.remove(cls);
    option.classList.add(cls);
    this.#focused = option;
  }

  /**
   * Fokusera element vars innehåll börjar med angivna tecken.
   *
   * Tecken som anges inom 500 ms konkateneras till en söksträng.
   *
   * @private
   * @param {string} key Tryckt tangent.
   * @return {boolean} `true` om sökningen ger träff, annars `false`.
   */
  #focusByChar(key) {
    // Avbryt eventuell väntande rensning av ackumulerad söksträng.
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
    }

    // Ignorera tangentnamn som Escape och Tab.
    if (key.length > 1) {
      return false;
    }

    // Sök efter aggregerad sträng från det aktiva elementet.
    const active = this.#indexOf(this.#currentOption());
    this.#origin ||= active;
    this.#search += key;
    let match = this.#findMatch(this.#search, this.#origin);

    if (match < 0 && this.#search.length > 1) {
      // Ingen träff? Prova med bara senaste tecknet.
      this.#search = key;
      match = this.#findMatch(this.#search, this.#origin);
    }

    if (match >= 0) {
      // Träff. Fokusera och sätt som aktivt element. Vid enkelval, flytta
      // valdmarkeringen till det matchande elementet.
      const options = this.#list.children;
      this.#multi || this.#select(options[active], false);
      this.#multi || this.#select(options[match], true);
      this.#makeActive(options[match]);

      // Sätt en timer som återställer söksträngen efter 500 ms om inga
      // fler tecken matas in.
      setTimeout(() => this.#clearSearch(), 500);
      return true;
    }

    this.#origin = undefined;
    this.#search = '';
    return false;
  }

  /**
   * Hantera tangentbordshändelser.
   *
   * Lägg till en händelselyssnare på listelementet.
   *
   * @private
   * @param {HTMLUListElement} list Listelement.
   */
  #handleKeys(list) {
    this.#listeners.add(list, 'keydown', (event) => {
      if (this.#active && this.#keys.action(event)) {
        event.stopPropagation();
        event.preventDefault();
      }
    });
  }

  /**
   * Returnera ett listelements index.
   *
   * @private
   * @param {HTMLLIElement} option Listelement.
   * @return {number}
   */
  #indexOf(option) {
    return option ? Array.from(this.#list.children).indexOf(option) : 0;
  }

  /**
   * Sätt angivet element som det aktiva och fokuserade elementet.
   *
   * @private
   * @param {HTMLLIElement} option Listelement.
   */
  #makeActive(option) {
    this.#focus(option, true);
    this.#list.setAttribute('aria-activedescendant', option.id);
  }

  /**
   * Flyttar fokus och aktivt element.
   *
   * Vid absolut förflyttning sätts fokus till listelementet med angivet index
   * (eller sista elementet om index är -1). Vid relativ förflyttning flyttas
   * fokkus angivet antal steg (om det inte skulle hamna utanför listan).
   *
   * @private
   * @param {number}  index    Index eller antal steg.
   * @param {boolean} relative Relativ förflyttning?
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #move(index, relative) {
    const options = this.#list.children;
    const length = options.length;
    const active = this.#indexOf(this.#currentOption());
    const target = relative
      ? Math.min(Math.max(index + active, 0), length - 1)
      : (index + length) % length;

    if (active !== target) {
      this.#multi || this.#select(options[active], false);
      this.#multi || this.#select(options[target], true);
      this.#makeActive(options[target]);
    }
    return true;
  }

  /**
   * Flyttar fokus och växlar valdmarkering.
   *
   * Flyttar fokus och aktivt element ett steg uppåt eller nedåt i listan och
   * växlar målelementets valdmarkering.
   *
   * @private
   * @see #move
   * @see #toggle
   * @param {number} steps Antal steg (+1 eller -1).
   * @return {boolean} `true` om händelsen hanteras, annars `false`.
   */
  #moveAndToggle(steps) {
    this.#move(steps, true);
    return this.#toggle();
  }

  /**
   * Meddela alla tillagda observatörer om en statusändring i listan.
   *
   * @private
   * @param {HTMLLIElement} option Ändrat listelement.
   */
  #notifyObservers(option) {
    const event = {
      state: this.#selected(option),
      target: option,
    };

    for (const observer of this.#observers) {
      observer(event);
    }
  }

  /**
   * Sök valt element närmast före det aktiva elementet.
   *
   * Returrnera det valda elementet, eller `null` om inget hittades.
   *
   * @private
   * @return {(HTMLLIElement|null)}
   */
  #previousSelected() {
    const options = this.#list.children;
    let index = this.#indexOf(this.#currentOption());
    while (--index >= 0) {
      if (this.#selected(options[index])) {
        return options[index];
      }
    }
    return null;
  }

  /**
   * Sätt eller ta bort valdmarkeringen från ett element.
   *
   * Vid enkelval: sätt attributet `aria-selected` om elementet är valt,
   * annars ta  bort attributet. Meddela observatörer bara om elementet är
   * valt.
   *
   * Vid flerval: sätt attributet `aria-selected` till "true" om elementet är
   * valt, annars till "false'. Meddela observatörer oavsett markering.
   *
   * @private
   * @param {HTMLLIElememnt} option   Listelement.
   * @param {boolean}        selected Valdmarkering.
   */
  #select(option, selected) {
    const attr = 'aria-selected';
    if (this.#multi) {
      option?.setAttribute(attr, String(selected));
      if (option) {
        this.#notifyObservers(option);
      }
    } else if (selected) {
      option.setAttribute(attr, 'true');
      this.#notifyObservers(option);
    } else {
      option?.removeAttribute(attr);
    }
  }

  /**
   * Returnera elementets valdmarkering.
   *
   * @private
   * @param {HTMLLIElememnt} option Listelement.
   * @return {boolean} `true` om händelsen hanteras, annars `false`.
   */
  #selected(option) {
    return 'true' === option?.getAttribute('aria-selected');
  }

  /**
   * Sätt valdmarkeringen från första elementet till och med aktivt element.
   *
   * Vid enkelval: flytta fokus och valdmarkering till första elementet.
   *
   * @private
   * @see #move
   * @see #selectRange
   * @return {boolean} `true` om händelsen hanteras, annars `false`.
   */
  #selectFromFirst() {
    if (!this.#multi) return this.#move(0, false);

    return this.#selectRange(this.#list.children[0]);
  }

  /**
   * Sätt valdmarkeringen från föregående valda till aktivt element.
   *
   * Vid enkelval: ignorera.
   *
   * @private
   * @see #selectRange
   * @return {boolean} `true` om händelsen hanteras, annars `false`.
   */
  #selectFromPrev() {
    if (!this.#multi) return false;

    const prev = this.#previousSelected();
    return prev ? this.#selectRange(prev) : true;
  }

  /**
   * Valj ett eller flera element vid musklick.
   *
   * Lägg till en händelselyssnare på listelementet. Vid enkelval, markera det
   * klickade elementet som valt. Vid flerval, växla läge på det klickade ele-
   * mentet eller, om Skift-tangenten är nedtryckt, välj alla element från det
   * aktiva till det klickade.
   *
   * Gör det klickade elementet till aktivt element.
   *
   * @private
   * @param {HTMLUListElement} list Listelement.
   */
  #selectOnClick(list) {
    this.#listeners.add(list, 'click', (e) => {
      if (this.#active && 0 === e.button) {
        e.preventDefault();
        e.stopPropagation();

        if (this.#multi) {
          if (e.shiftKey) {
            this.#selectRange(e.target);
          } else {
            this.#toggle(e.target, true);
          }
        } else {
          this.#select(this.#currentOption(), false);
          this.#select(e.target, true);
        }

        this.#makeActive(e.target);
      }
    });
  }

  /**
   * Sätt valddmarkeringen på en serie element.
   *
   * Sätt valdmarkeringen på alla element från det aktiva elementet till det
   * angivna.
   *
   * @private
   * @param {HTMLLIElememnt} [option] Listelement.
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #selectRange(option) {
    const start = this.#indexOf(this.#currentOption());
    const end = this.#indexOf(option ?? this.#previousSelected(start));
    for (let i = Math.min(start, end); i <= Math.max(start, end); ++i) {
      this.#select(this.#list.children[i], true);
    }
    return true;
  }

  /**
   * Sätt valdmarkeringen från aktivt element till och med sista elementet.
   *
   * Vid enkelval: flytta fokus och valdmarkering till sista elementet.
   *
   * @private
   * @see #move
   * @see #selectRange
   * @return {boolean} `true` om händelsen hanteras, annars `false`.
   */
  #selectToLast() {
    if (!this.#multi) return this.#move(-1, false);

    const options = this.#list.children;
    return this.#selectRange(options[options.length - 1]);
  }

  /**
   * Sätt det aktiva elementet från märkkoden.
   *
   * Sök efter första listelementet med `aria-selected="true"`. Om det finns
   * ett sådant, sätt det som aktivt element. I annat fall, sätt första ele-
   * mentet som aktivt.
   *
   * @private
   * @param {HTMLUListElement} list Listelement.
   */
  #setActiveOption(list) {
    for (const option of this.#list.children) {
      if (this.#selected(option)) {
        this.#makeActive(option);
        return;
      }
    }

    this.#makeActive(this.#list.children[0]);
  }

  /**
   * Skapa tangentmappning.
   *
   * @private
   * @param {KeyMap} keyMap Tangentmappare.
   */
  #setUpKeyMap(keyMap) {
    keyMap.map(' ', () => this.#toggle());
    keyMap.map(' ', () => this.#selectFromPrev(), 'shift');
    keyMap.map('ArrowDown', () => this.#move(1, true));
    keyMap.map('ArrowDown', () => this.#moveAndToggle(1), 'shift');
    keyMap.map('ArrowUp', () => this.#move(-1, true));
    keyMap.map('ArrowUp', () => this.#moveAndToggle(-1), 'shift');
    keyMap.map('End', () => this.#move(-1, false));
    keyMap.map('End', () => this.#selectToLast(), 'ctrl+shift');
    keyMap.map('Home', () => this.#move(0, false));
    keyMap.map('Home', () => this.#selectFromFirst(), 'ctrl+shift');
    keyMap.map('a', () => this.#toggleAll(), 'ctrl');
    keyMap.map('*', (key) => this.#focusByChar(key));

    this.#keys = keyMap;
  }

  /**
   * Växla valt tillstånd för ett listelemet.
   *
   * Vid enkelval: ignorera.
   *
   * @private
   * @param {HTMLLIElement} [target] Målelement vid mushändelse.
   * @return {boolean} `true` om händelsen hanteras, annars `false`.
   */
  #toggle(target) {
    if (!this.#multi) return false;

    const option = target ?? this.#currentOption();
    this.#select(option, !this.#selected(option));
    return true;
  }

  /**
   * Sätt eller ta bort valdmarkeringen för alla element.
   *
   * Om alla element är valda, ta bort valdmarkeringen. Annars, sätt vald-
   * markeringen.
   *
   * Vid enkelval: ignorera.
   *
   * @private
   * @return {boolean} `true` om händelsen hanteras, annars `false`.
   */
  #toggleAll() {
    if (!this.#multi) return false;

    // Se om valdmarkeringen ska sättas eller tas bort.
    const options = this.#list.children;
    let state = false;
    for (const option of options) {
      if (!this.#selected(option)) {
        // Icke valt element: valdmarkeringar ska sättas.
        state = true;
        break;
      }
    }

    // Sätt eller ta bort valdmarkeringen på alla element.
    for (const option of options) {
      this.#select(option, state);
    }

    return true;
  }
}

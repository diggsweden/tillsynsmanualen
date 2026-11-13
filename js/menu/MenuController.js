/**
 * Menycontroller.
 *
 * Hanterar användarinteraktionen med menyn och menyknappen.
 *
 * @license CC-BY 4.0
 * @property {Menubar} menubar    Menyrad.
 * @property {Menubar} menuButton Menyknapp.
 */
export class MenuController {
  // Privata fält.
  #current = {};
  #subjects = [];

  /**
   * Konstruera en controllerinstans.
   *
   * Registrera händelselyssnare på BODY-elementet för att hantera klick utan-
   * för menyer.
   *
   * @param {Document} [doc] DOM-dokument vid enhetstester.
   */
  constructor(doc = document) {
    // Stäng alla öppna menyer vid klick utanför hanterade menyer.
    doc.body.addEventListener('click', (event) => {
      this.#subjects.forEach((s) => (this.#current[s.id] = s.closeAll()));
    });
  }

  /**
   * Lägg till ett subjekt att hantera.
   *
   * Registrera en observatör på subjektet, som anropas vid mus- eller tan-
   * genthändelser i subjektet.
   *
   * @param {Menu} subject Subjekt som controllerna ska hantera.
   */
  handle(subject) {
    this.#subjects.push(subject);
    this.#current[subject.id] = subject.current;
    subject.addObserver((event) => this.#onSubjectEvent(event));
  }

  /**
   * Aktivera aktuellt menyelement.
   *
   * @private
   * @param {Menu}     source  Subjekt där händelsen inträffat.
   * @param {MenuItem} current Aktuellt menyelement i subjektet.
   * @return {(MenuItem|null)} Aktivt element, om något.
   */
  #activate(source, current) {
    const item = current.activate();
    if (item) {
      this.#current[source.id] = item;
      item.focus();
    }
    return item;
  }

  /**
   * Hantera en musklickshändelse i ett subjekt.
   *
   * Sätt det klickade målelementet som subjektets aktuella elment.
   *
   * @private
   * @param {object}   event        Händelseinformation.
   * @param {Menu}     event.source Subjekt där händelsen inträffat.
   * @param {MenuItem} event.target Klickat målelement.
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #click({ source, target }) {
    this.#closeToCommonParent(this.#current[source.id], target);
    this.#current[source.id] = target;
    source.current = target;
    if (target) {
      if (target.toggle()) return true;
      this.#current[source.id] = target.activate();
    }
    return false;
  }

  /**
   * Stäng aktuell öppen meny vid Escape.
   *
   * Om en undermeny är öppen, stäng den.
   * Om en toppmeny är öppen men fokus är på ägarelementet, stäng toppmenyn.
   *
   * @private
   * @param {MenuItem} current Aktuellt menyelement.
   * @return {MenuItem} Nytt aktuellt element.
   */
  #closeOnEscape(current) {
    if (!current.parentItem) {
      // Stäng toppmeny.
      current.submenu && current.close();
      return current;
    } else {
      // Stäng undermeny.
      return current.parentItem.close();
    }
  }

  /**
   * Stäng undermenyer till en kusinmeny.
   *
   * Om aktuellt element och målelementet har en gemensam förälder, stäng den
   * närmast underordnade menyn som är överordnad aktuellt element.
   *
   * Anta strukturen A(B(C(D, E), F(G))) och att D är aktuellt element.
   * Om målelementet är F är den gemensamma föräldern B. Närmast underordnat
   * element som är överordnat D är C. Alltså ska C stängas.
   *
   * @private
   * @param {MenuItem} item   Aktuellt element.
   * @param {MenuItem} target Målelement.
   */
  #closeToCommonParent(item, target) {
    if (item === target) return;

    const ancestors = [];
    let node = target;
    while (node?.parentItem) {
      ancestors.push(node.parentItem);
      node = node.parentItem;
    }

    node = item;
    while (node?.parentItem) {
      if (ancestors.includes(node.parentItem)) {
        // Gemensam förälder; stäng öppen undermeny.
        node.submenu && node.close();
        return;
      } else if (ancestors.includes(node)) {
        // Målelementet är underordnat aktuellt element.
        return;
      }
      node = node.parentItem;
    }

    if (!ancestors.includes(item)) {
      item?.closeAll();
    }
  }

  /**
   * Hantera en tangenthändelse i ett subjekt.
   *
   * @private
   * @param {object}   event        Händelseinformation.
   * @param {string}   event.key    Tangent.
   * @param {Menu}     event.source Subjekt där händelsen inträffat.
   * @param {MenuItem} event.target Klickat målelement.
   * @return {boolean} `true` om metoden hanterar händelsen, annars `false`.
   */
  #key({ key, source, target }) {
    const current = this.#current[source.id];
    const handler = {
      ArrowDown: () => current.parentMenu.down(current),
      ArrowLeft: () => current.parentMenu.left(current),
      ArrowRight: () => current.parentMenu.right(current),
      ArrowUp: () => current.parentMenu.up(current),
      Enter: () => this.#activate(source, current),
      Escape: () => this.#closeOnEscape(current),
      Space: () => this.#activate(source, current),
    }[key];

    let result;
    if (current && handler) {
      result = handler();
    } else if (current && 1 === key.length) {
      result = current.parentMenu.nextMatchingItem(current, key);
    }
    result && (this.#current[source.id] = result.focus());
    return !!result;
    console.log('Okänd tangenthändelse', event);
  }

  /**
   * Hantera en händelse i ett subjekt.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  #onSubjectEvent(event) {
    const handler = {
      click: (e) => this.#click(e),
      close: (e) => false,
      key: (e) => this.#key(e),
    }[event.type];

    if (handler) {
      return handler(event);
    }
    console.log('Okänd händelsetyp', event);
  }
}

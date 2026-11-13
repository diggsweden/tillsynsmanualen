/**
 * Hjälpmedel för att testa WCAG 1.4.4.
 *
 * Beräknar den faktiska förstoringsgraden vid zoom. Användaren fyller i
 * beräknad grad vid 100 % zoom och vid aktuell förstoring samt förstoringsgrad-
 * en. Verktyget räknar ut den reella förstoringen.
 *
 * @license CC-BY 4.0
 */

/**
 * Skapa och infoga formuläret.
 *
 * @param {HTMLElement} parent Element att infoga formuläret i.
 */
export default function initFontSize(parent) {
  const checker = new ResizeChecker();
  const form = new FontSizeForm(parent);
  const ctrl = new Controller(checker, form);
}

/**
 * Controllerklass för hjälpmedlet.
 *
 * Controllern hanterar interaktionen mellan formuläret och beräkningsverktyget.
 */
class Controller {
  // Privata fält.
  #analyzer;
  #ui;

  /**
   * Konstruera en controllerinstans.
   *
   * @param {ResizeChecker} analyzer Analysverktyg.
   * @param {FontSizeForm}  ui       Användargränssnitt.
   */
  constructor(analyzer, ui) {
    this.#analyzer = analyzer;
    this.#ui = ui;
    this.#ui.addObserver((data) => this.#onInput(data));
  }

  /**
   * Händelsehanterare för användargränssnittet.
   *
   * Metoden anropas när användaren ändrar värden i formuläret. Den anropar
   * analysverktyget för att beräkna den effektiva förstoringsgraden och
   * uppdaterar sedan användargränssnittet med resultatet.
   *
   * @private
   * @param {object} data        Värden från användargränssnittet.
   * @param {number} data.normal Beräknad textstorlek vid 100 % zoom.
   * @param {number} data.zoomed Beräknad textstorlek vid aktuell zoom.
   * @param {number} data.zoom   Förstoringsgrad (procent).
   */
  #onInput({ normal, zoom, zoomed }) {
    const conforming = this.#analyzer.conforming(normal, zoomed, zoom);
    const effective = this.#analyzer.effectiveSize(zoomed, zoom);
    const magnification = (effective * 100) / normal;
    this.#ui.update(magnification, conforming);
  }
}

/**
 * Verktygets användargränssnitt.
 */
class FontSizeForm {
  // Privata fält.
  static #ID = 'font-size-form';
  #doc;
  #form;
  #normal;
  #observers = [];
  #parent;
  #result;
  #sources = [];
  #zoom;
  #zoomed;

  /**
   * Konstruera en formulärinstans.
   *
   * @param {HTMLElement} parent Element att infoga fält i.
   */
  constructor(parent) {
    this.#parent = this.#element(parent, 'div', { class: 'font-size' });
    this.#notifyOnInput();
    this.#validateOnChange();
    this.#instructions();
    this.#formElement();
    this.#inputFields();
    this.#outputField();
  }

  /**
   * Lägg till en observatörsfunktion.
   *
   * Observatörsfunktionen anropas när användaren ändrar värde i något av in-
   * matningsfälten. Funktionen anropas med ett objekt som innehåller alla
   * värden i formuläret.
   *
   * @param {callback} observer Observatörsfunktion.
   */
  addObserver(observer) {
    this.#observers.push(observer);
  }

  /**
   * Uppdatera resultatfältet.
   *
   * @param {number}  magnification Beräknad förstoring (procent).
   * @param {boolean} conforming    Är WCAG-kravet uppfyllt?
   */
  update(magnification, conforming) {
    const nf = new Intl.NumberFormat('sv');
    const status = {
      true: { class: 'pass', text: 'godkänt' },
      false: { class: 'fail', text: 'underkänt' },
    };
    const mag = nf.format(Math.round(magnification));
    const conf = status[conforming].text;
    this.#result.className = status[conforming].class;
    this.#result.value = `${mag} % (${conf})`;
  }

  /**
   * Skapa och infoga en elementnod.
   *
   * @private
   * @param {(HTMLElemen|null)t} parent       Föräldranod.
   * @param {string}             tag          Elementtyp.
   * @param {object}             [attributes] Attribut.
   * @param {string}             [content]    Textinnehåll.
   * @return {HTMLElement}
   */
  #element(parent, tag, attributes = {}, content = null) {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
      element.setAttribute(name, value);
    }
    if (null !== content) {
      element.innerHTML = content;
    }
    if (null !== parent) {
      parent.appendChild(element);
    }
    return element;
  }

  /**
   * Skapa och infoga inmatningsfältet för grad.
   *
   * @private
   * @param {string} id    Fältidentitet.
   * @param {string} label Ledtext.
   * @return {HTMLInputElement}
   */
  #fontSizeField(id, label) {
    const p = this.#element(this.#parent, 'p');
    this.#element(p, 'label', { for: id }, label);
    const input = this.#element(p, 'input', {
      form: FontSizeForm.#ID,
      id: id,
      min: '0',
      required: '',
      step: '0.01',
      type: 'number',
    });
    this.#element(
      p,
      'label',
      {
        'aria-label': 'pixlar',
        for: id,
      },
      'px'
    );
    this.#sources.push(id);
    return input;
  }

  /**
   * Skapa formuläret.
   *
   * HTML medger inte nästling av `form`-element och granskningssidan består i
   * princip av ett enda stort formulär. Metoden skapar ett separat formulär
   * för verktyget och de fält som ingår i verktyget kopplas till detta for-
   * mulär, trots att de strukturellt är underordnade sidans huvudformulär.
   *
   * @private
   */
  #formElement() {
    if (null === document.getElementById(FontSizeForm.#ID)) {
      const article = document.querySelector('article');
      this.#form = this.#element(article, 'form', {
        hidden: true,
        id: FontSizeForm.#ID,
      });
    }
  }

  /**
   * Skapa inmatningsfälten.
   *
   * Inmatningsfält för beräknad textstorlek vid 100 % zoom.
   * Inmatningsfält för beräknad textstorlek vid aktuell zoom.
   * Inmatningsfält för aktuell zoom (procent).
   *
   * @private
   */
  #inputFields() {
    this.#normal = this.#fontSizeField('fs-100', 'Normal storlek');
    this.#zoomed = this.#fontSizeField('fs-cur', 'Storlek vid zoom');
    this.#zoomField();
  }

  /**
   * Skapa och lägg till instruktionstexten.
   *
   * @private
   */
  #instructions() {
    const p = this.#element(this.#parent, 'p', { class: 'instructions' });
    p.innerHTML =
      'Om det beräknade värdet för textstorlek är \
            <em>mindre</em> vid zoom kan du kontrollera här om kravet är \
            uppfyllt. Fyll i de beräknade värdena för \
            <code translate="no" lang="en">font-size</code> vid 100\u00a0% \
            zoom respektive aktuell zoom. Fyll också i zoomgraden och \
            kontrollera sedan att förstoringen är godkänd.';
  }

  /**
   * Skapa och infoga resultatfältet.
   *
   * Utmatningsfält för beräknad förstoringsgrad.
   *
   * @private
   */
  #outputField() {
    const id = 'fs-result';
    const p = this.#element(this.#parent, 'p');
    this.#element(p, 'label', { for: id }, 'Resultat');
    this.#result = this.#element(p, 'output', {
      for: this.#sources.join(' '),
      form: FontSizeForm.#ID,
      id: id,
    });
  }

  /**
   * Anropa registrerade observatörsfunktioner och meddela om ändring.
   *
   * @private
   */
  #notifyObservers() {
    const data = {
      normal: this.#normal.valueAsNumber,
      zoomed: this.#zoomed.valueAsNumber,
      zoom: this.#zoom.valueAsNumber,
    };
    for (const observer of this.#observers) {
      observer(data);
    }
  }

  /**
   * Lägg till en lyssnare för att meddela observatörer vid värdeändringar.
   *
   * @private
   */
  #notifyOnInput() {
    this.#parent.addEventListener('input', (event) => {
      if (this.#form.checkValidity()) {
        this.#notifyObservers();
      }
    });
  }

  /**
   * Lägg till en lyssnare för att visa valideringsfel.
   *
   * Rapportera inte saknade obligatoriska värden; användaren kanske vill
   * navigera på sitt sätt eller fylla i värden i en annan ordning.
   *
   * @private
   */
  #validateOnChange() {
    this.#parent.addEventListener('change', (event) => {
      const target = event.target;
      if (!target.checkValidity() && !target.validity.missingValue) {
        target.reportValidity();
      }
    });
  }

  /**
   * Skapa och infoga inmatningsfältet för förstoringsgrad (zoom).
   *
   * @private
   */
  #zoomField() {
    const id = 'fs-zoom';
    const p = this.#element(this.#parent, 'p');
    this.#element(p, 'label', { for: id }, 'Förstoring');
    this.#zoom = this.#element(p, 'input', {
      form: FontSizeForm.#ID,
      id: id,
      min: '0',
      required: '',
      step: '10',
      type: 'number',
    });
    this.#element(p, 'label', { for: id }, '%');
    this.#sources.push(id);
  }
}

/**
 * Verktyget som beräknar förstoringsgraden.
 *
 * @example
 * Om den angivna textstorleken vid 100 % zoom är 16px och vid 400 % är 8px
 * är WCAG 1.4.4 uppfyllt. Detta då den effektiva textstorleken vid
 * 400 % är 8·4=32px, vilket jämfört med 16px är 200 %.
 */
class ResizeChecker {
  /**
   * Kontrollera om WCAG 1.4.4 är uppfyllt.
   *
   * Den effektiva storleken ska motsvara förstoringsgradne, eller åtminstone
   * dubbla storleken vid förstoringsgraden över 200 %.
   *
   * Argumenten `normal` och `zoomed` måste anges med samma måttenhet.
   *
   * @param {number} normal Beräknad textstorlek vid 100 % zoom.
   * @param {number} zoomed Beräknad textstorlek vid aktuell zoom.
   * @param {number} zoom   Förstoringsgrad (procent).
   * @return {boolean}
   */
  conforming(normal, zoomed, zoom) {
    const magnification = this.effectiveSize(zoomed, zoom) / normal;
    return magnification >= Math.min(zoom / 100, 2);
  }

  /**
   * Beräkna den effektiva textstorleken vid angiven förstoringsgrad.
   *
   * @param {number} computed Beräknad textstorlek.
   * @param {number} zoom    Förstoringsgrad (procent).
   * @return {number}
   */
  effectiveSize(computed, zoom) {
    return (computed * zoom) / 100;
  }
}

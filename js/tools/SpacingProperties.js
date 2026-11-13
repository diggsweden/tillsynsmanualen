/**
 * Hjälpmedel för att verifiera WCAG 1.4.12.
 *
 * Beräknar relativa textavstånd för att avgöra om de uppfyller kravet i WCAG.
 * Avstånd som hjälpmedlet beräknar:
 * - teckenavstånd (`letter-spacing`)
 * - ordmellanrum  (`word-spacing`)
 * - radavstånd    (`line-height`)
 * - styckeavstånd (`margin-top` eller ´margin-bottom`)
 *
 * @license CC-BY 4.0
 */

/**
 * Skapa och infoga formuläret.
 *
 * @param {HTMLElement} parent  Element att infoga formuläret i.
 * @param {object}      options Parameterar.
 */
export default function initSpacingProperties(parent, options) {
  const checker = new SpacingPropertyChecker();
  const form = new SpacingPropertiesForm(parent);
  const ctrl = new Controller(checker, form, options);
}

/**
 * Controllerklass för hjälpmedlet.
 *
 * Controllern hanterar interaktionen mellan formuläret och beräkningsverktyget.
 */
class Controller {
  // Privata fält.
  #analyzer;
  #checks;
  #controller;
  #states = {};
  #ui;

  /**
   * Konstruera en controllerinstans.
   *
   * @param {SpacingPropertyChecker} analyzer Analysverktyg.
   * @param {SpacingPropertiesForm}  ui       Användargränssnitt.
   * @param {object}                 options  Parametrar.
   */
  constructor(analyzer, ui, options) {
    this.#analyzer = analyzer;
    this.#checks = {
      letter: options.letterSpacing,
      line: options.lineHeight,
      para: options.paragraphSpacing,
      word: options.wordSpacing,
    };
    this.#controller = options.controller;
    this.#ui = ui;
    this.#ui.addObserver((data) => this.#onInput(data));
  }

  /**
   * Händelsehanterare för användargränssnittet.
   *
   * Metoden anropas när användaren ändrar värden i formuläret. Den anropar
   * analysverktyget för att beräkna de relativa textavstkaanden och uppdate-
   * rar sedan användargränssnittet med resultatet.
   *
   * @private
   * @param {object} data Värden från användargränssnittet.
   */
  #onInput(data) {
    const {
      fontSize,
      letterSpacing,
      lineHeight,
      paragraphSpacing,
      wordSpacing,
    } = data;
    let c;
    let r;

    if (letterSpacing) {
      [r, c] = this.#analyzer.letterSpacing(letterSpacing, fontSize);
      this.#ui.updateLetterSpacing(r, c);
      this.#updateCheck('letter', c);
    }

    if (wordSpacing) {
      [r, c] = this.#analyzer.wordSpacing(wordSpacing, fontSize);
      this.#ui.updateWordSpacing(r, c);
      this.#updateCheck('word', c);
    }

    if (lineHeight) {
      [r, c] = this.#analyzer.lineHeight(lineHeight, fontSize);
      this.#ui.updateLineHeight(r, c);
      this.#updateCheck('line', c);
    }

    if (paragraphSpacing) {
      [r, c] = this.#analyzer.paragraphSpacing(paragraphSpacing, fontSize);
      this.#ui.updateParagraphSpacing(r, c);
      this.#updateCheck('para', c);
    }
  }

  /**
   * Uppdatera en kontroll i granskningsformuläret.
   *
   * Sätt, via controllern, den angivna kontrollen till angivet tillstånd.
   *
   * @private
   * @param {string}  check Kontroll-id i granskningskonfigurationen.
   * @param {boolean} state Tillstånd att sätta.
   */
  #updateCheck(check, state) {
    const id = this.#checks[check];
    if (id && state !== this.#states[id]) {
      this.#states[id] = state;
      this.#controller?.setCheck?.(id, state);
    }
  }
}

/**
 * Verktygets användargränssnitt.
 */
class SpacingPropertiesForm {
  // Privata fält.
  static #ID = 'spacing-properties-form';
  #doc;
  #fontSize;
  #form;
  #letterSpacing = {};
  #lineHeight = {};
  #observers = [];
  #parent;
  #paragraphSpacing = {};
  #wordSpacing = {};

  /**
   * Konstruera en formulärinstans.
   *
   * @param {HTMLElement} parent Element att infoga fält i.
   */
  constructor(parent) {
    this.#parent = this.#element(parent, 'div', { class: 'text-spacing' });
    this.#notifyOnInput();
    this.#validateOnChange();
    this.#instructions();
    this.#formElement();
    this.#fontSizeField();
    this.#letterSpacingFields();
    this.#wordSpacingFields();
    this.#lineHeightFields();
    this.#paragraphSpacingFields();
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
   * Uppdatera resultatfältet för teckenavstånd.
   *
   * @param {number}  relative   Relativt teckenasvtånd.
   * @param {boolean} conforming Är WCAG-kravet uppfyllt?
   */
  updateLetterSpacing(relative, conforming) {
    this.#update(relative, conforming, this.#letterSpacing.output);
  }

  /**
   * Uppdatera resultatfältet för radavstånd.
   *
   * @param {number}  relative   Relativt radasvtånd.
   * @param {boolean} conforming Är WCAG-kravet uppfyllt?
   */
  updateLineHeight(relative, conforming) {
    this.#update(relative, conforming, this.#lineHeight.output);
  }

  /**
   * Uppdatera resultatfältet för styckeavstånd.
   *
   * @param {number}  relative   Relativt styckeasvtånd.
   * @param {boolean} conforming Är WCAG-kravet uppfyllt?
   */
  updateParagraphSpacing(relative, conforming) {
    this.#update(relative, conforming, this.#paragraphSpacing.output);
  }

  /**
   * Uppdatera resultatfältet för ordmellanrum.
   *
   * @param {number}  relative   Relativt ordmellanrum.
   * @param {boolean} conforming Är WCAG-kravet uppfyllt?
   */
  updateWordSpacing(relative, conforming) {
    this.#update(relative, conforming, this.#wordSpacing.output);
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
   */
  #fontSizeField() {
    const id = 'ts-font-size';
    const p = this.#element(this.#parent, 'p');
    const lbl = this.#element(p, 'label', { for: id });
    this.#element(lbl, 'code', { lang: 'en' }, 'font-size');
    this.#fontSize = this.#element(p, 'input', {
      form: SpacingPropertiesForm.#ID,
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
    if (null === document.getElementById(SpacingPropertiesForm.#ID)) {
      const article = document.querySelector('article');
      this.#form = this.#element(article, 'form', {
        hidden: true,
        id: SpacingPropertiesForm.#ID,
      });
    }
  }

  /**
   * Skapa och lägg till instruktionstexten.
   *
   * @private
   */
  #instructions() {
    let p = this.#element(this.#parent, 'p', { class: 'instructions' });
    p.textContent =
      'Fyll i de beräknade värdena för angivna \
            CSS-egenskaper i formuläret för att kontrollera om de uppfyller \
            kraven i WCAG\u00a01.4.12. \
            (Glöm inte att utöka textavstånden först!)';

    p = this.#element(this.#parent, 'p', { class: 'instructions' });
    p.innerHTML =
      'För styckemellanrum använder du det största av de \
            beräknade värdet för egenskaperna \
            <code translate="no" lang="en">margin-top<code> och \
            <code translate="no" lang="en">margin-bottom<code> för ett \
            <code>&lt;p&gt;</code>-element.';
  }

  /**
   * Skapa och infoga fälten för teckenavstånd.
   *
   * @private
   */
  #letterSpacingFields() {
    const id = 'ts-letter-spacing';
    const p = this.#element(this.#parent, 'p');
    const lbl = this.#element(p, 'label', { for: id });
    this.#element(lbl, 'code', { lang: 'en' }, 'letter-spacing');
    const input = this.#element(p, 'input', {
      form: SpacingPropertiesForm.#ID,
      id: id,
      min: '0',
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
    const output = this.#element(p, 'output', {
      for: 'ts-font-size ts-letter-spacing',
      form: SpacingPropertiesForm.#ID,
      id: `${id}-result`,
    });
    this.#letterSpacing = { input, output };
  }

  /**
   * Skapa och infoga fälten för radavstånd.
   *
   * @private
   */
  #lineHeightFields() {
    const id = 'ts-line-height';
    const p = this.#element(this.#parent, 'p');
    const lbl = this.#element(p, 'label', { for: id });
    this.#element(lbl, 'code', { lang: 'en' }, 'line-height');
    const input = this.#element(p, 'input', {
      form: SpacingPropertiesForm.#ID,
      id: id,
      min: '0',
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
    const output = this.#element(p, 'output', {
      for: 'ts-font-size ts-line-height',
      form: SpacingPropertiesForm.#ID,
      id: `${id}-result`,
    });
    this.#lineHeight = { input, output };
  }

  /**
   * Anropa registrerade observatörsfunktioner och meddela om ändring.
   *
   * @private
   */
  #notifyObservers() {
    const add = (p, v) => !isNaN(v) && (data[p] = v);
    const value = (f) => f.input.valueAsNumber;
    const data = {
      fontSize: this.#fontSize.valueAsNumber,
    };
    add('letterSpacing', value(this.#letterSpacing));
    add('lineHeight', value(this.#lineHeight));
    add('paragraphSpacing', value(this.#paragraphSpacing));
    add('wordSpacing', value(this.#wordSpacing));

    if (Object.keys(data).length > 1) {
      for (const observer of this.#observers) {
        observer(data);
      }
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
   * Skapa och infoga fälten för styckeavstånd.
   *
   * @private
   */
  #paragraphSpacingFields() {
    const id = 'ts-margin';
    const p = this.#element(this.#parent, 'p');
    const lbl = this.#element(p, 'label', { for: id });
    this.#element(lbl, 'code', { lang: 'en' }, 'margin');
    const input = this.#element(p, 'input', {
      form: SpacingPropertiesForm.#ID,
      id: id,
      min: '0',
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
    const output = this.#element(p, 'output', {
      for: 'ts-font-size ts-margin',
      form: SpacingPropertiesForm.#ID,
      id: `${id}-result`,
    });
    this.#paragraphSpacing = { input, output };
  }

  /**
   * Uppdatera ett resultatfält.
   *
   * @private
   * @param {number}            relative   Relativt teckenasvtånd.
   * @param {boolean}           conforming Är WCAG-kravet uppfyllt?
   * @param {HTMLOutputElement} output     Resultatfält.
   */
  #update(relative, conforming, output) {
    const nf = new Intl.NumberFormat('sv');
    const status = {
      true: { class: 'pass', text: 'godkänt' },
      false: { class: 'fail', text: 'underkänt' },
    };
    const rel = nf.format(Math.round(relative * 100) / 100);
    const conf = status[conforming].text;
    output.className = status[conforming].class;
    output.value = `${rel}× (${conf})`;
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
   * Skapa och infoga fälten för ordmellanrum.
   *
   * @private
   */
  #wordSpacingFields() {
    const id = 'ts-word-spacing';
    const p = this.#element(this.#parent, 'p');
    const lbl = this.#element(p, 'label', { for: id });
    this.#element(lbl, 'code', { lang: 'en' }, 'word-spacing');
    const input = this.#element(p, 'input', {
      form: SpacingPropertiesForm.#ID,
      id: id,
      min: '0',
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
    const output = this.#element(p, 'output', {
      for: 'ts-font-size ts-word-spacing',
      form: SpacingPropertiesForm.#ID,
      id: `${id}-result`,
    });
    this.#wordSpacing = { input, output };
  }
}

/**
 * Verktyget som beräknar de relativa textavstånden.
 *
 * @example
 * Om den beräknade textstorleken är 16px och det beräknade teckenavståndet är
 * 2,88px blir det relativa avståndet 0,18 vilket överstiger WCAG-kravet på
 * minst 0,12 gånger graden.
 */
class SpacingPropertyChecker {
  /**
   * Beräkna relativt teckenavstånd.
   *
   * Returnera en vektor med två element: det relativa teckenavståndet och en
   * flagga som anger om det uppfyller kravet i WCAG 1.4.12.
   *
   * @param {number} absolute Beräknat absolut teckenavstånd.
   * @param {number} fontSize Beräknad absolut teckenstorlek (grad).
   * @return {array} Relativt teckenavstånd och följsamhetsflagga.
   */
  letterSpacing(absolute, fontSize) {
    const relative = absolute / fontSize;
    const conforming = relative >= 0.12;
    return [relative, conforming];
  }

  /**
   * Beräkna relativt radavstånd.
   *
   * Returnera en vektor med två element: det relativa radavståndet och en
   * flagga som anger om det uppfyller kravet i WCAG 1.4.12.
   *
   * @param {number} absolute Beräknat absolut radavstånd.
   * @param {number} fontSize Beräknad absolut teckenstorlek (grad).
   * @return {array} Relativt radavstånd och följsamhetsflagga.
   */
  lineHeight(absolute, fontSize) {
    const relative = absolute / fontSize;
    const conforming = relative >= 1.5;
    return [relative, conforming];
  }

  /**
   * Beräkna relativt styckeavstånd.
   *
   * Returnera en vektor med två element: det relativa styckeavståndet och en
   * flagga som anger om det uppfyller kravet i WCAG 1.4.12.
   *
   * @param {number} absolute Beräknat absolut styckeavstånd.
   * @param {number} fontSize Beräknad absolut teckenstorlek (grad).
   * @return {array} Relativt styckeavstånd och följsamhetsflagga.
   */
  paragraphSpacing(absolute, fontSize) {
    const relative = absolute / fontSize;
    const conforming = relative >= 2;
    return [relative, conforming];
  }

  /**
   * Beräkna relativt ordmellanrum.
   *
   * Returnera en vektor med två element: det relativa ordmellanrummet och en
   * flagga som anger om det uppfyller kravet i WCAG 1.4.12.
   *
   * @param {number} absolute Beräknat absolut ordmellanrum.
   * @param {number} fontSize Beräknad absolut teckenstorlek (grad).
   * @return {array} Relativt ordmellanrum och följsamhetsflagga.
   */
  wordSpacing(absolute, fontSize) {
    const relative = absolute / fontSize;
    const conforming = relative >= 0.16;
    return [relative, conforming];
  }
}

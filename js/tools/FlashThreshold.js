/**
 * Hjälpmedel för att verifiera WCAG 2.3.1.
 *
 * Beräknar relativa luminansskillnader och rödmättnad för de färger som ingår i
 * flimrande innehåll, för att se om de överstiger gränsvärdena.
 *
 * Konfigurationsarametrar
 * -----------------------
 * - luminance  Identitet för kontrollen för skillnaden i relativ luminans.
 * - red        Identitet för kontrollen för rödmättnad.
 *
 * @license CC-BY 4.0
 */

/**
 * Skapa och infoga formuläret.
 *
 * @param {HTMLElement} parent  Element att infoga formuläret i.
 * @param {object}      options Parameterar.
 */
export default function initFlashThreshold(parent, options) {
  const luminance = new LuminanceChecker();
  const saturation = new SaturationChecker();
  const form = new FlashThresholdForm(parent);
  const ctrl = new Controller(luminance, saturation, form, options);
}

/**
 * Controllerklass för hjälpmedlet.
 *
 * Controllern hanterar interaktionen mellan formuläret och beräkningsverktygen.
 */
class Controller {
  // Privata fält.
  #checks;
  #controller;
  #luminance;
  #saturation;
  #ui;

  /**
   * Konstruera en controllerinstans.
   *
   * @param {LuminanceChecker}   luminance  Analysverktyg, luminans.
   * @param {SaturationChecker}  saturation Analysverktyg, rödmättnad.
   * @param {FlashThresholdForm} ui         Användargränssnitt.
   * @param {object}             options    Parametrar.
   */
  constructor(luminance, saturation, ui, options) {
    this.#checks = {
      luminance: options.luminance,
      saturation: options.red,
    };
    this.#controller = options.controller;
    this.#luminance = luminance;
    this.#saturation = saturation;
    this.#ui = ui;
    this.#ui.addObserver((data) => this.#onInput(data));
  }

  /**
   * Händelsehanterare för användargränssnittet.
   *
   * Metoden anropas när användaren ändrar värden i formuläret. Den anropar
   * analysverktygen och uppdaterar sedan användargränssnittet med resultaten.
   *
   * @private
   * @param {object} data Värden från användargränssnittet.
   */
  #onInput(data) {
    const { rgb1, rgb2 } = data;
    const lum1 = this.#luminance.luminance(rgb1);
    const lum2 = this.#luminance.luminance(rgb2);
    const deltaLum = this.#luminance.delta(lum1, lum2);
    const confLum = this.#luminance.conformance(lum1, lum2);
    const sat1 = this.#saturation.saturation(rgb1);
    const sat2 = this.#saturation.saturation(rgb2);
    const deltaSat = this.#saturation.delta(rgb1, rgb2);
    const confSat = this.#saturation.conformance(sat1, sat2, deltaSat);
    this.#ui.updateLuminance(lum1, lum2, deltaLum, confLum);
    this.#ui.updateSaturation(sat1, sat2, deltaSat, confSat);
    this.#updateCheck('luminance', confLum);
    this.#updateCheck('saturation', confSat);
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
    id && this.#controller?.setCheck?.(id, state);
  }
}

/**
 * Verktygets användargränssnitt.
 */
class FlashThresholdForm {
  // Privata fält.
  static #ID = 'flash-threshold-form';
  #deltaLum;
  #deltaSat;
  #doc;
  #form;
  #lum1;
  #lum2;
  #observers = [];
  #parent;
  #rgb1;
  #rgb2;
  #sat1;
  #sat2;

  /**
   * Konstruera en formulärinstans.
   *
   * @param {HTMLElement} parent Element att infoga fält i.
   */
  constructor(parent) {
    this.#parent = this.#element(parent, 'div', { class: 'flash-threshold' });
    this.#notifyOnInput();
    this.#validateOnChange();
    this.#instructions();
    this.#formElement();
    [this.#rgb1, this.#lum1, this.#sat1] = this.#colourFields('ft-1', 'Färg 1');
    [this.#rgb2, this.#lum2, this.#sat2] = this.#colourFields('ft-2', 'Färg 2');
    this.#deltaLuminanceOutputField();
    this.#deltaSaturationOutputField();
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
   * Uppdatera resultatfälten för luminans.
   *
   * @param {number}  lum1       Relativ luminans för färg 1.
   * @param {number}  lum2       Relativ luminans för färg 2.
   * @param {number}  delta      Relativ skillnad i relativ luminans.
   * @param {boolean} conforming Är kravet uppfyllt?
   */
  updateLuminance(lum1, lum2, delta, conforming) {
    const nf = new Intl.NumberFormat('sv');
    const status = {
      true: { class: 'pass', text: 'godkänt' },
      false: { class: 'fail', text: 'underkänt' },
    };
    this.#lum1.value = nf.format(Math.round(lum1 * 100) / 100);
    this.#lum2.value = nf.format(Math.round(lum2 * 100) / 100);
    const rel = Math.round(delta * 100);
    const conf = status[conforming].text;
    this.#deltaLum.className = status[conforming].class;
    this.#deltaLum.value = `${rel} % (${conf})`;
  }

  /**
   * Uppdatera resultatfälten för rödmättnad.
   *
   * @param {number}  sat1       Rödmättnad för färg 1.
   * @param {number}  sat2       Rödmättnad för färg 2.
   * @param {number}  delta      Skillnad i rödmättnad.
   * @param {boolean} conforming Är kravet uppfyllt?
   */
  updateSaturation(sat1, sat2, delta, conforming) {
    const nf = new Intl.NumberFormat('sv');
    const status = {
      true: { class: 'pass', text: 'godkänt' },
      false: { class: 'fail', text: 'underkänt' },
    };
    this.#sat1.value = nf.format(Math.round(sat1 * 100) / 100);
    this.#sat2.value = nf.format(Math.round(sat2 * 100) / 100);
    const rel = Math.round(delta);
    const conf = status[conforming].text;
    this.#deltaSat.className = status[conforming].class;
    this.#deltaSat.value = `${rel} (${conf})`;
  }

  /**
   * Skapa och infoga in- och utdatafält för en färgkod.
   *
   * @private
   * @param {string} id     Fältidentitet.
   * @param {string} legend Överskrift.
   * @return {array} Vektor med fälten för luminans (in/ut) och rödmättnad.
   */
  #colourFields(id, legend) {
    const fieldset = this.#element(this.#parent, 'fieldset');
    this.#element(fieldset, 'legend', {}, legend);
    const rgb = this.#colourInput(fieldset, id);
    const lum = this.#luminanceOutputField(fieldset, id);
    const sat = this.#saturationOutputField(fieldset, id);
    return [rgb, lum, sat];
  }

  /**
   * Skapa och infoga ett inmatningsfält för färgkod.
   *
   * @private
   * @param {HTMLFieldSetElement} parent Föräldraelement.
   * @param {string}              rootID Fältrotidentitet.
   * @return {HTMLInputElement}
   */
  #colourInput(parent, rootID) {
    const id = `${rootID}-rgb`;
    const p = this.#element(parent, 'p');
    this.#element(p, 'label', { for: id }, 'RGB');
    return this.#element(p, 'input', {
      form: FlashThresholdForm.#ID,
      id: id,
      required: '',
      type: 'color',
    });
  }

  /**
   * Skapa och infoga utdatafältet för skillnad i relativ luminans.
   *
   * @private
   */
  #deltaLuminanceOutputField() {
    const id = 'ft-delta-l';
    const p = this.#element(this.#parent, 'p');
    this.#element(p, 'label', { for: id }, 'ΔL');
    this.#deltaLum = this.#element(p, 'output', {
      for: 'ft-1-rgb ft-2-rgb',
      form: FlashThresholdForm.#ID,
      id: id,
    });
  }

  /**
   * Skapa och infoga utdatafältet för skillnad i rödmättnad.
   *
   * @private
   */
  #deltaSaturationOutputField() {
    const id = 'ft-delta-s';
    const p = this.#element(this.#parent, 'p');
    this.#element(p, 'label', { for: id }, 'ΔS');
    this.#deltaSat = this.#element(p, 'output', {
      for: 'ft-1-rgb ft-2-rgb',
      form: FlashThresholdForm.#ID,
      id: id,
    });
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
    if (null === document.getElementById(FlashThresholdForm.#ID)) {
      const article = document.querySelector('article');
      this.#form = this.#element(article, 'form', {
        hidden: true,
        id: FlashThresholdForm.#ID,
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
      'Fyll i de två färgerna i en övergång för att räkna ut \
            om skillnaden i relativ luminans (ΔL) eller skillnaden i \
            rödmättnad (ΔS) överstiger gränsvärdet.';
  }

  /**
   * Skapa och infoga ett utdatafält för relativ luminans.
   *
   * @private
   * @param {HTMLFieldSetElement} parent Föräldraelement.
   * @param {string}              rootID Fältrotidentitet.
   * @return {HTMLOutputElement}
   */
  #luminanceOutputField(parent, rootID) {
    const id = `${rootID}-lum`;
    const p = this.#element(parent, 'p');
    this.#element(p, 'label', { for: id }, 'Luminans');
    return this.#element(p, 'output', {
      'aria-atomic': 'true',
      'aria-live': 'polite',
      for: `${rootID}-rgb`,
      form: FlashThresholdForm.#ID,
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
      rgb1: this.#parseRGB(this.#rgb1.value),
      rgb2: this.#parseRGB(this.#rgb2.value),
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
   * Översätt en färgkod till ett RGB-värde.
   *
   * Färgkoden är en hexadecimalkod (till exempel "#3ac" eller "#32a0cf".
   * Returvärdet är ett sRGB-objekt med fälten `r`, `g` och `b`.
   *
   * @private
   * @param {string} value Färgkod (hexadecimal).
   * @param {object}
   */
  #parseRGB(value) {
    const matches = /^#(?:([0-9a-f]{3})|([0-9a-f]{6}))$/i.exec(value);

    if (null !== matches) {
      if (matches[1]) {
        return {
          r: parseInt(matches[1][0] + matches[1][0], 16) / 255,
          g: parseInt(matches[1][1] + matches[1][1], 16) / 255,
          b: parseInt(matches[1][2] + matches[1][2], 16) / 255,
        };
      } else {
        return {
          r: parseInt(matches[2].substring(0, 2), 16) / 255,
          g: parseInt(matches[2].substring(2, 4), 16) / 255,
          b: parseInt(matches[2].substring(4, 6), 16) / 255,
        };
      }
    }
  }

  /**
   * Skapa och infoga ett utdatafält för rödmättnad.
   *
   * @private
   * @param {HTMLFieldSetElement} parent Föräldraelement.
   * @param {string}              rootID Fältrotidentitet.
   * @return {HTMLOutputElement}
   */
  #saturationOutputField(parent, rootID) {
    const id = `${rootID}-sat`;
    const p = this.#element(parent, 'p');
    this.#element(p, 'label', { for: id }, 'Rödmättnad');
    return this.#element(p, 'output', {
      'aria-atomic': 'true',
      'aria-live': 'polite',
      for: `${rootID}-rgb`,
      form: FlashThresholdForm.#ID,
      id: id,
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
}

/**
 * Verktyg för att beräkna och utvärdera skillnader i relativ luminans.
 */
class LuminanceChecker {
  /**
   * Avgör om skillnaden i relativ luminans uppfyller WCAG 2.3.1.
   *
   * Skillnaden får inte överstiga 10 % av det största luminansvärdet om den
   * mörkare färgens relativa luminans är under 0,80.
   *
   * @param {number} l1 Relativ luminans för den ena färgen.
   * @param {number} l2 Relativ luminans för den andra färgen.
   * @return {boolean}
   */
  conformance(l1, l2) {
    return !(Math.min(l1, l2) < 0.8 && this.delta(l1, l2) >= 0.1);
  }

  /**
   * Beräkna skillnaden i relativ luminans mellan två värden.
   *
   * Returnvärdet är skillnaden i luminans uttryckt som en andel av den
   * största luminansen.
   *
   * @param {number} l1 Relativ luminans för den ena färgen.
   * @param {number} l2 Relativ luminans för den andra färgen.
   * @return {number}
   */
  delta(l1, l2) {
    const max = Math.max(l1, l2);
    const min = Math.min(l1, l2);
    return (max - min) / max;
  }

  /**
   * Beräkna den relativa luminansen för en färg.
   *
   * @see {@link https://www.w3.org/TR/WCAG21/#dfn-relative-luminance}
   * @param {object} sRGB   Färgvärde (sRGB).
   * @param {number} sRGB.r Rött färgvärde.
   * @param {number} sRGB.g Grönt färgvärde.
   * @param {number} sRGB.b Blått färgvärde.
   * @return {number}
   */
  luminance(rgb) {
    const norm = (v) =>
      v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    const b = norm(rgb.b);
    const g = norm(rgb.g);
    const r = norm(rgb.r);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
}

/**
 * Verktyg för att beräkna och utvärdera skillnader i rödmättnad.
 */
class SaturationChecker {
  /**
   * Avgör om skillnaden i rödmättnad uppfyller WCAG 2.3.1.
   *
   * Kravet är underkänt om någon av färgerna har en rödmättnad på minst 0,8
   * och mättnadsskillnaden är större än 20.
   *
   * @param {number} s1    Rödmättnad för den ena färgen.
   * @param {number} s2    Rödmättnad för den andra färgen.
   * @param {number} delta Skillnad i rödmättnad mellan färgerna.
   * @return {boolean}
   */
  conformance(s1, s2, delta) {
    return !((s1 >= 0.8 || s2 >= 0.8) && delta > 20);
  }

  /**
   * Beräkna skillnaden i rödmättnad mellan två värden.
   *
   * Returnera skillnaden i värdena (R - G - B) × 320, där negativa värden
   * sätts till 0.
   *
   * @param {object} rbg1 sRGB-värde för den första färgen.
   * @param {object} rbg2 sRGB-värde för den andra färgen.
   * @return {number}
   */
  delta(rgb1, rgb2) {
    const value = (s) => Math.max(s.r - s.g - s.b, 0) * 320;
    return Math.abs(value(rgb1) - value(rgb2));
  }

  /**
   * Beräkna rödmättnaden i en färg.
   *
   * @param {object} rgb sRGB-värde för färgen.
   * @return {number}
   */
  saturation(rgb) {
    const sum = rgb.r + rgb.g + rgb.b;
    return 0 === sum ? 0 : rgb.r / sum;
  }
}

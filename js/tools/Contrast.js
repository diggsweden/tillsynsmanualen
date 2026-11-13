/**
 * Kontrastanalysverktyg (WCAG 2).
 *
 * Består av ett formulär med inmatningsfält för två färger som ska testas, plus
 * fält för bakgrundsfärg och opacitet. Vid analys av textkontraster finns även
 * inmatningsfält för grad (textstorlek) och svärta.
 *
 * Konfigurationsarametrar
 * -----------------------
 * - mode  "text" för kontroll av 1.4.3, "graphics" för 1.4.11.
 *
 * @license CC-BY 4.0
 */

/**
 * Skapa och infoga formuläret.
 *
 * @param {HTMLElement} parent  Element att infoga formuläret i.
 * @param {object}      options Parameterar.
 */
export default async function initContrast(parent, options) {
  const { model } = options;
  const params = new URLSearchParams(location.search.slice(1));
  const sample = await model.getSample(Number(params.get('sample')));
  options.audit = await model.getAudit(sample?.auditID);
  options.model = model;
  const checker = new ContrastAnalyzer();
  const parser = new ColourParser();
  const form = new ContrastForm(parent, options, parser);
  const ctrl = new Controller(checker, form);
}

/**
 * Tolk för färgspecifikationer.
 *
 * Stödjer följande format:
 * - Hexadecimalt: #3c9, #32C89E
 * - RGB:          rgb(255, 240, 128)
 * - RBB:          rgb(100%, 94.2%, 50.2%)
 * - RGBA:         rgba(255, 240, 128, 0.8)
 * - RBBA:         rgb(100%, 94.2%, 50.2%, 0.8)
 * - HSL:          hsl(310, 47%, 72%)
 * - HSLA:         hsla(310, 47%, 72%, 0.6)
 * - Nyckelord:    white, DarkSlateBlue
 */
class ColourParser {
  /**
   * Tolka en färgspecifikation.
   *
   * @param {string} value Färgspecifikation att tolka.
   * @return {object} Ett RGBA-objekt.
   * @throws {TypeError} Ogiltigt färgvärde.
   */
  parse(value) {
    const methods = [
      { pattern: /^#/, method: (v) => this.#parseHex(v) },
      { pattern: /^rgba/i, method: (v) => this.#parseRGBA(v) },
      { pattern: /^rgb/i, method: (v) => this.#parseRGB(v) },
      { pattern: /^hsla/i, method: (v) => this.#parseHSLA(v) },
      { pattern: /^hsl/i, method: (v) => this.#parseHSL(v) },
      { pattern: /^[a-z]+$/i, method: (v) => this.#parseKeyword(v) },
    ];

    const mapping = methods.find((m) => m.pattern.test(value));
    if (!mapping) {
      throw new TypeError(
        'Fyll i ett färgvärde som hex, rgb(a), hsl(a) eller ' + 'CSS-nyckelord.'
      );
    }

    return mapping.method(value);
  }

  /**
   * Konvertera HSLA till RGBA.
   *
   * @private
   * @param {object} hsla HSLA-värde.
   * @return {object} Ett RGBA-objekt.
   */
  #hslaToRGBA(hsla) {
    const hueToRGB = (m1, m2, h) => {
      if (h < 0) h += 1;
      if (h > 1) h -= 1;
      if (h * 6 < 1) return m1 + (m2 - m1) * h * 6;
      if (h * 2 < 1) return m2;
      if (h * 3 < 2) return m1 + (m2 - m1) * (2 / 3 - h) * 6;

      return m1;
    };

    const h = hsla.h / 360;
    const s = hsla.s / 100;
    const l = hsla.l / 100;

    const m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
    const m1 = l * 2 - m2;

    return {
      r: Math.round(255 * hueToRGB(m1, m2, h + 1 / 3)),
      g: Math.round(255 * hueToRGB(m1, m2, h)),
      b: Math.round(255 * hueToRGB(m1, m2, h - 1 / 3)),
      a: hsla.a,
    };
  }

  /**
   * Tolka 3- eller 6-ställigt hexadecimalvärde till RGBA.
   *
   * @example
   * #3c9
   * #32C89E
   *
   * @private
   * @param {string} value Hexadecimalvärde att tolka.
   * @return {object} Ett RGBA-objekt.
   * @throws {TypeError} Ogltigt hexvärde.
   */
  #parseHex(value) {
    const matches = /^#(?:([0-9a-f]{3})|([0-9a-f]{6}))$/i.exec(value);

    if (null !== matches) {
      if (matches[1]) {
        return {
          r: parseInt(matches[1][0] + matches[1][0], 16),
          g: parseInt(matches[1][1] + matches[1][1], 16),
          b: parseInt(matches[1][2] + matches[1][2], 16),
          a: 1,
        };
      } else {
        return {
          r: parseInt(matches[2].substring(0, 2), 16),
          g: parseInt(matches[2].substring(2, 4), 16),
          b: parseInt(matches[2].substring(4, 6), 16),
          a: 1,
        };
      }
    }

    throw new TypeError(
      'Fyll i hexvärde med 3 eller 6 tecken, t.ex. #3c9, #32C89E.'
    );
  }

  /**
   * Tolka hsl()-notation till RGBA.
   *
   * @example
   * hsl(310, 47%, 72%)
   *
   * @param {string} value Notation att tolka.
   * @return {object} Ett HSLA-objekt.
   * @throws {TypeError} Ogiltig HSL-specifikation.
   */
  #parseHSL(value) {
    const matches =
      /^hsl\(\s*(\d+)\s*,\s*(\d+(?:\.\d*)?|\.\d+)%\s*,\s*(\d+(?:\.\d*)?|\.\d+)%\s*\)$/.exec(
        value
      );

    if (null !== matches) {
      return this.#hslaToRGBA({
        h: parseInt(matches[1], 10) % 360,
        s: Math.min(parseFloat(matches[2]) / 100, 1),
        l: Math.min(parseFloat(matches[3]) / 100, 1),
        a: 1,
      });
    }

    throw new TypeError('Fyll i som t.ex. hsl(310, 47%, 72%).');
  }

  /**
   * Tolka hsla()-notation till RGBA.
   *
   * @example
   * hsl(310, 47%, 72%, 0.6)
   *
   * @private
   * @param {string} value Notation att tolka.
   * @return {object} Ett HSLA-objekt.
   * @throws {TypeError} Ogiltig HSLA-specifikation.
   */
  #parseHSLA(value) {
    const matches =
      /^hsla\(\s*(\d+)\s*,\s*(\d+(?:\.\d*)?|\.\d+)%\s*,\s*(\d+(?:\.\d*)?|\.\d+)%\s*,\s*(\d+(?:\.\d*)?|\.\d+)\s*\)$/.exec(
        value
      );

    if (null !== matches) {
      return this.#hslaToRGBA({
        h: parseInt(matches[1], 10) % 360,
        s: Math.min(parseFloat(matches[2]) / 100, 1),
        l: Math.min(parseFloat(matches[3]) / 100, 1),
        a: Math.min(parseFloat(matches[4]), 1),
      });
    }

    throw new TypeError('Fyll i som t.ex. hsla(310, 47%, 72%, 0.6).');
  }

  /**
   * Tolka CSS-nyckelord till RGBA.
   *
   * @example
   * white, DarkSlateBlue
   *
   * @private
   * @param {string} value Nyckelord att tolka.
   * @return {object} Ett RGBA-objekt.
   * @throws {TypeError} Ogiltgt CSS-nyckelord för färg.
   */
  #parseKeyword(value) {
    const keywords = {
      aliceblue: [240, 248, 255],
      antiquewhite: [250, 235, 215],
      aqua: [0, 255, 255],
      aquamarine: [127, 255, 212],
      azure: [240, 255, 255],
      beige: [245, 245, 220],
      bisque: [255, 228, 196],
      black: [0, 0, 0],
      blanchedalmond: [255, 235, 205],
      blue: [0, 0, 255],
      blueviolet: [138, 43, 226],
      brown: [165, 42, 42],
      burlywood: [222, 184, 135],
      cadetblue: [95, 158, 160],
      chartreuse: [127, 255, 0],
      chocolate: [210, 105, 30],
      coral: [255, 127, 80],
      cornflowerblue: [100, 149, 237],
      cornsilk: [255, 248, 220],
      crimson: [220, 20, 60],
      cyan: [0, 255, 255],
      darkblue: [0, 0, 139],
      darkcyan: [0, 139, 139],
      darkgoldenrod: [184, 134, 11],
      darkgray: [169, 169, 169],
      darkgreen: [0, 100, 0],
      darkgrey: [169, 169, 169],
      darkkhaki: [189, 183, 107],
      darkmagenta: [139, 0, 139],
      darkolivegreen: [85, 107, 47],
      darkorange: [255, 140, 0],
      darkorchid: [153, 50, 204],
      darkred: [139, 0, 0],
      darksalmon: [233, 150, 122],
      darkseagreen: [143, 188, 143],
      darkslateblue: [72, 61, 139],
      darkslategray: [47, 79, 79],
      darkslategrey: [47, 79, 79],
      darkturquoise: [0, 206, 209],
      darkviolet: [148, 0, 211],
      deeppink: [255, 20, 147],
      deepskyblue: [0, 191, 255],
      dimgray: [105, 105, 105],
      dimgrey: [105, 105, 105],
      dodgerblue: [30, 144, 255],
      firebrick: [178, 34, 34],
      floralwhite: [255, 250, 240],
      forestgreen: [34, 139, 34],
      fuchsia: [255, 0, 255],
      gainsboro: [220, 220, 220],
      ghostwhite: [248, 248, 255],
      gold: [255, 215, 0],
      goldenrod: [218, 165, 32],
      gray: [128, 128, 128],
      green: [0, 128, 0],
      greenyellow: [173, 255, 47],
      grey: [128, 128, 128],
      honeydew: [240, 255, 240],
      hotpink: [255, 105, 180],
      indianred: [205, 92, 92],
      indigo: [75, 0, 130],
      ivory: [255, 255, 240],
      khaki: [240, 230, 140],
      lavender: [230, 230, 250],
      lavenderblush: [2550, 240, 245],
      lawngreen: [124, 252, 0],
      lemonchiffon: [255, 250, 205],
      lightblue: [173, 216, 230],
      lightcoral: [240, 128, 128],
      lightcyan: [224, 255, 255],
      lightgoldenrodyellow: [250, 250, 210],
      lightgray: [211, 211, 211],
      lightgreen: [144, 238, 144],
      lightgrey: [211, 211, 211],
      lightpink: [255, 182, 193],
      lightsalmon: [255, 160, 122],
      lightseagreen: [32, 178, 170],
      lightskyblue: [135, 206, 250],
      lightslategray: [119, 136, 153],
      lightslategrey: [119, 136, 153],
      lightsteelblue: [176, 196, 222],
      lightyellow: [255, 255, 224],
      lime: [0, 255, 0],
      limegreen: [50, 205, 50],
      linen: [250, 240, 230],
      magenta: [255, 0, 255],
      maroon: [120, 0, 0],
      mediumaquamarine: [102, 205, 170],
      mediumblue: [0, 0, 205],
      mediumorchid: [186, 85, 211],
      mediumpurple: [147, 112, 219],
      mediumseagreen: [60, 179, 113],
      mediumslateblue: [123, 104, 238],
      mediumspringgreen: [0, 250, 154],
      mediumturquoise: [72, 209, 204],
      mediumvioletred: [199, 21, 133],
      midnightblue: [25, 25, 112],
      mintcream: [245, 255, 250],
      mistyrose: [255, 228, 225],
      moccasin: [255, 228, 181],
      navajowhite: [255, 222, 173],
      navy: [0, 0, 128],
      oldlace: [253, 245, 230],
      olive: [128, 128, 0],
      olivedrab: [107, 142, 35],
      orange: [255, 165, 0],
      orangered: [255, 69, 0],
      orchid: [218, 112, 214],
      palegoldenrod: [238, 232, 170],
      palegreen: [152, 251, 152],
      paleturquoise: [175, 238, 238],
      palevioletred: [219, 112, 147],
      papayawhip: [255, 239, 213],
      peachpuff: [255, 218, 185],
      peru: [205, 133, 63],
      pink: [255, 192, 203],
      plum: [221, 160, 221],
      powderblue: [176, 224, 230],
      purple: [120, 0, 128],
      red: [255, 0, 0],
      rosybrown: [188, 143, 143],
      royalblue: [65, 105, 255],
      saddlebrown: [139, 69, 19],
      salmon: [250, 128, 114],
      sandybrown: [244, 164, 96],
      seagreen: [46, 139, 87],
      seashell: [255, 245, 238],
      sienna: [160, 82, 45],
      silver: [192, 192, 192],
      skyblue: [135, 206, 235],
      slateblue: [106, 90, 205],
      slategray: [112, 128, 144],
      slategrey: [112, 128, 144],
      snow: [255, 250, 250],
      springgreen: [0, 255, 127],
      steelblue: [70, 130, 180],
      tan: [210, 180, 140],
      teal: [0, 128, 128],
      thistle: [216, 191, 216],
      tomato: [255, 99, 71],
      turquoise: [64, 224, 208],
      violet: [238, 130, 238],
      wheat: [245, 222, 179],
      white: [255, 255, 255],
      whitesmoke: [245, 245, 245],
      yellow: [255, 255, 0],
      yellowgreen: [154, 205, 50],
    };

    if (keywords.hasOwnProperty(value.toLowerCase())) {
      const a = 1;
      const [r, g, b] = keywords[value.toLowerCase()];
      return { r, g, b, a };
    }

    throw new Error('Fyll i ett giltigt CSS-färgnamn.');
  }

  /**
   * Tolka rgb()-notation till RGBA.
   *
   * @example
   * rgb(255, 240, 128)
   * rgb(100%, 94.2%, 50.2%)
   *
   * @private
   * @param {string} value Notation att tolka.
   * @return {object} Ett RGBA-objekt.
   * @throws {TypeError} Ogiltig RGB-specifikation.
   */
  #parseRGB(value) {
    const abs = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(value);
    const rel =
      /^rgb\(\s*(\d+(?:\.\d*)?|\.\d+)%\s*,\s*(\d+(?:\.\d*)?|\.\d+)%\s*,\s*(\d+(?:\.\d*)?|\.\d+)%\s*\)$/.exec(
        value
      );

    if (abs) {
      return {
        r: Math.min(parseInt(abs[1], 10), 255),
        g: Math.min(parseInt(abs[2], 10), 255),
        b: Math.min(parseInt(abs[3], 10), 255),
        a: 1,
      };
    } else if (rel) {
      return {
        r: Math.round(2.55 * Math.min(parseFloat(rel[1]), 100)),
        g: Math.round(2.55 * Math.min(parseFloat(rel[2]), 100)),
        b: Math.round(2.55 * Math.min(parseFloat(rel[3]), 100)),
        a: 1,
      };
    }

    throw new TypeError('Fyll i som t.ex. rgb(255, 240, 128).');
  }

  /**
   * Tolka rgba()-notation till RGBA.
   *
   * @example
   * rgba(255, 240, 128, 0.8)
   * rgba(100%, 94.2%, 50.2%, 0.8)
   *
   * @private
   * @param {string} value Notation att tolka.
   * @return {object} Ett RGBA-objektk.
   * @throws {TypeError} Ogiltig RGBA-specifikation.
   */
  #parseRGBA(value) {
    const abs =
      /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+(?:\.\d*)?|\.\d+)\s*\)$/.exec(
        value
      );
    const rel =
      /^rgba\(\s*(\d+(?:\.\d*)?|\.\d+)%\s*,\s*(\d+(?:\.\d*)?|\.\d+)%\s*,\s*(\d+(?:\.\d*)?|\.\d+)%\s*,\s*(\d+(?:\.\d*)?|\.\d+)\s*\)$/.exec(
        value
      );

    if (abs) {
      return {
        r: Math.min(parseInt(abs[1], 10), 255),
        g: Math.min(parseInt(abs[2], 10), 255),
        b: Math.min(parseInt(abs[3], 10), 255),
        a: Math.min(parseFloat(abs[4]), 1),
      };
    } else if (rel) {
      return {
        r: Math.round(2.55 * Math.min(parseFloat(rel[1]), 100)),
        g: Math.round(2.55 * Math.min(parseFloat(rel[2]), 100)),
        b: Math.round(2.55 * Math.min(parseFloat(rel[3]), 100)),
        a: Math.min(parseFloat(rel[4]), 1),
      };
    }

    throw new TypeError('Fyll i som t.ex. rgba(255, 240, 128, 0.8).');
  }
}

/**
 * Kontrastanalysator.
 *
 * Beräknar kontrastförhållandet mellan två färger enligt den algoritm som
 * beskrivs i WCAG 2.1.
 *
 * @see {@link https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio|WCAG algorithm}
 */
class ContrastAnalyzer {
  /**
   * Returnera till vilken nivå en kontrast uppfyller kraven.
   *
   * Returnera "a", "aa" eller "aaa" beroende på kontrastvärde och
   * om det avser stor text eller annat än text.
   *
   * @param {number} constrast   Kontrastvärde.
   * @param {number} [fontSize]  Textstorlek i pixel.
   * @param {number} [fontWeight] Svärta (100-900);
   * @return {string} "a", "aa" eller "aaa".
   */
  conformance(contrast, fontSize = -1, fontWeight = -1) {
    const pt = (px) => px / 0.75;
    if (fontSize < 0 || fontWeight < 0) {
      return contrast >= 3 ? 'aa' : 'a';
    } else if (fontSize >= (fontWeight >= 700 ? pt(14) : pt(18))) {
      return contrast >= 4.5 ? 'aaa' : contrast >= 3 ? 'aa' : 'a';
    }

    return contrast >= 7 ? 'aaa' : contrast >= 4.5 ? 'aa' : 'a';
  }

  /**
   * Beräkna kontrastförhållande mellan två färger.
   *
   * @param {object} bg Bakgrund/färg 1 som RGB.
   * @param {object} fg Förgrund/färg 2 som RGB.
   * @return {number}
   */
  contrast(bg, fg) {
    const fromSRGB = (s) =>
      s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);

    const convertRGB = (rgb) => ({
      r: fromSRGB(rgb.r / 255),
      g: fromSRGB(rgb.g / 255),
      b: fromSRGB(rgb.b / 255),
    });

    const luminance = ({ r, g, b }) => r * 0.2126 + g * 0.7152 + b * 0.0722;

    const l1 = luminance(convertRGB(bg));
    const l2 = luminance(convertRGB(fg));

    return (
      Math.round(
        ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100
      ) / 100
    );
  }

  /**
   * Normalisera färger.
   *
   * Beräkna den effektiva färgen för en förgrundsfärg med transparens,
   * där även hela elementet kan ha transparens.
   *
   * Returnera ett RGBA-värde.
   *
   * @param {object} fg      Förgrundsfärg som RGBA.
   * @param {object} bg      Bakgrundsfärg som RGB.
   * @param {number} opacity Elementets opacitet.
   * @return {object} Ett RGBA-objekt.
   */
  normalize(fg, bg, opacity) {
    const normalizeValue = (fgVal, bgVal, alpha) =>
      bgVal + Math.round((fgVal - bgVal) * alpha * opacity);

    return {
      r: normalizeValue(fg.r, bg.r, fg.a),
      g: normalizeValue(fg.g, bg.g, fg.a),
      b: normalizeValue(fg.b, bg.b, fg.a),
      a: 1,
    };
  }
}

/**
 * Kontrastanalysatorns användargränssnitt.
 */
class ContrastForm {
  // Privata fält.
  static #ID = 'contrast-form';
  #audit;
  #background;
  #colour1;
  #colour2;
  #colourStore;
  #conformance;
  #fontSize;
  #fontWeight;
  #form;
  #graphic1;
  #graphic2;
  #model;
  #observers = [];
  #opacity;
  #parent;
  #parser;
  #result;
  #sample;
  #sources = [];
  #status;
  #textMode;

  /**
   * Konstruera en formulärinstans.
   *
   * @param {HTMLElement}  parent  Element att infoga fält i.
   * @param {object}       options Parametrar.
   * @param {ColourParser} parser  Färgspecifikationstolk.
   */
  constructor(parent, options, parser) {
    this.#audit = options.audit;
    this.#model = options.model;
    this.#parent = this.#element(parent, 'div', { class: 'contrast' });
    this.#element(this.#parent, 'h4', {}, 'Kontrollera kontrast');
    this.#parser = parser;
    this.#parent.addEventListener('change', (event) => {
      const target = event.target;
      target.parentNode.classList.add('validated');
      if (this.#form.checkValidity()) {
        this.#notifyObservers();
      } else if (!target.checkValidity() && !target.validity.missingValue) {
        target.reportValidity();
      }
    });
    this.#textMode = 'text' === (options.mode ?? 'text');
    this.#formElement();
    this.#details();
    this.#inputFields();
    this.#outputFields();
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
   * Uppdatera resultatet.
   *
   * Sätt angivet kontrastförhållande och överensstämmelsenivå.
   * Uppdatera även exemplen med aktuella färger.
   *
   * @param {number} contrast    Kontrastförhållande.
   * @param {string} conformance Överensstämmelse (a/aa/aaa).
   */
  update(contrast, conformance) {
    const bool = (c) => (c ? 'true' : 'false');
    const fmt = (n) => new Intl.NumberFormat('sv').format(n);
    const hide = (e, c) => e.setAttribute('aria-hidden', bool(c));
    this.#conformance.className = conformance;
    const levels = this.#conformance.children;
    const ratio = Math.round(100 * contrast) / 100;
    this.#result.value = `${fmt(ratio)}:1`;
    this.#result.tabIndex = 0;
    this.#status.textContent = '';
    this.#result.setAttribute('aria-label', `${ratio} till ett`);
    hide(levels[1], 'a' === conformance);
    hide(levels[2], 'aaa' !== conformance);
    if (this.#textMode) {
      const parent = this.#sample.parentNode;
      parent.style.backgroundColor = this.#background.value ?? 'transparent';
      parent.style.fontSize = `${this.#fontSize.value}px`;
      parent.style.fontWeight = this.#fontWeight.value;
      this.#sample.style.backgroundColor = this.#colour2.value;
      this.#sample.style.color = this.#colour1.value;
      this.#sample.style.opacity = this.#opacity.value;
    } else {
      this.#graphic1.parentNode.style.backgroundColor =
        this.#background.value ?? 'transparent';
      this.#graphic1.style.backgroundColor = this.#colour2.value;
      this.#graphic1.style.opacity = this.#opacity.value;
      this.#graphic2.style.backgroundColor = this.#colour1.value;
      this.#graphic2.style.opacity = this.#opacity.value;
    }
  }

  /**
   * Skapa och infoga ett färgspecifikationsfält.
   *
   * Består av en ledtext, en färgväljarknapp, ett inmatningsfält med en
   * kompletteringslista och en knapp för att lägga till eller ta bort en färg
   * från kompletteringslistan.
   *
   * @private
   * @param {string}  id         Fältidentitet.
   * @param {string}  label      Ledtext.
   * @param {boolean} [required] Obligatoriskt?
   * @return {HTMLInputElement}
   */
  #colourField(id, label, required = true) {
    const p = this.#element(this.#parent, 'p', { class: 'input' });
    this.#element(p, 'label', { for: id }, label);
    const span = this.#element(p, 'span');
    const input = this.#element(span, 'input', {
      form: ContrastForm.#ID,
      id: id,
      list: 'colour-store',
      type: 'text',
    });
    input.required = required;
    this.#picker(input, label.toLowerCase());
    this.#sources.push(id);
    const save = this.#storageButton(input);
    input.addEventListener('input', (event) => {
      if ('' !== input.value) {
        try {
          this.#parser.parse(input.value);
          input.setCustomValidity('');
          input.removeAttribute('aria-invalid');
          save.disabled = false;
          if (this.#audit.hasColour(input.value)) {
            this.#makeDelete(save);
          } else {
            this.#makeSave(save);
          }
        } catch (err) {
          input.setCustomValidity(err.message);
          input.setAttribute('aria-invalid', 'true');
          save.disabled = true;
        }
      }
    });
    return input;
  }

  /**
   * Skapa listan med sparade färger.
   *
   * Listan är ett `datalist`-element som kopplas till färginmatningsfälten
   * som kompletteringsförslag.
   *
   * @private
   */
  #datalist() {
    this.#colourStore = this.#element(this.#form, 'datalist', {
      id: 'colour-store',
    });
    for (const [value, name] of this.#audit.colours()) {
      this.#datalistOption(name, value);
    }
  }

  /**
   * Skapa ett element i kompletteringslistan för färger.
   *
   * @private
   * @param {string} name  Namn.
   * @param {string} value Färgvärde.
   */
  #datalistOption(name, value) {
    const option = new Option(name, value);
    this.#colourStore.appendChild(option);
  }

  /**
   * Skapa ett utfällbart avsnitt med hjälpinformation.
   *
   * @private
   */
  #details() {
    const code = (c, t) => `<code>${c}</code>${t ?? ''}`;
    const details = this.#element(this.#parent, 'details');
    const li = (c, t) => this.#element(ul, 'li', {}, code(c, t));
    this.#element(details, 'summary', {}, 'Färger');
    const ul = this.#element(details, 'ul');
    li('#5a675c', ' (= <code>#5A675C</code>)');
    li('#369', ' (= <code>#336699</code>)');
    li('rgb(90, 103, 92)');
    li('rgb(35.3%, 40.4%, 36.1%)');
    li('rgba(35.3%, 40.4%, 36.1%, 0.6)');
    li('hsl(129, 7%, 38%)');
    li('hsl(129, 7%, 38%, 0.6)');
    li('MediumTurquoise', ' etc. (CSS-nyckelord)');
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
    const id = 'font-size';
    const p = this.#element(this.#parent, 'p', { class: 'input' });
    this.#element(p, 'label', { for: id, lang: 'en' }, 'font-size');
    const span = this.#element(p, 'span');
    this.#fontSize = this.#element(span, 'input', {
      class: 'int',
      form: ContrastForm.#ID,
      id: id,
      max: '96',
      min: '0',
      required: '',
      step: '1',
      type: 'number',
      value: '16',
    });
    this.#element(
      span,
      'label',
      {
        'aria-label': 'pixlar',
        for: id,
      },
      'px'
    );
    this.#sources.push(id);
  }

  /**
   * Skapa och infoga inmatningsfältet för svärta.
   *
   * @private
   */
  #fontWeightField() {
    const id = 'font-weight';
    const p = this.#element(this.#parent, 'p', { class: 'input' });
    this.#element(p, 'label', { for: id, lang: 'en' }, 'font-weight');
    const span = this.#element(p, 'span');
    this.#fontWeight = this.#element(span, 'input', {
      class: 'int',
      form: ContrastForm.#ID,
      id: id,
      max: '900',
      min: '100',
      required: '',
      step: '100',
      type: 'number',
      value: '400',
    });
    this.#sources.push(id);
  }

  /**
   * Skapa formuläret.
   *
   * HTML medger inte nästling av `form`-element och granskningssidan består i
   * princip av ett enda stort formulär. Metoden skapar ett separat formulär
   * för kontrastanalysatorn och de fält som ingår i verktyget kopplas till
   * detta formulär, trots att de strukturellt är underordnade sidans huvud-
   * formulär.
   *
   * @private
   */
  #formElement() {
    if (null === document.getElementById(ContrastForm.#ID)) {
      const article = document.querySelector('article');
      this.#form = this.#element(article, 'form', {
        hidden: true,
        id: ContrastForm.#ID,
      });
      this.#datalist();
    }
  }

  /**
   * Skapa en ikon i form av ett SVG-element.
   *
   * @private
   * @param {string} id Ikonens ID i `ikoner.svg`.
   * @return {SVGSVGElement}
   */
  #icon(id) {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const XLINK_NS = 'http://www.w3.org/1999/xlink';
    const icon = `../img/ikoner.svg#${id}`;
    const svg = document.createElementNS(SVG_NS, 'svg');
    const use = document.createElementNS(SVG_NS, 'use');
    svg.setAttribute('aria-hidden', 'true');
    use.setAttributeNS(XLINK_NS, 'xlink:href', icon);
    svg.appendChild(use);
    return svg;
  }

  /**
   * Skapa inmatningsfälten.
   *
   * Inmatningsfält för de två färgerna som ska jämföras, opacitet och bak-
   * grundsfärg samt, för textkontrast, grad och svärta.
   *
   * Fälten skapas i sidans huvudformulär, men associeas med kontrastanalysa-
   * torns formulär med hjälp av `form`-attribut.
   *
   * @private
   */
  #inputFields() {
    const text = (t, g) => (this.#textMode ? t : g);
    this.#colour1 = this.#colourField('colour-1', text('Textfärg', 'Färg 1'));
    this.#colour2 = this.#colourField(
      'colour-2',
      text('Textbakgrund', 'Färg 2')
    );
    this.#opacityField();
    this.#background = this.#colourField(
      'bg-colour',
      'Sidans bakgrundsfärg',
      false
    );
    if (this.#textMode) {
      this.#fontSizeField();
      this.#fontWeightField();
    }
  }

  /**
   * Sätter en spara/ta bort-knapp i "radera"-läge.
   *
   * @private
   * @param {HTMLButtonElement} button Spara/ta bort-knapp.
   */
  #makeDelete(button) {
    button.setAttribute('data-action', 'delete');
    const [svg] = button.children;
    const [use] = svg.children;
    const path = use.getAttribute('xlink:href').replace(/#.*/, '');
    use.setAttribute('xlink:href', `${path}#ico-delete`);
  }

  /**
   * Sätter en spara/ta bort-knapp i "spara"-läge.
   *
   * @private
   * @param {HTMLButtonElement} button Spara/ta bort-knapp.
   */
  #makeSave(button) {
    button.setAttribute('data-action', 'save');
    const [svg] = button.children;
    const [use] = svg.children;
    const path = use.getAttribute('xlink:href').replace(/#.*/, '');
    use.setAttribute('xlink:href', `${path}#ico-save`);
  }

  /**
   * Anropa registrerade observatörsfunktioner och meddela om ändring.
   *
   * @private
   */
  #notifyObservers() {
    const white = { r: 255, g: 255, b: 255, a: 1 };
    const rgb = (s) => (s ? this.#parser.parse(s) : white);
    const data = {
      background: rgb(this.#background.value),
      colour1: rgb(this.#colour1.value),
      colour2: rgb(this.#colour2.value),
      opacity: this.#opacity.valueAsNumber,
    };
    if (this.#textMode) {
      (data.fontSize = this.#fontSize.valueAsNumber),
        (data.fontWeight = this.#fontWeight.valueAsNumber);
    }
    for (const observer of this.#observers) {
      observer(data);
    }
  }

  /**
   * Skapa och infoga inmatningsfältet för opacitet.
   *
   * @private
   */
  #opacityField() {
    const id = 'opacity';
    const p = this.#element(this.#parent, 'p', { class: 'input' });
    this.#element(p, 'label', { for: id }, 'Opacitet');
    const span = this.#element(p, 'span');
    this.#opacity = this.#element(span, 'input', {
      class: 'num-0-1',
      form: ContrastForm.#ID,
      id: id,
      max: '1',
      min: '0',
      required: '',
      step: '0.01',
      type: 'number',
      value: '1',
    });
    this.#sources.push(id);
  }

  /**
   * Skapa och infoga resultatfälten.
   *
   * Utmatningsfält för kontrastförhållande och konformitetsnivå.
   * Exempelfält som visar färgerna.
   *
   * @private
   */
  #outputFields() {
    this.#resultFields();
    if (this.#textMode) {
      this.#sampleText();
    } else {
      this.#sampleGraphic();
    }
  }

  /**
   * Skapa och infoga en färgväljarknapp.
   *
   * Om webbläsaren inte har stöd för `EyeDropper`-gränssnittet gör metoden
   * ingenting.
   *
   * @private
   * @param {HTMLInputElement} input TillhÖrande inmatningsfält.
   * @param {string}           label Knapptext.
   */
  #picker(input, label) {
    if ('undefined' !== typeof EyeDropper) {
      const button = this.#element(
        null,
        'button',
        {
          class: 'eye-dropper',
          form: ContrastForm.#ID,
          type: 'button',
        },
        `<span>Hämta ${label}</span>`
      );
      const span = input.parentNode;
      const svg = this.#icon('ico-sample');
      button.insertBefore(svg, button.firstChild);
      span.parentNode.insertBefore(button, span);
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const eyeDropper = new EyeDropper();
        (async () => {
          try {
            const colour = await eyeDropper.open();
            input.value = colour.sRGBHex;
            this.#notifyObservers();
          } catch (cancelled) {}
        })();
      });
    }
  }

  /**
   * Skapa och infoga resultatfält för kontrast och konformitetsnivå.
   *
   * @private
   */
  #resultFields() {
    const levelID = 'conformance-level';
    const p = this.#element(this.#parent, 'p', {
      'aria-atomic': 'true',
      'aria-live': 'true',
      class: 'result',
    });
    const resultID = 'contrast-ratio';
    this.#element(p, 'label', { for: resultID }, 'Kontrast');
    this.#result = this.#element(p, 'output', {
      form: ContrastForm.#ID,
      id: resultID,
      title: 'Klicka för att kopiera',
    });
    this.#element(p, 'label', { for: levelID }, 'Överensstämmelse');
    this.#conformance = this.#element(p, 'output', {
      'aria-label': 'inte beräknad',
      for: this.#sources.join(' '),
      form: ContrastForm.#ID,
      id: levelID,
    });
    this.#element(this.#conformance, 'span', {}, 'A');
    this.#element(this.#conformance, 'span', {}, 'A');
    this.#element(this.#conformance, 'span', {}, 'A');
    this.#status = this.#element(p, 'span', { role: 'alert' });
    const copyRatio = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!navigator.clipboard) {
        alert('Din webbläsare stödjer inte kopiering.');
        return;
      }
      try {
        const value = this.#result.value.replace(/:.*/, '');
        await navigator.clipboard.writeText(value);
        this.#status.textContent = 'Kopierat';
      } catch (err) {
        this.#status.textContent = err.toString();
      }
    };
    this.#result.addEventListener('click', copyRatio);
    this.#result.addEventListener('keydown', (event) => {
      if ('Enter' === event.key) {
        copyRatio(event);
      }
    });
  }

  /**
   * Skapa och infoga element som visar färgexempel för grafik.
   *
   * @private
   */
  #sampleGraphic() {
    const div = this.#element(this.#parent, 'div', {
      'aria-hidden': 'true',
      class: 'sample-graphic',
    });
    this.#graphic1 = this.#element(div, 'div');
    this.#graphic2 = this.#element(this.#graphic1, 'span');
  }

  /**
   * Skapa och infoga element som visar textexempel.
   *
   * @private
   */
  #sampleText() {
    const p = this.#element(this.#parent, 'p', {
      'aria-hidden': 'true',
      class: 'sample-text',
    });
    this.#sample = this.#element(p, 'span', {}, 'ÅIWfgl12&§');
  }

  /**
   * Skapa och infoga en knapp för tillägg/borttag av sparade färger.
   *
   * Skapa en behållare med en knapp och ett namnfält. Knappen används för att
   * lägga till eller ta bort en färg i granskningen. Namnfältet visas när
   * användaren väljaer att spara en färg.
   *
   * @private
   * @param {HTMLInputElement} input Tillhörande inmatningsfält.
   * @return {HTMLButtonElement}
   */
  #storageButton(input) {
    const container = this.#element(input.parentNode, 'span');
    const button = this.#element(
      container,
      'button',
      {
        'aria-expanded': 'false',
        'aria-haspopup': 'dialog',
        class: 'storage',
        'data-action': 'save',
        disabled: '',
        form: ContrastForm.#ID,
        type: 'button',
      },
      '<span>Spara</span>'
    );
    const svg = this.#icon('ico-save');
    button.insertBefore(svg, button.firstChild);

    const dialog = this.#element(container, 'span', {
      'aria-label': 'Spara färgvärde',
      'aria-modal': 'true',
      role: 'dialog',
    });
    const guard1 = this.#element(dialog, 'span', { tabindex: '0' });
    const span = this.#element(dialog, 'span', { class: 'dialog' });

    this.#element(span, 'label', { for: `${input.id}-name` }, 'Namn');
    const name = this.#element(span, 'input', {
      disabled: true,
      form: ContrastForm.#ID,
      id: `${input.id}-name`,
      required: true,
      type: 'text',
    });

    const btns = this.#element(span, 'span');
    const save = this.#element(
      btns,
      'button',
      {
        form: ContrastForm.#ID,
        type: 'button',
      },
      'Spara'
    );
    save.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.#audit.setColour(name.value, input.value);
      this.#model.setAudit(this.#audit);
      this.#datalistOption(name.value, input.value);
      button.focus();
      button.setAttribute('aria-expanded', 'false');
      name.disabled = true;
    });

    const cancel = this.#element(
      btns,
      'button',
      {
        form: ContrastForm.#ID,
        type: 'button',
      },
      'Avbryt'
    );
    cancel.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.focus();
      button.setAttribute('aria-expanded', 'false');
      name.disabled = true;
    });

    const guard2 = this.#element(dialog, 'span', { tabindex: '0' });
    document.body.addEventListener(
      'focus',
      (event) => {
        if ('true' === button.getAttribute('aria-expanded')) {
          if (guard1 === event.target) {
            cancel.focus();
          } else if (guard2 === event.target) {
            name.focus();
          }
        }
      },
      true
    );
    document.body.addEventListener('keyup', (event) => {
      if (
        'true' === button.getAttribute('aria-expanded') &&
        'Escape' === event.key
      ) {
        button.focus();
        button.setAttribute('aria-expanded', 'false');
        name.disabled = true;
      }
    });

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if ('save' === button.dataset.action) {
        button.setAttribute('aria-expanded', 'true');
        name.disabled = false;
        name.focus();
      } else {
        this.#audit.deleteColour(input.value);
        this.#model.setAudit(this.#audit);
        Array.from(this.#colourStore.options)
          .find((o) => o.value === input.value)
          ?.remove();
        this.#makeSave(button);
      }
    });

    return button;
  }
}

/**
 * Controllerklass för kontrastanalysverketyet.
 *
 * Controllern hanterar interaktionen mellan formuläret och analysverktyget.
 */
class Controller {
  // Privata fält.
  #analyzer;
  #ui;

  /**
   * Konstruera en controllerinstans.
   *
   * @param {ContrastAnalyzer} analyzer Analysverktyg.
   * @param {ContrastForm}     ui       Användargränssnitt.
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
   * analysverktyget för att beräkna kontrast och konformitetsnivå och upp-
   * daterar sedan anväandargränssnittet med resultatet.
   *
   * @private
   * @param {object} values Värden från användargränssnittet.
   */
  #onInput(values) {
    let bg = values.colour2;
    const norm = (fg, bg, op) => this.#analyzer.normalize(fg, bg, op);
    if (values.colour2.a < 1 || values.opacity < 1) {
      const white = { r: 255, g: 255, b: 255, a: 1 };
      bg = norm(values.colour2, values.background ?? white, values.opacity);
    }
    const fg = norm(values.colour1, bg, values.opacity);
    const ratio = this.#analyzer.contrast(bg, fg);
    const size = values.fontSize ?? -1;
    const weight = values.fontWeight ?? -1;
    const level = this.#analyzer.conformance(ratio, size, weight);
    this.#ui.update(ratio, level);
  }
}

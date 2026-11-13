/**
 * Diagram i SVG-format.
 *
 * @license CC-BY 4.0
 */
export class SVGChart {
  // Privata fält.
  #doc = document;

  // Åtkomstmetoder för DOM-dokumentet.
  get document() {
    return this.#doc;
  }

  set document(doc) {
    this.#doc = doc;
  }

  /**
   * Skapa ett liggande stapeldiagram.
   *
   * @see HorizontalBarChart
   * @return {HorizontalBarChart}
   */
  horizontalBarChart() {
    return new HorizontalBarChart(this.#doc);
  }
}

/**
 * Liggande stapeldiagram.
 *
 * Ett liggande stapeldiagram i form av ett SVG-element. Diagrammet förmedlar
 * roller och värden som en tabell mot tillgänglighets-API:et.
 *
 * Diagrammet kan ha följande beståndsdelar:
 * - X-axel ovanför diagrammet, automatisk skala.
 * - Vertikala stödlinjer motsvarande varje värdepunkt på X-axeln.
 * - En vertikal indikatorlinje för ett specifikt värde.
 * - Zoner i form av rektanglar som kan färgläggas via CSS.
 * - Datastaplar med textetikett och datavärde; exponeras som tabellrad/celler.
 *
 * @license CC-BY 4.0
 * @property {boolean}  axis      Visa X-axel?
 * @property {string}   cssClass  Klassnamn för formgivning med CSS.
 * @property {number}   decimals  Antal decimaler i datavärden.
 * @property {number}   indicator Indikatorvärde.
 * @property {boolean}  lines     Visa stödlinjer?
 * @property {string}   locale    Språk vid formatering av datavärden.
 * @property {number}   minEnd    Minsta ändpunktsvärde.
 */
class HorizontalBarChart {
  // Privata fält.
  #cssClass;
  #data = [];
  #decimals = 0;
  #doc;
  #em = 12;
  #end;
  #fmt;
  #hasAxis = false;
  #hasLines = false;
  #height;
  #increment;
  #indicator;
  #labelWidth = 0;
  #locale = 'sv';
  #maxValue = 0;
  #minEnd = 1;
  #scale;
  #svg;
  #x0;
  #width = 500;
  #zones;

  /**
   * Konstruera en diagraminstans.
   *
   * @param {Document} doc DOM-dokument.
   */
  constructor(doc) {
    this.#doc = doc;
  }

  /**
   * Lägg till en datastapel i diagrammet.
   *
   * @param {string} label Etikett.
   * @param {number} value Datavärde.
   */
  addBar(label, value) {
    this.#data.push([label, value]);
  }

  /**
   * Lägg till en zon i diagrammet.
   *
   * En zon är en rektangel längs hela diagramytans höjd mellan angivna X-
   * värden. Zoner utanför ändvärdet renderas inte.
   *
   * @param {number} from     Zonens startvärde.
   * @param {number} to       Zonens slutvärde.
   * @param {string} cssClass Klassnamn för formgivning med CSS.
   */
  addZone(from, to, cssClass) {
    this.#zones ??= [];
    this.#zones.push([from, to, cssClass]);
  }

  // Åtkomstmetod för X-axel.
  get axis() {
    return this.#hasAxis;
  }

  set axis(flag) {
    this.#hasAxis = Boolean(flag);
  }

  // Åtkomstmetoder för CSS-klass.
  get cssClass() {
    return this.#cssClass;
  }

  set cssClass(name) {
    this.#cssClass = String(name);
  }

  // Åtkomstmetod för antal decimaler.
  get decimals() {
    return this.#decimals;
  }

  set decimals(value) {
    this.#decimals = Math.max(0, Number(value));
  }

  // Åtkomstmetoder för indikatorvärde.
  get indicator() {
    return this.#indicator;
  }

  set indicator(value) {
    this.#indicator = Number(value);
  }

  // Åtkomstmetoder för stödlinjer.
  get lines() {
    return this.#hasLines;
  }

  set lines(flag) {
    this.#hasLines = Boolean(flag);
  }

  // Åtkomstmetod för språk.
  get locale() {
    return this.#locale;
  }

  set locale(lang) {
    this.#locale = String(lang);
  }

  // Åtkomstmetoder för minsta ändpunktsvärde.
  get minEnd() {
    return this.#minEnd;
  }

  set minEnd(value) {
    this.#minEnd = Math.max(Number(value), 1);
  }

  /**
   * Generera diagramelementet.
   *
   * @return {SVGSVGElement}
   */
  render() {
    if (0 === this.#data.length) {
      throw new TypeError('Lägg till data innan du skapar diagrammet.');
    }

    let rows = this.#data.length;
    this.#height = 1.25 * this.#em * rows + this.#em;
    let height = this.#height;
    this.#hasAxis && (height += 1.25 * this.#em);
    const attr = {
      role: 'table',
      viewBox: `0 0 ${this.#width} ${height}`,
    };
    this.#cssClass && (attr.class = this.#cssClass);
    this.#svg = this.#element(null, 'svg', attr);

    let y = (this.#hasAxis ? 1.25 : 0) * this.#em;
    this.#parameters();
    this.#setFormat();
    this.#zones && this.#renderZones(y);
    this.#hasLines && this.#lines(y);
    this.#hasAxis && this.#axis();
    this.#indicator && this.#indicatorLine(y);

    y += 0.5 * this.#em;
    for (const [label, value] of this.#data) {
      y = this.#bar(y, label, value);
    }

    return this.#svg;
  }

  /**
   * Generera en X-axel med värdepunkter.
   *
   * Ändpunkt och intervaller beräknas automatiskt utifrån tillagda staplar.
   *
   * @private
   */
  #axis() {
    let attr = {
      'aria-hidden': 'true',
      class: 'axis',
      role: 'none',
      transform: `translate(${this.#x0} 0)`,
    };
    const group = this.#element(this.#svg, 'g', attr);

    // Axellinje.
    const y = 1.25 * this.#em;
    attr = { x1: 0, y1: y, x2: this.#x(this.#end), y2: y };
    this.#element(group, 'line', attr);

    // Värdepunkter längs axeln.
    const dx = this.#x(this.#increment);
    const end = this.#end;
    const inc = this.#increment;
    for (let value = 0, x = 0; value <= end; value += inc, x += dx) {
      attr = { x, y: (this.#em * 5) / 6 };
      this.#text(this.#element(group, 'text', attr), String(value));
    }
  }

  /**
   * Generera en grupp med en datastapel.
   *
   * Gruppen består av två textelement som agerar tabellceller och en rektan-
   * gel som är den synliga stapeln.
   *
   * @private
   * @param {number} y     Y-koordinat.
   * @param {string} label Etikett.
   * @param {number} value Värde.
   * @return {number} Stapelhöjden i pixlar.
   */
  #bar(y, label, value) {
    let attr = {
      class: 'bar',
      role: 'row',
      transform: `translate(0 ${y})`,
    };
    const group = this.#element(this.#svg, 'g', attr);

    // Etikett till vänster om diagramytan.
    attr = { role: 'cell', x: this.#labelWidth, y: (this.#em * 5) / 6 };
    this.#text(this.#element(group, 'text', attr), label);

    // Stapel.
    const width = Math.max(this.#x(value), 1);
    attr = { x: this.#x0, y: 0, width, height: this.#em };
    this.#element(group, 'rect', attr);

    // Värdet, inuti eller till höger om stapeln.
    const text = this.#format(value);
    const tw = text.length * this.#em;
    let x = this.#x(value);
    const offset = ((x < tw ? 1 : -1) * this.#em) / 4;
    x += this.#x0 + offset;
    attr = {
      class: offset > 0 ? 'outside' : 'inside',
      role: 'cell',
      x: x,
      y: (this.#em * 5) / 6,
    };
    this.#text(this.#element(group, 'text', attr), text);
    return y + 1.25 * this.#em;
  }

  /**
   * Skapa ett element.
   *
   * @private
   * @param {(Element|null)} parent Eventuellt föräldralement att infoga i.
   * @param {string}         tag    Elementtyp.
   * @param {object}         [attr] Eventuella attribut.
   * @return {Element}
   */
  #element(parent, tag, attr = {}) {
    const NS = 'http://www.w3.org/2000/svg';
    const element = this.#doc.createElementNS(NS, tag);
    for (const [name, value] of Object.entries(attr)) {
      element.setAttribute(name, String(value));
    }
    parent?.appendChild(element);
    return element;
  }

  /**
   * Formatera ett datavärde som presenteras som en tabellcell.
   *
   * Formatet styrs av angivet språk och antalet decimaler.
   *
   * @private
   * @param {number} value Datavärde att formatera.
   * @return {string}
   */
  #format(value) {
    return this.#fmt.format(value);
  }

  /**
   * Generera en indikatorlinje.
   *
   * Linjen är en vertikal linje vid angivet värde.
   *
   * @private
   * @param {number} y Y-koordinat.
   */
  #indicatorLine(y) {
    const x = this.#x0 + this.#x(this.#indicator);
    const attr = {
      class: 'indicator',
      x1: x,
      y1: y,
      x2: x,
      y2: y + this.#height,
    };
    this.#element(this.#svg, 'line', attr);
  }

  /**
   * Generera en grupp med stödlinjer.
   *
   * Gruppen innehåller vertikala stödlinjer för värdepunkterna längs X-axeln
   * (oavsett om det finns en synlg X-axel).
   *
   * @private
   * @param {number} y Y-koordinat.
   */
  #lines(y) {
    let attr = {
      'aria-hidden': 'true',
      class: 'grid',
      role: 'none',
      transform: `translate(${this.#x0} ${y})`,
    };
    const group = this.#element(this.#svg, 'g', attr);

    const dx = this.#x(this.#increment);
    const end = this.#end;
    const inc = this.#increment;
    const y1 = 0;
    const y2 = this.#height;
    for (let value = 0, x = 0; value <= end; value += inc, x += dx) {
      attr = { x1: x, y1, x2: x, y2 };
      this.#element(group, 'line', attr);
    }
  }

  /**
   * Beräkna parametrar som används vid renderingen.
   *
   * @private
   */
  #parameters() {
    const params = {
      value: 0,
      width: 0,
    };

    this.#data.reduce((p, [label, value]) => {
      p.value = Math.max(p.value, value);
      p.width = Math.max(p.width, label.length);
      return p;
    }, params);

    this.#labelWidth = (params.width * this.#em) / 2;
    this.#maxValue = params.value;
    this.#x0 = this.#labelWidth + this.#em / 2;

    const max = Math.max(this.#maxValue, this.#minEnd, this.#indicator ?? 0);
    const mag = 10 ** Math.floor(Math.log10(max));
    const e = (10 * Math.ceil(max / 10)) / mag;
    const end = (e > 5 ? 10 : e > 2 ? 5 : e > 1 ? 2 : 1) * mag;
    const inc = (e > 5 ? 2 : e > 2 ? 1 : e > 1 ? 0.5 : 0.2) * mag;

    this.#end = end;
    this.#increment = inc;
    this.#scale = (this.#width - this.#x0 - this.#em) / end;
  }

  /**
   * Generera zonmarkeringar.
   *
   * @private
   * @param {number} y Y-koordinat.
   */
  #renderZones(y) {
    let attr = {
      'aria-hidden': 'true',
      role: 'none',
      transform: `translate(${this.#x0} ${y})`,
    };
    const group = this.#element(this.#svg, 'g', attr);

    for (const [from, to, cssClass] of this.#zones) {
      const x = this.#x(Math.min(from, to));
      const w = this.#x(Math.abs(to - from));
      if (x > this.#width) continue;
      attr = {
        class: cssClass,
        x,
        y: 0,
        width: Math.min(w, this.#x(this.#end) - x),
        height: this.#height,
      };
      this.#element(group, 'rect', attr);
    }
  }

  /**
   * Skapa formaterare för datavärden.
   *
   * @private
   */
  #setFormat() {
    const options = {
      minimumFractionDigits: this.#decimals,
      maximumFractionDigits: this.#decimals,
    };
    this.#fmt = new Intl.NumberFormat(this.#locale, options);
  }

  /**
   * Infoga en textnod i ett element.
   *
   * @param {Element} parent Element att infoga i.
   * @param {string}  text   Text att infoga.
   * @return {Element}
   */
  #text(parent, text) {
    parent.appendChild(this.#doc.createTextNode(text));
    return parent;
  }

  /**
   * Skala X-värde.
   *
   * @private
   * @param {number} value Datavärde.
   * @return {number}
   */
  #x(value) {
    return this.#scale * value;
  }
}

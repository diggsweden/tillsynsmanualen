/**
 * Vy för presentation av kontroller.
 *
 * Vyinnehållet populeras dynamiskt.
 *
 * @license CC-BY 4.0
 * @property {string} heading          Sidrubrik.
 * @property {number} requirementCount Antal krav.
 */
export class ChecksView extends ViewBase {
  // Privata fält.
  #progress;

  /**
   * Konstruera en vyinstans.
   *
   * @param {EventListenerList} listeners Händelselyssnarlista.
   * @param {ResourceLoader}    loader    Resursladdare.
   * @param {Document}          [doc]     DOM-dokument vid enhetstester.
   */
  constructor(listeners, loader, doc = document) {
    super('checks', 'Kontroller', null, listeners, loader, doc);
    this._addStyles('checks');
  }

  // Åtkomstmetod för sidrubriken.
  set heading(text) {
    this._article.querySelector('h1').textContent = String(text);
  }

  /**
   * Dölj förloppsindikatorn.
   */
  hideProgress() {
    this.#progress?.parentNode?.remove();
  }

  /**
   * @inheritDoc
   */
  async open() {
    await super.open();
    this.#progress = this._article.querySelector('progress');
  }

  // Åtkomstmetod för antal krav.
  set requirementCount(count) {
    this.#progress.max = Number(count);
    this.#updateProgressText();
  }

  /**
   * Skapa och infoga ett avsnitt.
   *
   * @param {string} heading Avsnittsrubrik.
   * @return {Section}
   */
  section(heading) {
    return new Section(
      this._article,
      heading,
      0,
      () => this.#incrementProgress(),
      this._doc
    );
  }

  /**
   * Stega upp förloppsindikatorn.
   *
   * @private
   */
  #incrementProgress() {
    ++this.#progress.value;
    this.#updateProgressText();
  }

  /**
   * Uppdatera förloppsindikatorns textinnehåll.
   *
   * @private
   */
  #updateProgressText() {
    const pr = new Intl.PluralRules('sv');
    const progress = this.#progress;
    const value = progress.value;
    const fetched = {
      one: 'hämtat',
      other: 'hämtade',
    }[pr.select(value)];
    progress.textContent = `${value} av ${progress.max} krav ${fetched}`;
  }
}

/**
 * Basklass för kontrollbehållare.
 */
class CheckContainer {
  // Skyddade fält.
  _container;
  _doc;
  _level;
  _needsHeading = true;

  /**
   * Konstruera en behållarinstans.
   *
   * @param {HTMLElement} parent    Föräldraelement att infoga avsnittet i.
   * @param {HTMLElement} container Behållarelement.
   * @param {number}      level     Strukturnivå.
   * @param {Document}    doc       DOM-dokument.
   */
  constructor(parent, container, level, doc) {
    this._container = parent.appendChild(container);
    this._doc = doc;
    this._level = level;
  }

  /**
   * Lägg till en kontroll.
   *
   * @param {string[]} texts        Kontrolltexter.
   * @param {string[]} [exceptions] Undantag på kontrollnivå.
   */
  check(texts, exceptions = []) {
    this.#heading();

    if (1 === texts.length) {
      this._add('p', { class: 'check' }, texts[0]);
    } else {
      this._add('p', {}, 'Kontroll: något av följande är sant:');
      const ul = this._add('ul', { class: 'checks' });
      texts.forEach((text) => this._element(ul, 'li', {}, text));
    }

    if (exceptions.length > 0) {
      this._add('p', {}, 'Undantag:');
      const ul = this._add('ul');
      exceptions.forEach((item) => this._element(ul, 'li', {}, item));
    }
  }

  /**
   * Lägg till ett villkor.
   *
   * @param {string}  text      Villkorstext.
   * @param {boolean} fulfilled Uppfyllt/inte uppfyllt?
   */
  condition(text, fulfilled) {
    this.#heading();
    const prefix = fulfilled ? 'Om' : 'Om inte';
    return new ConditionSection(
      this._container,
      this._level + 1,
      `${prefix}: ${text}`,
      this._doc
    );
  }

  /**
   * Lägg till ett element i behållaren.
   *
   * @see _elemennt
   * @protected
   * @param {string} tag          Taggnamn.
   * @param {object} [attributes] Attribut.
   * @param {string} [html]       Elementinnehåll.
   * @return {HTMLElement}
   */
  _add(tag, attributes = {}, html = null) {
    return this._element(this._container, tag, attributes, html);
  }

  /**
   * Skapa och infoga en elementnod i DOM-trädet.
   *
   * @protected
   * @param {(HTMLElement|null)} parent       Eventuellt föräldralement.
   * @param {string}             tag          Taggnamn.
   * @param {object}             [attributes] Attribut.
   * @param {string}             [html]       Elementinnehåll.
   * @return {HTMLElement}
   */
  _element(parent, tag, attributes = {}, html = null) {
    const element = this._doc.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
      element.setAttribute(name, value);
    }
    html && (element.innerHTML = String(html));
    parent && parent.appendChild(element);
    return element;
  }

  /**
   * Skapa och infoga en textnod i DOM-trädet.
   *
   * @protected
   * @param {(HTMLElement|null)} parent Eventuellt föräldralement.
   * @param {string}             text   Textinnehåll.
   * @return {Text}
   */
  _text(parent, text) {
    const node = this._doc.createTextNode(text);
    parent && parent.appendChild(node);
    return node;
  }

  /**
   * Lägg till en rubrik om den inte finns.
   *
   * @private
   */
  #heading() {
    if (this._needsHeading) {
      this._add(`h${this._level + 1}`, {}, 'Kontroller');
      this._needsHeading = false;
    }
  }
}

/**
 * Ett villkorsavsnitt i vyn.
 *
 * @see CheckContainer
 */
class ConditionSection extends CheckContainer {
  /**
   * Konstruera en kravavsnittsinstans.
   *
   * @param {HTMLElement} parent Föräldraelement att infoga avsnittet i.
   * @param {number}      level  Strukturnivå.
   * @param {string}      text   Villkorstext.
   * @param {Document}    doc    DOM-dokument.
   */
  constructor(parent, level, text, doc) {
    super(parent, doc.createElement('div'), level, doc);
    this._needsHeading = false;
    this._container.classList.add('condition');
    const p = this._element(null, 'p', { class: 'condition' }, text);
    this._container.parentNode.insertBefore(p, this._container);
  }
}

/**
 * Ett kravavsnitt i vyn.
 *
 * @see CheckContainer
 */
class RequirementSection extends CheckContainer {
  /**
   * Konstruera en kravavsnittsinstans.
   *
   * @param {HTMLElement} parent Föräldraelement att infoga avsnittet i.
   * @param {string}      title  Kravtitel.
   * @param {number}      level  Avsnittsnivå (0-baserad);
   * @param {Document}    doc    DOM-dokument.
   */
  constructor(parent, title, level, doc) {
    super(parent, doc.createElement('section'), level + 2, doc);
    this._add(`h${this._level}`, {}, title);
  }

  /**
   * Lägg till en hänvisning till WCAG, EN 301 549 eller DOS-lagen.
   *
   * @param {string} num Avsnittsnummer i EN 301 549.
   */
  clause(num) {
    const info = EN301549Info.clause(num);
    const p = this._add('p');
    let title = info.title;
    p.textContent = `Krav: ${num} `;
    const attrs = { href: info.url, lang: 'en', target: '_blank' };
    const a = this._element(p, 'a', attrs);
    if (info.wcag) {
      this._text(p, ` (nivå\u00a0${info.level})`);
    } else if ('' !== info.functionality) {
      if (-1 !== title.indexOf(')')) {
        title.replace(')', ` - ${info.functionality} functionality)`);
      } else {
        title += ` (${info.functionality} functionality)`;
      }
    }
    a.textContent = title;
  }

  /**
   * Lägg in en referens till en paragraf i DOS-lagen.
   *
   * @private
   * @param {string} clause Hänvisning.
   */
  dos(clause) {
    const m = /\s(\d+)\s+§(?:\s+(\d+)\s+st)?/.exec(clause);
    const r = [`${m[1]} §`];
    m[2] && r.push(`${m[2]} stycket`);
    const p = this._add('p', {}, `${r.join(' ')} `);
    const href =
      'https://www.riksdagen.se/sv/dokument-lagar/dokument/svensk-forfattningssamling/lag-20181937-om-tillganglighet-till-digital_sfs-2018-1937';
    const a = this._element(p, 'a', { href, target: '_blank' });
    this._element(
      a,
      'cite',
      {},
      'lagen (2018:1937) om tillgänglighet ' + 'till digital offentlig service'
    );
  }

  /**
   * Lägg till undantag på kravnivå.
   *
   * @param {string[]} texts Undantag.
   */
  exceptions(texts) {
    this._add(`h${this._level + 1}`, {}, 'Undantag');
    const ul = this._add('ul');
    texts.forEach((text) => this._element(ul, 'li', {}, text));
  }

  /**
   * Lägg till en länk till en tillämpningsanvisning.
   *
   * @param {string} id    Fragmentidentifierare i URL:en.
   * @param {string} title Länktext.
   */
  instruction(id, title) {
    const href = `tillampning.html#${id}`;
    const p = this._add('p', {}, 'Se ');
    this._element(p, 'a', { href }, title);
  }

  /**
   * Lägg in en referens till en paragraf i DIGG:s DOS-föreskrift.
   *
   * @private
   * @param {string} clause Hänvisning.
   */
  mdffs(clause) {
    const href =
      'https://www.digg.se/om-oss/forfattningssamling/foreskrifter-om-tillganglighet-till-digital-offentlig-service-mdffs-20192/grundforfattning-mdffs-20192';
    const m = /\s(\d+)\s+§(?:\s+(\d+)\s+st(?:\s+(\d+)\s+p)?)?/.exec(clause);
    const r = [`${m[1]} §`];
    m[2] && r.push(`${m[2]} stycket`);
    m[3] && r.push(`${m[3]} punkten`);
    const p = this._add('p', {}, `${r.join(' ')} `);
    const a = this._element(p, 'a', { href, target: '_blank' });
    this._element(
      a,
      'cite',
      {},
      'Myndigheten för digital förvaltnings ' +
        'föreskrifter om tillgänglighet till digital ' +
        'offentlig service'
    );
    this._text(p, ' (MDFFS\u00a02019:2)');
  }

  /**
   * Lägg till en eller flera metodbeskrivningar.
   *
   * @param {string[]} texts Metodbeskrivningar.
   */
  methods(texts) {
    for (const [index, text] of texts.entries()) {
      this._add(
        `h${this._level + 1}`,
        {},
        1 === texts.length ? 'Metod' : `Metod ${index + 1}`
      );
      this._add('p', {}, text);
    }
  }

  /**
   * Lägg till en metodstegsbeskrivning.
   *
   * @param {string[]} texts Metodsteg.
   */
  steps(texts) {
    this._add(`h${this._level + 1}`, {}, 'Metod');
    const ol = this._add('ol');
    texts.forEach((text) => this._element(ol, 'li', {}, text));
  }
}

/**
 * Ett avsnitt i vyn.
 *
 * Ett avsnitt innehåller krav och/eller underavsnitt.
 */
class Section {
  // Privata fält.
  #doc;
  #level;
  #progress;
  #section;

  /**
   * Konstruera en avsnittsinstans.
   *
   * @param {HTMLElement} parent   Föräldraelement att infoga avsnittet i.
   * @param {string}      heading  Avsnittsrubrik.
   * @param {number}      level    Avsnittsnivå (0-baserad);
   * @param {callback}    progress Stega upp förloppsindikatorn.
   * @param {Document}    doc      DOM-dokument.
   */
  constructor(parent, heading, level, progress, doc) {
    const add = (p, c) => p.appendChild(c);
    const element = (t) => doc.createElement(t);
    this.#doc = doc;
    this.#level = level;
    this.#progress = () => progress();
    this.#section = add(parent, element('section'));
    add(this.#section, element(`h${level + 2}`)).textContent = heading;
  }

  /**
   * Skapa och infoga ett kravavsnitt.
   *
   * Avsnittsargumentet kan antingen vara ett avsnittsnummer i EN 301 549
   * eller en hänvisning till en paragraf i DOS-lagen eller MDFFS 2019:2.
   *
   * @param {string} title  Kravtitel.
   * @param {string} clause Avsnittsnummer i EN 301 549 eller paragraf.
   * @return {RequirementSection}
   */
  requirement(title, clause) {
    const req = new RequirementSection(
      this.#section,
      title,
      this.#level + 1,
      this.#doc
    );
    if (clause) {
      if (-1 !== clause.indexOf('SFS2018:1937')) {
        req.dos(clause);
      } else if (-1 !== clause.indexOf('MDFFS2019:2')) {
        req.mdffs(clause);
      } else {
        req.clause(clause);
      }
    }
    this.#progress();
    return req;
  }

  /**
   * Skapa och infoga ett underavsnitt.
   *
   * @param {string} heading Avsnittsrubrik.
   * @return {Section}
   */
  section(heading) {
    return new Section(
      this.#section,
      heading,
      this.#level + 1,
      this.#progress,
      this.#doc
    );
  }
}

// Importera beroenden.
import { EN301549Info } from '../common/EN301549Info.js';
import { ViewBase } from './ViewBase.js';

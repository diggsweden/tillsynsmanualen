/**
 * Vy för visning av urvalet i en granskning.
 *
 * Vyn används för att visa en lista över stickprovsurvalet i en granskning.
 *
 * @license CC-BY 4.0
 * @property {string} appVersion     Versionsnummer för mobil applikation.
 * @property {number} componentCount Antal komponenter i urvalet.
 * @property {date}   date           Åtgärdsdatum för påpekande/föreläggande.
 * @property {number} documentCount  Antal dokument i urvalet.
 * @property {string} heading        Huvudrubrik.
 * @property {date}   minDate        Tidigaste tillåtna åtgärdsdatum.
 * @property {number} screenCount    Antal appvyer i urvalet.
 * @property {string} service        Typ av digital tjänst.
 * @property {number} webpageCount   Antal webbsidor i urvalet.
 */
export class AuditDisplayView extends ViewBase {
  // Privata fält.
  #counts = { component: 0, document: 0, screen: 0, webpage: 0 };
  #onDeleteDocument;
  #onDocument;
  #service;
  #table;

  /**
   * Konstruera en vyinstans.
   *
   * @param {BreadcrumbTrail}   breadcrumbs Länkstig.
   * @param {EventListenerList} listeners   Händelselyssnarlista.
   * @param {ResourceLoader}    loader      Resursladdare.
   * @param {Document}          [doc]       DOM-dokument vid enhetstester.
   */
  constructor(breadcrumbs, listeners, loader, doc = document) {
    super('audit-display', 'Granskning', breadcrumbs, listeners, loader, doc);
    this._confirmID = 'confirm-dialog';
    this._wide = true;
  }

  /**
   * @inheritDoc
   */
  activate() {
    super.activate();
    this.#onDocument = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget;
      this._notifyObservers({
        action: 'open',
        id: target.dataset.id ?? null,
        type: target.dataset.type,
      });
    };
    const list = this._doc.getElementById('doc-list');
    list.querySelectorAll('a:not([target])').forEach((link) => {
      this._listeners.add(link, 'click', this.#onDocument);
    });
  }

  /**
   * Lägg till ett dokument i listan.
   *
   * Klona ett mallelement, populera och infoga.
   *
   * @param {string} icon Ikon.
   * @param {string} name Dokumentnamn.
   * @param {string} id   Dokumentidentifierare.
   */
  addDocument(icon, name, id) {
    const template = this._doc.getElementById('doc-template');
    const fragment = template.content.cloneNode(true);
    const [li] = fragment.children;
    const list = this._doc.getElementById('doc-list');
    const [svg, s1, s2] = li.children;
    const [del] = s1.children;
    const [link] = s2.children;
    const [use] = svg.children;
    const href = use.getAttribute('xlink:href');

    use.setAttribute('xlink:href', `${href}${icon}`);
    li.id = `doc-${id}`;
    del.dataset.id = String(id);
    del.dataset.type = icon;
    del.id = `del-${id}`;
    link.dataset.id = String(id);
    link.id = `link-${id}`;
    del.setAttribute('aria-labelledby', `del-${id} link-${id}`);
    link.dataset.type = 'document' === icon ? 'protocol' : icon;
    link.textContent = name;

    if (this.#onDocument) {
      this._listeners.add(link, 'click', this.#onDocument);
      this._listeners.add(del, 'click', (e) => this._notifyAction(e));
    }

    list.appendChild(li);
  }

  /**
   * Lägg till ett granskningsprotokoll i listan.
   *
   * Klona ett mallelement, populera och infoga.
   *
   * @param {numebr} audit Granskningsidentitet.
   */
  addProtocol(audit) {
    const template = this._doc.getElementById('doc-template');
    const fragment = template.content.cloneNode(true);
    const [li] = fragment.children;
    const list = this._doc.getElementById('doc-list');
    const [svg, s1, s2] = li.children;
    const [del] = s1.children;
    const [link] = s2.children;
    const [use] = svg.children;
    const href = use.getAttribute('xlink:href');

    use.setAttribute('xlink:href', `${href}document`);
    del.remove();
    link.textContent = 'Granskningsprotokoll';
    link.href = `protokoll.html?audit=${audit}`;
    link.target = '_blank';

    list.appendChild(li);
  }

  /**
   * Lägg till ett element i listan.
   *
   * @param {number} auditID     Granskningsidentitet.
   * @param {number} sampleID    Stickprovsidentitet.
   * @param {string} progress    Förloppsbeskrivning ("13 av 42 granskade").
   * @param {string} category    Urvalskategori.
   * @param {number} connections Antal kopplingar.
   * @param {string} type        Stickprovstyp.
   * @param {string} name        Stickprovets namn eller titel.
   * @param {string} url         Stickprovets URL.
   * @param {string} note        Notering.
   */
  addSample(
    auditID,
    sampleID,
    progress,
    category,
    connections,
    type,
    name,
    url,
    note
  ) {
    const template = this._doc.getElementById('grid-row-template');
    const fragment = template.content.cloneNode(true);
    const [tr] = fragment.children;

    const types = {
      component: 'Komponent',
      document: 'Dokument',
      screen: 'Vy',
      webpage: 'Webbsida',
    };
    const typesD = {
      document: 'dokumentet',
      webpage: 'webbsidan',
    };
    const data = {
      audit: auditID,
      category,
      ico: type,
      id: sampleID,
      name,
      note,
      progress,
      type: types[type],
      'type-d': typesD[type],
      url,
    };
    const populate = (s) => s.replace(/\{\{([a-z-]+)\}\}/g, (m, v) => data[v]);
    const popAttr = (o, a) => o.setAttribute(a, populate(o.getAttribute(a)));

    // Sökväg och statusikon för granskalänken.
    const auditLink = tr.children[0].children[0];
    const [auditSVG, auditName] = auditLink.children;
    const [auditUse] = auditSVG.children;
    popAttr(auditLink, 'aria-label');
    popAttr(auditLink, 'href');
    popAttr(auditSVG, 'aria-label');
    popAttr(auditUse, 'xlink:href');
    auditName.textContent = populate(auditName.textContent);

    tr.children[1].textContent = progress;

    const editLink = tr.children[2].children[0];
    popAttr(editLink, 'aria-label');
    popAttr(editLink, 'href');

    tr.children[3].textContent = category;
    tr.children[4].textContent = String(connections);

    const link = tr.children[5].children[0];
    if (url) {
      // Länk till dokument eller webbsida.
      popAttr(link, 'aria-label');
      popAttr(link, 'href');

      const span = link.children[0];
      span.textContent = populate(span.textContent);
    } else {
      link.remove();
    }

    tr.children[6].textContent = note;

    template.parentNode.insertBefore(tr, template);
  }

  /**
   * @inheritDoc
   * @override
   */
  get advancedMode() {
    return super.advancedMode;
  }

  set advancedMode(flag) {
    super.advancedMode = flag;
    if (!flag) {
      this._article?.querySelector('form')?.remove();
    }
  }

  // Åtkomstmetod för versionsnummer för mobil applikation.
  set appVersion(version) {
    const p = this._article.querySelector('p.app');
    p && (p.textContent += ` ${version}`);
  }

  /**
   * @inheritDoc
   */
  close() {
    this.#service && this._article.classList.remove(this.#service);
    super.close();
  }

  // Åtkomstmetoder för antal komponenter.
  get componentCount() {
    return this.#counts.component;
  }

  set componentCount(value) {
    value = Number(value);
    const pr = new Intl.PluralRules('sv');
    const texts = { one: 'komponent', other: 'komponenter' };
    const text = `${value} ${texts[pr.select(value)]}`;
    this.#counts.component = value;
    this._doc.getElementById('component-count').textContent = text;
  }

  // Åtkomstmetoder för åtgärdsdatum.
  get date() {
    return this._form.date.valueAsDate;
  }

  set date(aDate) {
    this._form.date.value = aDate.toLocaleDateString('sv');
  }

  /**
   * Radera dokumentet med angiven identitet.
   *
   * Ta bort listelementet ur dokumentlistan.
   *
   * @private
   * @param {string} id Dokumentidentitet.
   */
  deleteDocument(id) {
    this._doc.getElementById(`doc-${id}`)?.remove();
  }

  // Åtkomstmetoder för antal dokument.
  get documentCount() {
    return this.#counts.document;
  }

  set documentCount(value) {
    value = Number(value);
    const text = `${value} dokument`;
    this.#counts.document = Number(value);
    this._doc.getElementById('doc-count').textContent = text;
  }

  /**
   * Aktivera eller avaktivera föreläggandeknappen.
   *
   * @param {boolean} flag Knappen aktiv?
   */
  enableInjunctions(flag) {
    const selector = 'button[value="injunction"]';
    const button = this._article.querySelector(selector);
    button && (button.disabled = !flag);
  }

  /**
   * Aktivera upplåsningsknappen.
   *
   * Aktivera knappen som öppnar en avslutad granskning, och gör behållaren
   * den ligger i synlig.
   */
  enableReopen() {
    const p = this._doc.getElementById('reopen');
    const button = p.querySelector('button');
    p.hidden = false;
    button.disabled = false;
  }

  // Åtkomstmetod för huvudrubriken.
  set heading(text) {
    this._article.querySelector('h1').textContent = String(text);
  }

  /**
   * @inheritDoc
   */
  async open() {
    this._doc.body.classList.add('wide');
    await super.open();
    super.advancedMode || this._article.querySelector('form')?.remove();
    this.#table = this._article.querySelector('table.sample');
  }

  // Åtkomstmetod för åtgärdsdatum.
  set minDate(aDate) {
    this._form.date.min = aDate.toLocaleDateString('sv');
  }

  // Åtkomstmetoder för antal appvyer.
  get screenCount() {
    return this.#counts.screen;
  }

  set screenCount(value) {
    value = Number(value);
    const pr = new Intl.PluralRules('sv');
    const texts = { one: 'vy', other: 'vyer' };
    const text = `${value} ${texts[pr.select(value)]}`;
    this.#counts.screen = Number(value);
    this._doc.getElementById('screen-count').textContent = text;
  }

  // Åtkomstmetod för typ av digital service.
  set service(type) {
    this.#service && this._article.classList.remove(this.#service);
    this.#service = String(type);
    this._article.classList.add(this.#service);
  }

  /**
   * Sätt länken för påbörja/fortsätt granskning.
   *
   * Sätt sökväg och textinnehåll  i länken. Om sökvägen är `null`, ta bort
   * `href`-attributet.
   *
   * @param {string} url  Sökväg.
   * @param {string} text Textinnehåll.
   */
  setAuditLink(url, text) {
    const link = this._doc.getElementById('audit');
    const [svg, span] = link.children;
    span.textContent = text;

    if (null !== url) {
      link.href = url;
    } else {
      link.removeAttribute('href');
    }
  }

  /**
   * Uppdaterar förloppsindikatorn för granskning.
   *
   * @param {number} value Aktuellt värde.
   * @param {number} max   Maxvärde.
   * @param {string} label Ledtext.
   */
  setAuditProgress(value, max, label) {
    const [, progress] = this._article.querySelectorAll('progress');
    progress.max = max;
    progress.value = value;
    progress.setAttribute('aria-label', label);
  }

  /**
   * Sätt vyns läge till "pågående" eller "slutfört".
   *
   * I "pågående" läge: ta bort dokumentsektionen.
   * I "slutfört" läge: ta bort förloppsindikatorerna samt urvals- och
   * granskningslänkarna.
   *
   * @param {boolean} flag     Sätt "slutfört" läge?
   * @param {boolean} [failed] Sätt "underkänt" läge?
   */
  setFinishedMode(flag, failed) {
    if (flag) {
      this._article.querySelector('.progress')?.remove();
      this._article.querySelector('.audit.buttons')?.remove();
      failed || this._form.remove();
    } else {
      this._article.querySelector('#docs')?.remove();
    }
  }

  /**
   * Sätt länken för påbörja/fortsätt/komplettera urval.
   *
   * Sätt sökväg och textinnehåll  i länken.
   *
   * @param {string} url  Sökväg.
   * @param {string} text Textinnehåll.
   */
  setSampleLink(url, text) {
    const link = this._doc.getElementById('sample');
    const [svg, span] = link.children;
    link.href = url;
    span.textContent = text;
  }

  /**
   * Uppdaterar förloppsindikatorn för urval.
   *
   * @param {number} value Aktuellt värde.
   * @param {number} max   Maxvärde.
   * @param {string} label Ledtext.
   */
  setSampleProgress(value, max, label) {
    const [progress] = this._article.querySelectorAll('progress');
    progress.max = max;
    progress.value = value;
    progress.setAttribute('aria-label', label);
  }

  /**
   * @inheritDoc
   */
  unload() {
    this._doc.body.classList.remove('wide');
    super.unload();
  }

  // Åtkomstmetoder för antal webbsidor.
  get webpageCount() {
    return this.#counts.webpage;
  }

  set webpageCount(value) {
    value = Number(value);
    const pr = new Intl.PluralRules('sv');
    const texts = { one: 'webbsida', other: 'webbsidor' };
    const text = `${value} ${texts[pr.select(value)]}`;
    this.#counts.webpage = Number(value);
    this._doc.getElementById('page-count').textContent = text;
  }
}

// Importera beroenden.
import { ViewBase } from './ViewBase.js';

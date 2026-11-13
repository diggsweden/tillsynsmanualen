/**
 * Vy för granskning av tillgänglighetskrav.
 *
 * Vyinnehållet populeras dynamiskt.
 *
 * @license CC-BY 4.0
 * @property {string}   externalNote Extern anteckning.
 * @property {string}   heading      Sidrubrik.
 * @property {string}   internalNote Intern anteckning.
 * @property {booolean} readOnly     Skrivskyddat läge.
 */
export class RequirementView extends ViewBase {
  // Privata fält.
  #aside;
  #navigator;
  #readOnly = false;
  #sections = {};

  /**
   * Konstruera en vyinstans.
   *
   * @param {BreadcrumbTrail}   breadcrumbs Länkstig.
   * @param {EventListenerList} listeners   Händelselyssnarlista.
   * @param {ResourceLoader}    loader      Resursladdare.
   * @param {Document}          [doc]       DOM-dokument vid enhetstester.
   * @param {Navigator}         [nav]       Webbläsarinfo vid enhetstester.
   */
  constructor(breadcrumbs, listeners, loader, doc = document, nav = navigator) {
    super('requirement', 'krav', breadcrumbs, listeners, loader, doc);
    this._addStyles('requirement');
    this._wide = true;
    this.#navigator = nav;
  }

  /**
   * Lägg till en åtgärdsruta under relaterat innehåll.
   *
   * @param {string} html Textinnehåll med eventuell HTML.
   */
  action(html) {
    this.#infoContainer().action(html);
  }

  /**
   * Lägg till en filterklass på artikelelementet.
   *
   * @param {string} name Klassnamn att lägga till.
   */
  addFilter(name) {
    this._article.classList.add(name);
  }

  /**
   * Lägg till en bookmarklet under relaterat innehåll.
   *
   * @param {string} title Bokmärkets namn.
   * @param {string} code  JavaScript-kod.
   */
  bookmarklet(title, code) {
    const parent = this.#toolsSection();
    const text =
      `Dra länken <samp>${title}</samp> nedan till ` +
      'bokmärkesraden i webbläsaren.';
    this._element(parent, 'p').innerHTML = text;
    const p = this._element(parent, 'p');
    this._element(p, 'a', { href: `javascript:${code}` }, title);
  }

  /**
   * Lägg till en kontroll.
   *
   * Klona ett eller två mallelemenet (kontroll och eventuell observation),
   * populera klonerna och infoga dem i DOM-trädet. För en multipel, klona
   * kontrollmallen för varje alternativ.
   *
   * @param {string}      id          Kontrollidentitet.
   * @param {array[]}     states      Vektor med tillstånd/ledtext-par.
   * @param {string[]}    exceptions  Undantag från kontrollen.
   * @param {string}      observation Observationstext.
   * @param {string[]}    reusable    Återanvändbara observationer.
   * @param {string}      path        Sökväg för skärmavbildning.
   * @param {string}      alt         Textalternativ till skärmavbildning.
   * @param {HTMLElement} [group]     Gruppbehållare för villkor.
   * @param {object[]}    [sources]   Källkrav för härledd kontroll.
   */
  check(
    id,
    states,
    exceptions,
    observation,
    reusable,
    path,
    alt,
    group = null,
    sources = null
  ) {
    const checks = [];
    let hlp;
    let index = 1 === states.length ? null : 0;
    const name = id.replace(/(-.)/g, (m, p) => p[1]?.toUpperCase());
    if (states.length > 1) {
      const n = states.length;
      hlp = this._doc.createElement('p');
      hlp.className = 'multi-lead';
      hlp.append(`Det räcker att ett av följande ${n} påståenden är sant.`);
    }
    for (const [state, text] of states) {
      checks.push(
        this.#cloneCheck(id, index, name, state, text, null != sources)
      );
      ++index;
    }
    let obs;
    if (observation) {
      const state = states.some(([s, t]) => false !== s);
      obs = this.#cloneObservation(
        id,
        name,
        state,
        observation,
        reusable,
        path,
        alt
      );
    }
    const sec = this.#exceptionList(exceptions);
    const src = this.#derivedCheckSources(sources);
    if (null === group) {
      const sibling = this._article.querySelector('.checks .notes');
      hlp && sibling.parentNode.insertBefore(hlp, sibling);
      for (const check of checks) {
        sibling.parentNode.insertBefore(check, sibling);
      }
      src && sibling.parentNode.insertBefore(src, sibling);
      obs && sibling.parentNode.insertBefore(obs, sibling);
      sec && sibling.parentNode.insertBefore(sec, sibling);
    } else {
      hlp && group.appendChild(hlp);
      for (const check of checks) {
        group.appendChild(check);
      }
      src && group.appendChild(src);
      obs && group.appendChild(obs);
      sec && group.appendChild(sec);
    }
  }

  /**
   * Lägg till ett villkor.
   *
   * @param {string}              id       Villkorsidentitet.
   * @param {(boolean|undefined)} state    Tillstånd.
   * @param {string}              [text]   Villkorstext.
   * @param {HTMLElement}         [parent] Föräldrabehållare.
   */
  condition(id, state, text = null, parent = null) {
    const name = id.replace(/(-.)/g, (m, p) => p[1]?.toUpperCase());
    const frag = this.#cloneCondition(id, name, state, text);
    if (null === parent) {
      const sibling = this._article.querySelector('.checks .notes');
      sibling.parentNode.insertBefore(frag, sibling);
    } else {
      parent.appendChild(frag);
    }
  }

  /**
   * Lägg till ett utfällbart avsnitt under relaterat innehåll.
   *
   * @param {string} summary Synlig sammanfattning.
   * @return {ContentContainer}
   */
  createDetails(summary) {
    return this.#infoContainer().details(summary);
  }

  /**
   * Lägg till en figurbehålare under relaterat innehåll.
   *
   * @return {ContentContainer}
   */
  createFigure() {
    return this.#infoContainer().figure();
  }

  /**
   * Lägg till en behållare för WAVE-information under relaterat innehåll.
   *
   * @see WAVEContainer
   * @return {WAVEContainer}
   */
  createWAVE() {
    return new WAVEContainer(this._doc, this.#toolsSection());
  }

  /**
   * Lägg till en definition under relaterat innehåll.
   *
   * @param {string} term        Term.
   * @param {string} description Beskrivning.
   */
  definition(term, description) {
    this.#infoContainer().definition(term, description);
  }

  /**
   * Lägg till Inspektör-information under relaterat innehåll.
   *
   * @param {string}   tab          Fliknamn.
   * @param {string}   [pane]       Panelnamn.
   * @param {string[]} [properties] CSS-egenskaper.
   * @param {string}   [func]       Funktionsnamn.
   * @param {string}   [help]       Hjälptext.
   */
  devTool(tab, pane, properties, func, help) {
    const nav = this.#navigator;
    const browser = this.#browser(nav.userAgent);
    const lang = nav.language.replace(/-.*/, '');
    const parent = this.#toolsSection();
    const h4 = this._element(parent, 'h4');
    this._element(h4, 'cite', {}, 'Inspektör');

    if (func) {
      const functions = {
        Device: {
          chrome: { en: 'Toggle Device Toolbar' },
          firefox: {
            en: 'Responsive Design Mode',
            sv: 'Följsamt designläge',
          },
        },
      };
      const info = functions[func][browser] ?? {};
      const lc = lang in info ? lang : 'en';
      const name = info[lc] ?? func;
      const text = `Funktionen <samp lang=\"${lc}\">${name}</samp>.`;
      this._element(parent, 'p').innerHTML = text;
    } else if (tab) {
      const dl = this._element(parent, 'dl', { class: 'compact' });
      const tabName = this.#devToolTab(tab, browser, lang);
      this._element(dl, 'dt', {}, 'Flik');
      this._element(dl, 'dd', { lang }, tabName);
      if (pane) {
        const paneName = this.#devToolPane(pane, browser, lang);
        this._element(dl, 'dt', {}, 'Panel');
        this._element(dl, 'dd', { lang }, paneName);
      }
      if (properties.length > 0) {
        this._element(dl, 'dt', {}, 'Egenskaper');
        const props = properties.map(
          (p) => `<code translate="no" lang="en">${p}</code>`
        );
        this._element(dl, 'dd').innerHTML = props.join(', ');
      }
    }

    if (help) {
      this._element(parent, 'p').innerHTML = help;
    }
  }

  /**
   * Lägg till exempellista.
   *
   * Skapa en oordnad lista. Iterera över objektets nycklar och lägg till
   * listelement. Sätt nyckeln som klass på listelementen för att kunna formge
   * bra och dåliga exempel olika.
   *
   * @param {object} obj Exempelobjekt.
   */
  examples(obj) {
    if (0 === Object.keys(obj).length) {
      return;
    }
    const section = this._element(null, 'section');
    this._element(section, 'h2', {}, 'Exempel');
    const ul = this._element(section, 'ul');
    for (const key of Object.keys(obj)) {
      for (const text of obj[key]) {
        this._element(ul, 'li', { class: key }).innerHTML = text;
      }
    }
    const sibling = this._article.querySelector('section.checks');
    sibling.parentNode.insertBefore(section, sibling);
  }

  /**
   * Lägg till undantagslista.
   *
   * Infoga en sektion med en oordnad lista.
   *
   * @param {string[]} texts Undantagstexter.
   */
  exceptions(texts) {
    if (0 === texts.length) {
      return;
    }
    const section = this._element(null, 'section');
    this._element(section, 'h2', {}, 'Undantag');
    const ul = this._element(section, 'ul');
    for (const text of texts) {
      this._element(ul, 'li').innerHTML = text;
    }
    const sibling = this._article.querySelector('section.checks');
    sibling.parentNode.insertBefore(section, sibling);
  }

  // Åtkomstmetod för extern anteckning.
  set externalNote(text) {
    this._form.externalNote.value = String(text);
  }

  /**
   * Lägg till ett externt verktyg under relaterat innehåll.
   *
   * @param {string} text Text att visa.
   */
  externalTool(text) {
    const parent = this.#toolsSection();
    this._element(parent, 'p', {}, text);
  }

  /**
   * Lägg till en villkorsgrupp.
   *
   * @param {string}      id       Gruppidentitet.
   * @param {boolean}     visible  Initialt synlig?
   * @param {HTMLElement} [parent] Ev. föräldraelement.
   * @return {HTMLElement}
   */
  group(id, visible, parent = null) {
    const div = this._element(null, 'div', { id });
    div.hidden = !visible;
    if (null === parent) {
      const sibling = this._article.querySelector('.checks .notes');
      sibling.parentNode.insertBefore(div, sibling);
    } else {
      parent.appendChild(div);
    }
    return div;
  }

  // Åtkomstmetod för sidrubrik.
  set heading(text) {
    this._article.querySelector('h1').textContent = String(text);
  }

  /**
   * Lägg till en bild under relaterat innehåll.
   *
   * @param {string} path Sökväg relativt granskningssidan.
   * @param {string} alt  Textekvivalent.
   */
  image(path, alt) {
    this.#infoContainer().image(path, alt);
  }

  /**
   * Lägg till hänvisning till tillämpningsanvisning under relaterat innehåll.
   *
   * @param {id}     id    Fragmentidentifierare på målsidan.
   * @param {string} title Länktext.
   */
  instruction(id, title) {
    const href = `../granskning/tillampning.html#${id}`;
    const section = this._element(this.#aside, 'section');
    this._element(section, 'h3', {}, 'Tillämpning');
    const p = this._element(section, 'p', { class: 'instruction' });
    this._element(p, 'a', { href }, title);
  }

  // Åtkomstmetod för intern anteckning.
  set internalNote(text) {
    this._form.internalNote.value = String(text);
  }

  /**
   * Lägg till en länk under relaterat innehåll.
   *
   * @param {string} url   Länkadress.
   * @param {string} title Länktext.
   */
  link(url, title) {
    if (!('links' in this.#sections)) {
      const sec = this._element(this.#aside, 'section');
      this._element(sec, 'h3', {}, 'Länkar');
      this.#sections.links = this._element(sec, 'ul', { class: 'links' });
    }
    const li = this._element(this.#sections.links, 'li');
    const rel = 'external';
    const target = '_blank';
    this._element(li, 'a', { href: url, rel, target }, title);
  }

  /**
   * Lägg till metodbeskrivningar.
   *
   * Infoga en sektion för varje metod.
   *
   * @see steps
   * @param {string[]} texts Metodbeskrivningar.
   */
  methods(texts) {
    for (const [index, text] of texts.entries()) {
      const heading = 1 === texts.length ? 'Metod' : `Metod ${index + 1}`;
      const section = this._element(null, 'section');
      this._element(section, 'h2', {}, heading);
      this._element(section, 'p').innerHTML = text;
      const sibling = this._article.querySelector('section.checks');
      sibling.parentNode.insertBefore(section, sibling);
    }
  }

  /**
   * Lägg till ett modulverktyg under relaterat innehåll.
   *
   * Alla verktygsmoduler ska ha en defaultexport som anropas med föräldra-
   * elementet och eventuella verktygsparametrar.
   *
   * @param {object} module   Verktygsmodul.
   * @param {object} [params] Eventuella parametrar.
   */
  moduleTool(module, params) {
    const parent = this.#toolsSection();
    module.default(parent, params);
  }

  /**
   * Lägg till en notera-ruta under relaterat innehåll.
   *
   * @param {string} text Textinnehåll.
   */
  note(text) {
    this.#infoContainer().note(text);
  }

  /**
   * Lägg till en ordnad lista under relaterat innehåll.
   *
   * @param {string[]} items Listelement.
   */
  oList(items) {
    this.#infoContainer().oList(items);
  }

  /**
   * @inheritDoc
   */
  async open() {
    await super.open();
    this.#aside = this._article.querySelector('form aside');
  }

  /**
   * Ta bort en filterklass.
   *
   * @param {string} filter Filterklass att ta bort.
   */
  popFilter(filter) {
    this.#infoContainer().popFilter(filter);
  }

  /**
   * Lägg till en filterklass.
   *
   * @param {string} filter Filterklass att lägga till.
   */
  pushFilter(filter) {
    this.#infoContainer().pushFilter(filter);
  }

  // Åtkomstmetod för skrivskydd.
  set readOnly(flag) {
    const disable = (f) => f && (f.disabled = flag);
    this.#readOnly = Boolean(flag);
    disable(this._form.externalNote);
    disable(this._form.internalNote);
  }

  /**
   * Lägg till en referens till ett kravavsnitt.
   *
   * Avsnittsnummer kan vara ett avsnittsnummer från EN 301 549, till exempel
   * "11.4.1.3.1", eller en hänvisning till DIGG:s föreskrifter, till exempel
   * "6 § 1 st 3 p MDFFS2019:2".
   *
   * Infoga en sektion med rubrik samt en länk EN 301 549, WCAG eller DIGG>s
   * föreskrifter om tillgänglighet till digital offentlig service.
   *
   * @param {string} clause Avsnittsnummer.
   */
  reference(clause) {
    const section = this._element(this.#aside, 'section');
    this._element(section, 'h3', {}, 'Referens');
    const p = this._element(section, 'p');
    if (/^\d+\.\d/.test(clause)) {
      const info = EN301549Info.clause(clause);
      if (info.wcag) {
        this.#wcag(info, p);
      } else {
        this.#en301549(info, p);
      }
    } else if (/^\d § MDFFS2019:2$/.test(clause)) {
      this.#mdffs(clause, p);
    }
  }

  /**
   * Ta bort fältet för extern notering.
   */
  removeExternalNote() {
    this._form.externalNote?.parentNode.remove();
  }

  /**
   * Sätt länken till granskningsöversikten.
   *
   * @param {string} url   Sökväg.
   * @param {string} audit Granskningsnamn.
   */
  setAuditLink(url, text) {
    const link = this._doc.getElementById('audit');
    link.textContent = text;
    link.setAttribute('href', url);
  }

  /**
   * Uppdatera tillståndet för angiven singelkontroll.
   *
   * @param {string}  id    Kontrollidentitet.
   * @param {boolean} state Tillstånd att sätta.
   */
  setCheck(id, state) {
    const name = id.replace(/(-.)/g, (m, p) => p[1]?.toUpperCase());
    const group = this._form[`${name}.check`];
    group && (group.value = state ? 'ok' : 'fail');
  }

  /**
   * Sätt sökväg och knapptext för nästa-knappen.
   *
   * @param {string} url   Sökväg.
   * @param {string} title Knapptext.
   */
  setNext(url, title) {
    const button = this._form.querySelector('button[value="next"]');
    if (null === url) {
      button.disabled = true;
    } else {
      button.setAttribute('formaction', url);
    }
    button.children[1].textContent = title ?? '';
  }

  /**
   * Sätt sökväg och knapptext för föregående-knappen.
   *
   * @param {(string|null)} url   Sökväg.
   * @param {(string|null)} title Knapptext.
   */
  setPrevious(url, title) {
    const button = this._form.querySelector('button[value="prev"]');
    if (null === url) {
      button.disabled = true;
    } else {
      button.setAttribute('formaction', url);
    }
    button.children[1].textContent = title ?? '';
  }

  /**
   * Uppdatera förloppsindikatorn.
   *
   * @param {number} value Aktuellt värde.
   * @param {number} max   Maxvärde.
   * @param {string} label Ledtext.
   */
  setProgress(value, max, label) {
    const progress = this._article.querySelector('progress');
    progress.max = max;
    progress.value = value;
    progress.setAttribute('aria-label', label);
  }

  /**
   * Sätt sökväg och knapptext för uppåt-knappen.
   *
   * @param {string} url   Sökväg.
   * @param {string} title Knapptext.
   */
  setSample(url, title) {
    const button = this._form.querySelector('button[value="up"]');
    button.setAttribute('formaction', url);
    button.children[1].textContent = title;
  }

  /**
   * Visa stickprovsname.
   *
   * Om sökväg anges, länka till stickprovet.
   *
   * @param {string} title Knapptext.
   * @param {string} [url] Sökväg.
   */
  setSampleInfo(title, url = null) {
    const p = this._article.querySelector('h1 + p + p');
    if (url) {
      const attr = { href: url, target: '_blank' };
      this._element(p, 'a', attr, title);
    } else {
      p.innerText += ` ${title}`;
    }
  }

  /**
   * Sätt sökväg och knapptext för nästa-ogranskade–knappen.
   *
   * @param {string} url   Sökväg.
   * @param {string} title Knapptext.
   */
  setSkip(url, title) {
    const button = this._form.querySelector('button[value="skip"]');
    if (null === url) {
      button.disabled = true;
    } else {
      button.setAttribute('formaction', url);
    }
    button.children[1].textContent = title ?? '';
  }

  /**
   * Visa eller dölj fält för misslyckad kontroll.
   *
   * Fältet för observation ska bara visas för underkända kontroller.
   *
   * @param {string}  chkID   Kontrollidentitet.
   * @param {boolean} visible Synlighetsflagga.
   */
  showFail(chkID, visible) {
    const textarea = this._doc.getElementById(`${chkID}-obs`);
    if (null !== textarea) {
      const label = textarea.parentNode;
      const p = label.parentNode;
      const div = p.parentNode;
      div.hidden = !visible;
      textarea.disabled = !visible;
    }
  }

  /**
   * Visa eller dölj en villkorsgrupp.
   *
   * @param {string}  grpID   Gruppidentitet.
   * @param {boolean} visible Synlighetsflagga.
   */
  showGroup(grpID, visible) {
    const group = this._doc.getElementById(grpID);
    if (null !== group) {
      group.hidden = !visible;
    } else {
      console.warn(`Kan inte visa/dölja grupp; id '${grpID}' saknas.`);
    }
  }

  /**
   * Lägg till metodsteg.
   *
   * Infoga en sektion med en ordnad lista.
   *
   * @param {string[]} steps Metodsteg.
   */
  steps(texts) {
    if (0 === texts.length) {
      return;
    }
    const section = this._element(null, 'section');
    this._element(section, 'h2', {}, 'Metod');
    const ol = this._element(section, 'ol');
    for (const text of texts) {
      this._element(ol, 'li').innerHTML = text;
    }
    const sibling = this._article.querySelector('section.checks');
    sibling.parentNode.insertBefore(section, sibling);
  }

  /**
   * Lägg till en tabell under relaterad innehåll.
   *
   * @param {string[]}   headers   Kolumnrubriker.
   * @param {string[][]} rows      Rader med cellinnehåll.
   * @param {string}     [caption] Tabellrubrik.
   */
  table(headers, rows, caption = null) {
    this.#infoContainer().table(headers, rows, caption);
  }

  /**
   * Lägg till ett textstycke under relaterat innehåll.
   *
   * @param {string} text Textinnehåll.
   */
  text(content) {
    this.#infoContainer().text(content);
  }

  /**
   * Lägg till en tipsruta under relaterat innehåll.
   *
   * @param {string} text Textinnehåll.
   */
  tip(text) {
    this.#infoContainer().tip(text);
  }

  /**
   * Lägg till en oordnad lista under relaterat innehåll.
   *
   * @param {string[]} items Listelement.
   */
  uList(items) {
    this.#infoContainer().uList(items);
  }

  /**
   * Lägg till en varningsruta under relaterat innehåll.
   *
   * @param {string} text Textinnehåll.
   */
  warning(text) {
    this.#infoContainer().warning(text);
  }

  /**
   * Lägg till information om Web Developer Toolbar under relaterat innehåll.
   *
   * @param {string} tab    Fliknamn.
   * @param {string} [func] Funktionsnamn.
   */
  webDeveloper(tab, func) {
    const attrs = 'translate="no" lang="en"';
    const content = [`<cite ${attrs}>Web Developer</cite>`];
    const parent = this.#toolsSection();
    if (tab) {
      content.push(`fliken <samp ${attrs}>${tab}</samp>`);
    }
    if (func) {
      content.push(`funktionen <samp ${attrs}>${func}</samp>`);
    }
    this._element(parent, 'p').innerHTML = `${content.join(', ')}.`;
  }

  /**
   * Detektera webbläsare.
   *
   * (Mycket rudimentär kontroll, som bara känner igen Firefox och antar att
   * allt annat är Chrome.)
   *
   * @private
   * @param {string} ua Webbläsarinformation.
   * @return {string}
   */
  #browser(ua) {
    let browser = 'chrome';
    if (-1 !== ua.indexOf(' Firefox/')) {
      browser = 'firefox';
    }
    return browser;
  }

  /**
   * Klona ett mallelement för att skapa en kontroll.
   *
   * @private
   * @param {string}              id       Kontrollidentitet.
   * @param {number}              [index]  Index (för multipla kontroller).
   * @param {string}              name     Basnamn.
   * @param {(boolean|undefined)} state    Tillstånd.
   * @param {string}              text     Kontrolltext.
   * @param {boolean}             disabled Avaktivera radioknapparna?
   * @return {DocumentFragment}
   */
  #cloneCheck(id, index, name, state, text, disabled) {
    const template = this._doc.getElementById('check-template');
    const fragment = template.content.cloneNode(true);
    const fieldset = fragment.children[0];
    const [legend, p] = fieldset.children;
    const nx = null === index ? '' : `[${index}]`;
    const radio = (i) => p.children[i].children[0];
    const span = legend.children[0];
    span.innerHTML = text;
    radio(0).checked = true === state;
    radio(0).disabled = disabled || this.#readOnly;
    radio(0).name = `${name}${nx}.check`;
    radio(1).checked = false === state;
    radio(1).disabled = disabled || this.#readOnly;
    radio(1).name = `${name}${nx}.check`;
    return fragment;
  }

  /**
   * Klona ett mallelement för att skapa en villkorsbehållare.
   *
   * @private
   * @param {string}              id    Villkorsidentitet;
   * @param {string}              name  Basnamn.
   * @param {(boolean|undefined)} state Tillstånd.
   * @param {string}              text  Villkorstext.
   * @return {DocumentFragment}
   */
  #cloneCondition(id, name, state, text) {
    const template = this._doc.getElementById('condition-template');
    const fragment = template.content.cloneNode(true);
    const fieldset = fragment.children[0];
    const [legend, p] = fieldset.children;
    const radio = (i) => p.children[i].children[0];
    const span = legend.children[0];
    span.innerHTML = text;
    radio(0).checked = true === state;
    radio(0).disabled = this.#readOnly;
    radio(0).name = `${name}.cond`;
    radio(1).checked = false === state;
    radio(1).disabled = this.#readOnly;
    radio(1).name = `${name}.cond`;
    return fragment;
  }

  /**
   * Klona ett mallelement för att skapa en kontroll.
   *
   * @private
   * @param {string}              id          Kontrollidentitet.
   * @param {string}              name        Basnamn.
   * @param {(boolean|undefined)} state       Tillstånd.
   * @param {string}              observation Observationstext.
   * @param {string[]}            reusable    Återanvändbara observationer.
   * @param {string}              path        Sökväg för skärmavbildning.
   * @param {string}              alt         Textalternativ till skärmavb.
   * @return {DocumentFragment}
   */
  #cloneObservation(id, name, state, observation, reusable, path, alt) {
    const template = this._doc.getElementById('observation-template');
    const fragment = template.content.cloneNode(true);
    const div = fragment.children[0];
    let p = div.children[0];
    let [textarea] = p.children[0].children;
    div.hidden = false !== state;
    textarea.disabled = false !== state || this.#readOnly;
    textarea.id = `${id}-obs`;
    textarea.name = `${name}.obs`;
    textarea.value = observation ?? '';
    const details = div.children[1];
    p = details.nextElementSibling;
    if (reusable.length > 0) {
      const copy = (ev) => this.#copyObservation(ev);
      for (const text of reusable) {
        const btn = this._element(details, 'button', { type: 'button' }, text);
        this._listeners.add(btn, 'click', copy);
      }
    } else {
      details.remove();
    }
    const [input] = p.children[0].children;
    [textarea] = p.children[1].children;
    input.id = `${id}-path`;
    input.name = `${name}.path`;
    input.value = path ?? '';
    textarea.id = `${id}-alt`;
    textarea.name = `${name}.alt`;
    textarea.value = alt ?? '';
    return fragment;
  }

  /**
   * Hämta fält ur nästlade objekt.
   *
   * @private
   * @example
   * #contentOf({foo: {bar: "quux"}}, "foo", "bar")  // "quux"
   * #contentOf({foo: {bar: "quux"}}, "foo", "thud") // {}
   *
   * @param {object}   obj    Yttre objekt.
   * @param {string[]} fields Fältnamn för nästlade objkt.
   * @return {*}
   */
  #contentOf(obj, ...fields) {
    return fields.reduce((acc, cur) => acc[cur] ?? {}, obj);
  }

  /**
   * Kopiera en tidigare observation för samma kontroll.
   *
   * Metoden används som händelsehanterare för de knappar som skapas för att
   * återanvända en befintlig observation för samma kontroll i ett annat
   * stickprov.
   *
   * Simulera ett `change`-event så att controllern blir informerad om
   * ändringen.
   *
   * @see #cloneObservation()
   * @param {Event} event Händelseinformation.
   */
  #copyObservation(event) {
    const btn = event.currentTarget;
    const p = btn.parentNode.previousElementSibling;
    const ta = p.querySelector('textarea');
    ta.value = btn.textContent;
    event.preventDefault();
    event.stopPropagation();
    ta.dispatchEvent(new CustomEvent('change', { bubbles: true }));
  }

  /**
   * Skapa utfällbart avsnitt med källkravsinformation för härledd kontroll.
   *
   * @private
   * @param {object[]} sources Källkravsinformation.,
   * @return {(HTMLElement|undefined)}
   */
  #derivedCheckSources(sources) {
    if (!sources) return;
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const XLINK_NS = 'http://www.w3.org/1999/xlink';
    const details = this._element(null, 'details', { class: 'src' });
    const icon = (s) => `../img/ikoner.svg#ico-${s}`;
    this._element(details, 'summary', {}, 'Påverkande krav');
    const statusTexts = {
      fail: 'Underkänt',
      pass: 'Godkänt',
      unchecked: 'Inte granskat',
    };
    const ul = this._element(details, 'ul');
    for (const { clause, status, title, url } of sources) {
      const li = this._element(ul, 'li');
      const svg = li.appendChild(this._doc.createElementNS(SVG_NS, 'svg'));
      const use = svg.appendChild(this._doc.createElementNS(SVG_NS, 'use'));
      svg.role = 'img';
      svg.ariaLabel = statusTexts[status];
      svg.setAttribute('class', status);
      use.setAttributeNS(XLINK_NS, 'xlink:href', icon(status));
      this._element(li, 'span', {}, clause);
      this._element(li, 'a', { href: url, target: '_blank' }, title);
    }
    return details;
  }

  /**
   * Returnera panelnamn i Inspektören för webbläsare och språk.
   *
   * @private
   * @param {string} pane    Panelspecifikation.
   * @param {string} browser Webbläsare.
   * @param {string} lang    Språkkod.
   * @return {string}
   */
  #devToolPane(pane, browser, lang) {
    const panes = {
      Accessibility: {
        chrome: { en: 'Accessibility' },
        firefox: { en: 'Accessibility', sv: 'Tillgänglighet' },
      },
      Computed: {
        chrome: { en: 'Computed' },
        firefox: { en: 'Computed', sv: 'Beräknad' },
      },
      Style: {
        chrome: { en: 'Style' },
        firefox: { en: 'Rules', sv: 'Regler' },
      },
    };
    return this.#contentOf(panes, pane, browser)[lang] ?? pane;
  }

  /**
   * Returnera fliknamn i Inspektören för webbläsare och språk.
   *
   * @private
   * @param {string} tab     Tabbfliksspecifikation.
   * @param {string} browser Webbläsare.
   * @param {string} lang    Språkkod.
   * @return {string}
   */
  #devToolTab(tab, browser, lang) {
    const tabs = {
      Elements: {
        chrome: { en: 'Elements' },
        firefox: { en: 'Inspector', sv: 'Inspektör' },
      },
      Network: {
        chrome: { en: 'Network' },
        firefox: { en: 'Network', sv: 'Nätverk' },
      },
    };
    return this.#contentOf(tabs, tab, browser)[lang] ?? tab;
  }

  /**
   * Lägg in en referens till ett kravavsnitt i EN 301 549 V3.2.1.
   *
   * @private
   * @param {object}      info   Kravavsnittsinformation.
   * @param {HTMLElement} parent Element att infoga länken i.
   */
  #en301549(info, parent) {
    const href = info.url;
    const hreflang = 'en';
    const lang = 'en';
    const rel = 'external';
    const target = 'wcag';
    let { title } = info;
    if ('' !== info.functionality) {
      const suffix = `${info.functionality} functionality`;
      if (-1 !== title.indexOf(')')) {
        title = title.replace(')', ` - ${suffix})`);
      } else {
        title += ` (${suffix})`;
      }
    }
    parent.textContent = `EN\u00a0301\u00a0549 ${info.clause} `;
    this._element(parent, 'a', { href, hreflang, lang, rel, target }, title);
  }

  /**
   * Skapa en sektion med en undantagslista.
   *
   * @private
   * @param {string[]} exception Undantag.
   * @return {(HTMLElement|undefined)}
   */
  #exceptionList(exceptions) {
    if (exceptions.length > 0) {
      const sec = this._element(null, 'section', { class: 'exceptions' });
      this._element(sec, 'h3', {}, 'Undantag');
      const ul = this._element(sec, 'ul');
      for (const li of exceptions) {
        this._element(ul, 'li').innerHTML = li;
      }
      return sec;
    }
  }

  /**
   * Returnera informationsbehållaren.
   *
   * Om behållaren inte finns, skapa den och dess rubrik.
   *
   * @private
   * @return {ContentContainer}
   */
  #infoContainer() {
    if (!('info' in this.#sections)) {
      const section = this._element(this.#aside, 'section');
      this._element(section, 'h3', {}, 'Mer information');
      this.#sections.info = new ContentContainer(this._doc, section);
    }
    return this.#sections.info;
  }

  /**
   * Avgör om ett kravavsnitt finns i WCAG.1.
   *
   * @private
   * @param {string} clause Kravavsnittsnummer i EN 301 549.
   * @return {boolean}
   */
  #isWCAG(clause) {
    return /^(9|10|11)\.[1-4]\.\d\.\d+$/.test(clause);
  }

  /**
   * Lägg in en referens till en paragraf i DIGG:s DOS-föreskrift.
   *
   * @private
   * @param {string}      clause Hänvisning.
   * @param {HTMLElement} parent Element att infoga länken i.
   */
  #mdffs(clause, p) {
    const href =
      'https://www.digg.se/om-oss/forfattningssamling/foreskrifter-om-tillganglighet-till-digital-offentlig-service-mdffs-20192/grundforfattning-mdffs-20192';
    const rel = 'external';
    const target = '_blank';
    p.textContent = clause.replace(/§.*/, '§ ');
    this._element(p, 'a', { href, rel, target }, 'MDFFS\u00a02019:2');
  }

  /**
   * Skapa en elementnod i SVG:s namnrymd i DOM-trädet.
   *
   * @private
   * @param {Element} parent  Föräldranod att lägga till i.
   * @param {string}  tag     SVG-taggnamn.
   * @param {object}  [attrs] Attribut.
   * @return {Element}
   */
  #svg(parent, tag, attrs = {}) {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const XLINK = 'xlink:';
    const XLINK_NS = 'http://www.w3.org/1999/xlink';
    const element = this._doc.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) {
      if (name.startsWith(XLINK)) {
        element.setAttributeNS(XLINK_NS, name.slice(XLINK.length), value);
      } else {
        element.setAttribute(name, value);
      }
    }
    return parent.appendChild(element);
  }

  /**
   * Returnera verktygsavsnittet.
   *
   * Om avsnittet inte finns, skapa det och dess rubrik.
   *
   * @private
   * @return {HTMLElement}
   */
  #toolsSection() {
    if (!('tools' in this.#sections)) {
      this.#sections.tools = this._element(this.#aside, 'section', {
        class: 'tools',
      });
      this._element(this.#sections.tools, 'h3', {}, 'Verktyg');
    }
    return this.#sections.tools;
  }

  /**
   * Lägg in en referens till ett kravavsnitt i WCAG.1
   *
   * @private
   * @param {object}      info   Kravavsnittsinformation.
   * @param {HTMLElement} parent Element att infoga länken i.
   */
  #wcag(info, p) {
    const href = info.url;
    const hreflang = 'en';
    const lang = 'en';
    const rel = 'external';
    const target = 'wcag';
    p.textContent = `WCAG\u00a02.1, kriterium ${info.criterion} `;
    this._element(p, 'a', { href, hreflang, lang, rel, target }, info.title);
    p.appendChild(this._doc.createTextNode(` (nivå ${info.level})`));
  }
}

/**
 * Basklass för innehållsbehållare.
 *
 * Olika typer av detaljinformation går att lägga till dels i innehållssektionen
 * i ett kravavsnitt och dels i ett utfällbart avsnitt i en sådan sektion.
 * Därför är det lämpligt att samla funktionerna i en gemensam basklass.
 *
 * @license CC-BY 4.0
 */
class ContentContainer {
  // Privata fält.
  #container;
  #doc;
  #filters = {};

  /**
   * Konstruera en behållarinstans.
   *
   * @param {Document}    doc       DOM-dokument.
   * @param {HTMLElement} container Behållarelement.
   */
  constructor(doc, container) {
    this.#container = container;
    this.#doc = doc;
  }

  /**
   * Lägg till en åtgärdsruta i behålaren.
   *
   * @param {string} text Textinnehåll.
   */
  action(text) {
    const c = this.#applyFilters('action');
    this.#element(this.#container, 'p', { class: c }, text);
  }

  /**
   * Lägg till en figurtext i behållaren.
   *
   * Får bara anropas om behållarelementet är en figur.
   *
   * @param {string} text Figurtext.
   * @throws {TypeError}
   */
  caption(text) {
    const c = this.#applyFilters();
    const tag = this.#container.tagName;
    if ('FIGURE' !== tag) {
      throw new TypeError(`Kan inte lägga till 'figcaption' i '${tag}'.`);
    }
    this.#element(this.#container, 'figcaption', { class: c }, text);
  }

  /**
   * Lägg till en definition i behållaren.
   *
   * @param {string} term        Term.
   * @param {string} description Beskrivning.
   */
  definition(term, description) {
    const c = this.#applyFilters('definition');
    const content = `<dfn>${term}</dfn>: ${description}`;
    this.#element(this.#container, 'p', { class: c }, content);
  }

  /**
   * Lägg till ett utfällbar avsnitt i behållaren.
   *
   * Skapa och returnera en nästlad behållare.
   *
   * @param {string} summary Synleg sammanfatnning.
   * @return {ContentContainer}
   */
  details(summary) {
    const c = this.#applyFilters();
    const details = this.#element(this.#container, 'details');
    this.#element(details, 'summary', { class: c }, summary);
    return new ContentContainer(this.#doc, details);
  }

  /**
   * Lägg till en figurbehållare  i behållaren.
   *
   * Skapa och returnera en nästlad behållare.
   *
   * @return {ContentContainer}
   */
  figure() {
    const c = this.#applyFilters();
    const figure = this.#element(this.#container, 'figure', { class: c });
    return new ContentContainer(this.#doc, figure);
  }

  /**
   * Lägg till en bild i behållaren.
   *
   * @param {string} path Sökväg relativt granskningssidan.
   * @param {string} alt  Textalternativ.
   */
  image(path, alt) {
    const c = this.#applyFilters();
    const src = `../img/${path}`;
    this.#element(this.#container, 'img', { src, alt, class: c });
  }

  /**
   * Lägg till en notera-ruta i behållaren.
   *
   * @param {string} text Textinnehåll.
   */
  note(text) {
    const c = this.#applyFilters('note');
    this.#element(this.#container, 'p', { class: c }, text);
  }

  /**
   * Lägg till en ordnad lista i behållaren.
   *
   * @param {string[]} items Listelement.
   */
  oList(items) {
    const c = this.#applyFilters();
    const ol = this.#element(this.#container, 'ol', { class: c });
    for (const li of items) {
      this.#element(ol, 'li', {}, li);
    }
  }

  /**
   * Ta bort en filterklass.
   *
   * @param {string} filter Filterklass att ta bort.
   */
  popFilter(filter) {
    if (filter in this.#filters) {
      this.#filters[filter] = Math.max(0, this.#filters[filter] - 1);
    }
  }

  /**
   * Lägg till en filterklass.
   *
   * @param {string} filter Filterklass att lägga till.
   */
  pushFilter(filter) {
    this.#filters[filter] ??= 0;
    ++this.#filters[filter];
  }

  /**
   * Lägg till en datatabell i behållaren.
   *
   * @param {string[]}   headers   Kolumnrubriker.
   * @param {string[][]} rows      Rader med cellinnehåll.
   * @param {string}     [caption] Tabellrubrik.
   */
  table(headers, rows, caption = null) {
    const c = this.#applyFilters();
    const tbl = this.#element(this.#container, 'table', { class: c });
    if (null !== caption) {
      tbl.createCaption().innerHTML = caption;
    }
    const thead = tbl.createTHead();
    const tr = thead.insertRow();
    for (const th of headers) {
      this.#element(tr, 'th', {}, th);
    }
    const tbody = tbl.createTBody();
    for (const row of rows) {
      const tr = tbody.insertRow();
      for (const td of row) {
        tr.insertCell().innerHTML = td;
      }
    }
  }

  /**
   * Lägg till ett textstycke i behållaren.
   *
   * @param {string} content Textinnehåll.
   */
  text(content) {
    const c = this.#applyFilters();
    this.#element(this.#container, 'p', { class: c }, content);
  }

  /**
   * Lägg till en tipsruta i behållaren.
   *
   * @param {string} text Textinnehåll.
   */
  tip(text) {
    const c = this.#applyFilters('tip');
    this.#element(this.#container, 'p', { class: c }, text);
  }

  /**
   * Lägg till en oordnad lista i behållaren.
   *
   * @param {string[]} items Listelement.
   */
  uList(items) {
    const c = this.#applyFilters();
    const ul = this.#element(this.#container, 'ul', { class: c });
    for (const li of items) {
      this.#element(ul, 'li', {}, li);
    }
  }

  /**
   * Lägg till en varningsruta i behållaren.
   *
   * @param {string} text Textinnehåll.
   */
  warning(text) {
    const c = this.#applyFilters('warning');
    this.#element(this.#container, 'p', { class: c }, text);
  }

  /**
   * Tillämpa aktulla filterklasser.
   *
   * @param {string} [fixed] Eventuella fasta klasser.
   * @return {string}
   */
  #applyFilters(fixed = null) {
    const filters = Object.entries(this.#filters)
      .filter(([n, c]) => c > 0)
      .map(([n, c]) => n);

    const names = [];
    fixed && names.push(fixed);
    filters.length > 0 && names.push('only-if');
    return names.concat(filters).join(' ');
  }

  /**
   * Skapa en elementnod i DOM-trädet.
   *
   * @private
   * @param {(HTMLElement|null)} parent    Ev. föräldranod att lägga till i.
   * @param {string}             tag       HTML-taggnamn.
   * @param {object}             [attrs]   Attribut.
   * @param {string}             [content] Innehåll.
   * @return {HTMLElement}
   */
  #element(parent, tag, attrs = {}, content = undefined) {
    const element = this.#doc.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) {
      if ('class' === name && '' === value) continue;
      element.setAttribute(name, value);
    }
    if (undefined !== content) {
      element.innerHTML = content;
    }
    if (null !== parent) {
      parent.appendChild(element);
    }
    return element;
  }
}

/**
 * Representerar en behållare för WAVE-information.
 *
 * @license CC-BY 4.0
 */
class WAVEContainer {
  // Privata fält.
  #doc;
  #parent;

  /**
   * Konstruera en WAVE-avsnittsinstans.
   *
   * @param {Document}    doc    DOM-dokument.
   * @param {HTMLElement} parent Föräldraelement att infoga i.
   */
  constructor(doc, parent) {
    this.#doc = doc;
    this.#parent = parent;
    const attrs = { translate: 'no', lang: 'en' };
    this.#element(this.#parent, 'h4', attrs, '<cite>WAVE</cite>');
  }

  /**
   * Lägger till information om text och eventuell ikon som visas på angiven
   * tabbflik och under angivet avsnitt i WAVE om kontrollen ska underkännas.
   *
   * @param {string}   [tab]     Tabbfliksnamn.
   * @param {string}   [section] Avsnittsnamn.
   * @param {string[]} texts     Texter att titta efter.
   * @param {object}   [icon]    Ikon att titta efter.
   * @param {string}   icon.src  Filnamn för ikonen.
   * @param {string}   icon.alt  Textalternativ för ikonen.
   * @return {this}
   */
  absent(tab, section, texts, icon = null) {
    const attrs = { translate: 'no', lang: 'en' };
    const samp = (p, t) => this.#element(p, 'samp', attrs, t);
    const p = this.#element(this.#parent, 'p', { className: 'wave' });
    const sa = { class: 'fail', 'aria-label': 'Underkänt', role: 'img' };
    const svg = this.#svg(p, 'svg', sa);
    this.#svg(svg, 'use', { 'xlink:href': '../img/ikoner.svg#ico-fail' });
    if (null !== icon) {
      const alt = icon.alt;
      const src = `../img/${icon.src}`;
      this.#element(p, 'img', { src, alt });
      this.#text(p, ' ');
    }
    if (texts.length > 0) {
      for (const [index, text] of texts.entries()) {
        if (index > 0) {
          this.#text(p, ' eller ');
        }
        samp(p, text);
      }
    }
    if (section) {
      this.#text(p, ' under ');
      samp(p, section);
    }
    if (tab) {
      this.#text(p, ' på fliken ');
      samp(p, tab);
    }
    this.#text(p, '.');
    return this;
  }

  /**
   * Lägger till information om text och eventuell ikon som visas på angiven
   * tabbflik och under angivet avsnitt i WAVE om kontrollen ska godkännas.
   *
   * @param {string}   [tab]     Tabbfliksnamn.
   * @param {string}   [section] Avsnittsnamn.
   * @param {string[]} texts     Texter att titta efter.
   * @param {object}   [icon]    Ikon att titta efter.
   * @param {string}   icon.src  Filnamn för ikonen.
   * @param {string}   icon.alt  Textalternativ för ikonen.
   * @return {this}
   */
  present(tab, section, texts, icon = null) {
    const attrs = { translate: 'no', lang: 'en' };
    const samp = (p, t) => this.#element(p, 'samp', attrs, t);
    const p = this.#element(this.#parent, 'p', { className: 'wave' });
    const sa = { class: 'pass', 'aria-label': 'Godkänt', role: 'img' };
    const svg = this.#svg(p, 'svg', sa);
    this.#svg(svg, 'use', { 'xlink:href': '../img/ikoner.svg#ico-pass' });
    if (null !== icon) {
      const alt = icon.alt;
      const src = `../img/${icon.src}`;
      this.#element(p, 'img', { src, alt });
      this.#text(p, ' ');
    }
    if (texts.length > 0) {
      for (const [index, text] of texts.entries()) {
        if (index > 0) {
          this.#text(p, ' eller ');
        }
        samp(p, text);
      }
    }
    if (section) {
      this.#text(p, ' under ');
      samp(p, section);
    }
    if (tab) {
      this.#text(p, ' på fliken ');
      samp(p, tab);
    }
    this.#text(p, '.');
    return this;
  }

  /**
   * Lägger till information om en tabbflik i WAVE.
   *
   * @param {string} name Tabbfliksnamn.
   * @return {this}
   */
  tab(name) {
    const attrs = { translate: 'no', lang: 'en' };
    const content = `Fliken <samp ${attrs}>${name}</samp>.`;
    this.#element(this.#parent, 'p', {}, content);
    return this;
  }

  /**
   * Skapa en elementnod i DOM-trädet.
   *
   * @private
   * @param {(HTMLElement|null)} parent    Ev. föräldranod att lägga till i.
   * @param {string}             tag       HTML-taggnamn.
   * @param {object}             [attrs]   Attribut.
   * @param {string}             [content] Textinnehåll.
   * @return {HTMLElement}
   */
  #element(parent, tag, attrs = {}, content = undefined) {
    const element = this.#doc.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) {
      element[name] = value;
    }
    if (undefined !== content) {
      element.innerHTML = content;
    }
    if (null !== parent) {
      parent.appendChild(element);
    }
    return element;
  }

  /**
   * Skapa en elementnod i SVG:s namnrymd i DOM-trädet.
   *
   * @private
   * @param {Element} parent  Föräldranod att lägga till i.
   * @param {string}  tag     SVG-taggnamn.
   * @param {object}  [attrs] Attribut.
   * @return {Element}
   */
  #svg(parent, tag, attrs = {}) {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const XLINK = 'xlink:';
    const XLINK_NS = 'http://www.w3.org/1999/xlink';
    const element = this.#doc.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) {
      if (name.startsWith(XLINK)) {
        element.setAttributeNS(XLINK_NS, name.slice(XLINK.length), value);
      } else {
        element.setAttribute(name, value);
      }
    }
    return parent.appendChild(element);
  }

  /**
   * Skapa och lägg till en textnod i DOM-trädet.
   *
   * @param {HTMLElement} parent Föräldranod att lägga till i.
   * @param {string}      text   Textinnehåll.
   * @return {Text}
   */
  #text(parent, text) {
    return parent.appendChild(this.#doc.createTextNode(text));
  }
}

// Importera beroenden.
import { EN301549Info } from '../common/EN301549Info.js';
import { ViewBase } from './ViewBase.js';

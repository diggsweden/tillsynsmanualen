/*
 * Vy som visar ett granskningsprotokoll.
 *
 * @license CC-BY 4.0
 */
export class ProtocolView {
  // Privata fält.
  #advanced;
  #app;
  #case;
  #chart;
  #failList;
  #file;
  #loader;
  #metric;
  #model;
  #protCfg;
  #srcDoc;
  #win;

  /**
   * Konstruera en vyinstans.
   *
   * @param {Model}                 model      Modellobjekt.
   * @param {InaccessibilityMetriC} metric     Mätetal för otillgänglighet.
   * @param {HorizontalBarChart}    chart      Stapeldiagram.
   * @param {FileStorage}           filesystem Fillagring.
   * @param {ResourceLoader}        loader     Resursladdare.
   * @param {object}                [globals]  Globala objekt vid enhetstest.
   */
  constructor(model, metric, chart, filesystem, loader, globals = {}) {
    this.#chart = chart;
    this.#file = filesystem;
    this.#loader = loader;
    this.#metric = metric;
    this.#model = model;
    this.#srcDoc = globals.document ?? document;
    this.#win = globals.window ?? window;
  }

  /**
   * Öppna angivet granskningsprotokoll.
   *
   * @param {AuditCase} aCase Ärendee.
   * @param {Audit}     audit Granskning.
   */
  async open(aCase, audit) {
    try {
      this.#app = aCase.service instanceof MobileApp;
      this.#advanced = aCase.monitoring;
      this.#case = aCase;

      // Häamta malldokument.
      const template = await this.#getConfigurations();

      // Populera aktuellt dokument med mall och granskningsdata.
      this.#populateProtocolDocument(document, audit, template);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  /**
   * Spara angivet granskningsprotokoll.
   *
   * @param {AuditCase} aCase Ärendee.
   * @param {Audit}     audit Granskning.
   */
  async save(aCase, audit) {
    try {
      this.#app = aCase.service instanceof MobileApp;
      this.#advanced = aCase.monitoring;
      this.#case = aCase;

      // Häamta malldokument.
      const model = this.#model;
      const template = await this.#getConfigurations();

      // Skapa ett nytt DOM-dokument och populera det.
      const date = audit.started.toLocaleDateString('sv');
      const title = `Protokoll ${aCase.caseNumber}, ${date}`;
      const doc = this.#srcDoc.implementation.createHTMLDocument(title);
      this.#populateProtocolDocument(doc, audit, template);

      const filename = `protokoll_${aCase.caseNumber}_${date}.html`;
      await this.#file.saveToHTMLFile(filename, doc);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  /**
   * Infoga mallinnehållet i dokumentet.
   *
   * För extern granskning, ta bort innehåll som är specifikt för tillsyn.
   *
   * @private
   * @param {Document} doc      Protokolldokument.
   * @param {string}   template Mallinnehåll.
   */
  #addTemplate(doc, template) {
    const html = doc.documentElement;
    html.lang = 'sv';
    html.innerHTML = template;

    if (!this.#advanced) {
      const h1 = html.querySelector('h1');
      for (const element of Array.from(html.querySelectorAll('.digg'))) {
        element.remove();
      }
    }
  }

  /**
   * Iterera över alla ingående komponenter.
   *
   * Ingående komponenter är färddiggranskade komponenter som är underkända
   * eller har extern notering.
   *
   * @private
   * @param {Audit} audit Granskning.
   * @yield {Component}
   */
  *#allComponents(audit) {
    const include = (c) => c.done && (c.failed || c.hasExternalNotes);
    for (const component of audit.components()) {
      if (include(component)) {
        yield component;
      }
    }
  }

  /**
   * Iterera över alla ingående dokument.
   *
   * Ingående dokument är de som är färdiggranskade.
   *
   * @private
   * @param {Audit} audit Granskning.
   * @yield {NonWebDocument}
   */
  *#allDocuments(audit) {
    yield* audit.doneSamples(NonWebDocument);
  }

  /**
   * Iterera över alla ingående webbsidor.
   *
   * Ingående webbsidor är de som är färdiggranskade.
   *
   * @private
   * @param {Audit} audit Granskning.
   * @yield {Webpage}
   */
  *#allPages(audit) {
    yield* audit.doneSamples(Webpage);
  }

  /**
   * Iterera över alla ingående appvyer.
   *
   * Ingående vyer är de som är färdiggranskade.
   *
   * @private
   * @param {Audit} audit Granskning.
   * @yield {AppScreen}
   */
  *#allScreens(audit) {
    yield* audit.doneSamples(AppScreen);
  }

  /**
   * Kontrollera följsamheten för tillgänglighetsredogörelsen.
   *
   * Underkänn om något krav kopplat till DIGG:s föreskrifter är underkänt,
   * eller om redogörelse saknas.
   *
   * @param {iterator} samples Iterator för tillgänglighetsredogörelser.
   * @return {string[]} Klassnamn och textinnehåll för fältet.
   */
  #checkA11yStatementCompliance(samples) {
    let count = 0;
    const isA11y = (r) => -1 !== r.clause.indexOf('§');

    for (const sample of samples) {
      ++count;
      if (!sample.done) continue;

      for (const req of sample.requirements()) {
        if (isA11y(req) && req.failed) {
          return ['fail', 'underkänd'];
        }
      }
    }

    return 0 === count ? ['fail', 'underkänd (saknas)'] : ['pass', 'godkänd'];
  }

  /**
   * Populera en lista med granskade komponenter.
   *
   * Om det inte finns några färdiggranskade komponenter i granskningen, ta
   * bort avsnittet och tillhörande länk i innehållsmenyn.
   *
   * @private
   * @param {Document} doc   Protokolldokument.
   * @param {Audit}    audit Granskning.
   */
  #components(doc, audit) {
    let count = 0;
    const parent = doc.getElementById('sec-comps');
    const list = parent.querySelector('ul.toc');

    for (const component of this.#allComponents(audit)) {
      this.#sample(doc, list, component);
      ++count;
    }

    if (0 === count) {
      parent?.remove();
      doc.getElementById('toc-comps')?.remove();
    }
  }

  /**
   * Populera en lista med granskade dokument.
   *
   * Om det inte finns några färdiggranskade dokument i granskningen, ta
   * bort avsnittet och tillhörande länk i innehållsmenyn.
   *
   * @private
   * @param {Document} doc   Protokolldokument.
   * @param {Audit}    audit Granskning.
   */
  #documents(doc, audit) {
    let count = 0;
    const parent = doc.getElementById('sec-docs');
    const list = parent.querySelector('ul.toc');

    for (const document of this.#allDocuments(audit)) {
      this.#sample(doc, list, document);
      ++count;
    }

    if (0 === count) {
      parent?.remove();
      doc.getElementById('toc-docs')?.remove();
    }
  }

  /**
   * Infoga en referens till ett kravavsnitt i EN 301 549.
   *
   * @private
   * @param {Document}    doc    Protokolldokument.
   * @param {HTMLElement} parent Föräldraelement att infoga i.
   * @param {object}      info   Kravavsnittsinformation.
   */
  #en301549(doc, parent, info) {
    const p = parent.appendChild(doc.createElement('p'));
    let { title } = info;
    if ('' !== info.functionality) {
      const suffix = `${info.functionality} functionality`;
      if (-1 !== title.indexOf(')')) {
        title = title.replace(')', ` - ${suffix})`);
      } else {
        title += ` (${suffix})`;
      }
    }
    p.innerHTML = `Referens: <cite>EN 301 549</cite> avsnitt ${info.clause}, `;
    const a = p.appendChild(doc.createElement('a'));
    a.href = info.url;
    a.hreflang = 'en';
    a.lang = 'en';
    a.target = '_blank';
    a.textContent = title;
  }

  /**
   * Infoga förväntningar för ett underkänt krav.
   *
   * @private
   * @param {Document}    doc    Protokolldokument.
   * @param {HTMLElement} parent Föräldraelement att infoga i.
   * @param {string[]}    texts  Förväntningar.
   */
  #expectations(doc, parent, texts) {
    const a = (tag, cont) => c(parent.appendChild(e(tag)), cont);
    const c = (el, cont) => (el.textContent = cont);
    const e = (tag) => doc.createElement(tag);
    a('h4', 'Krav');
    for (const expectation of texts) {
      a('p', expectation);
    }
  }

  /**
   * Infoga ett informationsavsnitt om ett underkänt krav i EN 301 594.
   *
   * @private
   * @param {Document}    doc    Protokolldokument.
   * @param {HTMLElement} parent Föräldraelement att infoga i.
   * @param {Audit}       audit  Granskning.
   * @param {string}      clause Kravavsnittsnummer.
   */
  #failedClause(doc, parent, audit, clause) {
    const cfg = this.#protCfg.clauses[clause];
    const fmt = (c) => c.replace(/.*\s(\d+\s+§).*/, '$1');
    const info = EN301549Info.clause(clause);
    const section = parent.appendChild(doc.createElement('section'));
    const h3 = section.appendChild(doc.createElement('h3'));
    h3.id = `r-${clause.replace(/\W+/g, '-')}`;
    h3.textContent = `${fmt(clause)} – ${cfg.title}`;
    const infoBox = section.appendChild(doc.createElement('div'));
    infoBox.className = 'info req';

    this.#expectations(doc, infoBox, cfg.expectations);
    'important' in cfg && this.#important(doc, infoBox, cfg.important);
    this.#mappedPrinciples(doc, infoBox, cfg.principles);
    this.#references(doc, infoBox, cfg.real ?? clause, info);
    cfg.guideline && this.#guideline(doc, infoBox, cfg.guideline);

    let h4;
    const heading = () => h4 ?? (h4 = obs(infoBox.appendChild(mkH4())));
    const mkH4 = () => doc.createElement('h4');
    const obs = (h) => ((h.textContent = 'Observationer'), h);

    for (const [sample, req, id] of this.#failList.fails(clause)) {
      heading();
      this.#failedSample(doc, infoBox, sample, clause, req, id);
    }
  }

  /**
   * Infoga observationer för ett underkänt stickprov.
   *
   * @private
   * @param {Document}      doc    Protokolldokument.
   * @param {HTMLElement}   parent Föräldraelement att infoga i,
   * @param {Sample}        sample Underkänt stickprov.
   * @param {string}        clause Kravavsnittsnummer.
   * @param {Requirement[]} reqs   Underkända krav.
   * @param {number}        id     Bristidentitet.
   */
  #failedSample(doc, parent, sample, clause, reqs, id) {
    const name =
      sample instanceof Component
        ? `Alla sidor med ${sample.name}`
        : sample.name;
    parent.appendChild(doc.createElement('h5')).textContent =
      `${name} (ID ${id})`;
    const ul = parent.appendChild(doc.createElement('ul'));

    for (const req of reqs) {
      for (const check of req.checks()) {
        if (check.failed && check.observation) {
          const li = ul.appendChild(doc.createElement('li'));
          li.textContent = check.observation;
          if (check.screenshot?.path) {
            const img = li.appendChild(doc.createElement('img'));
            img.src = check.screenshot.path;
            img.alt = check.screenshot.alt;
          }
        }
      }
    }
  }

  /**
   * Lägg till ett informationsavsnitt per underkänt krav EN 301 549.
   *
   * Om det inte finns några underkända krav i granskningen, ta bort
   * avsnittet.
   *
   * @private
   * @param {Document} doc   Protokolldokument.
   * @param {Audit}    audit Granskning.
   */
  #fails(doc, audit) {
    const parent = doc.getElementById('reqs');

    // Lägg till ett avsnitt per underkänt krav.
    let count = 0;
    for (const clause of this.#failList.allClauses()) {
      this.#failedClause(doc, parent, audit, clause);
      ++count;
    }

    // Ta bort hela avsnittet om inga krav är underkända.
    if (0 === count) {
      parent?.remove();
    }
  }

  /**
   * Returnera underkända WCAG-avsnitt för ett stickprov.
   *
   * Resultatet ska inkludera avsnitt underkända i ingående komponenter.
   *
   * @private
   * @param {Audit}  audit  Granskning.
   * @param {Sample} sample Stickprov.
   * @return {object} Objekt med kravavsnitt som nycklar och antal underkända
   *                  sidor som värden.
   */
  #failsForSample(audit, sample) {
    const fails = new Set();
    for (const component of sample.components) {
      component.failures(fails);
    }
    sample.failures(fails);
    const map = Array.from(fails).reduce((o, c) => ((o[c] = 1), o), {});
    return this.#mapAuditFailures(map);
  }

  /**
   * Infoga diagram över otillgänglighet per användningssituation.
   *
   * @private
   * @param {Document} doc   Protokolldokument.
   * @param {Audit}    audit Granskning.
   */
  #functionalPerformanceStatements(doc, audit) {
    const fails = this.#mapAuditFailures(audit.failures(Webpage));
    const map = {
      WV: 'utan syn',
      LV: 'nedsatt syn',
      WPC: 'nedsatt färgseende',
      WH: 'utan hörsel',
      LH: 'nedsatt hörsel',
      WVC: 'utan talförmåga',
      LMS: 'nedsatt motorik',
      LR: 'begränsad räckvidd',
      PST: 'känslighet för flimmer',
      LC: 'nedsatt kognition',
    };
    const pages = audit.countDone(Webpage);
    const data = Object.entries(map).map(([fps, label]) => [
      label,
      this.#metric.score(pages, fails, fps),
    ]);
    const section = doc.getElementById('graph-fps');
    this.#chart.document = doc;
    const chart = this.#chart.horizontalBarChart();
    chart.axis = true;
    chart.cssClass = 'fps';
    chart.lines = true;
    chart.minEnd = 20;
    chart.addZone(0, 10, 'full');
    chart.addZone(10, 80, 'partial');
    chart.addZone(80, 500, 'none');
    for (const [label, score] of data) {
      chart.addBar(label, score);
    }
    section.insertBefore(chart.render(), section.children[0]);
  }

  /**
   * Hämta malldokument och konfigurationsfil.
   *
   * Returnera innehållet i det malldokument som hör till ärendet.
   *
   * @private
   * @return {string}
   */
  async #getConfigurations() {
    // Protokollkonfiguraation.
    const type = this.#case.service.type;
    const protCfg = `protocols/${type}`;
    this.#protCfg = await this.#loader.configuration(protCfg);

    // Protokollmall.
    const name = `protocol-${type}`;
    const template = await this.#loader.pageTemplate(name);
    return template;
  }

  /**
   * Infoga en länk till webbriktlinjer.se.
   *
   * @private
   * @param {Document}    doc       Protokolldokument.
   * @param {HTMLElement} parent    Föräldraelement att infoga i.
   * @param {number}      guideline Riktlinjenummer.
   */
  #guideline(doc, parent, guideline) {
    const p = parent.appendChild(doc.createElement('p'));
    p.textContent = 'Läs mer: ';
    const a = p.appendChild(doc.createElement('a'));
    a.href = `https://webbriktlinjer.se/${guideline}`;
    a.target = '_blank';
    a.textContent = `R${guideline}`;
    p.appendChild(doc.createTextNode(' på '));
    p.appendChild(doc.createElement('cite')).textContent =
      'Vägledning för webbutveckling';
  }

  /**
   * Populera dokumenhuvudet.
   *
   * @private
   * @param {Document}  doc   Protokolldokument.
   * @param {AuditCase} aCase Ärende.
   * @param {Audit}     audit Granskning.
   */
  #header(doc, aCase, audit) {
    let caseNo, finished, officer, started;
    const date = (d) => d?.toLocaleDateString('sv');

    if (this.#advanced) {
      [caseNo, started, finished, officer] = doc.querySelectorAll('header dd');
      caseNo.textContent = aCase.caseNumber.toString();
    } else {
      [started, finished, officer] = doc.querySelectorAll('header dd');
    }

    started.textContent = date(audit.started);
    finished.textContent = date(audit.finished) ?? '';
    officer.textContent = audit.officer.toString();
  }

  /**
   * Infoga diagram över inverkan per underkänt krav på otillgängligheten.
   *
   * @private
   * @param {Document} doc   Protokolldokument.
   * @param {Audit}    audit Granskning.
   */
  #impactPerRequirement(doc, audit) {
    const fails = this.#mapAuditFailures(audit.failures(Webpage));
    const pages = audit.countDone(Webpage);
    const data = this.#metric.impact(pages, fails);
    const section = doc.getElementById('graph-impact');
    if (0 === Object.keys(data).length) {
      const p = doc.createElement('p');
      p.textContent = '(Inga brister)';
      section.parentNode.replaceChild(p, section);
      return;
    }
    this.#chart.document = doc;
    const chart = this.#chart.horizontalBarChart();
    chart.axis = true;
    chart.cssClass = 'impact';
    chart.decimals = 1;
    chart.indicator = this.#metric.score(pages, fails);
    chart.lines = true;
    chart.document = doc;
    for (const [label, score] of Object.entries(data)) {
      chart.addBar(label, score);
    }
    section.insertBefore(chart.render(), section.children[0]);
  }

  /**
   * Infoga eventuell viktig notering för ett underkänt krav.
   *
   * @private
   * @param {Document}    doc    Protokolldokument.
   * @param {HTMLElement} parent Föräldraelement att infoga i.
   * @param {string}      text   Viktig notering
   */
  #important(doc, parent, text) {
    const a = (tag, cont) => c(parent.appendChild(e(tag)), cont);
    const c = (el, cont) => (el.textContent = cont);
    const e = (tag) => doc.createElement(tag);
    a('h4', 'Viktigt');
    a('p', text);
  }

  /**
   * Infoga en tabellrad per granskad sida.
   *
   * @private
   * @param {Document} doc   Protokolldokument.
   * @param {Audit}    audit Granskning.
   */
  #inaccessibilityPerPage(doc, audit) {
    const compliance = {
      full: 'helt',
      partial: 'delvis',
      none: 'inte',
    };
    let pages = 0;
    const table = doc.querySelector('table.inaccessibility');
    const tbody = table.tBodies[0];

    for (const category of Audit.AuditCategories) {
      for (const sample of audit.samples(category)) {
        if (!(sample instanceof Webpage) || !sample.done) continue;
        ++pages;
        const fails = this.#failsForSample(audit, sample);
        const score = this.#metric.score(1, fails);
        const comp = this.#metric.compliance(score);
        const row = tbody.insertRow();
        const td = row.insertCell();
        td.className = comp;
        td.textContent = String(Math.round(score));
        row.insertCell().textContent = compliance[comp];
        row.insertCell().textContent = sample.name;
      }
    }

    const fails = this.#mapAuditFailures(audit.failures(Webpage));
    const score = this.#metric.score(pages, fails);
    const comp = this.#metric.compliance(score);
    table.tFoot.rows[0].cells[0].className = comp;
    table.tFoot.rows[0].cells[0].textContent = String(Math.round(score));
    table.tFoot.rows[0].cells[1].textContent = compliance[comp];
  }

  /**
   * Infoga en dokumenttypsdeklaration i dokumentet.
   *
   * @private
   * @param {Document} doc Protokolldokument.
   */
  #insertDocType(doc) {
    const docType = doc.implementation.createDocumentType('html', '', '');
    doc.insertBefore(docType, doc.firstChild);
  }

  /**
   * Infoga den granskade tjänstens namn på avsedda ställen.
   *
   * @private
   * @param {Dcoument}  doc   Protokolldokument.
   * @param {AuditCase} aCase Ärende.
   */
  #intro(doc, aCase) {
    for (const elem of doc.querySelectorAll('.v-service')) {
      elem.textContent = aCase.service.name;
    }
  }

  /**
   * Översätt kravidentiteter till WCAG-kriterienummer.
   *
   * Returvärdet från `Audit.failures()` är ett objekt med avsnittsnummer i
   * EN 301 549 som nycklar och antalet underkända sidor som värden. Nycklarna
   * behöver översättas till WCAG-kriterienummer.
   *
   * Krav som inte motsvarar WCAG-kriterier ska sållas bort.
   *
   * @private
   * @param {object} failures Antal underkända sidor per krav-id.
   * @return {object}
   */
  #mapAuditFailures(failures) {
    const result = {};
    for (const [id, pages] of Object.entries(failures)) {
      if (EN301549Info.isWCAG(id)) {
        result[id.replace(/^\d+\./, '')] = pages;
      }
    }
    return result;
  }

  /**
   * Infoga mappade principer för ett underkänt krav.
   *
   * Principerna anges som en sträng med en eller flera av bokstäverna P, O, U
   * och R.
   *
   * @private
   * @param {Document}    doc        Protokolldokument.
   * @param {HTMLElement} parent     Föräldraelement att infoga i.
   * @param {string}      principles Mappade principer.
   */
  #mappedPrinciples(doc, parent, principles) {
    const a = (tag, cont) => c(parent.appendChild(e(tag)), cont);
    const c = (el, cont) => (el.textContent = cont);
    const e = (tag) => doc.createElement(tag);
    const map = (a) => a.map((c) => texts[c]);
    const texts = {
      O: 'Hanterbar',
      P: 'Möjlig att uppfatta',
      R: 'Robust',
      U: 'Begriplig',
    };
    a('h4', 'Principer');
    a('p', map(Array.from(principles ?? '')).join(', '));
  }

  /**
   * Infoga en länk till DIGG:s DOS-föreskrifter.
   *
   * @private
   * @param {Document}    doc    Protokolldokument.
   * @param {HTMLElement} parent Föräldraelement att infoga i.
   * @param {string}      clause Paragrafhänvisning.
   */
  #mdffs(doc, parent, clause) {
    const m = /\s(\d+)\s+§(?:\s+(\d+)\s+st(?:\s+(\d+)\s+p)?)?/.exec(clause);
    const r = [`${m[1]} §`];
    m[2] && r.push(`${m[2]} stycket`);
    m[3] && r.push(`${m[3]} punkten`);
    const p = parent.appendChild(doc.createElement('p'));
    p.textContent = `Referens: ${r.join(' ')} `;
    const a = p.appendChild(doc.createElement('a'));
    a.href =
      'https://www.digg.se/om-oss/forfattningssamling/foreskrifter-om-tillganglighet-till-digital-offentlig-service-mdffs-20192/grundforfattning-mdffs-20192';
    a.target = '_blank';
    a.appendChild(doc.createElement('cite')).textContent =
      'Myndigheten för digital förvaltnings föreskrifter om ' +
      'tillgänglighet till digital offentlig service';
    p.appendChild(doc.createTextNode(' (MDFFS\u00a02019:2)'));
  }

  /**
   * Populera ett tomt DOM-dokument med protokollets innehåll.
   *
   * @private
   * @param {Document} doc      DOM-dokument.
   * @param {Audit}    audit    Granskning.
   * @param {string}   template Mallinnehåll.
   */
  #populateProtocolDocument(doc, audit, template) {
    this.#failList = new FailureList(audit);
    const aCase = this.#case;
    this.#addTemplate(doc, template);
    this.#header(doc, aCase, audit);
    this.#intro(doc, aCase);
    this.#summary(doc, aCase, audit);
    this.#components(doc, audit);
    this.#samples(doc, audit);
    this.#documents(doc, audit);
    this.#principles(doc, audit);
    this.#fails(doc, audit);
    if (aCase.service instanceof Website) {
      this.#inaccessibilityPerPage(doc, audit);
      this.#functionalPerformanceStatements(doc, audit);
      this.#impactPerRequirement(doc, audit);
    }
  }

  /**
   * Populera förteckningen med underkända krav per princip.
   *
   * @private
   * @param {Document} doc   Protokolldokument.
   * @param {Audit}    audit Granskning.
   */
  #principles(doc, audit) {
    const parent = doc.querySelector('#principles');
    this.#subPrinciple(doc, parent, 'P');
    this.#subPrinciple(doc, parent, 'O');
    this.#subPrinciple(doc, parent, 'U');
    this.#subPrinciple(doc, parent, 'R');
  }

  /**
   * Infoga hänvisningar för ett underkänt krav.
   *
   * Infoga en länkad hänvisning till kriteriet i WCAG 2.1, sidan i EN 301 549
   * eller DIGG:s föreskrifter.
   *
   * I förekommande fall, infoga en länk till relevant riktlinje på
   * webbriktlinjer.se.
   *
   * @private
   * @param {Document}    doc     Protokolldokument.
   * @param {HTMLElement} parent  Föräldraelement att infoga i.
   * @param {string}      clause  Kravavsnitt i EN 301 549, eller paragraf.
   * @param {object}      config  Protokollkonfiguration för kravet.
   */
  #references(doc, parent, clause, config) {
    const a = (tag, cont) => c(parent.appendChild(e(tag)), cont);
    const c = (el, cont) => (el.textContent = cont);
    const e = (tag) => doc.createElement(tag);
    a('h4', 'Hänvisningar');

    if (null === config) {
      if (/MDFFS2019:2/.test(clause)) {
        this.#mdffs(doc, parent, clause);
      } else if (/SFS2018:1937/.test(clause)) {
        this.#sfs(doc, parent, clause);
      } else {
        a('p', clause);
      }
    } else if (config.wcag) {
      this.#wcag(doc, parent, config);
    } else {
      this.#en301549(doc, parent, config);
    }
  }

  /**
   * Lägg ett granskat stickprov i en lista.
   *
   * Om stickprovet har en associerad URL, skapa en länk.
   *
   * @private
   * @param {Document}    doc    Protokolldokument.
   * @param {HTMLElement} list   Lista att lägga till i.
   * @param {Sample}}     sample Stickprov.
   */
  #sample(doc, list, sample) {
    const item = list.appendChild(doc.createElement('li'));
    if (sample.url) {
      const link = item.appendChild(doc.createElement('a'));
      link.href = sample.url;
      link.textContent = sample.name;
    } else {
      item.textContent = sample.name;
    }
  }

  /**
   * Populera en lista med granskade strickprov (webbsidor, vyer).
   *
   * Om det inte finns några färdiggranskade stickprov i granskningen, ta
   * bort avsnittet och tillhörande länk i innehållsmenyn.
   *
   * @private
   * @param {Document} doc   Protokolldokument.
   * @param {Audit}    audit Granskning.
   */
  #samples(doc, audit) {
    let count = 0;
    const e = (id) => doc.getElementById(id);
    const parent = e('sec-pages') ?? e('sec-screens');
    const list = parent.querySelector('ul.toc');

    for (const screen of this.#allScreens(audit)) {
      this.#sample(doc, list, screen);
      ++count;
    }
    for (const page of this.#allPages(audit)) {
      this.#sample(doc, list, page);
      ++count;
    }

    if (0 === count) {
      parent?.remove();
      (e('toc-pages') ?? e('toc-screens'))?.remove();
    }
  }

  /**
   * Infoga en länk till DOS-lagen.
   *
   * @private
   * @param {Document}    doc    Protokolldokument.
   * @param {HTMLElement} parent Föräldraelement att infoga i.
   * @param {string}      clause Paragrafhänvisning.
   */
  #sfs(doc, parent, clause) {
    const m = /\s(\d+)\s+§(?:\s+(\d+)\s+st)?/.exec(clause);
    const r = [`${m[1]} §`];
    m[2] && r.push(`${m[2]} stycket`);
    const p = parent.appendChild(doc.createElement('p'));
    p.textContent = `Referens: ${r.join(' ')} `;
    const a = p.appendChild(doc.createElement('a'));
    a.href =
      'https://www.riksdagen.se/sv/dokument-lagar/dokument/svensk-forfattningssamling/lag-20181937-om-tillganglighet-till-digital_sfs-2018-1937';
    a.target = '_blank';
    a.appendChild(doc.createElement('cite')).textContent =
      'lagen (2018:1937) om tillgänglighet till digital offentlig ' + 'service';
  }

  /**
   * Populera en lista med brister som hör till en given princip.
   *
   * Om iteratorn inte genererar något innehåll, ta bort listans förälder.
   *
   * @private
   * @param {Document}    doc       Protokolldokument.
   * @param {HTMLElement} parent    Överordnad sektion.
   * @param {string}      principle Princip (P, O, U, R).
   */
  #subPrinciple(doc, parent, principle) {
    const cfg = this.#protCfg.clauses;
    let count = 0;
    const fmt = (c) => c.replace(/.*\s(\d+\s+§).*/, '$1');
    const lc = (s) => s.toLowerCase();
    const list = parent.querySelector(`#principle-${lc(principle)} ul`);
    for (const clause of this.#failList.allClauses()) {
      if (!cfg[clause].principles?.includes(principle)) continue;
      const li = list.appendChild(doc.createElement('li'));
      const a = li.appendChild(doc.createElement('a'));
      a.href = `#r-${clause.replace(/\W+/g, '-')}`;
      a.textContent = `${fmt(clause)} – ${cfg[clause].title}`;
      ++count;
    }
    count || list.parentNode.remove();
  }

  /**
   * Populera sammanfattningen.
   *
   * @private
   * @param {Document}  doc   Protokolldokument.
   * @param {AuditCase} aCase Ärende.
   * @param {Audit}     audit Granskning.
   */
  #summary(doc, aCase, audit) {
    const dd = Array.from(doc.querySelectorAll('.summary dd'));

    const service = dd.shift();
    const version = this.#app && dd.shift();
    const os = this.#app && dd.shift();
    const orgName = dd.shift();
    const orgNo = this.#advanced && dd.shift();
    const pages = dd.shift();
    const docs = dd.shift();
    const metric = !this.#app && dd.shift();
    const statement = dd.shift();

    orgName.textContent = aCase.organization.name;
    pages.textContent = String(audit.countDone(AppScreen, Webpage));
    docs.textContent = String(audit.countDone(NonWebDocument));

    if (this.#advanced) {
      orgNo.textContent = aCase.organization.registrationNumber.toString();
    }

    if (this.#app) {
      service.textContent = aCase.service.name;
      version.textContent = audit.version;
      os.textContent = aCase.service.operatingSystem;
    } else {
      const link = service.children[0];
      const start = Array.from(audit.samples('start'));
      if (start.length > 0 && start[0].url) {
        link.href = start[0].url;
      } else {
        link.removeAttribute('href');
      }
      link.textContent = aCase.service.name;
    }

    if (metric) {
      const fails = this.#mapAuditFailures(audit.failures(Webpage));
      const pageCount = audit.countDone(Webpage);
      const score = this.#metric.score(pageCount, fails);
      metric.className = this.#metric.compliance(score);
      metric.textContent = String(Math.round(score));
    }

    [statement.className, statement.textContent] =
      this.#checkA11yStatementCompliance(audit.samples('statement'));
  }

  /**
   * Infoga en länk till ett kriterium i WCAG 2.1
   *
   * @private
   * @param {Document}    doc    Protokolldokument.
   * @param {HTMLElement} parent Föräldraelement att infoga i.
   * @param {object}      info   Kravavsnittsinformation.
   */
  #wcag(doc, parent, info) {
    const p = parent.appendChild(doc.createElement('p'));
    p.innerHTML = `Referens: <cite>WCAG 2.1</cite>, kriterium ${info.criterion} `;
    const a = p.appendChild(doc.createElement('a'));
    a.href = info.url;
    a.hreflang = 'en';
    a.lang = 'en';
    a.target = '_blank';
    a.textContent = info.title;
    p.appendChild(doc.createTextNode(` (nivå\u00a0${info.level})`));
  }
}

// Importera beroenden.
import {
  AppScreen,
  Component,
  NonWebDocument,
  Webpage,
} from '../model/sample.js';
import { Audit } from '../model/Audit.js';
import { AuditCase, ComplaintCase, MonitoringCase } from '../model/case.js';
import { EN301549Info } from '../common/EN301549Info.js';
import { FailureList } from '../model/FailureList.js';
import { MobileApp, Website } from '../model/service.js';

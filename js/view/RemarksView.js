/**
 * Vy som visar ett påpekande eller ett föreläggnade.
 *
 * @license CC-BY 4.0
 */
export class RemarksView {
  // Privata fält.
  #config;
  #dtf;
  #file;
  #loader;
  #model;
  #srcDoc;
  #win;

  /**
   * Konstruera en vyinstans.
   *
   * @param {Model}          model      Modellobjekt.
   * @param {FileStorage}    filesystem Fillagring.
   * @param {ResourceLoader} loader     Resursladdare.
   * @param {object}         [globals]  Globala objekt vid enhetstest.
   */
  constructor(model, filesystem, loader, globals = {}) {
    this.#dtf = new Intl.DateTimeFormat('sv', { dateStyle: 'long' });
    this.#file = filesystem;
    this.#loader = loader;
    this.#model = model;
    this.#srcDoc = globals.document ?? document;
    this.#win = globals.window ?? window;
  }

  /**
   * Öppna angivet dokument.
   *
   * @param {AuditCase} aCase   Ärende.
   * @param {Audit}     audit   Granskning.
   * @param {date}      created Dokumentets skapandedatum.
   * @param {string}    type    Dokumenttyp (remarks/injunction).
   */
  async open(aCase, audit, created, type) {
    // Häamta malldokument.
    const template = await this.#getConfigurations(aCase, type);

    // Öppna en ny vy och populera dokumentet i den.
    const win = this.#win.open('', '_blank');
    const doc = win.document;
    this.#insertDocType(doc);
    this.#populateGeneratedDocument(doc, aCase, audit, created, type, template);
  }

  /**
   * Spara angivet dokument.
   *
   * @param {AuditCase} aCase   Ärende.
   * @param {Audit}     audit   Granskning.
   * @param {date}      created Dokumentets skapandedatum.
   * @param {string}    type    Dokumenttyp (remarks/injunction).
   */
  async save(aCase, audit, created, type) {
    // Häamta malldokument.
    const model = this.#model;
    const template = await this.#getConfigurations(aCase, type);
    const types = {
      injunction: { name: 'forelaggande', title: 'Föreläggande' },
      remarks: { name: 'papekande', title: 'Påpekande' },
    };

    // Skapa ett nytt DOM-dokument och populera det.
    const cno = aCase.caseNumber;
    const date = created.toLocaleDateString('sv');
    const title = `${types[type].title} ${cno}, ${date}`;
    const doc = this.#srcDoc.implementation.createHTMLDocument(title);
    this.#populateGeneratedDocument(doc, aCase, audit, created, type, template);

    const filename = `${types[type].name}_${cno}_${date}.html`;
    await this.#file.saveToHTMLFile(filename, doc);
  }

  /**
   * Infoga mallinnehållet i dokumentet.
   *
   * @private
   * @param {Document} doc      DOM-dokument.
   * @param {string}   template Mallinnehåll.
   */
  #addTemplate(doc, template) {
    const html = doc.documentElement;
    html.lang = 'sv';
    html.innerHTML = template;
  }

  /**
   * Populera ärendeinformationen.
   *
   * @private
   * @param {Document} doc     DOM-dokument.
   * @param {case}     aCase   Ärende.
   * @param {date}     created Dokumentets skapandedatum.
   */
  #caseInfo(doc, aCase, created) {
    const date = `den ${this.#dtf.format(created)}`;
    const dl = doc.querySelector('main > dl:first-of-type');
    const name = aCase.organization.name;
    const reg = aCase.organization.registrationNumber;
    dl.children[1].children[0].textContent = date;
    dl.children[3].textContent = aCase.caseNumber.toString();
    dl.children[5].textContent = `${name} (org.nr: ${reg})`;
  }

  /**
   * Populera ärendeloggstabellen.
   *
   * Lägg in inkomna och utgående händelser fram till att dokumentet skapades.
   *
   * @private
   * @param {Document} doc     DOM-dokument.
   * @param {case}     aCase   Ärende.
   * @param {Audit}    audit   Granskning.
   * @param {date}     created Dokumentets skapandedatum.
   */
  #caseLog(doc, aCase, audit, created) {
    const data = audit.started.getTime();
    const date = (d) => `Den ${this.#dtf.format(d)}`;
    const iso = (d) => d.toISOString().slice(0, 10);
    const length = aCase.logSize;
    const tbody = doc.getElementById('log');
    const types = [
      LogEntry.EntryType.ActionPlan,
      LogEntry.EntryType.Appeal,
      LogEntry.EntryType.AuditFinish,
      LogEntry.EntryType.AuditStart,
      LogEntry.EntryType.CaseOpen,
      LogEntry.EntryType.Deferment,
      LogEntry.EntryType.Injunction,
      LogEntry.EntryType.Notification,
      LogEntry.EntryType.Remarks,
    ];
    for (const entry of aCase.log()) {
      if (entry.timestamp > created && entry.data !== data) break;
      if (!types.includes(entry.type)) continue;
      const tr = tbody.insertRow();
      const time = tr.insertCell().appendChild(doc.createElement('time'));
      time.setAttribute('datetime', iso(entry.timestamp));
      time.textContent = date(entry.timestamp);
      tr.insertCell().textContent = entry.summary;
    }
  }

  /**
   * Populera ärendeinformationen.
   *
   * @private
   * @param {Document} doc     DOM-dokument.
   * @param {case}     aCase   Ärende.
   * @param {Audit}    audit   Granskning.
   * @param {date}     created Dokumentets skapandedatum.
   * @param {string}   type    Dokumenttyp (remarks/injunction).
   */
  #details(doc, aCase, audit, created, type) {
    const fill = (s, t, d = null) =>
      doc.querySelectorAll(s).forEach((e) => {
        e.textContent = t;
        d && e.setAttribute('datetime', d);
      });

    const org = aCase.organization;
    const abbr = org.abbreviation;
    const name = org.name;
    let possessive = org.name;
    if (!/[sxz]$/i.test(name)) {
      possessive += 's';
    }

    if (abbr) {
      fill('.psb', abbr);
      fill('.psb-abbr', `(${abbr})`);
      fill('.psb-possessive', `${abbr}:s`);
    } else {
      fill('.psb', name);
      fill('.psb-possessive', possessive);
      doc.querySelectorAll('.psb-abbr').forEach((e) => e.remove());
    }
    fill('.psb-name', possessive);
    fill('.reg-no', org.registrationNumber);
    fill('.service', aCase.service.name);

    doc.querySelectorAll('.url').forEach((e) => {
      for (const sample of audit.samples('start')) {
        if (sample.url) {
          e.href = sample.url;
          break;
        }
      }
      e.textContent = aCase.service.name;
    });

    const dates = { remarks: 'remarks', injunction: 'injunctions' };
    const match = (d) => d.getTime() === time;
    const time = created.getTime();
    const [, deadline] = audit[dates[type]].find(([c]) => match(c));
    const longDate = `den ${this.#dtf.format(deadline)}`;
    const shortDate = deadline.toISOString().slice(0, 10);
    fill('.deadline', longDate, shortDate);

    const s = (o) => o?.supervisor;
    const supervisor = (s(aCase) ?? s(aCase.schedule))?.toString() ?? '';
    fill('.supervisor-name', supervisor);
  }

  /**
   * Populera åtgärdslistan.
   *
   * Åtgärdslistan innehåller de åtgärder som aktören förväntas utföra och
   * populeras utifrån de underkända kraven i granskningen.
   *
   * Ordningen ska vara som följer:
   * 1. Krav från DOS-lagen, per paragraf och stycke..
   * 2. Krav från DOS-förordningen, per paragraf, stycke och punkt.
   * 3. Krav från EN 301 549, per avsnittsnummer.
   *
   * @private
   * @param {Document} doc   DOM-dokument.
   * @param {Audit}    audit Granskning.
   */
  #fails(doc, audit) {
    const all = [AppScreen, Component, NonWebDocument, Webpage];
    const c2n = (c) => pad(cn(c)).reduce((n, d) => 100 * n + m(d), 0);
    const cn = (c) => (-1 === c.indexOf('§') ? c : `0.${s2c(c)}`);
    const fails = Object.keys(audit.failures(...all));
    const m = (d) => Number(d) % 100;
    const pad = (c) => c.split('.').concat(0, 0, 0, 0).slice(0, 6);
    const s2c = (s) => s.replace(/\D+/g, '.').replace(/^\.|\.$/g, '');
    const ul = doc.getElementById('fails');
    fails.sort((a, b) => c2n(a) - c2n(b));
    for (const clause of fails) {
      if (!(clause in this.#config)) continue;
      const li = ul.appendChild(doc.createElement('li'));
      li.textContent = this.#config[clause];
    }
  }

  /**
   * Redigera den juridiska formalian.
   *
   * Ta bort första stycket om det finns en tillgänglighetsredogörelse.
   * Ta bort andra stycket om tillgänglighetsredogörelse saknas eller om den
   * uppfyller lagkraven.
   * Ta bort vissa element i tredje stycket beroende på om första och andra
   * stycket finns kvar.
   *
   * @private
   * @param {Document} doc   DOM-dokument.
   * @param {Audit}    audit Granskning.
   */
  #formalities(doc, audit) {
    let dos = true;
    let ord = true;

    if (0 === audit.count('statement')) {
      // Ingen redogörelse: ta bort andra stycket.
      doc.getElementById('item-stmt-compliance').remove();
      ord = false; // Förordningen inte definierad.
    } else {
      // Redogörelse finns: ta bort första stycket.
      doc.getElementById('item-no-stmt').remove();

      let count = 0;
      for (const sample of audit.samples('statement')) {
        for (const req of sample.requirements()) {
          if (!req.failed) continue;
          if (req.clause?.indexOf('§') >= 0) ++count;
        }
      }
      if (0 === count) {
        // Redogörelsens innehåll uppfyller lagkraven: ta bort 2:a st.
        doc.getElementById('item-stmt-compliance').remove();
        dos = ord = false; // Varken DOS eller förordning def.
      }
    }

    const all = [AppScreen, Component, NonWebDocument, Webpage];
    const failures = Object.keys(audit.failures(...all)).filter(
      (c) => -1 === c.indexOf('§')
    ).length;

    const a11y = doc.getElementById('item-a11y');
    const kill = (s) => a11y.querySelectorAll(s).forEach((e) => e.remove());
    if (0 === failures) {
      // Inga tillgänglighetsbrister: ta bort tredje stycket.
      a11y.remove();
    } else {
      // Ta bort hänvisningar till termer som inte definierats.
      !dos && kill('.abbr.dos');
      !ord && kill('.abbr.ord');

      // Ta bort definitioner av termer som redan definierats.
      dos && kill('.dfn.dos');
      ord && kill('.dfn.ord');
    }
  }

  /**
   * Hämta malldokument och konfigurationsfil.
   *
   * Returnera innehållet i det malldokument som hör till ärendet.
   *
   * @private
   * @param {AuditCase} aCase Ärende.
   * @param {string}    type  Dokumenttyp (remarks/injunction).
   * @return {string}
   */
  async #getConfigurations(aCase, type) {
    // Dokumentkonfiguraation.
    const service = aCase.service.type;
    const config = `remarks/${service}`;
    this.#config = await this.#loader.configuration(config);

    // Dokumentmall.
    const name = `${type}-${service}`;
    const template = await this.#loader.pageTemplate(name);
    return template;
  }

  /**
   * Infoga en dokumenttypsdeklaration i dokumentet.
   *
   * @private
   * @param {Document} doc DOM-dokument.
   */
  #insertDocType(doc) {
    const docType = doc.implementation.createDocumentType('html', '', '');
    doc.insertBefore(docType, doc.firstChild);
  }

  /**
   * Populera ett tomt DOM-dokument med påpekandets/föreläggandets innehåll.
   *
   * @private
   * @param {Document}  doc      DOM-dokument.
   * @param {AuditCase} aCase    Ärende.
   * @param {Audit}     audit    Granskning.
   * @param {date}      created  Dokumentets skapandedatum.
   * @param {string}    type     Dokumenttyp (remarks/injunction).
   * @param {string}    template Mallinnehåll.
   */
  #populateGeneratedDocument(doc, aCase, audit, created, type, template) {
    const model = this.#model;
    this.#addTemplate(doc, template);
    this.#caseInfo(doc, aCase, created);
    this.#formalities(doc, audit);
    this.#details(doc, aCase, audit, created, type);
    this.#fails(doc, audit);
    this.#sampleInfo(doc, aCase, audit);
    this.#sampleSummary(doc, aCase, audit);
    this.#caseLog(doc, aCase, audit, created);
  }

  /**
   * Populera stycket med stickprovsinformation.
   *
   * Ersätt platshållare med data utifrån granskningsresultatet.
   *
   * @private
   * @param {Document} doc   DOM-dokument.
   * @param {case}     aCase Ärende.
   * @param {Audit}    audit Granskning.
   */
  #sampleInfo(doc, aCase, audit) {
    let article;
    let docs = 0;
    const para = doc.getElementById('sample-info');
    let html = para.innerHTML;
    let pages = 0;
    let pronoun;
    const samples = [];
    let screens = 0;

    for (const category of Audit.AuditCategories) {
      for (const sample of audit.samples(category)) {
        ({
          screen: () => ++screens,
          document: () => ++docs,
          webpage: () => ++pages,
        })[sample.type]?.();
      }
    }

    const noPage = 0 === pages;
    const noScreen = 0 === screens;
    const oneDoc = 1 === docs;
    const oneEach = 1 === docs + pages + screens;
    const onePage = 1 === pages;
    const oneScreen = 1 === screens;
    const pageOrScreen = (pages || screens) > 0;
    if (oneDoc && noPage && noScreen) {
      article = pronoun = 'det';
    } else if (oneScreen || (onePage && noScreen)) {
      article = 'den';
      pronoun = oneEach ? 'den' : 'de';
    } else {
      article = pronoun = 'de';
    }

    const pr = new Intl.PluralRules('sv');
    const d = { one: 'dokumentet', other: 'dokumenten' };
    const p = { one: 'webbsidan', other: 'webbsidorna' };
    const s = { one: 'vyn', other: 'vyerna' };
    screens && samples.push(s[pr.select(screens)]);
    pages && samples.push(p[pr.select(pages)]);
    docs && samples.push(d[pr.select(docs)]);

    const last = samples.length > 1 ? samples.pop() : [];
    const first = samples.join(', ');
    const total = [first].concat(last).join(' och ');

    const r = {
      one: 'möjlig att uppfatta, hanterbar, begriplig och robust',
      other: 'möjliga att uppfatta, hanterbara, begripliga och robusta',
    };
    const reqs = r[pr.select(docs + pages + screens)];

    html = html.replace('%service%', aCase.service.name);
    html = html.replace('%samples%', `${article} granskade ${total}`);
    html = html.replace('%pronoun%', pronoun);
    html = html.replace('%requirements%', reqs);

    para.innerHTML = html;
  }

  /**
   * Populera beskrivningslistan med granskningsinformation.
   *
   * @private
   * @param {Document} doc   DOM-dokument.
   * @param {case}     aCase Ärende.
   * @param {Audit}    audit Granskning.
   */
  #sampleSummary(doc, aCase, audit) {
    const date = (d) => `den ${this.#dtf.format(d)}`;
    const dl = doc.getElementById('sample-summary');
    const dd = dl.querySelectorAll('dd');
    let i = 0;
    dd[0].children[0].textContent = date(audit.started);
    dd[1].children[0].textContent = date(audit.finished);
    dd[2].textContent = String(audit.countDone(AppScreen, Webpage));
    dd[3].textContent = String(audit.countDone(NonWebDocument));
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
import { LogEntry } from '../model/LogEntry.js';

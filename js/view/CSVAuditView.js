/**
 * Vy som skapar granskningsmetadata i CSV-format.
 *
 * Skapar ett försättsblad till ett granskningsprotokoll som en kommaseparerad
 * fil som går att öppna med exempelvis Microsoft Excel. Försättsbladet inne-
 * håller metainformation om granskningen, såsom datum och ärendenummer samt
 * antalet granskade objekt.
 *
 * @license CC-BY 4.0
 */
export class CSVAuditView {
  // Privata fält.
  #file;
  #lines = [];

  /**
   * Konstruera en vyinstans.
   *
   * @param {FileStorage} filesystem Fillagring.
   */
  constructor(filesystem) {
    this.#file = filesystem;
  }

  /**
   * Spara angivet försättsblad.
   *
   * @param {AuditCase} aCase Ärende.
   * @param {Audit}     audit Granskning.
   */
  async save(aCase, audit) {
    try {
      // Populera dataraderna.
      this.#populate(aCase, audit);

      const cno = aCase.caseNumber;
      const date = audit.started.toLocaleDateString('sv');
      const filename = `protokoll_${cno}_${date}_oversikt.csv`;
      await this.#file.saveToCSVFile(filename, this.#lines);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  /**
   * Infoga en datarad i innehållet.
   *
   * @private
   * @param {string} ...columns Datakolumner.
   */
  #addLine(...columns) {
    const line = columns.map((c) => this.#escape(c)).join(',');
    this.#lines.push(line + '\r\n');
  }

  /**
   * Lägg till metainformation om en mobil applikation.
   *
   * @private
   * @param {MobileApp} app   Mobil applikation.
   * @param {Audit}     audit Granskning.
   */
  #appMetadata(app, audit) {
    this.#addLine('Mobil applikation', app.name);
    this.#addLine('Operativsystem', app.operatingSystem);
    this.#addLine('Version', audit.version);
  }

  /**
   * Skydda specialtecken.
   *
   * Tecken som behöver skyddas är komma, citattecken, radmatning och omvänt
   * snedstreck.
   *
   * Komma skyddas genom att omge hela strängen med citattecken.
   *
   * Radmatning tycks inte gå att skydda så att Excel förstår det, så det
   * ersätts med två mellanslag.
   *
   * Citattecken och omvvända snedstreck i texten skyddas genom dubblering.
   *
   * @private
   * @param {string} text Text att skydda.
   * @return {string}
   */
  #escape(text) {
    if ('number' === typeof text) return text;
    const backslashes = text.replaceAll('\\', '\\\\');
    const newlines = backslashes.replaceAll('\n', '  ');
    const quotes = newlines.replaceAll('"', '""');
    return `"${quotes}"`;
  }

  /**
   * Populera dataraderna med granskningsmetadata.
   *
   * @private
   * @param {AuditCase} aCase Ärende.
   * @param {Audit}     audit Granskning.
   */
  #populate(aCase, audit) {
    ({
      app: (s, a) => this.#appMetadata(s, a),
      website: (s, a) => this.#websiteMetadata(s, a),
    })[aCase.service.type](aCase.service, audit);

    let date = aCase.schedule?.date ?? aCase.date;
    const fmt = (d) => d?.toLocaleDateString('sv') ?? '';
    date && this.#addLine('Tillsyn beslutad', fmt(date));

    this.#addLine('Ärendenummer', String(aCase.caseNumber));
    this.#addLine('Granskning inledd', fmt(audit.started));
    this.#addLine('Granskning avslutad', fmt(audit.finished));
    this.#addLine('Granskare', String(audit.officer));

    const count = (c) => [...audit.doneSamples(c)].length;
    if ('app' === aCase.service.type) {
      this.#addLine('Antal granskade vyer', count(AppScreen));
      this.#addLine('Antal granskade webbsidor', count(Webpage));
    } else {
      this.#addLine('Antal granskade sidor', count(Webpage));
    }
    this.#addLine('Antal granskade dokument', count(NonWebDocument));
  }

  /**
   * Lägg till metainformation om en webbplats.
   *
   * @private
   * @param {Website} site  Webbplats.
   * @param {Audit}   audit Granskning.
   */
  #websiteMetadata(site, audit) {
    this.#addLine('Webbplats', site.name);

    for (const sample of audit.samples('start') ?? []) {
      if (sample.url) {
        this.#addLine('ULR', sample.url);
        break;
      }
    }
  }
}

// Importera beroenden.
import { AppScreen, NonWebDocument, Webpage } from '../model/sample.js';

/**
 * Vy som skapar ett granskningsprotokoll i CSV-format.
 *
 * Skapar ett förenklat granskningsprotokoll som en kommaseparerad fil som går
 * att öppna med exempelvis Microsoft Excel.
 *
 * @license CC-BY 4.0
 * @see FaiureList
 */
export class CSVProtocolView {
  // Privata fält.
  #file;
  #lines = [];
  #loader;
  #protCfg;

  /**
   * Konstruera en vyinstans.
   *
   * @param {FileStorage}    filesystem Fillagring.
   * @param {ResourceLoader} loader     Resursladdare.
   */
  constructor(filesystem, loader) {
    this.#file = filesystem;
    this.#loader = loader;
  }

  /**
   * Spara angivet granskningsprotokoll.
   *
   * @param {AuditCase} aCase Ärende.
   * @param {Audit}     audit Granskning.
   */
  async save(aCase, audit) {
    try {
      const type = aCase.service.type;
      const protCfg = `protocols/${type}`;
      this.#protCfg = await this.#loader.configuration(protCfg);

      // Rubrikrad.
      this.#addHeadings();

      // Sortera alla underkända krav i avsnittsnummerordning.
      const fails = new FailureList(audit);
      const done = new Set();

      // Lägg till rader per underkänt stickprov och krav.
      for (const component of fails.components()) {
        const name = `Alla sidor med ${component.name}`;
        for (const [id, , requirements] of fails.clauses(component)) {
          done.add(id);
          for (const requirement of requirements) {
            this.#failedRequirement(id, name, requirement);
          }
        }
      }

      for (const type of [AppScreen, Webpage, NonWebDocument]) {
        for (const sample of fails.samples(type)) {
          for (const [id, , requirements] of fails.clauses(sample)) {
            if (done.has(id)) continue;
            for (const requirement of requirements) {
              this.#failedRequirement(id, sample, requirement);
            }
          }
        }
      }

      const cno = aCase.caseNumber;
      const date = audit.started.toLocaleDateString('sv');
      const filename = `protokoll_${cno}_${date}_brister.csv`;
      await this.#file.saveToCSVFile(filename, this.#lines);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  /**
   * Infoga rubrikraden först i innehållet.
   *
   * @private
   */
  #addHeadings() {
    const headings = [
      'ID',
      'Referens',
      'Sidans URL',
      'Sidans titel',
      'Kravets titel',
      'Förväntning',
      'Observation',
      'Bristen rättad',
    ].map((s) => `"${s}"`);
    this.#lines.push('\ufeff' + headings.join(',') + '\r\n');
  }

  /**
   * Infoga en datarad i innehållet.
   *
   * @private
   * @param {string[]} columns Datakolumner.
   */
  #addLine(columns) {
    columns.push(''); // Bristen rättad.
    const line = columns.map((c) => this.#escape(c)).join(',');
    this.#lines.push(line + '\r\n');
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
   * Infoga en rad per underkänd kontroll för ett krav.
   *
   * @private
   * @param {number}          id          Bristidentitet.
   * @param {(string|Sample)} sample      Komponentnamn eller stickprov.
   * @param {Requirement}     requirement Krav.
   */
  #failedRequirement(id, sample, requirement) {
    const { clause } = requirement;
    const cfg = this.#protCfg.clauses[clause];
    const name = sample?.name ?? sample;
    const url = sample?.url ?? '';

    for (const check of requirement.checks()) {
      if (check.failed && check.observation) {
        this.#addLine([
          id,
          clause,
          url,
          name,
          cfg.title,
          cfg.expectations.join('  '),
          check.observation,
        ]);
      }
    }
  }
}

// Importera beroenden.
import {
  AppScreen,
  Component,
  NonWebDocument,
  Webpage,
} from '../model/sample.js';
import { FailureList } from '../model/FailureList.js';

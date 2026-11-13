/**
 * Persistent lagring av data i filsystemet.
 *
 * @license CC-BY 4.0
 */
export class FileStorage {
  /**
   * Spara en strängvektor till en CSV-fil.
   *
   * Skapa en blob med vektorinnehållet. Skapa sedan en URL som representerar
   * bloben och en nedladdningslänk med denna URL. Simulera sedan ett klick på
   * länken för att öppna en filvalsdialog där användaren kan välja var filen
   * ska sparas.
   *
   * @param {string}   filename Förslag på filnamn.
   * @param {string[]} data     Datarader.
   * @param {Document} [doc]    DOM-dokument vid enhetstester.
   */
  async saveToCSVFile(filename, data, doc = document) {
    const [link, url] = await this.#initializeSaveToFile(
      'text/csv',
      filename,
      data,
      doc
    );
    this.#freeResources(link, url);
  }

  /**
   * Spara ett webbdokument till en HTML-fil.
   *
   * Skapa en blob med det serialiserade dokumentinnehållet. Skapa sedan en
   * URL som representerar bloben och en nedladdningslänk med denna URL.
   * Simulera sedan ett klick på länken för att öppna en
   * filvalsdialog där användaren kan välja var filen ska sparas.
   *
   * @param {string}   filename Förslag på filnamn.
   * @param {Document} dataDoc  Dokument att searialisera.
   * @param {Document} [doc]    DOM-dokument vid enhetstester.
   */
  async saveToHTMLFile(filename, dataDoc, doc = document) {
    const [link, url] = await this.#initializeSaveToFile(
      'text/html',
      filename,
      [`<!DOCTYPE html>\n${dataDoc.documentElement.outerHTML}`],
      doc
    );
    this.#freeResources(link, url);
  }

  /**
   * Spara data i JSON-format till en fil.
   *
   * Skapa en blob med data i JSON-format. Skapa sedan en URL som
   * representerar bloben och en nedladdningslänk med denna URL. Simulera
   * sedan ett klick på länken för att (förhoppningsvis) öppna en
   * filvalsdialog där användaren kan välja var filen ska sparas.
   *
   * @param {string}   filename Förslag på filnamn.
   * @param {Object}   data     Dataobjekt att spara.
   * @param {Document} [doc]    DOM-dokument vid enhetstester.
   */
  async saveToJSONFile(filename, data, doc = document) {
    const [link, url] = await this.#initializeSaveToFile(
      'application/json',
      filename,
      [JSON.stringify(data, null, 2)],
      doc
    );
    this.#freeResources(link, url);
  }

  /**
   * Frigör resurser som skapats vid spara till fil.
   *
   * @private
   * @param {HTMLAnchorElement} link Temporär länk.
   * @param {string}            url  Temporär URL.
   */
  #freeResources(link, url) {
    link.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * Öppna filvalsdialogen och låt användaren spara till fil.
   *
   * @private
   * @see saveToFile()
   * @param {string}   mimeType MIME-type.
   * @param {string}   filename Förslag på filnamn.
   * @param {array}    content  Datainnehåll att spara till fil.
   * @param {Document} [doc]    DOM-dokument vid enhetstester.
   * @return {array}
   */
  async #initializeSaveToFile(mimeType, filename, content, doc) {
    const file = new Blob(content, { type: mimeType });
    const url = URL.createObjectURL(file);
    const link = doc.createElement('a');
    link.href = url;
    link.download = filename;

    link.click();
    return [link, url];
  }
}

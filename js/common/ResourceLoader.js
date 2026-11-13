/**
 * Resursladdare.
 *
 * Hämtar resursfiler asynkront från servern. Klassen är, strikt sett, inte helt
 * nödvändig men förenklar och möjliggör enhetstester.
 *
 * @license CC-BY 4.0
 */
export class ResourceLoader {
  // Privata fält.
  static #Directories = {
    Config: '../js/config',
    Content: './pages',
    Scripts: '../js',
    Templates: './templates',
  };

  #importer = (p) => import(p);
  #loader = (p) => fetch(p);

  /**
   * Skapa en resursladdarinstans.
   *
   * @param {callback} [loader] Resursladdare vid enhetstester.
   */
  constructor(loader = null) {
    if (loader) {
      this.#importer = (p) => loader(p);
      this.#loader = (p) => loader(p);
    }
  }

  /**
   * Hämta en konfiguration i JSON-format.
   *
   * Argumentet anges relativt konfigurationskatalogen och utan filändelse:
   * "foo/bar" hämtar "/js/config/foo/bar.json".
   *
   * @param {string} path Sökväg relativt konfigurationskatalogen.
   * @return {object} Innehållet i angiven fil tolkat som JSON.
   * @throws {TypeError} Fel uppstod vid hämtning av filen.
   */
  async configuration(path) {
    const fullPath = `${ResourceLoader.#Directories.Config}/${path}.json`;
    const response = await this.#loader(fullPath);
    if (response.ok) {
      return response.json();
    }

    throw new TypeError(`Kan inte hämta '${fullPath}'.`);
  }

  /**
   * Importera en JavaScript-modul.
   *
   * @param {string} path Sökväg relativt controllerkatalogen.
   * @return {object} Den importerade JavaScript-modulen.
   * @throws {TypeError} Fel uppstod vid hämtning av filen.
   */
  async loadModule(path) {
    return this.#importer(`../${path}`);
  }

  /**
   * Hämta ett innehållsfragment som text.
   *
   * Argumentet anges relativt innehållskatalogen och utan filändelse:
   * "foo" hämtar "/granskning/pages/foo.html".
   *
   * @param {string} path Sökväg relativt granskningskatalogen.
   * @return {string} Textinnehållet i angiven fil.
   * @throws {TypeError} Fel uppstod vid hämtning av filen.
   */
  async pageContent(path) {
    const fullPath = `${ResourceLoader.#Directories.Content}/${path}.html`;
    const response = await this.#loader(fullPath);
    if (response.ok) {
      return response.text();
    }

    throw new TypeError(`Kan inte hämta '${fullPath}'.`);
  }

  /**
   * Hämta en sidmall som text.
   *
   * Argumentet anges relativt mallkatalogen och utan filändelse:
   * "foo" hämtar "/granskning/templates/foo.html".
   *
   * @param {string} path Sökväg relativt granskningskatalogen.
   * @return {string} Textinnehållet i angiven fil.
   * @throws {TypeError} Fel uppstod vid hämtning av filen.
   */
  async pageTemplate(path) {
    const fullPath = `${ResourceLoader.#Directories.Templates}/${path}.html`;
    const response = await this.#loader(fullPath);
    if (response.ok) {
      return response.text();
    }

    throw new TypeError(`Kan inte hämta '${fullPath}'.`);
  }

  /**
   * Hämta en resursfil som text.
   *
   * Argumentet anges relativt skriptrotkatalogen:
   * "foo/bar.txt" hämtar "/js/foo/bar.txt".
   *
   * @param {string} path Sökväg relativt skriptrotkatalogen.
   * @return {string} Textinnehållet i angiven fil.
   * @throws {TypeError} Fel uppstod vid hämtning av filen.
   */
  async resource(path) {
    const fullPath = `${ResourceLoader.#Directories.Scripts}/${path}`;
    const response = await this.#loader(fullPath);
    if (response.ok) {
      return response.text();
    }

    throw new TypeError(`Kan inte hämta '${fullPath}'.`);
  }
}

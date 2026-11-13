/**
 * Växel för översättning av begäransparametrar till sidor och moduler.
 *
 * Växeln analyserar en begäran och returnerar namnen på den modul som
 * fördelaren ska importera för att hantera begäran.
 *
 * Växeln använder en konfigurationsfil för att översätta sidnamnsparametrar
 * till modulnamn.
 *
 * @license CC-BY 4.0
 */
export class Router {
  // Privata fält.
  #loader;
  #request;
  #routes = {};

  /**
   * Konstruera en växelinstans.
   *
   * @param {string}         request Initial begäran.
   * @param {ResourceLoader} loader  Resursladdare.
   */
  constructor(request, loader) {
    this.#loader = loader;
    this.#request = request;
  }

  /**
   * Hämta konfigurationsfil.
   *
   * @param {string} name Konfigurationsfilens namn.
   * @return {object} Konfigurationen tolkad som JSON.
   * @throws {TypeError} Fel vid hämtning av konfigurationsfil.
   */
  async loadConfig(name) {
    this.#routes = await this.#loader.configuration(name);
  }

  /**
   * Växla en begäran.
   *
   * Hämta begäransparametrar ("sökväg") från någon av följande källor:
   * 1. applikationskontexten (senaste begäran)
   * 2. den initiala begäran
   * 3. modellen (senast sparade sökväg).
   *
   * @param {AppContext} context Applikationskontext.
   * @param {Model}      model   Modellobjekt.
   * @return {string} Relativ sökväg till en initieringsmodul.
   * @throws {TypeError} Sidan finns inte i konfigurationsfilen.
   */
  route(context, model) {
    // Första anropet? Använd sökväg från sidbegäran, eller sparad senast
    // besökta sida från modellen.
    context.path ||= this.#request || model.lastPath || '?';
    const page = context.page || 'start';

    if (!(page in this.#routes)) {
      throw new TypeError(`Sidan "${page}" finns inte.`);
    }

    return `../${this.#routes[page]}`;
  }
}

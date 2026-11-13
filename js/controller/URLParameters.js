/**
 * URL-parametrar med skydd av specialtecken.
 *
 * Hjälper till att konstruera en URL-parameterlista där värden (eller namn) kan
 * innehålla tecken som behöver %-kodas.
 *
 * @example
 * const p = new URLParameters();
 * p.add("foo", "bar");
 * p.add("quux", "x&y;
 * p.toString();  // "foo=bar&quux=x%26y"
 *
 * @license CC-BY 4.0
 */
export class URLParameters {
  // Privata fält.
  #params = {};

  /**
   * Konstruera en parameterstränginstans.
   *
   * @param {URLParameters} [source] Instans att kopiera.
   */
  constructor(source = null) {
    source && Object.assign(this.#params, source.#params);
  }

  /**
   * Lägg till en parameter.
   *
   * @param {string} name    Namn.
   * @param {string} [value] Värde.
   */
  add(name, value) {
    this.#params[this.#escape(name)] = this.#escape(value);
  }

  /**
   * Ta bort en parameter.
   *
   * @param {string} name Namn.
   */
  delete(name) {
    delete this.#params[this.#escape(name)];
  }

  /**
   * @inheritDoc
   * @override
   */
  toString() {
    return Object.entries(this.#params)
      .map(([name, value]) => (value ? `${name}=${value}` : name))
      .join('&');
  }

  /**
   * Skydda tecken med speciell betydelse i en URI.
   *
   * @private
   * @param {string} str Sträng att skydda.
   * @return {string} Strängen med specialtecken skyddade.
   */
  #escape(str) {
    return str && encodeURIComponent(str);
  }
}

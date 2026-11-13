/**
 * Felklass för validering av användargenererade data.
 *
 * Kastas av modellentitetsobjekt för ogiltiga fältvärden.
 *
 * @license CC-BY 4.0
 * @see Error
 */
export class ValidationError extends Error {
  // Publika fält.
  value;

  /**
   * Konstruera en undantagsinstans.
   *
   * @param {string} message Felmdeddelande.
   * @param {*}      value   Det ogiltiga värdet.
   */
  constructor(message, value) {
    super(message);
    this.value = value;
  }

  /**
   * @inheritDoc
   * @override
   */
  toString() {
    return this.message;
  }
}

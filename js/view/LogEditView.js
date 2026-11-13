/**
 * Vy för redigering av loggnoteringar.
 *
 * Vyn används för att skapa en ny loggnotering eller för att redigera en be-
 * fintlig.
 *
 * @license CC-BY 4.0
 * @property {string}  data      Händelsespecifika data.
 * @property {string}  direction Kommunikationsriktning.
 * @property {boolean} readOnly  Skrivskyddad vy.
 * @property {string}  summary   Sammanfattning.
 * @property {string}  text      Noteringstext.
 * @property {date}    timestamp Tidsstämpel.
 * @property {string}  type      Noteringstyp.
 */
export class LogEditView extends ViewBase {
  /**
   * Konstruera en vyinstans.
   *
   * @param {BreadcrumbTrail}   breadcrumbs Länkstig.
   * @param {EventListenerList} listeners   Händelselyssnarlista.
   * @param {ResourceLoader}    loader      Resursladdare.
   * @param {Document}          [doc]       DOM-dokument vid enhetstester.
   */
  constructor(breadcrumbs, listeners, loader, doc = document) {
    super(
      'log-edit',
      'Redigera loggnotering',
      breadcrumbs,
      listeners,
      loader,
      doc
    );
    this._confirmID = 'confirm-dialog';
  }

  // Åtkomstmetoder för händelsespecifika data.
  get data() {
    return this._form.data.value;
  }

  set data(value) {
    this._form.data.value = String(value);
  }

  // Åtkomstmetoder för kommunikationsriktning.
  get direction() {
    return this._form.direction.value;
  }

  set direction(dir) {
    this._form.direction.value = String(dir);
  }

  /**
   * Avaktivera kontrollen för händelsespecifika data.
   *
   * @param {booelan} flag Avaktiveringsflagga.
   */
  disableData(flag) {
    this._form.data.disabled = Boolean(flag);
  }

  /**
   * Avaktivera riktningslistan.
   *
   * @param {booelan} flag Avaktiveringsflagga.
   */
  disableDirection(flag) {
    this._form.direction.disabled = Boolean(flag);
  }

  /**
   * Avaktivera Ta bort-knappen.
   */
  disableRemove() {
    this._form.querySelector('button[value="delete"]').disabled = true;
  }

  /**
   * Aktivera eller avaktivera angivna noteringstyper.
   *
   * @param {string[]} types Noteringstyper att avaktivera.
   */
  disableTypes(types) {
    for (const option of this._form.type.options) {
      option.disabled = types.includes(option.value);
    }
  }

  // Åtkomstmetod för skrivskyddsflaggan.
  set readOnly(flag) {
    ['data', 'direction', 'type'].forEach(
      (field) => (this._form[field].disabled = flag)
    );
    ['summary', 'timestamp'].forEach(
      (field) => (this._form[field].readOnly = flag)
    );
  }

  /**
   * Gör listan med händelsespecifika data obligatorisk eller frivillig.
   *
   * Sätt också elementtypen för ledtexten i enlighet med flaggan (`em` för
   * obligatoriskt fält, `span` för frivilligt).
   *
   * @param {booelan} flag Obligatorisk?
   */
  requireData(flag) {
    const data = this._form.data;
    const prev = data.previousElementSibling;
    data.required = Boolean(flag);
    const label = this._doc.createElement(flag ? 'em' : 'span');
    label.textContent = prev.textContent;
    prev.parentNode.replaceChild(label, prev);
  }

  /**
   * Populera listan med händelsespecifika data.
   *
   * @param {array[]} values Värde-/etikettpar.
   */
  setData(values) {
    const data = this._form.data;
    while (data.options.length > 1) {
      data.remove(1);
    }
    for (const [value, label] of values) {
      data.add(new Option(label, value));
    }
  }

  /**
   * Sätt sammanfattningstext om fältet är tomt.
   *
   * @param {string} text Förslag på sammanfattning.
   * @return {string}
   */
  suggestSummary(text) {
    this._form.summary.value ||= String(text);
    return this._form.summary.value;
  }

  // Åtkomstmetoder för sammanfattning.
  get summary() {
    return this._form.summary.value;
  }

  set summary(str) {
    this._form.summary.value = String(str);
  }

  // Åtkomstmetoder för noteringstext.
  get text() {
    return this._form.text.value;
  }

  set text(str) {
    this._form.text.value = String(str);
  }

  // Åtkomstmetoder för tidsstämpel.
  get timestamp() {
    return this._form.timestamp.valueAsNumber;
  }

  set timestamp(date) {
    const d = date.toLocaleDateString('sv');
    const t = date.toLocaleTimeString('sv').slice(0, 5);
    return (this._form.timestamp.value = `${d}T${t}`);
  }

  // Åtkomstmetoder för noteringstyp.
  get type() {
    return this._form.type.value;
  }

  set type(str) {
    this._form.type.value = String(str);
  }
}

// Importera beroenden.
import { ViewBase } from './ViewBase.js';

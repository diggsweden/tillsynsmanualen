/**
 * Vy för visning av listinformation.
 *
 * Vyn används för att visa listor med personer (granskare, tillsynsansvariga),
 * tillsynsplaner och ärenden.
 *
 * @license CC-BY 4.0
 * @property {string} emptyMessage Meddelande som visas om listan är tom.
 * @property {string} heading      Sidrubrik.
 * @property {string} listClass    CSS-klass för listelementet.
 */
export class ListView extends ViewBase {
  // Privata fält.
  #list;

  /**
   * Konstruera en vyinstans.
   *
   * @param {BreadcrumbTrail}   breadcrumbs Länkstig.
   * @param {EventListenerList} listeners   Händelselyssnarlista.
   * @param {ResourceLoader}    loader      Resursladdare.
   * @param {Document}          [doc]       DOM-dokument vid enhetstester.
   */
  constructor(breadcrumbs, listeners, loader, doc = document) {
    super('list', 'Lista', breadcrumbs, listeners, loader, doc);
    this._confirmID = 'confirm-dialog';
    this._wide = true;
  }

  /**
   * Lägg till ett länkat element i listan.
   *
   * @param {string}   icon    Ikon-id.
   * @param {string}   key     Unik nyckel.
   * @param {string}   url     Länkadress.
   * @param {string[]} columns Texter att visa i kolumner.
   */
  addLink(icon, key, url, columns) {
    const template = this._doc.getElementById('listing-template');
    const fragment = template.content.cloneNode(true);
    const li = fragment.children[0];
    const [svg, a] = li.children;
    const use = svg.children[0];

    use.setAttribute('xlink:href', `../img/ikoner.svg#${icon}`);

    a.href = url;
    a.dataset.key = key;
    a.textContent = columns.shift();

    for (const [index, text] of columns.entries()) {
      this._element(li, 'span', {}, text);
    }

    this.#list.appendChild(fragment);
  }

  // Sätt meddelande som ska visas när listan är tom.
  set emptyMessage(text) {
    this.#list.setAttribute('data-empty', text);
  }

  /**
   * Lägg till en knapp för att läsa in ett objekt från fil.
   *
   * Registrera också händelselyssnare för dra-och-släpp på artikelelementet.
   */
  enableUpload() {
    this.#createUploadControls();
    this.#addDragAndDropListeners();
  }

  // Åtkomstmetod för sidrubrik.
  set heading(text) {
    this._article.querySelector('h1').textContent = text;
  }

  // Åtkomstmetod för CSS-klass för listelementet.
  set listClass(className) {
    this.#list.classList.add(className);
  }

  /**
   * @inheritDoc
   */
  async open(context) {
    await super.open();
    this.#list = this._article.querySelector('ul.listing');
  }

  /**
   * Ersätt ett länkat element i listan.
   *
   * @param {string}   key     Primärnyckel.
   * @param {string}   url     Ny URL.
   * @param {string[]} columns Texter att visa i kolumner.
   */
  replaceLink(key, url, columns) {
    const a = this.#list.querySelector(`[data-key="${key}"]`);
    const li = a.parentNode;

    a.href = url;
    a.textContent = columns.shift();

    // Ersätt befintliga kolumner.
    let count = 2; // svg och a
    while (columns.length > 0 && count < li.children.length) {
      li.children[count++].textContent = columns.shift();
    }

    // Lägg till nya kolumner om det behövs.
    while (columns.length > 0) {
      this._element(li, 'span', {}, columns.shift());
      ++count;
    }

    // Radera oanvända kolumner.
    while (li.children.length > count) {
      li.removeChild(li.children[count]);
    }
  }

  /**
   * Sätt ikon och text i länken för att skapa ny entitet.
   *
   * @param {string} href Länkadress.
   * @param {string} icon Ikonens id i `img/ikoner.svg`.
   * @param {string} text Knapptext.
   */
  setCreate(href, icon, text) {
    const a = this._doc.getElementById('create');
    const [svg, span] = a.children;

    const path = `../img/ikoner.svg#${icon}`;
    svg.children[0].setAttribute('xlink:href', path);

    span.textContent = text;
    a.href = href;
  }

  /**
   * Lägg till händelselyssnare för dra-och-släpp på artikelelementet.
   *
   * Hantera `dragover`-händelser genom att indikera att det går att släppa
   * filer över artikeln.
   *
   * Hantera `drop`-händelser genom att meddela observatörer att det finns en
   * eller flera filer att ladda upp.
   *
   * @private
   */
  #addDragAndDropListeners() {
    this._listeners.add(this._article, 'dragover', (event) => {
      event.preventDefault();
      event.dropEffect = 'copy';
    });

    this._listeners.add(this._article, 'drop', (event) => {
      event.preventDefault();
      const files = event.dataTransfer.files;
      this._notifyObservers({
        action: 'drop',
        trigger: null,
        type: 'upload',
        value: files,
      });
    });
  }

  /**
   * Skapa filuppladdningsfält och knapp för uppladdning.
   *
   * @private
   * @return {object[]}
   */
  #createUploadControls() {
    // Klona en mall för att skapa elementen.
    const template = this._doc.getElementById('upload-template');
    const fragment = template.content.cloneNode(true);

    const [label, button] = fragment.children;
    const [span, input] = label.children;

    template.parentNode.insertBefore(fragment, template);

    // Händelselyssnare för filuppladdningsfältet.
    this._listeners.add(input, 'change', (event) => {
      event.preventDefault();
      const file = input.files[0];
      if (file) {
        this._notifyObservers({
          action: undefined,
          trigger: button,
          type: 'upload',
          value: file,
        });
      }
    });

    // Händelselyssnare för knappen.
    this._listeners.add(button, 'click', (event) => {
      input.value = '';
      input.click();
    });
  }
}

// Importera beroenden.
import { ViewBase } from './ViewBase.js';

/**
 * En meny med ankarlänkar presenterade som ett rutnät.
 *
 * @license CC-BY 4.0
 */
export class GridMenu {
  // Privata fält.
  #cells;
  #curCol = 0;
  #curRow = 0;
  #initials;
  #keys;
  #offsets;

  /**
   * Konstruera en rutnätsmenyinstans.
   *
   * @param {HTMLElement} container HTML-element som innehåller ankarlänkar.
   * @throws {TypeError} Behållaren är inte ett HTML-element.
   */
  constructor(container) {
    if (!(container instanceof HTMLElement)) {
      console.error('Måste vara HTMLElement:', element);
      throw new TypeError('Kan inte skapa innehållsmeny.');
    }

    this.#cells = this.#createGrid(container);
    this.#initials = this.#mapInitials(this.#cells);
    this.#keys = this.#setUpKeyMap();

    this.#setRovingFocus(this.#curRow, this.#curCol);

    const offset = document.querySelector('main').offsetTop;
    this.#offsets = Array.from(container.querySelectorAll('span')).map((span) =>
      this.#targetOffset(offset, span)
    );
    this._visible = null;

    document.addEventListener('scroll', () => this.#showVisible());

    container.addEventListener('keydown', (event) => {
      if (this.#keys.action(event)) {
        event.stopPropagation();
        event.preventDefault();
      }
    });
  }

  /**
   * Skapa grid- och row-element.
   *
   * Infoga en DIV med role="grid" i behållaren och en underordnad DIV med
   * role="row". Flytta alla element från behållaren till radelementet och
   * kapsla in interaktiva element i SPAN-element med role="gridcell".
   *
   * @private
   * @param {HTMLElement} container Behållare.
   * @return {HTMLElement[][]} Matris med virtuella rader och celler.
   */
  #createGrid(container) {
    // Se till att behållaren har ett id.
    if ('' === container.id) {
      container.id = `grid-${Date.now()}`;
    }

    // Yttre element (grid).
    const grid = document.createElement('div');
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-labelledby', container.id);

    // Inre element (row).
    const row = grid.appendChild(document.createElement('div'));
    row.setAttribute('role', 'row');

    // Skapa celler av innehållet i behållaren.
    while (container.children.length > 0) {
      const element = container.children[0];
      if ('A' === element.tagName) {
        const id = element.hash.slice(1);
        const target = document.getElementById(id);
        target && (target.tabIndex = -1);
      }
      row.appendChild(this.#gridCell(element));
    }

    // Lägg till grid-elementet i behållaren.
    container.appendChild(grid);

    // Dela in cellerna i virtuella rader och kolumner.
    let cells = null;
    let offset = -1;
    const rows = [];
    Array.from(row.children).forEach((cell) => {
      if (cell.offsetTop > offset) {
        offset = cell.offsetTop;
        rows.push((cells = []));
      }
      cells.push(cell);
    });

    return rows;
  }

  /**
   * Flytta fokus till cellen som innehåller angiven bokstav.
   *
   * @private
   * @param {string} char Tangentnamn.
   * @return {boolean} `true` om händelsen hanteras, annars `false`.
   */
  #focusByChar(char) {
    char = char.toUpperCase();
    if (char in this.#initials) {
      const [row, col] = this.#initials[char];
      this.#moveTo(row, col);
      return true;
    }

    return false;
  }

  /**
   * Skapa en rutnätscell.
   *
   * @private
   * @param {HTMLElement} element Underliggande HTML-element.
   * @return {HTMLElement}
   */
  #gridCell(element) {
    let cell = element;

    if (element instanceof HTMLAnchorElement) {
      cell = document.createElement('span');
      cell.appendChild(element);
    }

    cell.setAttribute('role', 'gridcell');
    element.tabIndex = -1;

    return cell;
  }

  /**
   * Mappa initialer till cellkoordinater.
   *
   * @private
   * @param {HTMLElement[][]} cells Celler.
   * @return {object} Objekt med initialer som nycklar och rad/kol som värden.
   */
  #mapInitials(cells) {
    const initials = {};

    cells.forEach((cellRow, rowIndex) => {
      cellRow.forEach((element, colIndex) => {
        initials[element.textContent[0]] = [rowIndex, colIndex];
      });
    });

    return initials;
  }

  /**
   * Flytta fokus nedåt.
   *
   * Om fokus är i sista raden, flytta till första raden i nästa kolumn. Om
   * fokus är i sista kolumnen, gör ingenting.
   *
   * @private
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #moveDown() {
    if (this.#curRow + 1 >= this.#cells.length) {
      if (this.#curCol + 1 < this.#cells[0].length) {
        this.#moveTo(0, this.#curCol + 1);
      }
    } else if (this.#curCol < this.#cells[this.#curRow + 1].length) {
      this.#moveTo(this.#curRow + 1, this.#curCol);
    }

    return true;
  }

  /**
   * Flytta fokus till första cellen i rutnätet.
   *
   * @private
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #moveFirstInGrid() {
    this.#moveTo(0, 0);
    return true;
  }

  /**
   * Flytta fokus till första cellen i aktuell rad.
   *
   * @private
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #moveFirstInRow() {
    this.#moveTo(this.#curRow, 0);
    return true;
  }

  /**
   * Flytta fokus till sista cellen i rutnätet.
   *
   * @private
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #moveLastInGrid() {
    const row = this.#cells.length - 1;
    this.#moveTo(row, this.#cells[row].length - 1);
    return true;
  }

  /**
   * Flytta fokus till sista cellen i aktuell rad.
   *
   * @private
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #moveLastInRow() {
    this.#moveTo(this.#curRow, this.#cells[this.#curRow].length - 1);
    return true;
  }

  /**
   * Flytta fokus åt vänster.
   *
   * Om fokus är i första kolumnen, flytta till sista kolumnen i föregående
   * rad. Om fokus är i första raden, gör ingenting.
   *
   * @private
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #moveLeft() {
    if (this.#curCol === 0) {
      if (this.#curRow > 0) {
        const row = this.#curRow - 1;
        this.#moveTo(row, this.#cells[row].length - 1);
      }
    } else {
      this.#moveTo(this.#curRow, this.#curCol - 1);
    }

    return true;
  }

  /**
   * Flytta fokus åt höger.
   *
   * Om fokus är i sista kolumnen, flytta till första kolumnen i nästa rad. Om
   * fokus är i sista raden, gör ingenting.
   *
   * @private
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #moveRight() {
    if (this.#curCol + 1 >= this.#cells[this.#curRow].length) {
      if (this.#curRow + 1 < this.#cells.length) {
        this.#moveTo(this.#curRow + 1, 0);
      }
    } else {
      this.#moveTo(this.#curRow, this.#curCol + 1);
    }

    return true;
  }

  /**
   * Flytta fokus till angiven cell.
   *
   * @private
   * @param {number} row Radindex, 0-baserat.
   * @param {number} col Kolumnindex, 0-baserat.
   */
  #moveTo(row, col) {
    this.#removeRovingFocus(this.#curRow, this.#curCol);

    this.#curRow = row;
    this.#curCol = col;

    this.#setRovingFocus(row, col);

    const cell = this.#cells[row][col];
    if (cell.firstChild instanceof HTMLAnchorElement) {
      cell.firstChild.focus();
    } else {
      cell.focus();
    }
  }

  /**
   * Flytta fokus uppåt.
   *
   * Om fokus är i första raden, flytta till sista raden i föregående kolumn.
   * Om fokus är i första kolumnen, gör ingenting.
   *
   * @private
   * @return {boolean} `true` för att indikera att händelsen är hanterad.
   */
  #moveUp() {
    if (this.#curRow === 0) {
      if (this.#curCol > 0) {
        const row = this.#cells.length - 1;
        const col = Math.min(this.#curCol - 1, this.#cells[row].length - 1);
        this.#moveTo(row, col);
      }
    } else {
      this.#moveTo(this.#curRow - 1, this.#curCol);
    }

    return true;
  }

  /**
   * Ta bort flytande tangentbordsfokus från aktuell cell.
   *
   * @private
   * @param {number} row Radindex, 0-baserat.
   * @param {number} col Kolumnindex, 0-baserat.
   */
  #removeRovingFocus(row, col) {
    const cell = this.#cells[row][col];
    if (cell.firstChild instanceof HTMLAnchorElement) {
      cell.firstChild.tabIndex = -1;
    } else {
      cell.tabIndex = -1;
    }
  }

  /**
   * Sätt flytande tangentbordsfokus till aktuell cell.
   *
   * Om cellen innehåller en länk, sätt flytande fokus till länken. I annat
   * fall, sätt flytande fokus till cellen.
   *
   * @private
   * @param {number} row Radindex, 0-baserat.
   * @param {number} col Kolumnindex, 0-baserat.
   */
  #setRovingFocus(row, col) {
    const cell = this.#cells[row][col];
    if (cell.firstChild instanceof HTMLAnchorElement) {
      cell.firstChild.tabIndex = 0;
    } else {
      cell.tabIndex = 0;
    }
  }

  /**
   * Skapa tangentmappning.
   *
   * @private
   * @return {KeyMap}
   */
  #setUpKeyMap() {
    const keys = new KeyMap();

    keys.map('ArrowDown', () => this.#moveDown());
    keys.map('ArrowLeft', () => this.#moveLeft());
    keys.map('ArrowRight', () => this.#moveRight());
    keys.map('ArrowUp', () => this.#moveUp());
    keys.map('End', () => this.#moveLastInRow());
    keys.map('End', () => this.#moveLastInGrid(), 'ctrl');
    keys.map('Home', () => this.#moveFirstInRow());
    keys.map('Home', () => this.#moveFirstInGrid(), 'ctrl');
    keys.map('*', (key) => this.#focusByChar(key));

    return keys;
  }

  /**
   * Sätt en klass på det länkmål som är synligt.
   *
   * Hitta det element i innehållsmenyn vars mål har ett offset som är större
   * än dokumentets skrollposition och sätt en klass på det för att göra det
   * möjligt att ge elementet en visuell formgivning.
   *
   * @private
   */
  #showVisible() {
    const top = document.documentElement.scrollTop;
    let index = this.#offsets.findIndex(
      (offset, index, array) =>
        (offset !== null && offset >= top) || index + 1 === array.length
    );

    if (top < this.#offsets[index]) {
      do {
        --index;
      } while (null === this.#offsets[index]);
    }

    if (this._visible) {
      this._visible.removeAttribute('aria-current');
    }

    if (index >= 0) {
      const columns = this.#cells[0].length;
      const row = Math.floor(index / columns);
      this._visible = this.#cells[row][index % columns];
      this._visible.setAttribute('aria-current', 'true');
    }
  }

  /**
   * Hämta offset för ett länkmål.
   *
   * @private
   * @param {number}      offset Basoffset.
   * @param {HTMLElement} span   SPAN-element.
   * @return {(number|null)}
   */
  #targetOffset(offset, span) {
    if (span.children.length > 0) {
      const id = span.children[0].href.replace(/^.*#/, '');
      const target = document.getElementById(id);

      return target ? offset + target.offsetTop - 20 : null;
    }

    return null;
  }
}

// Importera beroenden.
import { KeyMap } from '../common/KeyMap.js';

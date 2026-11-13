/**
 * Mappar tangenter till funktioner.
 *
 * En klass som behöver mappa tangenter till funktioner kan använda `KeyMap` för
 * att underlätta hanteringen. Först använder den `map()` för att göra själva
 * mappningen, sedan anropar den `action()` varje gång en tangenthändelse
 * inträffar.
 *
 * @license CC-BY 4.0
 */
export class KeyMap {
  // Privata fält.
  #map = {};

  /**
   * Utför funktionen som är mappad till en tangent.
   *
   * @param {KeyboardEvent} event Händelseinformation.
   * @return {boolean} `true` om en funktion utförts, annars `false`.
   */
  action(event) {
    const keyName = event.key.toLowerCase();
    let key = this.#map.hasOwnProperty(keyName) ? keyName : '*';

    if (this.#map.hasOwnProperty(key)) {
      const modifiers = this.#modifiers(event);

      if (this.#map[key].hasOwnProperty(modifiers)) {
        return this.#map[key][modifiers](keyName);
      }
    }

    return false;
  }

  /**
   * Mappa en tangent till en funktion.
   *
   * Modifierartangenter kan vara "alt", "ctrl", "meta" eller "shift",
   * eller en kombination, till exempel "ctrl+shift".
   *
   * Om tangentnamnet är "*", mappa funktionen som en standardfunktion som
   * ska anropas om ingen specifik mappning finns.
   *
   * För att mappa mellanslagstangenten, ange tangentnamn som " ".
   *
   * @param {string}   key         Tangentnamn.
   * @param {callback} action      Funktion.
   * @param {string}   [modifiers] Modifierartangenter,
   */
  map(key, action, modifiers = '') {
    const mods = modifiers.toLowerCase().split('+').sort().join('+');
    key = key.toLowerCase();

    if (!this.#map.hasOwnProperty(key)) {
      this.#map[key] = {};
    }

    this.#map[key][mods || 'none'] = action;
  }

  /**
   * Skapa modifierarsträng.
   *
   * Skapa en sträng som representerar de modifierartangenter som är satta i
   * händelsen. Strängen har samma format som skapas i metoden `map()`. Om
   * ingen modifierare är satt, returnera "none".
   *
   * @see map
   * @private
   * @param {KeyboardEvent} event Information om tangenthändelse.
   * @return {string} Modifierartangenter åtskilda med "+", eller "none".
   */
  #modifiers(event) {
    return (
      [
        ['altKey', 'alt'],
        ['ctrlKey', 'ctrl'],
        ['metaKey', 'meta'],
        ['shiftKey', 'shift'],
      ]
        .filter(([prop, name]) => event[prop])
        .map(([prop, name]) => name)
        .join('+') || 'none'
    );
  }
}

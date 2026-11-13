/**
 * Lista med registrerade händelselyssnare.
 *
 * Listan har funktioner för att registrera händelselyssnare för olika element i
 * en vy och sparar information om varje registrerad lyssnare. Det finns även en
 * funktion som avregistrerar samtliga lyssnare som registrerats med hjälp av
 * listan.
 *
 * Det här används av granskningsfunktionerna, som består av många olika
 * sidfragment som inkluderas inom en och samma grundsida.
 *
 * @license CC-BY 4.0
 */
export class EventListenerList {
  // Privata fält.
  #listeners = [];

  /**
   * Registrera en händelselyssnare.
   *
   * @param {EventTarget} target    Mål för händelsen.
   * @param {string}      type      Typ av händelse, t ex "click".
   * @param {function}    listener  Händelselyssnare.
   * @param {boolean}     [capture] Registrera för den inledande fasen i
   *                                händelsepropageringen.
   */
  add(target, type, listener, capture = false) {
    this.#listeners.push({ target, type, listener, capture });
    target.addEventListener(type, listener, capture);
  }

  /**
   * Ta bort en registrerad händelselyssnare.
   *
   * @param {EventTarget} target    Mål för händelsen.
   * @param {string}      type      Typ av händelse, t ex "click".
   * @param {function}    listener  Händelselyssnare.
   * @param {boolean}     [capture] Avregistrera för den inledande fasen i
   *                                händelsepropageringen.
   */
  remove(target, type, listener, capture = false) {
    const index = this.#listeners.findIndex(
      ({ target: t, type: e, listener: l, capture: c }) =>
        target === t && type === e && listener === l && capture === c
    );

    if (-1 !== index) {
      this.#listeners.splice(index, 1);
      target.removeEventListener(type, listener, capture);
    }
  }

  /**
   * Avregistrera alla händelselyssnare.
   */
  removeAll() {
    this.#listeners.forEach(({ target, type, listener, capture }) => {
      target.removeEventListener(type, listener, capture);
    });

    this.#listeners.length = 0;
  }
}

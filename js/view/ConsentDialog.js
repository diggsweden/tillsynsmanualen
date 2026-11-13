/**
 * Samtyckesdialog för lokal lagring.
 *
 * Dialogen visas om användaren inte gett sitt samtycke till lokal lagring av
 * information i webbläsaren. Den informerar användaren om behovet av tillgång
 * till lokal lagring och frågar efter samtycke.
 *
 * @license CC-BY 4.0
 */
export class ConsentDialog {
  // Privata fält.
  #dialog;

  /**
   * Konstruera en dialoginstans.
   *
   * @param {HTMLElement} container Behållare att infoga dialogen i.
   */
  constructor(container) {
    this.#createDialog(container);
  }

  /**
   * Visa dialogrutan modalt.
   *
   * @return {Promise} Infrias med `true` vid samtycke, annars `false`.
   */
  show() {
    return new Promise((resolve, reject) => {
      const onCancel = () => {
        this.#dialog.removeEventListener('cancel', onCancel);
        this.#dialog.removeEventListener('close', onClose);
        resolve(false);
      };

      const onClose = () => {
        this.#dialog.removeEventListener('cancel', onCancel);
        this.#dialog.removeEventListener('close', onClose);
        resolve('accept' === this.#dialog.returnValue);
      };

      this.#dialog.addEventListener('cancel', onCancel);
      this.#dialog.addEventListener('close', onClose);
      this.#dialog.showModal();
    });
  }

  /**
   * Skapa dialogelementet.
   *
   * @private
   * @param {HTMLElement} container Behållare att infoga dialogen i.
   */
  #createDialog(container) {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-labelledby', 'consent-label');

    const h2 = dialog.appendChild(document.createElement('h2'));
    h2.id = 'consent-label';
    h2.textContent = 'Lokal lagring av information';

    let p = dialog.appendChild(document.createElement('p'));
    p.id = 'consent-descr';
    p.textContent =
      'Tillsynsmanualen behöver kunna lagra information i \
            din webbläsare: så kallad lokal lagring. Den information som lagras \
            är den du själv skriver in när du granskar. DIGG ser inte denna \
            information och delar den inte med någon. Granskningsfunktionen \
            går inte att använda utan lokal lagring.';

    p = dialog.appendChild(document.createElement('p'));

    const decline = p.appendChild(document.createElement('button'));
    decline.autofocus = true;
    decline.type = 'button';
    decline.textContent = 'Nej tack';
    decline.addEventListener('click', () => dialog.close('decline'));

    const accept = p.appendChild(document.createElement('button'));
    accept.type = 'button';
    accept.textContent = 'Godkänn';
    accept.addEventListener('click', () => dialog.close('accept'));

    this.#dialog = container.appendChild(dialog);
  }
}

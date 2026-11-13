/**
 * Modul för inhämtande av samtycke för lokal lagring.
 *
 * @license CC-BY 4.0
 */

/**
 * Visa en modal dialogruta för att inhämta användarens samtycke.
 *
 * Om användaren samtycker, registrera datum och tid i det lokala lagrings-
 * utrymmet.
 *
 * I annat fall, dirigera om till anropande sida eller startsidan.
 *
 * @param {SettingsStorage} settings Lagringsutrymmer för inställningar.
 * @return {boolean} `true` om användaren givit sitt samtycke, annars `false`.
 */
export async function askConsent(settings) {
  const article = document.querySelector('article');
  const dialog = new ConsentDialog(article);
  const consent = await dialog.show();

  if (consent) {
    settings.write('consent', String(Date.now()));
    return true;
  } else {
    setTimeout(() => (location.href = document.referrer || '../'), 0);
    return false;
  }
}

// Importera beroenden.
import { ConsentDialog } from './view/ConsentDialog.js';

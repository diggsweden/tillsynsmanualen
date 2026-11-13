/**
 * Modul för tillämpning av användarinställningar.
 *
 * Sätter klasser på `body`-elementet för att reglera vilka egenskaper som på-
 * verkas av manualens stilmallar.
 *
 * @license CC-BY 4.0
 */

const classes = document.body.classList;
const settings = new SettingStorage();
const preferences = {
  focus: 'false' !== settings.read('styleFocus'),
  font: 'false' !== settings.read('styleFont'),
};

if (preferences.focus) {
  classes.add('focus');
}

if (preferences.font) {
  classes.add('font');
}

// Importera beroenden.
import { SettingStorage } from './common/SettingStorage.js';

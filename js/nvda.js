/**
 * Funktion för att växla synlighet mellan tangentbordslayouter för NVDA.
 *
 * För att öka läsbarheten i tabellerna visas bara en av de två layouterna åt
 * gången. Skriptet hanterar radioknapparna som växlar mellan de två.
 *
 * @license CC-BY 4.0
 */

const body = document.body;
const form = document.forms[0];
const settings = new SettingStorage();
const consent = null !== settings.read('consent');
let layout = settings.read('nvda.layout') ?? 'desktop';

body.classList.add(layout);
form.layout.value = layout;
form.addEventListener('change', (event) => {
  const target = event.target;
  body.classList.replace(layout, target.value);
  layout = target.value;
  consent && settings.write('nvda.layout', layout);
});

// Importera beroenden.
import { SettingStorage } from './common/SettingStorage.js';

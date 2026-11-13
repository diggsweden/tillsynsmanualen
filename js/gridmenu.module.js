/**
 * Modul för rutnätsmeny.
 *
 * @license CC-BY 4.0
 */

const main = document.querySelector('main');
if (main.classList.contains('grid-menu')) {
  const nav = document.querySelector('main > nav');
  if (nav) {
    new GridMenu(nav);
  }
}

// Importera beroenden.
import { GridMenu } from './view/GridMenu.js';

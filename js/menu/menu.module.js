/**
 * Modul för menyhantering.
 *
 * @license CC-BY 4.0
 */

// Generera liststrukturen för menyn från en strukturdefinitionsfil.
const builder = new MenuBuilder();
const controller = new MenuController();

(async () => {
  const placeholder = document.getElementById('nav-placeholder');
  if (placeholder) {
    const menubar = await builder.build(
      location.pathname,
      'Tillsynsmanual',
      placeholder
    );
    controller.handle(menubar);
  }

  const main = document.querySelector('main');
  const nav = document.querySelector('nav.page-menu');
  if (nav) {
    // Menyknapp med innehållsmeny.
    const menu = new ContentMenu(nav.querySelector('ul'));
    nav.querySelectorAll('ul a').forEach((link) => {
      menu.add(new MenuItem(link));
    });
    const button = new MenuButton(nav, 'Innehåll', menu);
    controller.handle(menu);
  }
})();

// Importera beroenden.
import { ContentMenu } from './ContentMenu.js';
import { Menubar } from './Menubar.js';
import { MenuBuilder } from './MenuBuilder.js';
import { MenuButton } from './MenuButton.js';
import { MenuController } from './MenuController.js';
import { MenuItem } from './MenuItem.js';

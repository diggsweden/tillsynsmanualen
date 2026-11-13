/**
 * Initiera modulen för listningssidan.
 *
 * Instansisera vy och controller.
 *
 * @license CC-BY 4.0
 * @param {Model} model Modellobjekt.
 * @return {object}
 */
export default function initModule(model) {
  const view = new ListView(
    new BreadcrumbTrail(),
    new EventListenerList(),
    new ResourceLoader()
  );

  const controller = new ListController(model, view, new FileReader());

  return { controller, view };
}

// Importera beroenden.
import { BreadcrumbTrail } from './view/BreadcrumbTrail.js';
import { EventListenerList } from './common/EventListenerList.js';
import { ListController } from './controller/ListController.js';
import { ListView } from './view/ListView.js';
import { ResourceLoader } from './common/ResourceLoader.js';

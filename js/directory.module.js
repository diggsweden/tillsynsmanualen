/**
 * Initiera modulen för redigering av tillsynskatalog.
 *
 * Instansisera vy och controller.
 *
 * @license CC-BY 4.0
 * @param {Model} model Modellobjekt.
 * @return {object}
 */
export default function initModule(model) {
  const view = new DirectoryView(
    new BreadcrumbTrail(),
    new EventListenerList(),
    new ResourceLoader()
  );

  const controller = new DirectoryController(model, view);

  return { controller, view };
}

// Importera beroenden.
import { BreadcrumbTrail } from './view/BreadcrumbTrail.js';
import { DirectoryController } from './controller/DirectoryController.js';
import { DirectoryView } from './view/DirectoryView.js';
import { EventListenerList } from './common/EventListenerList.js';
import { ResourceLoader } from './common/ResourceLoader.js';

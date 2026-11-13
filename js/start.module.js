/**
 * Initiera modulen för granskningsstartsidan.
 *
 * Instansisera och returnera vy och controller.
 *
 * @license CC-BY 4.0
 * @param {Model} model Modellobjekt.
 * @return {object}
 */
export default function initModule(model) {
  const view = new StartView(
    new BreadcrumbTrail(),
    new EventListenerList(),
    new ResourceLoader()
  );

  const controller = new StartController(model, view);

  return { controller, view };
}

// Importera beroenden.
import { BreadcrumbTrail } from './view/BreadcrumbTrail.js';
import { EventListenerList } from './common/EventListenerList.js';
import { ResourceLoader } from './common/ResourceLoader.js';
import { StartController } from './controller/StartController.js';
import { StartView } from './view/StartView.js';

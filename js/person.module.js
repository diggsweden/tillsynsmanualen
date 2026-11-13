/**
 * Initiera modulen för redigering av personinformation.
 *
 * Instansisera vy och controller.
 *
 * @license CC-BY 4.0
 * @param {Model} model Modellobjekt.
 * @return {object}
 */
export default function initModule(model) {
  const view = new PersonView(
    new BreadcrumbTrail(),
    new EventListenerList(),
    new ResourceLoader()
  );

  const controller = new PersonController(model, view);

  return { controller, view };
}

// Importera beroenden.
import { BreadcrumbTrail } from './view/BreadcrumbTrail.js';
import { EventListenerList } from './common/EventListenerList.js';
import { PersonController } from './controller/PersonController.js';
import { PersonView } from './view/PersonView.js';
import { ResourceLoader } from './common/ResourceLoader.js';

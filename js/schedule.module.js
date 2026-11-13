/**
 * Initiera modulen för redigering av tillsynsplaner.
 *
 * Instansisera vy och controller.
 *
 * @license CC-BY 4.0
 * @param {Model} model Modellobjekt.
 * @return {object}
 */
export default function initModule(model) {
  const view = new ScheduleView(
    new BreadcrumbTrail(),
    new EventListenerList(),
    new ResourceLoader()
  );

  const controller = new ScheduleController(model, view);

  return { controller, view };
}

// Importera beroenden.
import { BreadcrumbTrail } from './view/BreadcrumbTrail.js';
import { EventListenerList } from './common/EventListenerList.js';
import { ResourceLoader } from './common/ResourceLoader.js';
import { ScheduleController } from './controller/ScheduleController.js';
import { ScheduleView } from './view/ScheduleView.js';

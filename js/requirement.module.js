/**
 * Initiera modulen för granskning av krav i ett stickprov.
 *
 * Instansiera vy och controller.
 *
 * @license CC-BY 4.0
 * @param {Model} models Modellobjekt.
 * @return {object}
 */
export default function initModule(model) {
  const loader = new ResourceLoader();

  const view = new RequirementView(
    new BreadcrumbTrail(),
    new EventListenerList(),
    loader
  );

  const controller = new RequirementController(
    model,
    view,
    loader,
    new RequirementOrder(loader),
    new ConditionTree()
  );

  return { controller, view };
}

// Importera beroenden.
import { BreadcrumbTrail } from './view/BreadcrumbTrail.js';
import { ConditionTree } from './controller/ConditionTree.js';
import { EventListenerList } from './common/EventListenerList.js';
import { RequirementController } from './controller/RequirementController.js';
import { RequirementOrder } from './controller/RequirementOrder.js';
import { RequirementView } from './view/RequirementView.js';
import { ResourceLoader } from './common/ResourceLoader.js';

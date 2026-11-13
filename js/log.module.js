/**
 * Initiera modulen för ärendeloggshantering.
 *
 * Instansisera vy och controller.
 *
 * @license CC-BY 4.0
 * @param {Model}      model   Modellobjekit.
 * @param {AppContext} context Applikationskontext.
 * @return {object}
 */
export default function initModule(model, context) {
  let controller;
  const loader = new ResourceLoader();
  let view;

  if (!context.hasParam('entry') && !context.hasParam('new')) {
    // Lista loggnoteringar.
    view = new LogListView(
      new BreadcrumbTrail(),
      new EventListenerList(),
      loader
    );

    controller = new LogListController(model, view);
  } else {
    // Skapa eller redigera loggnotering.
    view = new LogEditView(
      new BreadcrumbTrail(),
      new EventListenerList(),
      loader
    );

    controller = new LogEditController(model, view);
  }

  return { controller, view };
}

// Importera beroenden.
import { BreadcrumbTrail } from './view/BreadcrumbTrail.js';
import { LogEditController } from './controller/LogEditController.js';
import { LogListController } from './controller/LogListController.js';
import { LogEditView } from './view/LogEditView.js';
import { LogListView } from './view/LogListView.js';
import { EventListenerList } from './common/EventListenerList.js';
import { ResourceLoader } from './common/ResourceLoader.js';

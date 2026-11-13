/**
 * Modul för presentation av kontroller.
 *
 * Instansiera vy och controller, öppna vyn och förbered controllern för
 * sidvisning.
 *
 * @license CC-BY 4.0
 */

const model = { advancedMode: false };
const context = new AppContext();
const loader = new ResourceLoader();
const noopListener = { add: () => {}, removeAll: () => {} };
const view = new ChecksView(noopListener, loader);
const controller = new ChecksController(model, view, loader);

(async () => {
  context.path = location.search;
  await view.open();
  await view.activate();
  await controller.prepare(context);
})();

// Importera beroenden.
import { AppContext } from './common/AppContext.js';
import { ChecksController } from './controller/ChecksController.js';
import { ChecksView } from './view/ChecksView.js';
import { ResourceLoader } from './common/ResourceLoader.js';

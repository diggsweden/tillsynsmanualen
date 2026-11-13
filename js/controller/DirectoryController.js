/**
 * Controller för filkatalogsidan.
 *
 * @license CC-BY 4.0
 */
export class DirectoryController extends ControllerBase {
  /**
   * @inheritDoc
   * @override
   */
  async prepare(context) {
    // Populera vyn med eventuell tidigare sparad tillsynskatalog.
    const view = this._view;
    view.dir = this._model.caseDirectory || '';
    view.breadcrumbs.current = 'Ärendekatalog';

    // Lägg till åtgärd för spara tillsynskatalogen i modellen.
    this._action('save', async (event) => {
      this._model.caseDirectory = this._view.dir;
      /* borttaget på begäran 2022-11-10
            this._context.status =
                "Ärendekatalogen har sparats i lagringsutrymmet.";
            */
      return this._context;
    });
  }
}

// Importera beroenden.
import { ControllerBase } from './ControllerBase.js';

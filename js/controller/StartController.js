/**
 * Controller för granskningsstartsidan.
 *
 * @license CC-BY 4.0
 */
export class StartController extends ControllerBase {
  /**
   * @inheritDoc
   * @override
   */
  async prepare(context) {
    const model = this._model;
    const view = this._view;
    const { breadcrumbs } = view;
    breadcrumbs.deleteRoot();
    breadcrumbs.current = 'Granska';

    // Hämta data från modellen asynkront. När alla uppgifter finns till-
    // gängliga, uppdatera stegen i vyn.
    const tasks = [
      model.peopleByRole('officer'),
      model.peopleByRole('supervisor'),
      model.allSchedules(),
      model.allCases(),
    ];

    const [officers, supervisors, schedules, cases] = await Promise.all(tasks);

    const dir = model.caseDirectory;
    const has = (arr) => arr.length > 0;
    const pers = (role) => `person&role=${role}`;
    const steps = {
      cases: { page: 'case', key: null },
      dir: { page: 'directory', key: 'dummy' },
      officer: { page: pers('officer'), key: 'id' },
      schedule: { page: 'schedule', key: 'id' },
      supervisor: { page: pers('supervisor'), key: 'id' },
    };
    const update = (step, arr, cond = true, count = (n) => n) => {
      this.#updateStep(
        arr,
        cond ? count(arr ? arr.length : 0) : -1,
        step,
        steps[step].page,
        steps[step].key
      );
    };

    const advanced = view.advancedMode;
    const cond = has(officers) && (!advanced || has(supervisors));

    update('officer', officers);
    if (advanced) {
      update('supervisor', supervisors);
      update('dir', null, true, () => (dir ? 1 : 0));
      update('schedule', schedules, has(supervisors));
    }
    update('cases', null, cond, () => cases.length);
  }

  /**
   * Uppdatera nästa-steg-länkar i vyn.
   *
   * Om antalet anges som -1 görs länken inaktiv.
   *
   * @private
   * @param {object} collection Entitetssamling.
   * @param {number} count      Antal entiteter.
   * @param {string} step       Stegnamn.
   * @param {string} page       Sida att länka till (namn).
   * @param {string} [param]    Parameternamn i frågesträngen.
   */
  #updateStep(collection, count, step, page, param = null) {
    let checked = false;
    const path = new URLParameters();
    let query = '';
    let value = '';
    const view = this._view;

    path.add('return', `start&target=step-${step}`);

    switch (count) {
      case -1:
        query = null;
        break;

      case 0:
        query = `?page=${page}&${path}`;
        break;

      case 1:
        if (collection) {
          checked = true;
          path.add(param, collection[0].id);
          query = `?page=${page}&${path}`;
          break;
        } else if (null !== param) {
          checked = true;
          query = `?page=${page}&${path}`;
          break;
        }

      default:
        checked = true;
        query = `?page=list&type=${page}`;
        break;
    }

    view.checkStep(step, checked, query);
  }
}

// Importera beroenden.
import { ControllerBase } from './ControllerBase.js';
import { URLParameters } from './URLParameters.js';

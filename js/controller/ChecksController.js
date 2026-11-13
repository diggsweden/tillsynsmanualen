/**
 * Controller för presentation av kontroller.
 *
 * @license CC-BY 4.0
 */
export class ChecksController extends ControllerBase {
  // Privata fält.
  #loader;
  #type;

  /**
   * Konstruera en controllerinstans
   *
   * @param {Model}          model     Modellobjekt.
   * @param {ViewBase}       view      Vyinstans.
   * @param {ResourceLoader} loader    Resursladdare.
   * @param {object}         [globals] Globala objekt vid enhetstester.
   */
  constructor(model, view, loader, globals = {}) {
    super(model, view, globals);
    this.#loader = loader;
    this._persistPath = false;
  }

  /**
   * @inheritDoc
   * @override
   */
  async prepare(context) {
    this.#type = context.param('type') || 'webpage';

    let cfgPath = `requirements/${this.#type}`;
    let closed = false;
    if ('screen' === this.#type) {
      closed = context.hasParam('closed');
      cfgPath += `-${closed ? 'closed' : 'open'}`;
    }
    const sampCfg = await this.#loader.configuration(cfgPath);

    this.#setHeading(this.#type, closed);
    this._view.requirementCount = this.#requirementCount(sampCfg);
    await this.#populateView(sampCfg);
  }

  /**
   * Lägg till ett villkor i vyn.
   *
   * Lägg till ett avsnitt med en rubrik. Lägg därefter till de villkor och
   * kontroller hör till villkoret.
   *
   * @private
   * @param {object} parent  Kravavsnitt.
   * @param {object} condCfg Villkorskonfiguration.
   * @param {object} sampCfg Stickprovskonfiguration.
   */
  #condition(parent, condCfg, sampCfg) {
    for (const branch of ['yes', 'no']) {
      if (!(branch in condCfg)) {
        continue;
      }
      const text = this.#conditionText(condCfg, sampCfg);
      const cond = parent.condition(text, 'yes' === branch);
      for (const chk of condCfg[branch] ?? []) {
        if ('check' in chk) {
          cond.check(sampCfg.checks[chk.check]?.texts ?? []);
        } else if ('condition' in chk) {
          this.#condition(
            cond,
            sampCfg.conditions[chk.condition] ?? {},
            sampCfg
          );
        }
      }
    }
  }

  /**
   * Ta fram villkorstext.
   *
   * För ett manuellt villkor, returrnera den angivna villkorstexten.
   * För ett härlett villkor, returnera källkontrollernas texter.
   *
   * @private
   * @param {object} condCfg Villkorskonfiguration.
   * @param {object} sampCfg Stickprovskonfiguration.
   */
  #conditionText(condCfg, sampCfg) {
    let text;
    if ('precondition' in condCfg) {
      text = condCfg.precondition;
    } else if ('sources' in condCfg) {
      text = condCfg.sources
        .map((id) => (sampCfg.checks[id]?.texts ?? ['?']).join(', '))
        .join(' och ');
    } else {
      text = '#villkor saknas#';
    }
    return text;
  }

  /**
   * Lägg till detaljinformation om ett krav.
   *
   * @private
   * @param {object} parent        Kravavsnitt.
   * @param {string} id            Kravidentitet.
   */
  async #details(parent, id) {
    const path = `requirements/${this.#type}/${id}`;
    const cfg = (await this.#loader.configuration(path)) ?? {};
    if ('methods' in cfg) {
      parent.methods(cfg.methods);
    } else if ('steps' in cfg) {
      parent.steps(cfg.steps);
    }
    if ('exceptions' in cfg) {
      parent.exceptions(cfg.exceptions);
    }
    if ('instruction' in cfg) {
      const { id, title } = cfg.instruction;
      parent.instruction(id, title);
    }
  }

  /**
   * Populera vyn med information.
   *
   * @private
   * @param {object} sampCfg Stickprovskonfiguration.
   */
  async #populateView(sampCfg) {
    for (const secCfg of sampCfg.sections ?? []) {
      await this.#section(this._view, secCfg, sampCfg);
    }
    this._view.hideProgress();
  }

  /**
   * Lägg till ett krav i vyn.
   *
   * Lägg till ett avsnitt med en rubrik. Lägg därefter till de villkor och
   * kontroller som ingår i kravet.
   *
   * @private
   * @param {object} parent  Avsnitt i vyn.
   * @param {string} id      Kravidentitet.
   * @param {object} sampCfg Stickprovskonfiguration.
   */
  async #requirement(parent, id, sampCfg) {
    const reqCfg = sampCfg.requirements[id] ?? {};
    if (reqCfg.pseudo) {
      return;
    }
    const req = parent.requirement(
      reqCfg.title ?? '#krav saknas',
      reqCfg.reference
    );
    await this.#details(req, id);
    for (const chk of reqCfg.checks ?? []) {
      if ('check' in chk) {
        req.check(sampCfg.checks[chk.check]?.texts ?? []);
      } else if ('condition' in chk) {
        this.#condition(req, sampCfg.conditions[chk.condition] ?? {}, sampCfg);
      }
    }
  }

  /**
   * Returnera antalet krav i en konfiguration.
   *
   * @private
   * @param {object} cfg Konfiguration.
   * @return {number}
   */
  #requirementCount(cfg) {
    return (
      (cfg.requirements?.length ?? 0) +
      (cfg.sections ?? []).reduce(
        (acc, c) => (acc += this.#requirementCount(c)),
        0
      )
    );
  }

  /**
   * Lägg till ett avsnitt i vyn.
   *
   * Lägg till ett avsnitt med en rubrik. Lägg därefter till de krav som ingår
   * i avsnittet och slutligen eventuella underavsnitt.
   *
   * @private
   * @param {object} parent  Vyn eller ett avsnitt i vyn.
   * @param {object} secCfg  Avsnittskonfiguration.
   * @param {object} sampCfg Stickprovskonfiguration.
   */
  async #section(parent, secCfg, sampCfg) {
    if (!(secCfg.public ?? true)) {
      return;
    }

    const section = parent.section(secCfg.title ?? '#rubrik saknas#');

    for (const id of secCfg.requirements ?? []) {
      await this.#requirement(section, id, sampCfg);
    }

    for (const subCfg of secCfg.sections ?? []) {
      await this.#section(section, subCfg, sampCfg);
    }
  }

  /**
   * Sätt sidtitel och huvudrubrik.
   *
   * @private
   * @param {string}  type   Stickprovstyp.
   * @param {boolean} closed Stängd funktionalitet?
   */
  #setHeading(type, closed) {
    const types = {
      document: 'dokument',
      screen: 'vy i mobil applikation',
      webpage: 'webbsida',
    };

    let title = types[type] ?? '#okänd';
    const view = this._view;
    if ('screen' === type) {
      title += ` (${closed ? 'stängd' : 'öppen'} funktionalitet)`;
    }
    view.title = view.heading = `Kontroller, ${title}`;
  }
}

// Importera beroenden.
import { ControllerBase } from './ControllerBase.js';

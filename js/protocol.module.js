/**
 * Populera ett granskningsprotokoll från en mall, och populera sedan mallen med
 * granskningsdata.
 *
 * @license CC-BY 4.0
 */

(async () => {
  try {
    const context = new AppContext();
    const db = await ConnectionFactory.build();
    const loader = new ResourceLoader();
    const settings = new SettingStorage();
    const model = new Model(db, settings);
    const view = new ProtocolView(
      model,
      new InaccessibilityMetric(),
      new SVGChart(),
      null,
      loader
    );

    context.path = location.search;
    const id = context.audit;
    const audit = await model.getAudit(id, true);
    if (!audit) {
      throw new TypeError(`Granskning #'${id}' finns inte.`);
    }
    const aCase = await model.getCase(audit.caseID);

    await view.open(aCase, audit);
  } catch (err) {
    console.error(err);
    console.trace();
  }
})();

// Importera statiska beroenden.
import { AppContext } from './common/AppContext.js';
import { ConnectionFactory } from './db/ConnectionFactory.js';
import { InaccessibilityMetric } from './model/InaccessibilityMetric.js';
import { Model } from './model/Model.js';
import { ProtocolView } from './view/ProtocolView.js';
import { ResourceLoader } from './common/ResourceLoader.js';
import { SettingStorage } from './common/SettingStorage.js';
import { SVGChart } from './view/SVGChart.js';

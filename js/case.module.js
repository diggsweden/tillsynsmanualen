/**
 * Initiera modulen för ärendehantering.
 *
 * Instansisera vy och controller.
 *
 * @license CC-BY 4.0
 * @param {Model}      model   Modellobjekt.
 * @param {AppContext} context Applikationskontext.
 * @return {object}
 */
export default async function initModule(model, context) {
  let controller;
  const loader = new ResourceLoader();
  let view;

  if (context.hasParam('edit') || !context.hasParam('case')) {
    // Redigering av ärendeinformation.
    const [
      { CaseEditController },
      { CaseEditView },
      { KeyMap },
      { TabList },
      { ViewCondition },
    ] = await Promise.all([
      import('./controller/CaseEditController.js'),
      import('./view/CaseEditView.js'),
      import('./common/KeyMap.js'),
      import('./view/TabList.js'),
      import('./view/ViewCondition.js'),
    ]);

    view = new CaseEditView(
      new BreadcrumbTrail(),
      new EventListenerList(),
      loader,
      new TabList(new EventListenerList(), new KeyMap()),
      new ViewCondition()
    );

    controller = new CaseEditController(model, view);
  } else {
    // Visning/handläggning av ärende.
    const [
      { CaseDisplayController },
      { CaseDisplayView },
      { CSVAuditView },
      { CSVProtocolView },
      { FileStorage },
      { InaccessibilityMetric },
      { ProtocolView },
      { RemarksView },
      { SVGChart },
    ] = await Promise.all([
      import('./controller/CaseDisplayController.js'),
      import('./view/CaseDisplayView.js'),
      import('./view/CSVAuditView.js'),
      import('./view/CSVProtocolView.js'),
      import('./common/FileStorage.js'),
      import('./model/InaccessibilityMetric.js'),
      import('./view/ProtocolView.js'),
      import('./view/RemarksView.js'),
      import('./view/SVGChart.js'),
    ]);

    view = new CaseDisplayView(
      new BreadcrumbTrail(),
      new EventListenerList(),
      loader
    );

    const filesystem = new FileStorage();
    controller = new CaseDisplayController(
      model,
      view,
      filesystem,
      new ProtocolView(
        model,
        new InaccessibilityMetric(),
        new SVGChart(),
        filesystem,
        loader
      ),
      new CSVAuditView(filesystem),
      new CSVProtocolView(filesystem, loader),
      new RemarksView(model, filesystem, loader)
    );
  }

  return { controller, view };
}

// Importera statiska beroenden.
import { BreadcrumbTrail } from './view/BreadcrumbTrail.js';
import { EventListenerList } from './common/EventListenerList.js';
import { ResourceLoader } from './common/ResourceLoader.js';

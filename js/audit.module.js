/**
 * Initiera modulen för granskningshantering.
 *
 * Instansiera vy och controller.
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

  if (context.hasParam('edit')) {
    const [{ AuditEditController }, { AuditEditView }, { ViewCondition }] =
      await Promise.all([
        import('./controller/AuditEditController.js'),
        import('./view/AuditEditView.js'),
        import('./view/ViewCondition.js'),
      ]);

    view = new AuditEditView(
      new BreadcrumbTrail(),
      new EventListenerList(),
      loader,
      new ViewCondition()
    );

    controller = new AuditEditController(model, view);
  } else if (context.hasParam('audit')) {
    const [
      { AuditDisplayController },
      { AuditDisplayView },
      { InaccessibilityMetric },
      { ProtocolView },
      { RemarksView },
      { SVGChart },
    ] = await Promise.all([
      import('./controller/AuditDisplayController.js'),
      import('./view/AuditDisplayView.js'),
      import('./model/InaccessibilityMetric.js'),
      import('./view/ProtocolView.js'),
      import('./view/RemarksView.js'),
      import('./view/SVGChart.js'),
    ]);

    view = new AuditDisplayView(
      new BreadcrumbTrail(),
      new EventListenerList(),
      loader
    );

    controller = new AuditDisplayController(
      model,
      view,
      new ProtocolView(
        model,
        new InaccessibilityMetric(),
        new SVGChart(),
        null,
        loader
      ),
      new RemarksView(model, null, loader)
    );
  } else {
    const [{ AuditStartController }, { AuditStartView }, { ViewCondition }] =
      await Promise.all([
        import('./controller/AuditStartController.js'),
        import('./view/AuditStartView.js'),
        import('./view/ViewCondition.js'),
      ]);

    view = new AuditStartView(
      new BreadcrumbTrail(),
      new EventListenerList(),
      loader,
      new ViewCondition()
    );

    controller = new AuditStartController(model, view);
  }

  return { controller, view };
}

// Importera statiska beroenden.
import { BreadcrumbTrail } from './view/BreadcrumbTrail.js';
import { EventListenerList } from './common/EventListenerList.js';
import { ResourceLoader } from './common/ResourceLoader.js';

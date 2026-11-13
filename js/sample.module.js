/**
 * Initiera modulen för stickprovsurval.
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

  if (context.hasParam('edit') || context.hasParam('new')) {
    const [
      { Dropdown },
      { KeyMap },
      { Listbox },
      { SampleEditView },
      { ViewCondition },
    ] = await Promise.all([
      import('./view/Dropdown.js'),
      import('./common/KeyMap.js'),
      import('./view/Listbox.js'),
      import('./view/SampleEditView.js'),
      import('./view/ViewCondition.js'),
    ]);

    let confirm;
    let title;

    if (context.hasParam('new')) {
      confirm = null;
      title = 'Lägg till stickprov';
    } else {
      confirm = 'confirm-dialog';
      title = 'Redigera stickprov';
    }

    view = new SampleEditView(
      'sample-edit',
      title,
      confirm,
      new BreadcrumbTrail(),
      new EventListenerList(),
      loader,
      new Listbox(new EventListenerList(), new KeyMap()),
      new Dropdown(
        new Listbox(new EventListenerList(), new KeyMap()),
        new EventListenerList(),
        new KeyMap()
      ),
      new ViewCondition()
    );

    const { SampleEditController } = await import(
      './controller/SampleEditController.js'
    );
    controller = new SampleEditController(model, view, loader);
  } else {
    const [
      { RequirementOrder },
      { SampleDisplayController },
      { SampleDisplayView },
    ] = await Promise.all([
      import('./controller/RequirementOrder.js'),
      import('./controller/SampleDisplayController.js'),
      import('./view/SampleDisplayView.js'),
    ]);

    view = new SampleDisplayView(
      new BreadcrumbTrail(),
      new EventListenerList(),
      loader
    );

    controller = new SampleDisplayController(
      model,
      view,
      new RequirementOrder(loader)
    );
  }

  return { controller, view };
}

// Importer statiska beroenden.
import { BreadcrumbTrail } from './view/BreadcrumbTrail.js';
import { EventListenerList } from './common/EventListenerList.js';
import { ResourceLoader } from './common/ResourceLoader.js';

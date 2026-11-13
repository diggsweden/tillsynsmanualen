/**
 * Modul för granskning av digital offentlig service.
 *
 * @license CC-BY 4.0
 */

(async () => {
  try {
    // Vi behöver användarens samtycke för att gå vidare.
    const settings = new SettingStorage();

    if (null === settings.read('consent')) {
      const { askConsent } = await import('./consent.module.js');
      const consent = await askConsent(settings);
      if (!consent) return;
    }

    // Skapa kontext, databas, resursladdare, modell och växel.
    const context = new AppContext();
    const db = await ConnectionFactory.build();
    const loader = new ResourceLoader();
    const model = new Model(db, settings);
    const router = new Router(location.search, loader);

    context.advanced ?? (context.path = location.search);
    model.advancedMode = context.advanced;
    await router.loadConfig('app-config');

    // Skapa fördelare.
    const dispatcher = new Dispatcher(model, loader);

    // Växla och fördela begäran så länge som användaren navigerar mellan
    // granskningssidor.
    while (true) {
      const path = router.route(context, model);
      context.reset();
      await dispatcher.dispatch(context, path);
    }
  } catch (err) {
    console.error(err);
    console.trace();
  }
})();

// Importera beroenden.
import { AppContext } from './common/AppContext.js';
import { ConnectionFactory } from './db/ConnectionFactory.js';
import { Dispatcher } from './Dispatcher.js';
import { Model } from './model/Model.js';
import { ResourceLoader } from './common/ResourceLoader.js';
import { Router } from './Router.js';
import { SettingStorage } from './common/SettingStorage.js';

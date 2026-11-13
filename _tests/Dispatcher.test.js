/**
 * Enhetstestfall för begäransfördelaren.
 *
 * @license CC-BY 4.0
 * @see Dispatcher
 */

it('fördelar en giltig begäran', async () => {
  // Mocka applikationskontext, växel, modul och resursladdare.
  const context = { advanced: true, modified: true };
  const loader = mock({ loadModule: async () => module });
  const model = { advancedMode: false };
  const modulePath = 'test.js';

  // Mocka controller, vy och modul.
  const controller = mock({
    handle: async () => {},
    prepare: async () => {},
  });

  const view = mock(
    {
      advancedMode: false,
    },
    {
      activate: () => {},
      close: () => {},
      open: async () => {},
    }
  );

  const module = mock({ default: async () => ({ controller, view }) });

  // Skapa fördelaren och fördela en begäran.
  const dispatcher = new Dispatcher(model, loader);
  await dispatcher.dispatch(context, modulePath);

  // Ska ha satt internflaggan i vyn och öppnat vyn.
  // Ska ha förberett controllern, aktiverat vyn och överlåtite hanteringen
  // till controllern.
  // När controllern returnerat ska fördelaren ha stängt vyn.
  expect(view.advancedMode).toBe(context.advanced);
  expect(view.open).toHaveBeenCalled.once();
  expect(controller.prepare).toHaveBeenCalled.once().with(context);
  expect(view.activate).toHaveBeenCalled.once();
  expect(controller.handle).toHaveBeenCalled.once().with(context);
  expect(view.close).toHaveBeenCalled.once();
});

it('visar felmeddelande vid fel före laddning', async () => {
  // Mocka applikationskontext, växel, modul och resursladdare.
  const context = { advanced: true, modified: true };
  const error = { message: 'ERROR' };
  const loader = mock({ loadModule: async () => module });
  const model = { isInternalUser: (c) => c.internal };
  const modulePath = 'test.js';

  // Mocka controller, vy och modul.
  const controller = mock({
    prepare: async () => {
      throw error;
    },
  });

  const view = mock(
    {
      advancedMode: false,
    },
    {
      close: () => {},
      open: async () => {},
      showError: () => {},
    }
  );

  const module = mock({ default: async () => ({ controller, view }) });

  // Skapa fördelaren och fördela en begäran.
  const dispatcher = new Dispatcher(model, loader);
  await expect.failure(() => dispatcher.dispatch(context, modulePath));

  // Ska ha stängt vyn och visat felmeddelandet.
  expect(view.close).toHaveBeenCalled.once();
  expect(view.showError).toHaveBeenCalled.once().with(error.message);
});

it('deaktiverar sidan vid fel efter laddning', async () => {
  // Mocka applikationskontext, växel, modul och resursladdare.
  const context = { advanced: true, modified: true };
  const error = { message: 'ERROR' };
  const loader = mock({ loadModule: async () => module });
  const model = { isInternalUser: (c) => c.internal };
  const modulePath = 'test.js';

  // Mocka controller, vy och modul.
  const controller = mock({
    handle: async () => {
      throw error;
    },
    prepare: async () => {},
  });

  const view = mock(
    {
      advancedMode: false,
    },
    {
      activate: () => {},
      close: () => {},
      deactivate: () => {},
      open: async () => {},
      showError: () => {},
    }
  );

  const module = mock({ default: async () => ({ controller, view }) });

  // Skapa fördelaren och fördela en begäran.
  const dispatcher = new Dispatcher(model, loader);
  await expect.failure(() => dispatcher.dispatch(context, modulePath));

  // Ska ha visat felmeddelandet och deaktiverat sidan.
  expect(view.showError).toHaveBeenCalled.once().with(error.message);
  expect(view.deactivate).toHaveBeenCalled.once();
});

// Importera beroenden.
import { Dispatcher } from '../js/Dispatcher.js';
import { expect, it, mock } from './functions.js';

/**
 * Enhetstestfall för controllerbasklassen.
 *
 * @license CC-BY 4.0
 * @see ControllerBase
 */

describe('Hantera sida', () => {
  let context;
  let controller;
  let globals;
  let model;
  let view;

  // Skapa förutsättningarna för varje test.
  beforeEach(() => {
    // Fönsterobjektet: controllern ska sätta en händelselyssnare för att
    // genskjuta historiknavigering (bakåt- och framåtknapparna).
    //
    // Historiknavigeringen: controllern ska lagra aktuellt tillstånd för
    // att kunna återställa det om användaren navigerar bakåt/framåt i
    // historiken.
    globals = mock.globals();

    // Modellen: controllern ska spara sökvägen till senast besökta sida.
    // Controllern ska även spara och radera entiteter i modellen.
    model = mock.model({});

    // Vyn: controllern ska registrera en observatör och sätta fokus.
    view = mock.view();

    // Applikationskontexten.
    context = mock.appContext({ modified: true });

    // Skapa en controllerinstans.
    controller = new ControllerBase(model, view, globals);
  });

  it('fokuserar angivet målelement i vyn', async () => {
    const path = '?page=other';
    const target = 'test';
    context.target = target;
    view.notify({ path, type: 'link' });
    await controller.handle(context);
    expect(view.autoFocus).toHaveBeenCalled.once().with(target);
  });

  it('sparar applikationstillståndet (en gång) i navigeringshistoriken', async () => {
    const path = '?page=other';
    context.path = path;
    view.notify({ path: null, type: 'form' });
    await controller.handle(context);
    view.notify({ path, type: 'link' });
    await controller.handle(context);
    expect(globals.history.pushState).toHaveBeenCalled.once();
    expect(model.lastPath).toBe(path);
  });

  it('visar statusmeddelande från föregående sidvisning', async () => {
    const path = '?page=other';
    const status = 'Hello, World!';
    context.status = status;
    view.notify({ path, type: 'link' });
    await controller.handle(context);
    expect(view.showSuccess).toHaveBeenCalled.once().with(status);
  });

  it('sätter returparameter som åtgärdssökväg i vyn', async () => {
    const path = '?page=other';
    const retPath = 'previous&foo=bar';
    context.params['return'] = encodeURIComponent(retPath);
    view.notify({ path, type: 'link' });
    await controller.handle(context);
    expect(view.action).toBe(`?page=${retPath}`);
  });

  it('uppdaterar applikationskontexten vid länkklick', async () => {
    const path = '?page=other';
    view.notify({ path, type: 'link' });
    await controller.handle(context);
    expect(context.path).toBe(path);
  });

  it('återställer applikationskontexten vid historiknavigering', async () => {
    const path = '?page=other';
    const ctx = { error: '', path, status: 'Test' };
    setTimeout(
      () =>
        globals.window.triggerEvent({
          path,
          state: ctx,
          type: 'popstate',
        }),
      0
    );
    await controller.handle(context);
    expect(context.history).toBe(true);
    expect(context.unserialize).toHaveBeenCalled.once().with(ctx);
  });
});

describe('Funktioner för härledda klasser', () => {
  let context;
  let globals;
  let model;
  let view;

  // Skapa förutsättningarna för varje test.
  beforeEach(() => {
    // Modellen: controllern ska spara sökvägen till senast besökta sida.
    // Controllern ska även spara och radera entiteter i modellen.
    model = mock.model({
      put: async (e) => {
        if (e.valid) {
          return e;
        } else {
          throw new Error('INVALID');
        }
      },
    });

    // Vyn: controllern ska registrera en observatör och sätta fokus.
    view = mock.view();

    // Applikationskontexten.
    context = mock.appContext({ modified: true });
    globals = mock.globals();
  });

  it('sparar inte senaste sökväg om avstängt i subklass', async () => {
    class TestController extends ControllerBase {
      constructor(model, view, globals) {
        super(model, view, globals);
        this._persistPath = false;
      }
    }
    let ctrl = new TestController(model, view, globals);
    const path = '?page=other';
    context.path = path;
    view.notify({ path, type: 'link' });
    await ctrl.handle(context);
    expect(globals.history.pushState).toHaveBeenCalled.once();
    expect(model.lastPath).toBe(null);
  });

  it('uppdaterar applikationskontexten vid formulärinskick', async () => {
    class TestController extends ControllerBase {
      async prepare() {
        this._action('test', () => {});
      }
    }
    let ctrl = new TestController(model, view, globals);
    const path = '?page=other';
    view.notify({ action: 'test', path, type: 'form' });
    await ctrl.prepare();
    await ctrl.handle(context);
    expect(context.path).toBe(path);
  });
});

// Importera beroenden.
import { ControllerBase } from '../../js/controller/ControllerBase.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

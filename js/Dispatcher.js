/**
 * Fördelare för granskning av digital offentlig service.
 *
 * Fördelaren laddar sidinnehåll beroende på var i granskningsprocessen
 * användaren befinner sig.
 *
 * @license CC-BY 4.0
 */
export class Dispatcher {
  // Privata fält.
  #loader;
  #model;

  /**
   * Konstruera en fördelarinstans.
   *
   * @param {Model}          model  Modellobjekt.
   * @param {ResourceLoader} loader Resursladdare.
   */
  constructor(model, loader) {
    this.#loader = loader;
    this.#model = model;
  }

  /**
   * Fördela en sidbegäran.
   *
   * Importera modulen, som i sin tur instansierar en vy och en controller.
   * Ladda vyinnehållet, förbered controllern och låt den sedan hantera
   * sidinteraktionen tills användaren navigerar till en annan gransknings-
   * sida.
   *
   * @param {AppContext}) context  Applikationskontext.
   * @param {string}      path     Modulsökväg.
   * @param {Document}    [doc]    DOM-dokument vid enhetstester.
   */
  async dispatch(context, path, doc = document) {
    const { default: init } = await this.#loader.loadModule(path);
    const { controller, view } = await init(this.#model, context);
    view.advancedMode = context.advanced ?? this.#model.advancedMode;
    await view.open();

    try {
      await controller.prepare(context);
    } catch (err) {
      console.debug('Exception caught in dispatcher:', err);
      view.close();
      view.showError(err.message);
      throw err;
    }

    try {
      view.activate();

      do {
        await controller.handle(context);
      } while (!context.modified && !context.history);

      view.close();
    } catch (err) {
      console.debug('Exception caught in dispatcher:', err);
      view.showError(err.message);
      view.deactivate();
      throw err;
    }
  }
}

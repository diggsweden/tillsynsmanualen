/**
 * Controller-basklass för granskningssidor.
 *
 * Hanterar användarinitierade händelser på en sida. Basklassen tar hand om
 * klick på länkar till andra granskningssidor och navigering via webbläsarens
 * bakåt- och framåtknappar.
 *
 * @license CC-BY 4.0
 */
export class ControllerBase {
  // Skyddade fält.
  _context;
  _model;
  _persistPath = true;
  _view;

  // Privata fält.
  #actions = {};
  #history;
  #onHistoryEvent;
  #onViewEvent;
  #persisted = false;
  #window;

  /**
   * Konstruera en controllerinstans.
   *
   * @param {Model}    model     Modellobjekt.
   * @param {ViewBase} view      Vyinstans.
   * @param {object}   [globals] Mockade globala objekt vid enhetstester.
   */
  constructor(model, view, globals = {}) {
    this.#history = globals.history ?? history;
    this._model = model;
    this._view = view;
    this.#window = globals.window ?? window;
  }

  /**
   * Hantera sidhändelser.
   *
   * Lägg eventuellt till sidan i navigeringshistoriken.
   * Registrera historikhändelselyssnare och observatör för vyhändelser.
   * Visa eventuellt statusmeddelande från föregående sidvisning.
   * Sätt åtgärdssökväg för eventuellt formuulär.
   *
   * @param {AppContext} context Applikationskontext.
   * @return {Promise} Infrias vid historiknavigering eller vyhändelse.
   */
  handle(context) {
    this._context = context;
    const target = context.target;
    target && this._view.autoFocus(target);
    this.#pushHistoryNavigationState(context);
    this.#showStatusMessage(context);
    this.#setReturnAction(context);

    return Promise.race([
      this.#handleViewEvent(context),
      this.#handleHistoryEvent(context),
    ]);
  }

  /**
   * Förbered sidhantering.
   *
   * Den här metoden ger möjlighet att exempelvis populera vyn innan händelse-
   * lyssnare läggs till och användaren kan börja interagera med sidan.
   *
   * Basklassmetoden gör ingenting, men härledda klaser kan erskätta den.
   *
   * @param {AppContext} context Applikationskontext.
   */
  async prepare(context) {
    // Basklassmetoden är tom.
  }

  /**
   * Registrera åtgärd.
   *
   * Den angivna funktionen anropas med händelseinformation när åtgärden ska
   * utföras.
   *
   * @protected
   * @param {string}   name   Åtgärdsnamn.
   * @param {callback} action Funktion att anropa vid åtgärd.
   */
  _action(name, action) {
    this.#actions[name] = action;
  }

  /**
   * Städa händelselyssnare och observatörer vid utgång.
   *
   * @private
   */
  #exit() {
    if (this.#onHistoryEvent) {
      this.#window.removeEventListener('popstate', this.#onHistoryEvent);
      this.#onHistoryEvent = null;
    }

    if (this.#onViewEvent) {
      this._view.unsubscribe(this.#onViewEvent);
      this.#onViewEvent = null;
    }
  }

  /**
   * Hantera händelser i historiknavigeringen.
   *
   * @private
   * @param {AppContext} context Applikationskontext.
   * @return {Promise} Infrias när användaren navigerar framåt/bakåt.
   */
  #handleHistoryEvent(context) {
    return new Promise((resolve) => {
      this.#onHistoryEvent = (event) => {
        event.path && context.unserialize(event.state);
        context.history = true;
        this.#exit();
        resolve();
      };

      this.#window.addEventListener('popstate', this.#onHistoryEvent);
    });
  }

  /**
   * Hantera innehållsförändringar och åtgärder i vyn.
   *
   * @private
   * @param {AppContext} context Applikationskontext.
   * @return {Promise} Infrias vid hanterad vyhändelse.
   */
  #handleViewEvent(context) {
    return new Promise((resolve, reject) => {
      this.#onViewEvent = async (event) => {
        const actions = {
          form: (e, c) => this.#onFormAction(e, c),
          link: (e, c) => this.#onLinkAction(e, c),
        };

        try {
          if (event.type in actions) {
            await actions[event.type](event, context);
            this.#exit();
            resolve();
          }
        } catch (err) {
          if (err) {
            this._view.showError(err.message);
            reject(err);
          }
        }
      };

      this._view.subscribe(this.#onViewEvent);
    });
  }

  /**
   * Utför en angiven åtgärd vid avisering om formulärhändelse.
   *
   * Om händelsen är ett formulärinskick (submit) med en åtgärd och det finns
   * en hanterare registrera för den, utför den angivna åtgärden.
   *
   * @param {object}     event   Händelseinformation.
   * @param {AppContext} context Applikationskontext.
   * @throws {TypeError} Ingen metod registrerad för angiven åtgärdtyp.
   */
  async #onFormAction(event, context) {
    const { action } = event;
    if (!action) return;

    if (!(action in this.#actions)) {
      console.warn(`Ingen åtgärd registrerad för "${action}".`);
      throw new TypeError(`Okänd åtgärd: "${action}".`);
    }

    await this.#actions[action](event);

    context.path = event.path;
    context.history = false;
  }

  /**
   * Uppdatera applikationskontexten vid navigering.
   *
   * Om användaren klickar på en länk till en annan granskningssida, uppdatera
   * sökvägen i applikationskontexten.
   *
   * @private
   * @param {object}     event   Händelseinformation.
   * @param {AppContext} context Applikationskontext.
   */
  #onLinkAction(event, context) {
    context.path = event.path;
    context.history = false;
  }

  /**
   * Spara applikationstillstånd och begäran.
   *
   * Spara applikationstillståndet, om det inte rör sig om historiknavigering.
   * Om begäran ska sparas för den här sidan, spara sökvägen i lagringsutrym-
   * met.
   *
   * @private
   * @param {AppContext} context Applikationskontext.
   */
  #pushHistoryNavigationState(context) {
    if (context.history || this.#persisted) return;
    this.#history.pushState(context.serialize(), '', context.path);
    this._persistPath && (this._model.lastPath = context.path);
    this.#persisted = true;
  }

  /**
   * Sätt ågärdssökväg i formuläret.
   *
   * Om en åtgärdssökväg angivits med parametern `return` i begäran, sätt den
   * i vyn.
   *
   * @private
   * @param {AppContext} context Applikationskontext.
   */
  #setReturnAction(context) {
    if (context.hasParam('return')) {
      const param = decodeURIComponent(context.param('return'));
      this._view.action = `?page=${param}`;
    }
  }

  /**
   * Visa eventuellt statusmeddelande.
   *
   * Om föregående sida satt ett statusmeddelande i applikationskontexten,
   * visa det i vyn. Ta sedan bort meddelandet ur kontexten.
   *
   * @private
   * @param {AppContext} context Applikationskontext.
   */
  #showStatusMessage(context) {
    if (context.status) {
      this._view.showSuccess(context.status);
      context.status = '';
    }
  }
}

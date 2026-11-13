/**
 * Controller för listor med entiteter.
 *
 * @license CC-BY 4.0
 */
export class ListController extends ControllerBase {
  // Privata fält.
  #keys = new Map();
  #reader;

  /**
   * Konstruera en controllerinstans
   *
   * @param {Model}      model     Modellobjekt.
   * @param {ViewBase}   view      Vyinstans.
   * @param {FileReader} reader    Filläsare.
   * @param {object}     [globals] Mockade globala objekt vid enhetstester.
   */
  constructor(model, view, reader, globals = {}) {
    super(model, view, globals);
    this.#reader = reader;
  }

  /**
   * @inheritDoc
   * @override
   */
  async prepare(context) {
    const view = this._view;

    // Hämta information som är beroende av listtypen.
    if (!context.hasParam('type')) {
      throw new TypeError('Ange typ av lista.');
    }

    const info = this.#typeInfo(context.param('type'));

    // Sätt titel och rubrik i vyn.
    view.title = info.title;
    view.heading = info.title;

    // Lägg till länkstig.
    view.breadcrumbs.current = info.title;

    // Sätt tom-meddelande och typklass på listan.
    view.emptyMessage = `Inga ${info.title.toLowerCase()}`;
    view.listClass = info.type;

    // Sätt ikon och text i länken för att skapa ny entitet.
    view.setCreate(`?page=${context.param('type')}`, info.icon, info.create);

    // Hantera funktion för att läsa in objekt från fil och via
    // dra-och-släpp.
    if (info.upload) {
      this.#handleUpload(info);
    }

    // Populera modellen och sedan vyn.
    const items = await info.getAll(this._model);
    items.forEach((item) => {
      this.#addLink(view, item, info);
    });
  }

  /**
   * Lägg till eller ersätt en länk i listan.
   *
   * @private
   * @param {ListView} view Vyinstans.
   * @param {object}   item Entitetsobjekt.
   * @param {object}   info Typberoende information.
   */
  #addLink(view, item, info) {
    const columns = info.columns.map((prop) =>
      'function' === typeof prop
        ? prop(item)
        : prop.split('.').reduce((acc, curr) => acc[curr], item)
    );
    const key = info.key(item);
    const params = new URLParameters();
    params.add(info.link.id, info.link.key(item));
    const url = `${info.link.url}&${params}`;

    if (this.#keys.has(key)) {
      view.replaceLink(key, url, columns);
    } else {
      view.addLink(info.icon, key, url, columns);
    }

    this.#keys.set(key, item);
  }

  /**
   * Begär bekräftelse om uppladdad fil ersätter existerande entitet.
   *
   * Om en uppladdad fil motsvarar en entitet med en nyckel som redan
   * existerar i listan, begär bekräftelse från användaren.
   *
   * @private
   * @param {string}            key       Nyckel i objektlagret.
   * @param {HTMLButtonElement} [focused] Element att ge fokus när dialogrutan
   *                                      stängs.
   * @return {boolean}
   */
  async #confirmReplace(key, focused = null) {
    if (this.#keys.has(key)) {
      const item = this.#keys.get(key);
      const prompt = `”${item}” finns redan och kommer att ersättas.`;
      return this._view.confirm(prompt, focused);
    }

    // Ingen konflikt.
    return true;
  }

  /**
   * Hantera uppladdning via filvaljare eller dra-och-släpp.
   *
   * @private
   * @param {object} info Typinformation.
   */
  #handleUpload(info) {
    // Aktivera filuppladdning i vyn.
    const view = this._view;
    view.enableUpload();

    // Registrera en observatör som tar hand om filuppladdning.
    view.subscribe((event) => {
      if ('upload' !== event.type) return;

      const { action, trigger, value } = event;
      const files = 'drop' === action ? value : [value];
      for (let i = 0; i < files.length; ++i) {
        if ('application/json' === files[i].type) {
          this.#uploadFile(files[i], info, null);
        } else {
          const msg = `${files[i].name} är inte ett ärende.`;
          this._view.showError(msg);
        }
      }
    });
  }

  /**
   * Typberoende information.
   *
   * Returnera ett objekt med information som beror på vilken typ av innehåll
   * listan har (anges av parametern `type` i begäran).
   *
   * @private
   * @param {string} type Typ av lista.
   * @return {object}
   */
  #typeInfo(type) {
    const map = {
      officer: 'handläggare',
      supervisor: 'tillsynsansvarig',
    };

    const roles = (p) => p.roles.map((r) => map[r]).join(', ');

    const info = {
      case: {
        columns: [(c) => c.toString(), 'service.name'],
        create: 'Nytt ärende',
        getAll: (m) => m.allCases(),
        icon: 'ico-case',
        key: (c) => c.caseNumber.id,
        link: { url: '?page=case', id: 'case', key: (c) => c.id },
        title: 'Ärenden',
        type: 'case',
        upload: true,
      },

      person: {
        columns: ['name', roles],
        create: 'Ny person',
        getAll: (m) => m.allPeople(),
        icon: 'ico-person',
        key: (p) => p.email,
        link: { url: '?page=person', id: 'id', key: (p) => p.id },
        title: 'Personer',
        type: 'person',
        upload: false,
      },

      schedule: {
        columns: [(s) => s.caseNumber.toString(), 'period'],
        create: 'Ny tillsynsplan',
        getAll: (m) => m.allSchedules(),
        icon: 'ico-document',
        key: (s) => s.caseNumber.id,
        link: { url: '?page=schedule', id: 'id', key: (s) => s.id },
        title: 'Tillsynsplaner',
        type: 'schedule',
        upload: false,
      },
    };

    if (!info.hasOwnProperty(type)) {
      throw new Error(`Okänd listtyp: "${info}".`);
    }

    return info[type];
  }

  /**
   * Läs in JSON-fil.
   *
   * @private
   * @param {File}              file     Filinformation.
   * @param {object}            info     Typinformation.
   * @param {HTMLButtonElement} [button] Knapp för uppladdning.
   */
  #uploadFile(file, info, button = null) {
    // Händelselyssnare som anropas när filinnehållet är tillgängligt.
    const onLoad = async (event) => {
      this.#reader.removeEventListener('load', onLoad);

      try {
        // Omvandla JSON-texten till ett entitetsobjekt.
        const data = JSON.parse(this.#reader.result);
        let aCase = CaseFactory.build(data);
        const key = info.key(aCase);

        // Persistera entitetsobjektet och lägg till element i listan.
        const ok = await this.#confirmReplace(key, button);
        if (ok) {
          aCase = await this._model.unserialize(data);
          if (this.#keys.has(key)) {
            // Radera tidigare ärende med samma ärendenummer.
            this._model.deleteCase(this.#keys.get(key).id);
          }
          this.#addLink(this._view, aCase, info);
        }
      } catch (err) {
        this.#reader.mock ?? console.error(err);
        const msg = `${file.name} är inte ett giltigt ärende.`;
        this._view.showError(msg);
      }
    };

    this.#reader.addEventListener('load', onLoad);

    // Läs filen.
    this.#reader.readAsText(file);
  }
}

// Importera beroenden.
import { CaseFactory } from '../model/case.js';
import { ControllerBase } from './ControllerBase.js';
import { URLParameters } from './URLParameters.js';

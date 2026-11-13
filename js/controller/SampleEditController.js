/**
 * Controller för redigering av stickprovsinformation.
 *
 * @license CC-BY 4.0
 */
export class SampleEditController extends ControllerBase {
  // Privata fält.
  #audit;
  #case;
  #compCfg = {};
  #component = false;
  #connections = new Map();
  #contentCfg;
  #isNew = false;
  #loader;
  #originallyClosed = false;
  #originalName;
  #originalType;
  #predecessors;
  #sample;

  /**
   * Konstruera en controllerinstans
   *
   * @param {Model}          model     Modellobjekt.
   * @param {ViewBase}       view      Vyinstans.
   * @param {ResourceLoader} loader    Resursladdare.
   * @param {object}         [globals] Globala objekt vid enhetstester.
   */
  constructor(model, view, loader, globals = {}) {
    super(model, view, globals);
    this.#loader = loader;
    this._persistPath = false;
  }

  /**
   * @inheritDoc
   * @override
   * @throws {TypeError} Gransknings-id saknas; stickprovs-id saknas eller
   *                     ogiltigt; granskningen avslutad.
   */
  async prepare(context) {
    const cp = (f, e) => {
      if (!f) throw new TypeError(e);
    };
    const model = this._model;
    const view = this._view;

    if (context.hasParam('new')) {
      this.#isNew = true;
      cp(context.audit, 'Ange granskningsidentitet.');
      this.#audit = await model.getAudit(context.audit);
    } else {
      // Hämta data från modellen.
      cp(context.sample, 'Ange stickprovsidentitet.');
      const id = context.sample;
      this.#sample = await model.getSample(id);
      if (!this.#sample) {
        throw new TypeError(`Stickprov #${id} finns inte.`);
      }
      this.#originallyClosed = this.#sample.closed;
      this.#audit = await model.getAudit(this.#sample.auditID);
    }

    if (this.#audit.finished) {
      const noun = this.#isNew ? 'urval' : 'stickprov';
      throw new TypeError(`Kan inte redigera ${noun} i avslutad granskning.`);
    }

    // Registrera en observatör på vyn, som anropas när användaren ändrar
    // värden i formuläret.
    view.subscribe((e) => this.#onViewEvent(e));

    // Registrera åtgärder för tillägg av komponent samt spara och ta bort.
    this._action('component', (e) => this.#onComponentAction(e));
    this._action('delete', (e) => this.#onDelete(e));
    this._action('save', (e) => this.#onSave(e));

    this.#case = await model.getCase(this.#audit.caseID);
    view.service = this.#case.service.type;
    this.#setBreadcrumbs();
    this.#setFormAction(context);
    this.#setProgress();
    this.#setRandomCount();

    if (this.#isNew) {
      await this.#createSample();
    } else {
      this.#component = 'component' === this.#sample.type;
      this.#contentCfg = await this.#loadContentConfig();
    }

    this.#setCategories();
    this.#isNew || this.#populateView();
    await this.#updateViewContent();
  }

  /**
   * Lägg till definierade komponenter i vyn.
   *
   * @private
   */
  #addComponentsToView() {
    if (!this.#sample.isComposite) return;
    const match = (c) => this.#sample.type === c.parentType;
    for (const component of this.#audit.components()) {
      if (!match(component)) continue;
      const { id, name, default: d } = component;
      const inc = this.#isNew ? d : this.#sample.hasComponent(id);
      this._view.addComponent(id, name, inc);
    }
  }

  /**
   * Lägg till stickprovskopplingar i vyn.
   *
   * @private
   */
  #addConnectionsToView() {
    if (!this.#component) return;
    this.#connections.clear();
    const cid = this.#sample.id;
    for (const sample of this.#audit.allSamples()) {
      if (this.#sample.parentType !== sample.type) continue;
      const { id, name } = sample;
      this._view.addConnection(id, name, sample.hasComponent(cid));
    }
  }

  /**
   * Lägg till innehållstyper i vyn.
   *
   * Lägg till typer från konfigurationsfiler: för stickprovet och för kompo-
   * nenter.
   *
   * Visa inte innehållstyper som lagts till i konfigurationen efter att
   * granskningen påbörjats eller som upphört att gälla innan granskningen
   * påbörjades.
   *
   * @private
   */
  async #addContentTypesToView() {
    const has = (id) => this.#sample.contains(id);
    let map = ({ id, title }) => [id, title, has(id)];
    let types = this.#contentTypesFromConfig(this.#contentCfg, has);
    this._view.setSampleContentTypes(types.map(map));

    if (this.#sample.isComposite) {
      const st = this.#sample.type;
      this.#compCfg[st] ??= await this.#loadComponentContentConfig(st);
      map = ({ id, title, default: d }) => [id, title, true === d];
      types = this.#contentTypesFromConfig(this.#compCfg[st]);
      this._view.setComponentContentTypes(types.map(map));
    }
  }

  /**
   * Översätt en kategoribeteckning till länkstigssidnamn.
   *
   * @private
   * @param {string} category  Stickprovskategori.
   * @param {string} [unknown] Returvärde för okänd kategori.
   * @return {string}
   */
  #categoryLabel(category, unknown = 'Okänd kategori') {
    return (
      {
        component: 'Komponent',
        contact: 'Kontakt',
        doc: 'Produktdokumentation',
        feedback: 'Meddelandefunktion',
        help: 'Hjälp',
        legal: 'Juridisk information',
        login: 'Inloggning',
        random: 'Slumpmässigt urval',
        relevant: 'Relevant',
        service: 'Typ av tjänst',
        sitemap: 'Webbplatskarta',
        sitemap: 'Webbplatskarta',
        special: 'Udda innehåll',
        start: 'Start',
        statement: 'Tillgänglighetsredogörelse',
        statementApp: 'Tillgänglighetsredogörelse',
        support: 'Supporttjänster',
      }[category] || unknown
    );
  }

  /**
   * Ändra stickprovstyp.
   *
   * Om användaren ändrar stickprovstyp, skapa en ny aktuell entitet och
   * kopiera värdena från den tidigare entiteten.
   *
   * Uppdatera också vyinnehallet.
   *
   * @private
   * @param {string} type Ny stickprovstyp.
   */
  async #changeSampleType(type) {
    const auditID = this.#audit.id;
    this.#originalType ??= this.#sample.type;
    this.#sample = {
      screen: (c) => new AppScreen(auditID, c),
      document: (c) => new NonWebDocument(auditID, c),
      webpage: (c) => new Webpage(auditID, c),
    }[type](this.#sample);
    this.#originallyClosed = this.#sample.closed;

    await this.#updateViewContent();
  }

  /**
   * Bekräfta komponentkopplingar vid nyskapande.
   *
   * Om det är ett nytt stickprov som kan ha komponenter, och det finns minst
   * en definierad komponent, och användaren inte valt att slippa dess be-
   * kräftelser, visa en modal dialogrutan där användaren kan ändra och
   * godkänna eller avbryta.
   *
   * Vid godkännande, uppdatera användarinställningen för att visa denna
   * bekräftelsedialog.
   *
   * @private
   * @return {boolean} `true` om användaren godkänt, `false` vid avbryt.
   */
  async #confirmConnections() {
    if (!this.#isNew) return true;
    if (!this._model.confirmComponents) return true;
    if (!this.#sample.isComposite) return true;
    if (this.#audit.countType(Component, this.#sample.type) < 1) {
      return true;
    }

    const ok = await this._view.confirmComponents();
    if (!ok) return false;

    this._model.confirmComponents = this._view.confirmOnSave;
    for (const { id, inc } of this._view.components) {
      inc
        ? this.#sample.addComponent(this.#audit.sample(id))
        : this.#sample.deleteComponent(id);
    }
    return true;
  }

  /**
   * Hämta relevanta innehållstyper ur konfigurationen.
   *
   * Filterfunktionen anropas med en innehållstypsidentitet från konfigurat-
   * ionsfilen.
   *
   * Om ingen annan filterfunktion angivits, exkludera innehållstyper som
   * lagts till i konfigurationen efter att granskningen påbörjats eller som
   * upphört att gälla innan granskningen påbörjades.
   *
   * @private
   * @param {object}   config   Konfiguration.
   * @param {function} [filter] Filterfunktion.
   * @return {array[]} En vektor där varje element är en vektor med tre
   *                   element: identitet, namn och förvalsflagga för en
   *                   innehållstyp.
   */
  #contentTypesFromConfig(config, filter) {
    filter ??= () => false;
    const after = (d) => date >= (d ?? 0);
    const before = (d) => date <= (d ?? date);
    const date = this.#audit.started.getTime();
    const inc = ({ id, begin, end }) => range(begin, end) || filter(id);
    const range = (begin, end) => after(begin) && before(end);
    return config.contentTypes?.filter(inc) ?? [];
  }

  /**
   * Skapa en stickprovsinstans i controllern.
   *
   * @private
   */
  async #createSample() {
    const create = {
      app: () => new AppScreen(this.#audit.id, ''),
      website: () => new Webpage(this.#audit.id, ''),
    };
    const service = this.#case.service;
    this.#sample = create[service.type]();
    this.#contentCfg = await this.#loadContentConfig();
    if ('app' === service.type) {
      this.#sample.platform = service.operatingSystem;
    }

    // Lägg till förvalda innehållstyper i stickprovet.
    this.#contentTypesFromConfig(this.#contentCfg)
      .filter(({ default: d }) => d)
      .forEach(({ id }) => this.#sample.addContentType(id));

    // Lägg till förvalda komponentnamn i stickprovet.
    const matches = (c) => this.#sample.type === c.parentType;
    for (const component of this.#audit.components()) {
      if (matches(component) && component.default) {
        this.#sample.addComponent(component);
      }
    }
  }

  /**
   * Ladda kravkonfiguration för komponenter.
   *
   * Den här controllern använder bara definitionerna av innehållstyper.
   *
   * @private
   * @return {object}
   */
  async #loadComponentContentConfig() {
    const type = this.#sample.parentType ?? this.#sample.type;
    let url = `requirements/${type}-component`;
    if ('screen' === type) {
      // Innehållstypsdefinitionerna antas vara desamma oavsett öppen
      // eller stängd funktionalitet.
      url += '-open';
    }
    return this.#loader.configuration(url);
  }

  /**
   * Ladda konfiguration av stickprov.
   *
   * Den här controllern använder bara definitionerna av innehållstyper.
   *
   * @private
   * @return {object}
   */
  async #loadContentConfig() {
    if (this.#component) {
      return await this.#loadComponentContentConfig();
    }
    let url = `requirements/${this.#sample.type}`;
    if ('screen' === this.#sample.type) {
      // Innehållstypsdefinitionerna antas vara desamma oavsett öppen
      // eller stängd funktionalitet.
      url += '-open';
    }
    return this.#loader.configuration(url);
  }

  /**
   * Lägg till en komponent till stickprovet.
   *
   * Validera namnet, skapa en komponentinstans och spara den i objektdata-
   * basen. Lägg sedan till komponenten i det aktuella stickprovet och i vyn.
   * Rensa komponentfälten i vyn och bekräfta med ett statusmeddelande.
   *
   * @private
   */
  async #onComponentAction() {
    // Hämta information från vyn, validera och skapa en komponent.
    const view = this._view;
    const name = view.component.trim();
    if ('' === name) {
      view.component = new ValidationError(
        'Fyll i ett namn för komponenten.',
        name
      );
    }
    if (!view.testComponentValidity()) throw null;

    const type = this.#sample.type;
    const component = new Component(this.#audit.id, type);
    component.name = name;
    component.closed = !view.srSupport;
    component.default = view.default;

    for (const type of view.contentTypes) {
      component.addContentType(type);
    }

    // Spara komponenten i objektdatabasen.
    await this._model.setSample(component);

    // Lägg till som ny komponent i urvalet.
    this.#audit.setSample(component);

    // Koppla komponenten till aktuellt stickprov.
    this.#sample.addComponent(component);

    // Lägg till komponenten i vyn och återställ komponentfälten.
    view.addComponent(component.id, name, true);
    view.clearComponentFields();
    view.showComponentStatus(
      `”${name}” har lagts till i granskningen och i ${this.#sample.name}.`
    );
  }

  /**
   * Åtgärdshanterare för Ta bort-knappen i vyn.
   *
   * Ta bort stickprovsinstansen ur aktuell granskning och spara granskningen
   * i objektdatabasen.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  async #onDelete(event) {
    if ('form' !== event.type || 'delete' !== event.action) return;

    // Be användaren bekräfta borttaget.
    const { name } = this.#sample;
    const ok = await this._view.confirm(
      `”${name}” kommer att tas bort ur granskningen.\n` +
        'Åtgärden går inte att ångra.',
      event.trigger
    );

    // Ta bort komponenten eller stickprovet ur granskningen och ur
    // objektdatabasen.
    if (ok) {
      // Uppdatera eventuella referenser.
      const ref = this.#originalName ?? name;
      const changed = this.#updateReferencesOnDelete(ref);

      const model = this._model;
      this.#audit.deleteSample(this.#sample.id);
      (this.#component || changed) &&
        (await model.setAuditSamples(this.#audit));

      await model.deleteSample(this.#sample.id);
      /* borttaget på begäran 2022-11-10
            this._context.status = `”${name}” raderad.`;
            */
    }
  }

  /**
   * Åtgärdshanterare för sparaknappen i vyn.
   *
   * Uppdatera stickprovsinstansen i objektdatabasen.
   *
   * @private
   * @param {object} event Händelseinformation.
   * @throws {TypeError} Minst ett obligatoriskt fält saknar innehåll.
   */
  async #onSave(event) {
    if ('form' !== event.type || !event.action) return;

    this.#validateSample(this.#sample);
    const model = this._model;

    // Bekräfta komponentkopplingar vid nyskapande.
    if (!(await this.#confirmConnections())) return;

    // Spara eller uppdatera stickprovet i databasen.
    await model.setSample(this.#sample);

    // Om flaggan för öppen/stängd funktionalitet ändrats, radera alla krav.
    // Detsamma gäller om stickprovstypen ändrats.
    const oc = this.#originallyClosed;
    const ot = this.#originalType;
    const c1 = oc != null && oc !== this.#sample.closed;
    const c2 = ot != null && ot !== this.#sample.type;
    if (c1 || c2) {
      await model.deleteRequirements(this.#sample.id);
    }

    /* borttaget på begäran 2022-11-10
        this._context.status = `”${this.#sample.name}” sparat.`;
        */

    // Om namnet ändrats, uppdatera eventuella referenser.
    // Om kopplingar ändrats, uppdatera stickproven.
    const tasks = this.#updateReferencesOnNameChange().concat(
      this.#updateConnections()
    );
    await Promise.all(tasks);

    // Forcera sidladdning.
    this._context.path = '';
  }

  /**
   * Observatör som anropas vid händelser i vyn.
   *
   * Uppdatera aktuell entitet i controllern.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  async #onViewEvent(event) {
    if ('change' !== event.type) return;

    const { state, target, value } = event;

    if (undefined !== state) {
      // Kryssruta eller listbox.
      const comp = (v) => this.#audit.sample(Number(v));
      ({
        srSupport: (s) => (this.#sample.closed = !s),
        component: (s, v) =>
          s
            ? this.#sample.addComponent(comp(v))
            : this.#sample.deleteComponent(Number(v)),
        connection: (s, v) => this.#connections.set(v, s),
        ct: (s, v) =>
          s
            ? this.#sample.addContentType(v)
            : this.#sample.deleteContentType(v),
        defaultEdit: (s) => (this.#sample.default = s),
      })[target.replace(/-.*/, '')]?.(state, value);
    } else {
      await {
        category: (v) => this.#setCategory(v),
        component: (v, t) => this.#validateName(t, v, true),
        follows: (v, t) => this.#setValue(t, v),
        format: (v, t) => this.#setValue(t, v),
        name: (v) => this.#setName(v.trim()),
        note: (v, t) => this.#setValue(t, v),
        serviceType: (v, t) => this.#setValue('service', v),
        type: (v) => this.#changeSampleType(v),
        url: (v, t) => this.#setURL(v),
      }[target]?.(value, target);
    }
  }

  /**
   * Populera vyn med stickprovsdata.
   *
   * @private
   */
  #populateView() {
    this.#predecessors ??= this.#setPredecessors(this.#audit);
    const sample = this.#sample;
    const view = this._view;
    view.heading = sample.name;
    view.serviceType = sample.service ?? '';
    view.category = sample.category;
    view.name = sample.name;
    view.defaultEdit = sample.default ?? false;
    view.url = sample.url ?? '';
    view.srSupport = !(sample.closed ?? true);
    view.note = sample.note ?? '';
    view.follows = sample.follows ?? '';

    'document' === sample.type && (view.format = sample.format ?? '');
  }

  /**
   * Kontrollera om ett stickprov har beroende till ett annat stickprov.
   *
   * Följedet angivna stickprovets föregående processteg rekursivt. Om det
   * angivna målet ingår i processtegskedjan returnera `true`, annars `false`.
   *
   * @private
   * @param {string}   target  Namn på målelementet.
   * @param {string}   name    Namn på stickprovet att kontrollera.
   * @param {Sample[]} samples Vektor med stickprov i samma kategori.
   * @return {boolean}
   */
  #precedes(target, name, samples) {
    const sample = samples.find((n) => n.name === name);
    console.assert(sample != null);
    if (!sample.follows) {
      return false;
    } else if (target === sample.follows) {
      return true;
    }
    return this.#precedes(target, sample.follows, samples);
  }

  /**
   * Populera länkstigen och lägg till den i vyn.
   *
   * @private
   */
  #setBreadcrumbs() {
    const { breadcrumbs } = this._view;
    breadcrumbs.case(
      this.#case.id,
      this.#case.toString(),
      this.#case.organization.name,
      this.#case.service.name
    );
    breadcrumbs.audit(this.#audit.id, this.#audit.started);
    const name = this.#isNew ? 'Nytt stickprov' : this.#sample.name;
    breadcrumbs.current = name;
  }

  /**
   * Populera listan med urvalskategorier i vyn.
   *
   * Listan visar antalet tillagna stickprov i varje kategori.
   *
   * @private
   */
  #setCategories() {
    const categories = [];
    if (this.#component) {
      categories.push({
        id: 'component',
        name: 'Komponent',
        count: this.#audit.count('component'),
      });
    } else {
      for (let id of Audit.SampleCategories) {
        if ('statement' === id && 'app' === this.#case.service.type) {
          id += 'App';
        }
        const name = this.#categoryLabel(id);
        categories.push({ id, name, count: this.#audit.count(id) });
      }
    }
    this._view.setCategories(categories);
  }

  /**
   * Ändra urvalskategori i vyn.
   *
   * Om användaren ändrar kategori vid redigering, informera vyn.
   * Uppdatera också listan med potentiella föregående processteg.
   *
   * @private
   */
  #setCategory(category) {
    this.#sample.category = category;
    this._view.category = category;
    this.#setPredecessors();
  }

  /**
   * Sätt åtgärdssökvägar för formuläret.
   *
   * @private
   * @param {AppContext} context Applikationskontext.
   */
  #setFormAction(context) {
    const params = new URLParameters();
    const view = this._view;
    params.add('audit', String(this.#audit.id));
    if (this.#isNew) {
      params.add('new');
      view.action = `?page=sample&${params}`;
      view.deleteAction = null;
    } else {
      const dec = (s) => decodeURIComponent(s);
      const path = dec(context.param('return')) ?? `audit&${params}`;
      view.action = `?page=${path}`;
      view.deleteAction = path.startsWith('sample')
        ? `?page=audit&${params}`
        : `?page=${path}`;
    }
  }

  /**
   * Validera uniciteten och sätt stickprovets namn.
   *
   * Om namnet är giltigt, sätt det som nytt stickprovsnamn>
   * I annat fall, sätt ett felmeddelanden i vyfältet.
   *
   * @see #validateName
   * @private
   * @param {string} name Nytt stickprovsnamn.
   */
  #setName(name) {
    const view = this._view;
    try {
      this.#validateName('name', name);
      this.#originalName ??= this.#sample.name;
      this.#sample.name = name;
      name === this.#originalName && (this.#originalName = null);
    } catch (error) {
      view.name = error;
    }
  }

  /**
   * Uppdatera befintliga stickprov i aktuell kategori i vyn.
   *
   * Namnen visas i en lista där användaren kan sätta föregående steg i en
   * process.
   *
   * @private
   * @return {boolean}
   */
  #setPredecessors() {
    if (['screen', 'webpage'].includes(this.#sample.type)) {
      const category = this.#sample.category;
      const same = (s) => this.#sample.type === s.type;
      const samples = [...this.#audit.samples(category)].filter(same);
      const names = new Set(samples.map((sample) => sample.name));
      names.delete(this.#sample.originalName);
      names.delete(this.#sample.name);
      samples
        .map((s) => s.follows)
        .filter(Boolean)
        .forEach((n) => names.delete(n));
      for (const name of names) {
        if (this.#precedes(this.#sample.name, name, samples)) {
          names.delete(name);
        }
      }
      this.#sample.follows && names.add(this.#sample.follows);
      this._view.predecessors = Array.from(names).sort();
    }
    return true;
  }

  /**
   * Uppdatera förloppsindikatorn.
   *
   * @private
   */
  #setProgress() {
    this._view.setProgress(...this.#audit.auditProgress());
  }

  /**
   * Visa antalet slumpmässiga stickprov som återstår.
   *
   * @private
   */
  #setRandomCount() {
    const count = this.#audit.randomCount();
    const type = this.#case.service.type;
    const text = {
      app: { one: 'vy', other: 'vyer' },
      website: { one: 'sida', other: 'sidor' },
    }[type][new Intl.PluralRules('sv').select(count)];
    this._view.randomCount = `${count} ${text}`;
  }

  /**
   * Sätt sökväg i stickprovet.
   *
   * Om stickprovet är ett dokument, extrahera eventuell typ från sökvägen och
   * uppdatera formatfältet om det är tomt.
   *
   * @see #setValue
   * @see #updateDocumentFormat
   * @private
   * @param {string} url Ny sökväg.
   */
  #setURL(url) {
    this.#setValue('url', url);
    this.#updateDocumentFormat(url);
  }

  /**
   * Sätt ett fältvärde i aktuellt stickprov.
   *
   * Om värdet formaterats av stickprovsklassen, uppdatera fältet i vyn med
   * det formaterade värdet.
   *
   * @private
   * @param {string} viewField Fältnamn i vyn.
   * @param {string} value     Värde att sätta.
   */
  #setValue(viewField, value) {
    const field = { serviceType: 'service' }[viewField] ?? viewField;
    this.#sample[field] = value;
    if (this.#sample[field] !== value) {
      this._view[viewField] = this.#sample[field];
    }
  }

  /**
   * Uppdatera berörda stickprov om kopplingar ändrats för en komponent.
   *
   * Om användaren ändrat stickprovskopplingarna för en komponent, uppdatera
   * de berörda stickproven: lägg till eller ta bort komponenten.
   *
   * @private
   * @return {promise[]} En vektor med löften om sparade stickprov.
   */
  #updateConnections() {
    const tasks = [];
    for (const [id, flag] of this.#connections) {
      const sample = this.#audit.sample(Number(id));
      flag
        ? sample.addComponent(this.#sample)
        : sample.deleteComponent(this.#sample.id);
      tasks.push(this._model.setSample(sample));
    }
    return tasks;
  }

  /**
   * Uppdatera dokumentformat vid ifyllnad av sökväg.
   *
   * Om stickprovet är ett dokument och formatfältet är tomt när användaren
   * fyller i en sökväg, hämta format (filändelse) ur sökvägen och sätt den
   * som föreslaget format.
   *
   * @private
   * @param {string} url Angiven sökväg.
   */
  #updateDocumentFormat(url) {
    if ('document' !== this.#sample.type) return;
    if (this._view.format) return;
    if (!url) return;
    const suffix = url.replace(/[?#].*/, '').replace(/^.*\./, '');
    suffix && (this.#sample.format ??= suffix);
    if (suffix === this.#sample.format) {
      this._view.format = suffix;
    }
  }

  /**
   * Uppdatera eventuella referenser vid borttag av stickprov.
   *
   * On det borttagna stickprovet var en del av en process, uppdatera efter-
   * följande steg så att det kommer efter det borttagna stickprovets föregå-
   * ende steg.
   *
   * @private
   * @param {string} name Det borttagna stickprovets namn.
   * @return {boolean} `true` om en referent ändrats, annars `false`.
   */
  #updateReferencesOnDelete(name) {
    let changed = false;
    for (const sample of this.#audit.allSamples()) {
      if (name === sample.follows) {
        sample.follows = this.#sample.follows;
        changed = true;
      }
    }
    return changed;
  }

  /**
   * Uppdatera eventuella referenser vid namnbyte på stickprov.
   *
   * On det omdöpta stickprovet är en del av en process, uppdatera efterfölj-
   * ande steg så att det hänvisar till det nya namnet
   *
   * @private
   * @return {promise[]} En vektor med löften om sparade stickprov.
   */
  #updateReferencesOnNameChange() {
    const tasks = [];
    if (this.#originalName) {
      for (const sample of this.#audit.allSamples()) {
        if (this.#originalName === sample.follows) {
          sample.follows = this.#sample.name;
          tasks.push(this._model.setSample(sample));
        }
      }
    }
    return tasks;
  }

  /**
   * Uppdatera vyinnehållet efter ändring av stickprovstyp.
   *
   * - Populera om innehållstyper.
   * - Populera om komponenter.
   * - Populera om innehhållstyper för komponenter.
   * - Uppdatera dokumentformatet.
   *
   * @private
   */
  async #updateViewContent() {
    this._view.type = this.#sample.type;
    this.#component && (this._view.parentType = this.#sample.parentType);
    this.#contentCfg = await this.#loadContentConfig();
    await this.#addContentTypesToView();
    this._view.clearComponentList();
    this.#addComponentsToView();
    this.#addConnectionsToView();
    this.#updateDocumentFormat(this.#sample.url);
  }

  /**
   * Verifiera uniciteten hos ett stickprovsnamn.
   *
   * Alla stickprov, inklusive komponenter, måste ha ett unikt namn eftersom
   * namnet är lagringsnyckel i granskningen. Verifiera därför att det inte
   * redan finns ett stickprov med angivet namn och kasta ett undantag om det
   * gör det.
   *
   * @private
   * @param {string}  field       Fältnamn i vyn.
   * @param {string}  name        Namn att kontrollera.
   * @param {boolean} [component] Komponent?
   * @throws {ValidationError} Namnet används redan i granskningen.
   */
  #validateName(field, name, component = false) {
    const noun = component ? 'komponenten' : 'stickprovet';
    if (this.#audit.contains(name)) {
      const error = new ValidationError(
        `Det finns redan ett stickprov med namnet ”${name}”. ` +
          `Välj ett annat namn på ${noun}.`,
        name
      );
      this._view[field] = error;
      if (!component) throw error;
    }
  }

  /**
   * Verifiera att obligatoriska fält har ett värde i en stickprovsinstans.
   *
   * @private
   * @param {Sample} sample Stickprovsinstans att validera.
   * @throws {TypeError} Minst ett obligatoriskt fält saknar innehåll.
   */
  #validateSample(sample) {
    const fields = [];
    if ('' === sample.name) {
      fields.push('namn');
    }

    if ('service' === this.#sample.category && '' === sample.service) {
      fields.push('typ av tjänst');
    }

    if (fields.length > 0) {
      const pr = new Intl.PluralRules('sv');
      const req = { one: 'obligatoriskt', other: 'obligatoriska' };
      const adj = req[pr.select(fields.length)];
      throw new TypeError(`Fyll i ${adj} fält: ${fields}.`);
    }
  }
}

// Importera beroenden.
import {
  AppScreen,
  Component,
  NonWebDocument,
  Webpage,
} from '../model/sample.js';
import { Audit } from '../model/Audit.js';
import { ControllerBase } from './ControllerBase.js';
import { URLParameters } from './URLParameters.js';
import { ValidationError } from '../model/ValidationError.js';

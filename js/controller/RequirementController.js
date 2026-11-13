/**
 * Controller för granskning av ett krav i ett stickprov.
 *
 * @license CC-BY 4.0
 */
export class RequirementController extends ControllerBase {
  // Privata fält.
  #advanced;
  #audit;
  #case;
  #component = false;
  #dir;
  #dirty = false;
  #loader;
  #order;
  #requirement;
  #sampCfg;
  #sample;
  #tree;

  /**
   * Konstruera en controllerinstans.
   *
   * @param {Model}            model     Modellobjekt.
   * @param {ViewBase}         view      Vyinstans.
   * @param {ResourceLoader}   loader    Resursladdare.
   * @param {RequirementOrder} order     Kravordning.
   * @param {ConditionTree}    tree      Villkorsstruktur.
   * @param {object}           [globals] Globala objekt vid enhetstester.
   */
  constructor(model, view, loader, order, tree, globals = {}) {
    super(model, view, globals);
    this.#loader = loader;
    this.#order = order;
    this.#tree = tree;
  }

  /**
   * @inheritDoc
   * @override
   * @throws {TypeError} Stickprov eller krav saknas eller ogiltigt.
   */
  async prepare(context) {
    const pc = (n, e) => {
      if (!context[n]) throw new TypeError(e);
    };
    pc('sample', 'Ange stickprovsidentitet.');
    pc('requirement', 'Ange kravidentitet.');

    await this.#getModelEntities(context);
    this.#registerObservers();

    // Ladda stickprovskonfiguration.
    // Populera kravet med kontroller om det är tomt.
    // Initiera villkorsgrupper.
    this.#sampCfg = await this.#loadSampleConfig();
    this.#populateRequirement();
    this.#tree.configuration = this.#sampCfg;
    this.#tree.requirement = this.#requirement;
    this.#tree.build();
    this.#applyConditions();

    let auditCfg;
    if (this.#sampCfg.requirements[this.#requirement.id]?.pseudo) {
      // Pseudokrav: komponera sökväg för tillsynskatalog.
      this.#dir = this.#directory();
    } else {
      // Ladda granskningskonfigurationen för det här kravet.
      auditCfg = await this.#loadAuditConfig();
    }

    // Populera vyn och sätt sökvägar i navigeringskontrollerna.
    await this.#populateView(auditCfg);
    this.#setNavigationURLs();
  }

  /**
   * Sätt tillstånd för angiven singelkontroll.
   *
   * Metoden anropas från verktygsmoduler för att automatiskt godkänna eller
   * underkänna krav.
   *
   * Tillståndet anges som `true` för ”godkänt” eller `false` för ”underkänt”.
   *
   * @param {string}  id    Kontrollidentitet i konfigurationen.
   * @param {boolean} state Tillstånd att sätta.
   */
  setCheck(id, state) {
    const check = this.#requirement.check(id);
    check.failed = !state;
    check.observation ||= this.#sampCfg.checks[id]?.observation ?? '';
    this._view.setCheck(id, state);
    this._view.showFail(id, !state);
    this.#updateDependencies(id);
    this.#dirty = true;
  }

  /**
   * Lägg till länkstigen i vyn.
   *
   * @private
   * @param {string} current Namn på aktuellt krav.
   */
  #addBreadcrumbs(current) {
    const { breadcrumbs } = this._view;
    breadcrumbs.case(
      this.#case.id,
      this.#case.toString(),
      this.#case.organization.name,
      this.#case.service.name
    );
    breadcrumbs.audit(this.#audit.id, this.#audit.started);
    breadcrumbs.sample(this.#sample.id, this.#sample.name);
    breadcrumbs.current = current;
  }

  /**
   * Lägg till filterklasser i vyn.
   *
   * Lägg till filterklasser för operativsystem (appvy) eller format
   * (dokument).
   *
   * @private
   */
  #addFilters() {
    const fmt = this.#sample.format;
    const lc = (s) => s.toLowerCase();
    const os = this.#case.service.operatingSystem;

    os && this._view.addFilter(lc(os));
    fmt && this._view.addFilter(lc(fmt));
  }

  /**
   * Initiera villkorstillstånd.
   *
   * Uppdatera innehållets synlighet för alla toppnivåvillkor. Beräkna
   * manuella villkors initiala tillstånd utifrån de ingående kontrollernas
   * tillämplighet (aktiv gren innehåller tillämpliga kontroller).
   *
   * Markera kontroller som inte ingår i något villkor som tillämpliga.
   *
   * @private
   */
  #applyConditions() {
    // Uppdatera villkor.
    this.#tree.apply();

    // Markera ovillkorliga kontroller som tillämpliga.
    const chk = (c) => c && (c.applicable = true);
    const req = this.#requirement;
    const reqCfg = this.#sampCfg.requirements[req.id];
    (reqCfg?.checks ?? [])
      .filter((c) => 'check' in c)
      .forEach((c) => chk(req.check(c.check)));
  }

  /**
   * Komprimera JavaScript-kod.
   *
   * Avlägnsa ett initialt kommentarsblock och onödiga blanktecken.
   *
   * @private
   * @param {string} code Kod att komprimera.
   * @return {string}
   */
  #compact(code) {
    const trim = (c) => c.replace(/([,:;(){}+'])\s+/gm, (w, p) => p);
    return trim(code.replace(/\/\*.*?\*\//s, '')).trim();
  }

  /**
   * Generera information om källkrav för en härledd kontroll.
   *
   * Informationen visas tillsammans med kontrollen i vyn och inkluderar
   * kravavsnittsnummer, kravets status och titel samt sökvägen till redige-
   * ringssidan för kravet. Status är "pass", "fail" eller "unchecked".
   *
   * @private
   * @param {DerivedCheck} check Härledd kontroll.
   * @return {object[]} Vektor med objekt med avsnitt, status, titel, URL.
   */
  #derivedSources(check) {
    const sources = [];
    for (const id of check.sources) {
      const req = this.#sample.requirement(id);
      if (!req) continue; // Exkluderad pga filter.

      let { clause, state, title } = req;
      const status = state ? 'pass' : false === state ? 'fail' : 'unchecked';
      const url =
        '?page=requirement' +
        `&sample=${this.#sample.id}` +
        `&requirement=${id}`;

      /^\D/.test(clause) && (clause = '');
      sources.push({ clause, status, title, url });
    }
    return sources;
  }

  /**
   * Generera aktuell sökväg till tillsynskatalogen.
   *
   * Utgå från den sparade sökvägen i lagringsutrymmet och lägg till årtal och
   * granskningskatalog (ärendenummer och tjänstens namn).
   *
   * @private
   * @return {string}
   */
  #directory() {
    const audit = this.#audit.started.toLocaleDateString('sv');
    const cno = this.#case.caseNumber;
    const dir = this._model.caseDirectory ?? '';
    const name = this.#pathName(this.#case.service.name, true);
    const sep = -1 !== dir.indexOf('/') ? '/' : '\\';
    const year = cno.year;
    return `${dir}${sep}${year}${sep}${cno} ${name}${sep}${audit}`;
  }

  /**
   * HÄmta entiteter ur modellen.
   *
   * Hämta angivet stickprov ur modellen.
   * Hämta granskningen som anges av stickprovet.
   * Hämta ärendet som anges av granskningen.
   * Hämta eventuella komponenter som ingår i stickprovet.
   * Hämta kravet ur modellen.
   *
   * @private
   * @param {AppContext} context Applikationskontext.
   */
  async #getModelEntities(context) {
    const model = this._model;
    this.#sample = await model.getSample(context.sample);
    this.#sample.mode = model.advancedMode ? 'advanced' : 'simplified';
    this.#audit = await model.getAudit(this.#sample.auditID, true);
    this.#case = await model.getCase(this.#audit.caseID);
    for (const { id } of this.#sample.pending ?? []) {
      this.#audit.setSample(await model.getSample(id));
    }
    this.#audit.setSample(this.#sample);
    const req = this.#sample.requirement(context.requirement);
    this.#requirement = await model.getRequirement(req.key);
    this.#component = 'component' === this.#sample.type;
    this.#advanced = model.advancedMode && this.#case.monitoring;
    this.#sample.setRequirement(this.#requirement);
    await this.#order.build(this.#sample);
  }

  /**
   * Omvandla ett fältnamn till en identitet.
   *
   * Ersätt camelCase med bindestreck, så att "fooBar" blir "foo-bar".
   *
   * @private
   * @param {string} name Fältnamn.
   * @return {string}
   */
  #idFromName(name) {
    return name.replace(/[A-Z0-9]/g, (s) => `-${s.toLowerCase()}`);
  }

  /**
   * Hämta granskningskonfiguration från servern.
   *
   * @private
   * @return {object}
   * @throws {TypeError}
   */
  async #loadAuditConfig() {
    const reqID = this.#requirement.id;
    const type = this.#component ? this.#sample.parentType : this.#sample.type;
    const url = `requirements/${type}/${reqID}`;
    return this.#loader.configuration(url);
  }

  /**
   * Hämta stickprovsvkonfiguration från servern.
   *
   * Konfigurationen beror på typ av tjänst, typ av stickprov och vilka
   * innehållstyper stickprovet består av.
   *
   * @private
   * @return {object} Stickprovskonfiguration.
   */
  async #loadSampleConfig() {
    const reqID = this.#requirement.id;
    const type = this.#component ? this.#sample.parentType : this.#sample.type;
    let url = this.#component
      ? `requirements/${type}-component`
      : `requirements/${type}`;
    if (['app', 'screen'].includes(type)) {
      url += this.#sample.closed ? '-closed' : '-open';
    }
    return this.#loader.configuration(url);
  }

  /**
   * Importera en verktygsmodul och lägg till den i vyn.
   *
   * @private
   * @param {object} toolCfg Verktygskonfiguration.
   */
  async #moduleTool(toolCfg) {
    const params = Object.assign({}, toolCfg.params);
    const path = `tools/${toolCfg.module}.js`;
    params.controller = this;
    params.model = this._model;
    try {
      const module = await this.#loader.loadModule(path);
      this._view.moduleTool(module, params);
    } catch (err) {
      console.warn(err);
    }
  }

  /**
   * Uppdatera förutsättning i en kontroll när användaren gjort ett val.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  #onCondition(event) {
    const { value } = event;
    const matches = /^(.+?)\.cond$/.exec(event.target);
    const condID = this.#idFromName(matches[1]);
    const condition = this.#tree.get(condID);
    condition.state = 'yes' === value;
    for (const branch of ['yes', 'no']) {
      const applicable = branch === value;
      if (condition.hasBranch(branch)) {
        this._view.showGroup(`${condID}--${branch}`, applicable);
      }
    }
  }

  /**
   * Uppdatera extern notering i ett krav när användaren ändrat värdet.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  #onExtNote(event) {
    this.#requirement.externalNote = event.value;
  }

  /**
   * Uppdatera intern notering i ett krav när användaren ändrat värdet.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  #onIntNote(event) {
    this.#requirement.internalNote = event.value;
  }

  /**
   * Uppdatera en multipelkontroll när användaren godkänt eller underkänt.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  #onMultipleCheck(event) {
    const matches = /^(.+?)\[(\d+)\]\.check$/.exec(event.target);
    const chkID = this.#idFromName(matches[1]);
    const index = Number(matches[2]);
    const check = this.#requirement.check(chkID);
    check.fail(index, 'fail' === event.value);
    check.observation ||= this.#sampCfg.checks[chkID]?.observation ?? '';
    this._view.showFail(chkID, true === check.failed);
    check.failed && (this.#requirement.approved = false);
    this.#updateDependencies(chkID);
  }

  /**
   * Uppdatera observation i en kontroll när användaren ändrat värdet.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  #onObservation(event) {
    const matches = /^(.+?)\.obs$/.exec(event.target);
    const chkID = this.#idFromName(matches[1]);
    const check = this.#requirement.check(chkID);
    check.observation = event.value;
  }

  /**
   * Uppdatera textalternativ till skärmavbildning vid ändrat värde.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  #onScreenshotAlt(event) {
    const matches = /^(.+?)\.alt/.exec(event.target);
    const chkID = this.#idFromName(matches[1]);
    const check = this.#requirement.check(chkID);
    check.setScreenshot(check.screenshot.path, event.value);
  }

  /**
   * Uppdatera sökväg till skärmavbildning i en kontroll vid ändrat värde.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  #onScreenshotPath(event) {
    const matches = /^(.+?)\.path/.exec(event.target);
    const chkID = this.#idFromName(matches[1]);
    const check = this.#requirement.check(chkID);
    check.setScreenshot(event.value, check.screenshot.alt);
  }

  /**
   * Uppdatera en singelkontroll när användaren godkänt eller underkänt.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  #onSingleCheck(event) {
    const fail = 'fail' === event.value;
    const matches = /^(.+?)\.check$/.exec(event.target);
    const chkID = this.#idFromName(matches[1]);
    const check = this.#requirement.check(chkID);
    check.failed = fail;
    check.observation ||= this.#sampCfg.checks[chkID]?.observation ?? '';
    this._view.showFail(chkID, fail);
    check.failed && (this.#requirement.approved = false);
    this.#updateDependencies(chkID);
  }

  /**
   * Observatör som anropas vid händelser i vyn.
   *
   * Uppdatera krav- och kontrollinformation i aktuellt stickprov.
   *
   * @private
   * @param {object} event Händelseinformation.
   */
  #onViewEvent(event) {
    if ('change' !== event.type) return;
    if (this.#audit.finished) return;

    const action = [
      [/\.alt$/, (e) => this.#onScreenshotAlt(e)],
      [/\[\d+\]\.check$/, (e) => this.#onMultipleCheck(e)],
      [/\.check$/, (e) => this.#onSingleCheck(e)],
      [/\.cond$/, (e) => this.#onCondition(e)],
      [/^externalNote$/, (e) => this.#onExtNote(e)],
      [/^internalNote$/, (e) => this.#onIntNote(e)],
      [/\.obs$/, (e) => this.#onObservation(e)],
      [/\.path$/, (e) => this.#onScreenshotPath(e)],
    ].find(([match]) => match.test(event.target));
    if (action) {
      const [, handle] = action;
      handle(event);
      this.#dirty = true;
    }
  }

  /**
   * Omvandla en sträng till ett tillåtet sökvägsnamn.
   *
   * Ersätt tecken som inte får ingå i namn på filer och kataloger med
   * bindestreck. För filnamn, ersätt även blanktecken och omvandla bokstäver
   * till gemener.
   *
   * @example
   * Fil:     " Foo:  [Bar/Baz] "  -->  "foo-bar-baz"
   * Katalog: " Foo: {Bar\Baz}  "  -->  "Foo Bar-Baz"
   *
   * @private
   * @param {string}  name  Stickprovsnamn.
   * @param {boolean} [dir] Katalog?
   * @return {string}
   */
  #pathName(name, dir = false) {
    let chars = '\\][{}:/\\\\*?';
    dir || (chars += ' ');
    const pattern = new RegExp(`[${chars}]+`, 'g');
    let path = name.trim().replace(pattern, '-').replace(/^-|-$/g, '');
    dir || (path = path.toLowerCase());
    return path;
  }

  /**
   * Populera angiven kravinstans med en kontroll.
   *
   * @private
   * @param {string}      chkID       Kontrollidentitet.
   * @param {object}      chkCfg      Kontrollkonfiguration.
   * @param {Requirement} requirement Kravinstans.
   * @throws {TypeError} Kontrollen finns inte i konfigurationen, eller saknar
   *                     beskrivningstext.
   */
  #populateCheck(chkID, chkCfg, requirement) {
    if (undefined === chkCfg) {
      console.error(`Kontroll '${chkID}' saknas i konfigurationen.`);
      throw new TypeError('En kontroll saknas i konfigurationen.');
    }
    if (!('texts' in chkCfg) || 0 === chkCfg.texts.length) {
      console.error(`Ogiltig kontroll '${chkID}': 'texts' saknas.`);
      throw new TypeError('Ogiltig kontroll i konfigurationen.');
    }

    const reqID = this.#requirement.id;
    if ('sources' in chkCfg) {
      const check = new DerivedCheck();
      check.sample = this.#sample;
      for (const id of chkCfg['sources']) {
        check.dependsOn(id);
      }
      check.global = chkCfg.global ?? false;
      check.id = chkID;
      check.observation = chkCfg.observation ?? '';
      requirement.setCheck(check);
      this.#dirty = true;
    } else {
      let check;
      if (chkCfg.texts.length > 1) {
        check = new MultipleCheck(chkCfg.texts.length);
      } else {
        check = new SingleCheck();
      }
      check.id = chkID;
      check.observation = chkCfg.observation ?? '';
      requirement.setCheck(check);
    }
  }

  /**
   * Populera angiven kravinstans med ett villkor.
   *
   * @private
   * @param {object}      sampCfg     Stickprovskonfiguration.
   * @param {string}      condID      Villkorsidentitet.
   * @param {Requirement} requirement Kravinstans.
   * @throws {TypeError} Villkoret finns inte i konfigurationen.
   */
  #populateCondition(sampCfg, condID, requirement) {
    const condCfg = sampCfg.conditions[condID];
    if (undefined === condCfg) {
      console.error(`Villkor '${condID}' saknas i konfigurationen.`);
      throw new TypeError('Ett villkor saknas i konfigurationen.');
    }
    for (const branch of ['yes', 'no']) {
      for (const chkCfg of condCfg[branch] ?? []) {
        if ('condition' in chkCfg) {
          this.#populateCondition(sampCfg, chkCfg.condition, requirement);
        } else if ('check' in chkCfg) {
          this.#populateCheck(
            chkCfg.check,
            sampCfg.checks[chkCfg.check],
            requirement
          );
        } else {
          console.warn(
            `config: check/condition saknas för villkor'${condID}'.`
          );
        }
      }
    }
  }

  /**
   * Populera ett krav i stickprovet med kontroller.
   *
   * Populera aktuellt krav med kontroller utifrån konfigurationen, om kravet
   * saknar kontroller. Bygg upp controllerns interna gruppstruktur för kon-
   * troller för att kunna aktivera och avaktivera villkorsstyrda kontroller.
   *
   * Kontroller kan vara singlekontroller (fristående kontroll med tillhörande
   * observation) eller multipelkontroller (alternativa kontroller, varav
   * minst en behöver vara uppfylld, med en gemensam observation). En eller
   * flera kontroller kan också grupperas med ett villkor (förutsättning). Om
   * förutsättningen inte är markerad som uppfylld är kontrollerna i gruppen
   * inte tillämpliga och ska inte visas.
   *
   * @private
   * @throws {TypeError} Aktuellt krav saknas i konfigurationen.
   */
  #populateRequirement() {
    if (this.#audit.finished) return;
    if (this.#requirement.hasChecks) return;

    const reqID = this.#requirement.id;
    const reqCfg = this.#sampCfg.requirements[reqID];
    if (undefined === reqCfg) {
      throw new TypeError(`Krav-id '${reqID}' saknas i konfigurationen.`);
    }

    for (const chkCfg of reqCfg.checks) {
      if ('condition' in chkCfg) {
        this.#populateCondition(
          this.#sampCfg,
          chkCfg.condition,
          this.#requirement
        );
      } else if ('check' in chkCfg) {
        const cfg = this.#sampCfg?.checks[chkCfg.check];
        this.#populateCheck(chkCfg.check, cfg, this.#requirement);
      } else {
        console.warn(`config: saknar check/condition i '${reqID}'.`);
        console.debug(reqCfg);
      }
    }
  }

  /**
   * Populera vyn med kravinformation och modelldata.
   *
   * Sätt dokumenttitel och sidrubrik.
   *
   * Populera avsnittet med granskningsmetoder, undantag, exempel, kontroller,
   * verktyg, länkar, detaljinformation, tillämpningsanvisning och referens
   * utifrån innehållet i krav- och granskningskonfigurationerna.
   *
   * För varje villkor och kontroll, sätt tillstånd för vyns kontroller samt
   * innehåll i observationsfält utifrån kontrollerna i aktuellt stickprov.
   *
   * Uppdatera också fälten för extern och intern notering med värden från
   * kravet.
   *
   * @private
   * @param {object} [auditCfg] Granskningskonfiguration.
   */
  async #populateView(auditCfg) {
    const reqID = this.#requirement.id;
    const reqCfg = this.#sampCfg.requirements[reqID] ?? {};
    const pseudo = reqCfg?.pseudo ?? false;
    const requirement = this.#requirement;
    const title = this.#title(reqID);
    const view = this._view;
    view.title = title;
    view.heading = title;
    this.#addBreadcrumbs(title);
    view.setAuditLink(
      `?page=audit&audit=${this.#audit.id}`,
      this.#audit.toString()
    );
    view.setSampleInfo(this.#sample.name, this.#sample.url);
    this.#setProgress();
    this.#addFilters();
    if (auditCfg) {
      this.#showMethods(auditCfg);
      view.exceptions(auditCfg.exceptions ?? []);
      view.examples(auditCfg.examples ?? []);
    }
    view.readOnly = null !== this.#audit.finished;
    for (const chkCfg of reqCfg.checks ?? []) {
      if ('condition' in chkCfg) {
        this.#showCondition(requirement, chkCfg.condition, pseudo);
      } else if ('check' in chkCfg) {
        this.#showCheck(requirement, chkCfg.check, pseudo);
      }
    }
    if (auditCfg) {
      await this.#showTools(auditCfg);
      this.#showLinks(auditCfg);
      this.#showInfo(view, auditCfg.info ?? []);
      this.#showInstruction(auditCfg);
      view.reference(requirement.clause);
      view.externalNote = requirement.externalNote;
    } else {
      view.removeExternalNote();
    }
    view.internalNote = requirement.internalNote;
  }

  /**
   * Registrera observatörer för interaktion.
   *
   * Registrera en observatör för vyhändelser och en åtgärdshanterare för
   * spara.
   *
   * @private
   */
  #registerObservers() {
    this._view.subscribe((e) => this.#onViewEvent(e));

    const save = () => {
      if (this.#dirty && !this.#audit.finished) {
        this._model.setRequirement(this.#requirement);
        /* borttaget på begäran 2022-11-10
                this._context.status = `”${this.#requirement.title}” sparad.`;
                */
      }
    };
    this._action('skip', save);
    this._action('next', save);
    this._action('prev', save);
    this._action('up', save);
  }

  /**
   * Ersätt platshållare med verkliga data.
   *
   * För pseudokrav kan kontrolltexten innehålla platshållare som ska bytas ut
   * mot verkliga data innan de visas för användaren. Platshållare omges av
   * procenttecken (%):
   * - %dir%   ersätts av sökvägen till aktuell tillsynskatalog
   * - %file%  ersätts med filnamn (sista komponenten i en URL)
   * - %name%  ersätts med sticprovsnamnet utan otillåtna tecken.
   *
   * @private
   * @param {string} str Sträng att ersätta platshållare i.
   * @return {string}
   */
  #replacePlaceholders(str) {
    const dir = (n) => n.replace('%dir%', this.#dir);
    const file = (n) => n.replace('%file%', url ?? path);
    const last = (u) => u?.replace(/^.*\//, '');
    const name = (n) => n.replace('%name%', path);
    const path = this.#pathName(this.#sample.name);
    const root = (u) => u?.replace(/[?#].*/, '');
    const url = root(last(this.#sample.url));
    return name(file(dir(str)));
  }

  /**
      Sätt sökvägar för navigeringsknapparna i vyn.
     *
     * @see RequirementOrder
     * @private
     */
  #setNavigationURLs() {
    const next = this.#order.next(this.#requirement.id);
    const params = new URLParameters();
    params.add('sample', String(this.#sample.id));
    const page = `?page=requirement&${params}`;
    const prev = this.#order.previous(this.#requirement.id);
    const skip = this.#order.skip(this.#requirement.id);
    const title = (i) => (i ? titleOf(i) : null);
    const titleOf = (i) => this.#sampCfg.requirements[i]?.title ?? '?';
    const url = (i, p) => (i ? `${page}&requirement=${i}` : null);
    const view = this._view;

    view.setSample(`?page=sample&${params}`, this.#sample.name);
    view.setPrevious(url(prev), title(prev));
    view.setSkip(url(skip), title(skip));

    if (next) {
      view.setNext(url(next), title(next));
    } else {
      view.setNext(
        `?page=audit&audit=${this.#audit.id}`,
        this.#audit.toString()
      );
    }
  }

  /**
   * Uppdatera förloppsindikatorn.
   *
   * @private
   */
  #setProgress() {
    const [done, total] = this.#sample.progress();
    const labels = { one: 'krav granskat', other: 'krav granskade' };
    const pr = new Intl.PluralRules('sv');
    const label = `${done} av ${total} ${labels[pr.select(done)]}`;
    this._view.setProgress(done, total, label);
  }

  /**
   * Visa en bookmarklet i vyn.
   *
   * En bookmarklet är en länk vars URL är JavaScript-kod. Användaren kan dra
   * länken till bokmärkesraden i webbläsaren för att installera skriptet som
   * ett bokmärke.
   *
   * @private
   * @param {object} toolCfg Verktygskonfiguration.
   */
  async #showBookmarklet(toolCfg) {
    const path = `tools/${toolCfg.file}.js`;
    const code = await this.#loader.resource(path);
    this._view.bookmarklet(toolCfg.title, this.#compact(code));
  }

  /**
   * Visa en kontroll i vyn.
   *
   * @private
   * @param {Requirement} requirement Kravinstans.
   * @param {string}      chkID       Kontrollidentitet.
   * @param {boolean}     pseudo      Pseudokrav?
   * @param {*}           [group]     Grupparameter från vyn.
   */
  #showCheck(requirement, chkID, pseudo, group = null) {
    const check = requirement.check(chkID);
    if (!check) return; // Konfig. ändrad efter att ärendet skapats.
    const chkCfg = this.#sampCfg.checks[chkID];
    if (undefined === chkCfg) {
      console.warn(`Kontroll '${chkID}' saknas i konfigurationen.`);
      return;
    }
    let checkStates;
    let sources = null;
    if ('sources' in chkCfg) {
      checkStates = [
        [check.applicable ? check.state : undefined, chkCfg.texts[0]],
      ];
      this.#dirty = true; // Spara alltid krav med härledda kontroller.
      sources = this.#derivedSources(check);
    } else {
      const state = (v) => (undefined === v ? v : !v);
      const texts = chkCfg.texts ?? [];
      checkStates =
        1 === texts.length
          ? [[check.state, texts[0]]]
          : texts.map((t, i) => [state(check.fails(i)), t]);
      if (pseudo) {
        const xlate = (n) => this.#replacePlaceholders(n);
        checkStates = checkStates.map(([s, t]) => [s, xlate(t)]);
      }
    }
    const reusable = this.#audit.observations(
      this.#sample,
      requirement.id,
      chkID
    );
    this._view.check(
      chkID,
      checkStates,
      chkCfg.exceptions ?? [],
      check.observation ?? chkCfg.observation,
      reusable,
      check.screenshot?.path ?? null,
      check.screenshot?.alt ?? null,
      group,
      sources
    );
  }

  /**
   * Visa ett villkor med tillhörande kontroller i vyn.
   *
   * @private
   * @param {Requirement} requirement Kravinstans.
   * @param {string}      condID      Villkorsidentitet.
   * @param {boolean}     pseudo      Pseudokrav?
   * @param {*}           [parent]    Överordnad grupparameter från vyn.
   */
  #showCondition(requirement, condID, pseudo, parent = null) {
    const condCfg = this.#sampCfg.conditions[condID];
    const condition = this.#tree.get(condID);
    const state = condition.state;
    const view = this._view;
    if (undefined === condCfg) {
      console.warn(`Villkor '${condID}' saknas i konfigurationen.`);
      return;
    }
    if ('precondition' in condCfg) {
      view.condition(condID, state, condCfg.precondition, parent);
    }
    for (const branch of ['yes', 'no']) {
      if (!(branch in condCfg)) continue;
      const visible = ('yes' === branch) === state;
      const group = view.group(`${condID}--${branch}`, visible, parent);
      for (const chkCfg of condCfg[branch] ?? []) {
        if ('condition' in chkCfg) {
          this.#showCondition(requirement, chkCfg.condition, pseudo, group);
        } else if ('check' in chkCfg) {
          this.#showCheck(requirement, chkCfg.check, pseudo, group);
        }
      }
    }
  }

  /**
   * Visa ett utfällbart informationsavsnitt i vyn.
   *
   * Detta kan i sin tur innehålla informationsobjekt av samma typer som det
   * övergripande detaljinformationsavsnittet och läggs till med samma metod.
   *
   * @private
   * @param {object} container Informationsbehållare.
   * @param {object} config    Detaljkonfiguration.
   */
  #showDetails(container, config) {
    const details = container.createDetails(config.summary);
    this.#showInfo(details, config.content);
  }

  /**
   * Visa verktygsinformation om Inspektören i vyn.
   *
   * Inspektören är webbläsarens inbyggda utvecklarverktyg som vanligen kan
   * visa DOM-trädet, CSS-regler, nätverksaktivitet, lokal lagring, med mera.
   *
   * @private
   * @param {object} toolCfg Verktygskonfiguration.
   */
  #showDevTool(toolCfg) {
    this._view.devTool(
      toolCfg.tab,
      toolCfg.pane,
      toolCfg.properties ?? [],
      toolCfg['function'],
      toolCfg.help
    );
  }

  /**
   * Visa en figur i vyn.
   *
   * Detta kan i sin tur innehålla informationsobjekt av samma typer som det
   * övergripande detaljinformationsavsnittet och läggs till med samma metod.
   *
   * @private
   * @param {object} container Informationsbehållare.
   * @param {object} config    Detaljkonfiguration.
   */
  #showFigure(container, config) {
    const figure = container.createFigure();
    this.#showInfo(figure, config.content);
    config.caption && figure.caption(config.caption);
  }

  /**
   * Visa avsnittet "mer information" i vyn.
   *
   * Avsnittet kan bestå av flera olika delar, var och en med en specifik
   * konfiguration.
   *
   * @private
   * @param {object}   container Informationsbehållare.
   * @param {object[]} config    Konfiguration.
   */
  #showInfo(container, config) {
    for (const partCfg of config) {
      const action = {
        action: (p) => container.action(p.text),
        definition: (p) => container.definition(p.term, p.description),
        details: (p) => this.#showDetails(container, p),
        figure: (p) => this.#showFigure(container, p),
        image: (p) => container.image(p.path, p.alt),
        note: (p) => container.note(p.text),
        olist: (p) => container.oList(p.items),
        table: (p) => container.table(p.headers, p.rows),
        text: (p) => container.text(p.text),
        tip: (p) => container.tip(p.text),
        ulist: (p) => container.uList(p.items),
        warning: (p) => container.warning(p.text),
      }[partCfg.type];
      if (undefined === action) {
        console.warn(`Okänd innehållstyp: '${partCfg.type}'.`);
      } else {
        const filters = partCfg.filters ?? [];
        filters.forEach((f) => container.pushFilter(f));
        action(partCfg);
        filters.forEach((f) => container.popFilter(f));
      }
    }
  }

  /**
   * Visa en tillämpningsanvisning i vyn.
   *
   * @private
   * @param {object} auditCfg Granskningskonfiguration.
   */
  #showInstruction(auditCfg) {
    if ('instruction' in auditCfg) {
      const { id, title } = auditCfg.instruction;
      this._view.instruction(id, title);
    }
  }

  /**
   * Visa relaterade länkar i vyn.
   *
   * Lägg till varje relaterad länk från kravkonfigurationen. Om det inte
   * finns någon relaterad länk, ta bort avsnittet ur vyn.
   *
   * @private
   * @param {object} auditCfg Granskningskonfiguration.
   */
  #showLinks(auditCfg) {
    for (const link of auditCfg.links ?? []) {
      this._view.link(link.url, link.title);
    }
  }

  /**
   * Visa metoder eller steg i vyn.
   *
   * Kravkonfigurationen kan innehålla en eller flera metodbeskrivningar eller
   * en lista med granskningssteg.
   *
   * @private
   * @param {object} auditCfg Granskningskonfiguration.
   */
  #showMethods(auditCfg) {
    if ('methods' in auditCfg) {
      this._view.methods(auditCfg.methods);
    } else if ('steps' in auditCfg) {
      this._view.steps(auditCfg.steps);
    }
  }

  /**
   * Visa verktygsinformation i vym.
   *
   * Granskningskonfigurationen kan innehålla en vektor med verktygsinforma-
   * tion. För varje verktyg, lägg till informatioen i vyn.
   *
   * @private
   * @param {object} auditCfg Granskningskonfiguration.
   */
  async #showTools(auditCfg) {
    const view = this._view;
    for (const toolCfg of auditCfg.tools ?? []) {
      const action = {
        bookmarklet: (t) => this.#showBookmarklet(t),
        DevTool: (t) => this.#showDevTool(t),
        external: (t) => view.externalTool(t.text),
        module: (t) => this.#moduleTool(t),
        WAVE: (t) => this.#showWAVE(t),
        WebDeveloper: (t) => view.webDeveloper(t.tab, t['function']),
      }[toolCfg.tool];
      if (undefined === action) {
        console.warn(`Okänt verktyg: '${toolCfg.tool}'.`);
      } else {
        await action(toolCfg);
      }
    }
  }

  /**
   * Visa verktygsinformation om WAVE i vyn.
   *
   * @private
   * @param {object} toolCfg Verktygskonfiguration.
   */
  #showWAVE(toolCfg) {
    const wave = this._view.createWAVE();
    if ('absent' in toolCfg) {
      wave.absent(
        toolCfg.absent.tab,
        toolCfg.absent.section,
        toolCfg.absent.texts ?? [toolCfg.absent.text],
        toolCfg.absent.icon ?? null
      );
    }
    if ('present' in toolCfg) {
      wave.present(
        toolCfg.present.tab,
        toolCfg.present.section,
        toolCfg.present.texts ?? [toolCfg.present.text],
        toolCfg.present.icon ?? null
      );
    }
    if ('tab' in toolCfg) {
      wave.tab(toolCfg.tab);
    }
  }

  /**
   * Hämta sidtiteln ur konfigurationen.
   *
   * Leta efter kravet med angiven identitet och returnera dess titel.
   *
   * @private
   * @param {string} reqID Kravidentitet.
   * @return {string}
   */
  #title(reqID) {
    return this.#sampCfg.requirements[reqID]?.title ?? 'Okänt krav';
  }

  /**
   * Uppdatera tillståndet i vyn för härledda kontroller.
   *
   * Metoden anropas när en kontroll ändrat tillstånd. Om det finns härledda
   * kontroller som är berende av det krav som den ändrade kontroller ingår i
   * behöver vyn uppdateras.
   *
   * @private
   * @param {string} chkID Identitet för den ändrade kontrollen.
   */
  #updateDependencies(chkID) {
    const show = (i, b, v) => this._view.showGroup(`${i}--${b}`, v);
    for (const condition of this.#tree.update(chkID)) {
      const has = (b) => condition.hasBranch(b);
      const showIf = (i, b, v) => has(b) && show(i, b, v);
      const state = !condition.disabled && condition.state;
      const visible = (b) => ('yes' === b) === state;
      ['yes', 'no'].forEach((b) => showIf(condition.id, b, visible(b)));
    }
  }
}

// Importera beroenden.
import { DerivedCheck, MultipleCheck, SingleCheck } from '../model/check.js';
import { ControllerBase } from './ControllerBase.js';
import { URLParameters } from './URLParameters.js';

/**
 * Vy för redigering av ärendeinformation.
 *
 * Vyn används för att redigera uppgifter om tillsynsärenden.
 *
 * @license CC-BY 4.0
 * @property {string}   abbr        Förkortning för aktörs namn.
 * @property {string}   access      Åtkomst (extranät/intranät/publik).
 * @property {string}   addr        Aktörens postadress.
 * @property {string}   appOS       Operativsystem för app.
 * @property {boolean}  auth        Kräver autentisering?
 * @property {string}   caseNumber  Ärendenummer.
 * @property {string}   caseType    Ärendetyp (anmälan/övervakning).
 * @property {date}     date        Beslutsdatunm.
 * @property {string}   email       Aktörens e-postadress.
 * @property {string}   org         Aktörens namn.
 * @property {string}   regNo       Aktörens organisationsnummer.
 * @property {string}   schedule    Ärendenummer för tillsynsplan.
 * @property {object[]} schedules   Tillsynsplanlista.
 * @property {string}   service     Tjänstens namn.
 * @property {string}   serviceType Typ av tjänst (mobil applikation/webbplats.
 * @property {string}   supervisor  Tillsynsansvarigs e-postadress.
 * @property {object[]} supervisors Tillsynsansvariglista.
 * @property {string}   tel         Aktörens telefonnummer.
 */
export class CaseEditView extends ViewBase {
  // Privata fält.
  #caseType = 'monitoring';
  #conditions;
  #ignore;
  #invalid;
  #serviceType = 'website';
  #tabs;
  #timer;

  /**
   * Konstruera en vyinstans.
   *
   * @param {BreadcrumbTrail}   breadcrumbs Länkstig.
   * @param {EventListenerList} listeners   Händelselyssnarlista.
   * @param {ResourceLoader}    loader      Resursladdare.
   * @param {TabList}           tabs        Tabbflikslista.
   * @param {ViewCondition}     conditions  Villkorsstyrning.
   * @param {Document}          [doc]       DOM-dokument vid enhetstester.
   */
  constructor(
    breadcrumbs,
    listeners,
    loader,
    tabs,
    conditions,
    doc = document
  ) {
    super('case-edit', 'Ärende', breadcrumbs, listeners, loader, doc);
    this._confirmID = 'confirm-dialog';
    this.#conditions = conditions;
    this.#tabs = tabs;
  }

  // Åtkomstmetoder för organisationsförkortning.
  get abbr() {
    return this._form.abbr.value;
  }

  set abbr(abbr) {
    this._form.abbr.value = abbr;
  }

  // Åtkomstmetoder för åtkomsttyp för webbplatser.
  get access() {
    return this._form.access.value;
  }

  set access(type) {
    this._form.access.value = type;
  }

  /**
   * @inheritDoc
   */
  activate() {
    super.activate();
    this._listeners.add(
      this._form,
      'invalid',
      (e) => this.#showErrorPanel(e),
      true
    );
  }

  // Åtkomstmetoder för aktörens postadress.
  get addr() {
    return this._form.addr.value;
  }

  set addr(addr) {
    this._form.addr.value = addr;
  }

  // Åtkomstmetoder för en mobil applikations operativsystem.
  get appOS() {
    return this._form.appOS.value;
  }

  set appOS(os) {
    this._form.appOS.value = os;
  }

  // Åtkomstmetoder för autentiseringsflaggan.
  get auth() {
    return this._form.auth.checked;
  }

  set auth(flag) {
    this._form.auth.checked = flag;
  }

  // Åtkomstmetoder för ärendenummer.
  get caseNumber() {
    return this._form.caseNumber.value;
  }

  set caseNumber(num) {
    if (num instanceof ValidationError) {
      this._form.caseNumber.value = num.value;
      this._form.caseNumber.setCustomValidity(num.message);
    } else {
      this._form.caseNumber.value = num;
    }
  }

  // Åtkomstmetoder för ärendetyp.
  get caseType() {
    return this._form.caseType.value;
  }

  set caseType(type) {
    this._form.caseType.value = this.#caseType = type;
    this.#conditions.apply();
  }

  /**
   * @inheritDoc
   */
  close() {
    this.#conditions.disconnect();
    this.#tabs.detach();
    super.close();
  }

  // Åtkomstmetoder för beslutsdatum för anmälningsärende.
  get date() {
    return this._form.date.valueAsDate;
  }

  set date(date) {
    const dv = (d) => d?.toLocaleDateString('sv') ?? '';
    if (date instanceof ValidationError) {
      this._form.date.value = dv(date.value);
      this._form.date.setCustomValidity(date.message);
    } else {
      this._form.date.value = dv(date);
    }
  }

  /**
   * Avaktivera radioknappen för övervakningsärende.
   */
  disableMonitoring() {
    const caseType = this._form.caseType;
    for (const rb of caseType) {
      if ('monitoring' === rb.value) {
        rb.disabled = true;
      }
    }
    caseType.value = 'complaint';
  }

  /**
   * Avaktivera Ta bort-knappen.
   */
  disableRemove() {
    this._form.querySelector('button[value="delete"]').disabled = true;
  }

  // Åtkomstmetoder för aktörens e-postadress.
  get email() {
    return this._form.email.value;
  }

  set email(addr) {
    if (addr instanceof ValidationError) {
      this._form.email.value = addr.value;
      this._form.email.setCustomValidity(addr.message);
    } else {
      this._form.email.value = addr;
    }
  }

  /**
   * @inheritDoc
   */
  async open() {
    await super.open();
    const selector = '[role="tablist"] button';
    this.#tabs.attach(this._article.querySelectorAll(selector));
    this.#conditions.observe(this._form, this._article);
  }

  // Åtkomstmetoder för aktörens namn.
  get org() {
    return this._form.org.value;
  }

  set org(name) {
    this._form.org.value = name;
  }

  // Åtkomstmetoder för aktörens organisationsnummer.
  get regNo() {
    return this._form.regNo.value;
  }

  set regNo(num) {
    if (num instanceof ValidationError) {
      this._form.regNo.value = num.value;
      this._form.regNo.setCustomValidity(num.message);
    } else {
      this._form.regNo.value = num;
    }
  }

  // Åtkomstmetoder för tillsynsplanens ärendenummer vid övervakning.
  get schedule() {
    return this._form.schedule.value;
  }

  set schedule(num) {
    this._form.schedule.value = num;
  }

  // Populera listan med tillsynsplaner.
  set schedules(periods) {
    this.#setSelect('schedule', periods);
  }

  // Åtkomstmetoder för tjänstens namn.
  get service() {
    return this._form.service.value;
  }

  set service(name) {
    this._form.service.value = name;
  }

  // Åtkomstmetoder för typ av tjänst (mobil applikation/webbplats).
  get serviceType() {
    return this._form.serviceType.value;
  }

  set serviceType(type) {
    this._form.serviceType.value = this.#serviceType = type;
    this.#conditions.apply();
  }

  // Åtkomstmetoder för tillsynsansvarigs e-postadress vid anmälan.
  get supervisor() {
    return this._form.supervisor.value;
  }

  set supervisor(email) {
    this._form.supervisor.value = email;
  }

  // Populera listan med tillsynsansvariga.
  set supervisors(names) {
    this.#setSelect('supervisor', names);
  }

  // Åtkomstmetoder för aktörens telefonnummer.
  get tel() {
    return this._form.tel.value;
  }

  set tel(num) {
    if (num instanceof ValidationError) {
      this._form.tel.value = num.value;
      this._form.tel.setCustomValidity(num.message);
    } else {
      this._form.tel.value = num;
    }
  }

  /**
   * Sätt värde i en radiogrupp som påverkar andra fält.
   *
   * Visa/dölj och aktivera/avaktivera fält beroende på värde.
   *
   * @private
   * @param {string} name     Radiogruppens namn.
   * @param {string} oldValue Nuvarande värde.
   * @param {string} newValue Värde att sätta.
   * @return {string} Det nya värdet.
   */
  // TODO REMOVE
  #setRadioGroup(name, oldValue, newValue) {
    const group = this._form[name];
    group.value = newValue;
    if (oldValue === newValue) return newValue;

    const disable = (field) => (field.disabled = true);
    const enable = (field) => (field.disabled = false);

    this._form.querySelectorAll(`.only.${oldValue}`).forEach((parent) => {
      // Växla filtervärde.
      parent.classList.toggle(oldValue, false);
      parent.classList.toggle(newValue, true);

      // Aktivera/deaktivera fält.
      parent.querySelectorAll(`.req-${oldValue}`).forEach(disable);
      parent.querySelectorAll(`.req-not-${newValue}`).forEach(disable);
      parent.querySelectorAll(`.req-${newValue}`).forEach(enable);
      parent.querySelectorAll(`.req-not-${oldValue}`).forEach(enable);
    });
    return newValue;
  }

  /**
   * Populera rullgardinslistan med tillsynsplaner.
   *
   * @private
   * @param {object[]} periods Tillsynsperioder.
   */
  #setSchedules(periods) {
    const select = $F('case-schedule');
    while (select.length > 1) {
      select.remove(1);
    }
    periods.forEach(({ label, value }) =>
      select.appendChild(new Option(label, value))
    );
  }

  /**
   * Populera en rullgardinslista.
   *
   * @private
   * @param {string}   name          Rullgardinslistans namn eller identitet.
   * @param {object[]} items         Elementvektor.
   * @param {string}   items[].label Ledtext.
   * @param {string}   items[].value Värde.
   */
  #setSelect(name, items) {
    const select = this._form[name];
    while (select.length > 1) {
      select.remove(1);
    }
    items.forEach(({ label, value }) =>
      select.appendChild(new Option(label, value))
    );
  }

  /**
   * Visar tabbpanelen med första valideringsfelet.
   *
   * Söker efter första fältet som är ogiltigt och gör tabbpanelen som inne-
   * håller det aktiv och synlig.
   *
   * Metoden anropas för varje `invalid`-händelse. Håll reda på det första
   * rapporterade ogiltiga fältet. När alla ogiltiga fält rapporterats,
   * visa felmeddelandet för det första ogiltiga fältet. (Detta genererar en
   * ny `invalid`-händelse som måste tas om hand.)
   *
   * @protected
   * @param {Event} händelseinformation
   */
  #showErrorPanel(event) {
    if (this.#ignore !== event.target) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.#timer && clearTimeout(this.#timer);
    this.#invalid ??= event.target;
    this.#timer = setTimeout(() => {
      if (this.#ignore !== this.#invalid) {
        const panel = this._form.querySelector('fieldset:invalid');
        this.#ignore = this.#invalid;
        this.#tabs.selectPanel(panel);
        this.#invalid.focus();
        this.#invalid.reportValidity();
      } else {
        this.#ignore = null;
        this.#invalid = null;
        this.#timer = null;
      }
    }, 100);
  }
}

// Importera beroenden.
import { ValidationError } from '../model/ValidationError.js';
import { ViewBase } from './ViewBase.js';

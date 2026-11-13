/**
 * Vy för urval eller redigering av stickprov.
 *
 * Vyn används för att fylla i information om ett stickprovsurval i en gransk-
 * ning. Användaren fyller i grunduppgifter om urvalet och kan markera vilka
 * tidigare identifierade komponenter som ingår samt lägga till nya komponenter.
 *
 * Samma vy används också för att redigera ett befintligt stickprov.
 *
 * @license CC-BY 4.0
 * @property {string}   action        Åtgärdssökväg för formuläret.
 * @property {string}   category      Urvalskategori som stickprovet ingår i.
 * @property {string}   component     Komponentnamn.
 * @property {object[]} components    Valda komponenter efter bekräftelse.
 * @property {boolean}  confirmOnSave Bekräfta komponenter vid spara?
 * @property {string[]} contentTypes  Innehållstyper för komponent.
 * @property {boolean}  default       Förvalsmarkering för komponent.
 * @property {boolean}  defaultEdit   Förvalsmarkering för komponent (redig.).
 * @property {string}   deleteAction  Åtgärdssökväg för Ta bort-knappen.
 * @property {string}   follows       Föregående stickprov i en process.
 * @property {string}   format        Dokumentformat.
 * @property {string}   heading       Sidrubrik.
 * @property {string}   name          Namn eller titel för stickprovet.
 * @property {string}   note          Granskarens notering.
 * @property {string}   parentType    Föräldratyp för komponent.
 * @property {string[]} predecessors  Befintliga namn i samma kategori.
 * @property {stirng}   randomCount   Återstående slumpurval.
 * @property {string}   service       Typ av digital service (app/website).
 * @property {string}   serviceType   Typ av tjänst i urvalet.
 * @property {boolean}  srSupport     Stöd för skärmläsare?
 * @property {string}   type          Typ av stickprov.
 * @property {string}   url           URL.
 */
export class SampleEditView extends ViewBase {
  // Privata fält.
  #cct = [];
  #cctDefault = [];
  #classes = new Set();
  #compDlg;
  #conditions;
  #dropdown;
  #listbox;
  #service = 'website';
  #type = 'webpage';

  /**
   * Konstruera en vyinstans.
   *
   * @param {string}            page        Namn på innehållsfragmentfil.
   * @param {string}            title       Sidtitel.
   * @param {(string|null)}     confirmID   ID för bekräftelsedialog..
   * @param {BreadcrumbTrail}   breadcrumbs Länkstig.
   * @param {EventListenerList} listeners   Händelselyssnarlista.
   * @param {ResourceLoader}    loader      Resursladdare.
   * @param {Listbox}           listbox     Innehållstypslista (stickprovet).
   * @param {Dropdown}          dropdown    Innehållstypslista (komponenter).
   * @param {ViewCondition}     conditions  Villkorsstyrning.
   * @param {Document}          [doc]       DOM-dokument vid enhetstester.
   */
  constructor(
    page,
    title,
    confirmID,
    breadcrumbs,
    listeners,
    loader,
    listbox,
    dropdown,
    conditions,
    doc = document
  ) {
    super(page, title, breadcrumbs, listeners, loader, doc);
    this._confirmID = confirmID;
    this.#conditions = conditions;
    this.#dropdown = dropdown;
    this.#listbox = listbox;
  }

  /**
   * @inheritDoc
   */
  activate() {
    super.activate();
    this.#addListboxObserver();
    this.#addDropdown();
    this.#addComponentListeners();
    this.#addConnectionListeners();
  }

  /**
   * Lägg till en kryssruta för en definierad komponent.
   *
   * Klona ett mallelement i vyn och lägg till i listan.
   *
   * @param {number}  id       Komponentidentitet.
   * @param {string}  name     Komponentens namn.
   * @param {boolean} included Ingår komponenten i aktuellt stickprov?
   */
  addComponent(id, name, included) {
    const ul = this._doc.getElementById('components');
    const template = this._doc.getElementById('component-template');
    const fragment = template.content.cloneNode(true);
    const [label] = fragment.children[0].children;
    const [cb] = label.children;

    cb.id = `component-${ul.children.length}`;
    cb.checked = included;
    cb.value = String(id);
    label.append(` ${name}`);

    ul.appendChild(fragment);
  }

  /**
   * Lägg till en kryssruta för en definierad koppling till en komponent.
   *
   * Klona ett mallelement i vyn och lägg till i listan.
   *
   * @param {number}  id       Stickprovsidentitet.
   * @param {string}  name     Stickprovets namn.
   * @param {boolean} included Ingår aktuell komponent i stickprovet?
   */
  addConnection(id, name, included) {
    const ul = this._doc.getElementById('connections');
    const template = this._doc.getElementById('connection-template');
    const fragment = template.content.cloneNode(true);
    const [label] = fragment.children[0].children;
    const [cb] = label.children;

    cb.id = `connection-${ul.children.length}`;
    cb.checked = included;
    cb.value = String(id);
    label.append(` ${name}`);

    ul.appendChild(fragment);
  }

  // Åtkomstmetoder för urvalskategori.
  get category() {
    return this._form.category.value;
  }

  set category(id) {
    this._form.category.value = id;
    this.#conditions.apply();
  }

  /**
   * Återställ formulärfälten för tillägg av komponent.
   */
  clearComponentFields() {
    this._form.component.value = '';
    this._form.default.checked = false;
    this.#dropdown.reset(this.#cctDefault);
  }

  /**
   * Radera tillagda komponenter.
   */
  clearComponentList() {
    this._doc.getElementById('components').innerHTML = '';
  }

  /**
   * Radera tillagda kopplingar.
   */
  clearConnectionList() {
    this._doc.getElementById('connections').innerHTML = '';
  }

  /**
   * @inheritDoc
   */
  close() {
    this.#conditions.disconnect();
    for (const c of this.#classes) {
      this._article.classList.remove(c);
    }
    super.close();
  }

  // Åtkomstmetoder för komponentnamn.
  get component() {
    return this._form.component.value;
  }

  set component(name) {
    if (name instanceof ValidationError) {
      this._form.component.value = name.value;
      this._form.component.setCustomValidity(name.message);
    } else {
      this._form.component.value = name;
    }
  }

  // Åtkomstmetoder för valda komponenter efter bekräftelse.
  get components() {
    const dialog = this._doc.getElementById('confirm-component-dialog');
    const result = [];
    for (const cb of dialog.querySelectorAll('li input[type="checkbox"]')) {
      result.push({ id: Number(cb.value), inc: cb.checked });
    }
    return result;
  }

  /**
   * Visa dialog för att bekräfta kopplade komponenter.
   *
   * Kopiera kryssrutor från komponentlistan till dialogrutan. Användaren kan
   * ändra valen i dialogen och även välja att inte se bekräftelsedialogen i
   * fortsättningen.
   *
   * @return {promise} Ett löfte som infrias med `true` om dialogen stängs med
   *                   "spara"; `false` om den stängs med "avbryt".
   */
  confirmComponents() {
    // Kopiera kryssrutor.
    this.#copyConnections();

    const dialog = this._doc.getElementById('confirm-component-dialog');
    const buttons = [...dialog.querySelectorAll('button')];
    const trigger = this._doc.activeElement;

    return new Promise((resolve, reject) => {
      const onClick = ({ currentTarget }) => {
        dialog.close(currentTarget.value);
      };
      const onClose = () => {
        buttons[0].removeEventListener('click', onClick);
        buttons[1].removeEventListener('click', onClick);
        dialog.removeEventListener('close', onClose);
        dialog.removeEventListener('close', onClose);
        trigger?.focus();
        resolve('confirm' === dialog.returnValue);
      };

      buttons[0].addEventListener('click', onClick);
      buttons[1].addEventListener('click', onClick);
      dialog.addEventListener('cancel', onClose);
      dialog.addEventListener('close', onClose);
      dialog.showModal();
    });
  }

  // Åtkomstmetod för kryssrutan för bekräfta komponenter vid spara.
  get confirmOnSave() {
    return this._doc.getElementById('ccd-confirm').checked;
  }

  // Åtkomstmetod för innehållstyper för komponent.
  get contentTypes() {
    return this.#cct.filter(([, sel]) => sel).map(([type]) => type);
  }

  /**
   * @inheritDoc
   */
  deactivate() {
    this.#dropdown?.detach();
    this.#listbox?.detach();
    super.deactivate();
  }

  // Åtkomstmetoder för förvalsflaggan för komponenter (tillägg).
  get default() {
    return this._form.default.checked;
  }

  set default(flag) {
    this._form.default.checked = Boolean(flag);
  }

  // Åtkomstmetoder för förvalsflaggan för komponenter (redigering).
  get defaultEdit() {
    return this._form.defaultEdit.checked;
  }

  set defaultEdit(flag) {
    this._form.defaultEdit.checked = Boolean(flag);
  }

  // Åtkomstmtod för åtgärdssökväg för Ta bort-knappen.
  set deleteAction(url) {
    const btn = this._form.querySelector('button[value="delete"]');
    if (btn && !url) {
      btn.disabled = true;
    } else if (btn && url) {
      btn.disabled = false;
      btn.setAttribute('formaction', url);
    }
  }

  // Åtkomstmetoder för föregående sida i en process.
  get follows() {
    return this._form.follows.value;
  }

  set follows(name) {
    this._form.follows.value = name;
  }

  // Åtkomstmetoder för dokumentformat.
  get format() {
    return this._form.format.value;
  }

  set format(name) {
    this._form.format.value = name;
  }

  // Åtkomstmetod för sidrubriken.
  set heading(text) {
    this._article.querySelector('h1').textContent = String(text);
  }

  // Åtkomstmetoder för namn/titel.
  get name() {
    return this._form.name.value;
  }

  set name(text) {
    if (text instanceof ValidationError) {
      this._form.name.value = text.value;
      this._form.name.setCustomValidity(text.message);
    } else {
      this._form.name.value = String(text);
    }
  }

  // Åtkomstmetoder för notering.
  get note() {
    return this._form.note.value;
  }

  set note(text) {
    this._form.note.value = String(text);
  }

  /**
   * @inheritDoc
   */
  async open() {
    await super.open();
    this._article.classList.add(this.#service);
    //TODO REMOVE this._article.classList.add(this.#type);
    this.#classes.add(this.#type);
    this.#conditions.observe(this._form, this._article);
  }

  // Åtkomstmetoder för föräldratyp för komponent.
  get parentType() {
    return this._form.parentType.value;
  }

  set parentType(type) {
    this._form.parentType.value = type;
  }

  // Åtgärdssökväg för listan med eventuella föregående sidor i en process.
  set predecessors(names) {
    const select = this._form.follows;
    while (select.length > 1) {
      select.remove(1);
    }
    for (const name of names) {
      select.add(new Option(name));
    }
  }

  // Åtkomstmetod för återstående slumpurval.
  set randomCount(text) {
    this._doc.getElementById('random').textContent = String(text);
  }

  // Åtkomstmetoder för typ av digital tjänst.
  get service() {
    return this.#service;
  }

  set service(type) {
    this._article.classList.replace(this.#service, type);
    this.#classes.delete(this.#service);
    this.#classes.add(type);
    this.#service = type;
    this.#conditions.apply();
  }

  // Åtkomstmetoder för typ av tjänst i urvalet.
  get serviceType() {
    return this._form.serviceType.value;
  }

  set serviceType(descr) {
    this._form.serviceType.value = String(descr);
    this.#conditions.apply();
  }

  /**
   * Populera listan med urvalskategorier.
   *
   * Varje objekt i datavektorn har tre fält:
   * - id:    kategoriidentitet
   * - name:  kategoribeteckning att visa i listan
   * - count: antalet befintliga stickprov i kategorin.
   *
   * Det synliga värdet i varje listalternativ är namnet följt av antalet
   * stickprov inom parentes (om det är större än noll).
   *
   * @private
   * @param {object[]} data Kategoriinformation.
   */
  setCategories(data) {
    const select = this._form.category;
    while (select.options.length > 1) {
      select.remove(1);
    }

    for (const { id, name, count } of data) {
      const label = count > 0 ? `${name} (${count})` : name;
      select.add(new Option(label, id));
    }
  }

  /**
   * Lägg till innehållstyper för komponenter och koppla rullgardinslistan.
   *
   * Lägg till angivna innehållstyper som listelement i dokumentet. Koppla
   * sedan listan till rullgardinslistan.
   *
   * Argumentet är en vektor där varje element är en vektor med tre element:
   * id och namn för innehållstypen samt markeringsflagga.
   *
   * @param {array[]} info Innehållstypsinformation.
   */
  setComponentContentTypes(info) {
    this.#cct = [];
    this.#cctDefault = [];
    const div = this._doc.getElementById('component-content-types');
    const [button, ul] = div.children;

    ul.innerHTML = '';

    for (const [id, title, selected] of info) {
      this.#cct.push([id, selected]);
      const liID = `cct-${id}`;
      const attrs = {
        'aria-selected': String(selected),
        id: liID,
        role: 'option',
      };
      const li = this._element(ul, 'li', attrs, title);
      li.dataset.value = id;
      selected && this.#cctDefault.push(liID);
    }

    this.#dropdown.attach(button, ul);
    this.#setDropdownText();
  }

  /**
   * Uppdatera förloppsindikatorn.
   *
   * @param {number} value Aktuellt värde.
   * @param {number} max   Maxvärde.
   */
  setProgress(value, max) {
    const progress = this._article.querySelector('progress');
    progress.max = max;
    progress.value = value;
  }

  /**
   * Lägg till innehållstyper och koppla listrutan.
   *
   * Lägg till angivna innehållstyper som listelement i dokumentet. Koppla
   * sedan listan till listrutan.
   *
   * Argumentet är en vektor där varje element är en vektor med tre element:
   * id och namn för innehållstypen samt markeringsflagga.
   *
   * @param {array[]} info Innehållstypsinformation.
   */
  setSampleContentTypes(info) {
    const ul = this._doc.getElementById('sample-content-types');
    ul.innerHTML = '';
    for (const [id, title, selected] of info) {
      const attrs = {
        'aria-selected': String(selected),
        id: `ct-${id}`,
        role: 'option',
      };
      const li = this._element(ul, 'li', attrs, title);
      li.dataset.value = id;
    }
    this.#listbox?.attach(ul);
  }

  /**
   * Visa statusmeddelande i komponentdialogen.
   *
   * @param {string} message Statusmeddelande att visa.
   */
  showComponentStatus(message) {
    this.#compDlg.querySelector('[role="status"]').textContent = message;
  }

  /**
   * @inheritDoc
   */
  showError(message) {
    super.showError(message);
    this._form.reportValidity();
  }

  // Åtkomstmetoder för skärmläsarstöd.
  get srSupport() {
    return this._form.srSupport.checked;
  }

  set srSupport(flag) {
    this._form.srSupport.checked = Boolean(flag);
  }

  /**
   * Kontrollera felmeddelande för komponentnamn.
   *
   * Visa eventuellt felmeddelande.
   *
   * @return {boolean} `true` om fältet är giltigt, annars `false`.j
   */
  testComponentValidity() {
    return this._form.component.reportValidity();
  }

  // Åtkomstmetoder för stickprovstyp.
  get type() {
    return this._form.type.value;
  }

  set type(type) {
    this._form.type.value = type;
    this._article.classList.toggle('component', 'component' === type);
    if ('component' === type) {
      this.#classes.add('component');
    } else {
      this.#classes.delete('component');
    }
    this.#conditions.apply();
  }

  // Åtkomstmetoder för URL.
  get url() {
    return this._form.url.value;
  }

  set url(url) {
    this._form.url.value = String(url ?? '');
  }

  /**
   * Lägg till händelselyssnare för komponenter.
   *
   * @private
   */
  #addComponentListeners() {
    this.#compDlg = this._doc.getElementById('component-dialog');
    const [open, close] = this._article.querySelectorAll(
      'button[data-handler="component"]'
    );
    if (!open || !close) return;
    this._listeners.add(open, 'click', () => this.#openComponentDialog());
    this._listeners.add(close, 'click', () => this.#closeComponentDialog());

    // Kryssrutor för ingående komponenter.
    this._listeners.add(
      this._doc.getElementById('components'),
      'input',
      ({ target }) => {
        this._notifyObservers({
          state: target.checked,
          target: target.name || target.id,
          type: 'change',
          value: target.value,
        });
      }
    );
  }

  /**
   * Lägg till händelselyssnare för kopplingar.
   *
   * @private
   */
  #addConnectionListeners() {
    const ul = this._doc.getElementById('connections');
    ul &&
      this._listeners.add(ul, 'input', ({ target }) => {
        this._notifyObservers({
          state: target.checked,
          target: target.name || target.id,
          type: 'change',
          value: target.value,
        });
      });
  }

  /**
   * Lägg till en observatör för rullgardinslistan.
   *
   * @private
   */
  #addDropdown() {
    const div = this._doc.getElementById('component-content-types');
    const [btn] = div?.children ?? [];

    // Lägg till en observatör för att hålla reda på valda innehållstyper
    // och för att uppdatera knapptexten när valet förändras.
    this.#dropdown?.subscribe((event) => {
      if (event.target) {
        const matchID = event.target.id.slice(4);
        const index = this.#cct.findIndex(
          ([id]) => id === event.target.id.slice(4)
        );
        if (index < 0) {
          console.error(`Innehållstyp '${matchID}' saknas.`);
        }
        this.#cct[index][1] = event.state;
      } else {
        for (const data of this.#cct) {
          data[1] = false;
        }
      }

      this.#setDropdownText();
    });
  }

  /**
   * Lägg till en observatör för listrutan.
   *
   * Observatörsfunktionen anropas varje gång tillståndet förändras för en
   * innehållstyp i listan.
   *
   * @private
   */
  #addListboxObserver() {
    this.#listbox?.subscribe((event) => {
      this._notifyObservers({
        state: event.state,
        target: event.target.name || event.target.id,
        type: 'change',
        value: event.target.dataset.value,
      });
    });
  }

  /**
   * Stäng dialogrutan för tillägg av komponenter.
   *
   * Ta bort eventuellt valideringsfel på komponentnamnfältet, som annars
   * kommer att hindra sparafunktionen.
   *
   * @private
   */
  #closeComponentDialog() {
    this._form.component.setCustomValidity('');
    this.#compDlg.close();
  }

  /**
   * Kopiera kryssrutor från komponentlistan till bekräftelsedialogen.
   *
   * @private
   */
  #copyConnections() {
    const dest = this._doc.getElementById('ccd-list');
    const src = this._doc.getElementById('components');

    dest.innerHTML = '';
    for (const liSrc of src.children) {
      const [cb] = liSrc.children[0].children;
      const liDest = this._doc.createElement('li');
      const label = this._doc.createElement('label');
      const inp = this._doc.createElement('input');
      const text = liSrc.children[0].lastChild.data;

      inp.type = 'checkbox';
      inp.checked = cb.checked;
      inp.role = 'switch';
      inp.value = cb.value;

      label.append(inp, text);
      liDest.append(label);
      dest.append(liDest);
    }
  }

  /**
   * Öppna modal dialogruta för tillägg av komponenter.
   *
   * @private
   */
  #openComponentDialog() {
    const dialog = this.#compDlg;
    const trigger = this._doc.activeElement;

    const onChange = () => {
      this.showComponentStatus('');
    };

    const onClose = () => {
      dialog.removeEventListener('change', onChange);
      dialog.removeEventListener('cancel', onClose);
      dialog.removeEventListener('close', onClose);
      dialog.removeEventListener('keydown', onEnter);
      trigger?.focus();
    };

    const onEnter = (e) => {
      if ('Enter' === e.key) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    dialog.addEventListener('change', onChange);
    dialog.addEventListener('cancel', onClose);
    dialog.addEventListener('close', onClose);
    dialog.addEventListener('keydown', onEnter, true);
    dialog.showModal();
  }

  /**
   * Uppdatera text i rullgardinsknappen så att den speglar aktuella val.
   *
   * @private
   */
  #setDropdownText() {
    const selected = this.#cct.filter(([, sel]) => sel).length;
    const text = {
      one: 'innehållstyp',
      other: 'innehållstyper',
    }[new Intl.PluralRules('sv').select(selected)];
    this.#dropdown.buttonText = `${selected} ${text}`;
  }
}

// Importera beroenden.
import { ValidationError } from '../model/ValidationError.js';
import { ViewBase } from './ViewBase.js';

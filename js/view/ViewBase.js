/**
 * Basklass för vyer.
 *
 * Gemensamma funktioner för vyklasser.
 *
 * Metoden `open()` hämtar ett HTML-fragment med hjälp av en resursladdare och
 * populerar ett artikelelement samt lägger till eventuella specifika
 * stilmallar.
 *
 * Metoden `activate()` lägger till händelselyssnare för länkar och formulär.
 * Intressenter kan registrera observatörer på vyn via metoden `subscribe()`.
 * Observatörerna anropas när länk- eller formulärhändlser inträffar.
 *
 * Metoden `close()´ tonar bort artikelinnehållet och raderar tillagda
 * specifika stilmallar.
 *
 * Klassen tillhandahåller också metoder för att skapa DOM-element, som kan vara
 * till nytta för härledda klasser.
 *
 * @license CC-BY 4.0
 * @property {string}          action       Åtgärdssökväg för formuläret.
 * @property {boolean}         advancedMode Avancerat visningsläge?
 * @property {BreadcrumbTrail} breadcrumbs  Länkstig.
 * @property {boolean}         busy         Upptagenmarkering.
 * @property {string}          title        Dokumenttitel.
 */
export class ViewBase {
  // Skyddade fält.
  _article;
  _autoMenu = false;
  _confirmID;
  _doc;
  _form;
  _listeners;
  _wide = false;

  // Privata fält.
  static #PATH = '/granska.html';
  static #TITLE = '– Tillsynsmanual';

  #advanced = false;
  #breadcrumbs;
  #confirm;
  #crumbsNav;
  #css = [];
  #fragment;
  #ignore;
  #loader;
  #observers = [];
  #status;
  #styles = [];
  #title;

  /**
   * Konstruera en vyinstans.
   *
   * @param {string}            page        Namn på innehållsfragmentfil.
   * @param {string}            title       Sidtitel.
   * @param {BreadcrumbTrail}   breadcrumbs Länkstig.
   * @param {EventListenerList} listeners   Händelselyssnarlista.
   * @param {ReosurceLoader}    loader      Resursladdare.
   * @param {Document}          doc         DOM-dokument.
   */
  constructor(page, title, breadcrumbs, listeners, loader, doc) {
    this._doc = doc;
    this._listeners = listeners;
    this.#breadcrumbs = breadcrumbs;
    this.#fragment = page;
    this.#loader = loader;
    this.#title = title;
  }

  // Åtkomstmetod för åtgärdssökvägen i ett formulär.
  get action() {
    return this._form.getAttribute('action');
  }

  set action(url) {
    this._form.setAttribute('action', url);
  }

  /**
   * Gör vyn "aktiv" och lyssna efter händelser.
   *
   * Lägg till händelselyssnare för formulärinskick, funktionsknappar,
   * ändringar i formulärfält och klick på statusmeddelande.
   *
   * @see deactivate
   */
  activate() {
    this.#skipLink();
    this.#buttonListeners();
    this.#linkListeners();
    this.#statusListeners();
    if (this._form) {
      this.#formListeners();
      this.#changeListeners();
    }
  }

  // Åtkomstmdetoder för avancerat visningsläge.
  get advancedMode() {
    return this.#advanced;
  }

  set advancedMode(flag) {
    this.#advanced = Boolean(flag);
    this._article && this.#markAdvanced(flag);
  }

  /**
   * Sätt inmatningsfokus till angivet element.
   *
   * @param {string} id Elementidentitet.
   */
  autoFocus(id) {
    const element = this._doc.getElementById(id);
    element &&
      setTimeout(() => {
        element.focus();
        element.scrollIntoView();
      }, 0);
  }

  // Åtkomstmetod för länkstigen.
  get breadcrumbs() {
    return this.#breadcrumbs;
  }

  // Åtkomstmetod för upptagen-flaggan.
  set busy(flag) {
    if (flag) {
      this._doc.body.setAttribute('aria-busy', 'true');
    } else {
      this._doc.body.removeAttribute('aria-busy');
    }
  }

  /**
   * Frigör resurser som vyn skapat.
   *
   * Radera tillagda specifika stilmallar och eventuell automatisk
   * innehållsmeny.
   *
   * Sätt även en klass på artikel-elementet för eventuell animering vid
   * sidbyte.
   */
  close() {
    this.deactivate();

    this._article.classList.add('changing');
    this.showStatus('Laddar…', 'loading');

    if (this._autoMenu) {
      this._menu.remove();
    }

    if (this.#crumbsNav) {
      this.#crumbsNav.remove();
    }

    this.#styles.forEach((link) => link.remove());
    this.#styles.length = 0;

    if (this._wide) {
      this._doc.querySelector('main')?.classList.remove('wide');
    }
  }

  /**
   * Visa och hantera en modal bekräftelsedialogruta.
   *
   * Dialogens identitet anges av fältet `_confirmID` och den ska innehålla
   * ett element med klassen `prompt` och två knapper (Avbryt och OK).
   * OK-knappen ska ha värdet "true", avbrytknappen "false".
   *
   * @param {string}      prompt  Meddelande att bekräfta.
   * @param {HTMLElement} trigger Element att fokusera vid stängning.
   * @param {string[]}    [texts] Knapptexter.
   * @param {boolean}     [icons] Visa ikoner i knappar?
   * @return {Promise} Infrias med `true` vid bekräftelse, annars `false`.
   * @throws {TypeError} Ogiltigt dialogelement.
   */
  confirm(prompt, trigger, texts = null, icons = true) {
    this.#confirm ??= this.#initConfirm();
    const dialog = this.#confirm;
    let originals;
    const promptElement = dialog.querySelector('.prompt');
    promptElement && (promptElement.textContent = prompt);
    texts && (originals = this.#setConfirmButtons(texts, icons, false));

    return new Promise((resolve) => {
      const onCancel = () => {
        dialog.removeEventListener('cancel', onCancel);
        dialog.removeEventListener('close', onClose);
        texts && this.#setConfirmButtons(originals, icons, true);
        trigger?.focus();
        resolve(false);
      };

      const onClose = () => {
        dialog.removeEventListener('cancel', onCancel);
        dialog.removeEventListener('close', onClose);
        texts && this.#setConfirmButtons(originals, icons, true);
        trigger?.focus();
        resolve('true' === dialog.returnValue);
      };

      dialog.addEventListener('cancel', onCancel);
      dialog.addEventListener('close', onClose);
      dialog.showModal();
    });
  }

  /**
   * Deaktivera vyn, så att den inte reagerar på händelser.
   *
   * Ta bort händelselyssnarna för länkar, formulärinskick, änderingar i
   * formulärfät och klick på statusmeddelande.
   *
   * Detta används när ett fel uppstått efter sidladdning, för att göra länkar
   * på sidan användbara.
   *
   * @see activate
   * @see close
   */
  deactivate() {
    this._listeners.removeAll();
  }

  /**
   * Dölj statusmeddelande.
   */
  hideStatus() {
    this.#status.textContent = '';
    this.#status.className = '';
    this.#status.tabIndex = -1;
  }

  /**
   * Öppna vyn och hämta innehållet.
   *
   * Lägg till eventuella specifika stilmallar. Hämta HTML-fragmentet och
   * populera artikelelementet med det. Sätt sidtiteln och radera innehållet i
   * statuselementet.
   *
   * Om sidan ska ha en automatgenererad innehållsmeny, lägg till den.
   */
  async open() {
    // Lägg till specifika stilmallar.
    this.#addStyles();

    this._article = this._doc.querySelector('main > article[aria-live]');
    this.#status = this._doc.querySelector('main > [role="status"]');

    if (this._wide) {
      this._doc.querySelector('main')?.classList.add('wide');
    }

    // Hämta HTML-fragmentet.
    const html = await this.#loader.pageContent(this.#fragment);
    this.#breadcrumbs?.completed().then((b) => this.#addBreadcrumbs(b));
    this.#insertContent(html);
  }

  /**
   * Visa ett felmeddelande i statusbehållaren.
   *
   * @param {string} message Felmeddelande att visa.
   */
  showError(message) {
    this.#status.textContent = message;
    this.#status.className = 'error';
    this.#status.tabIndex = -1;
  }

  /**
   * Visa ett statusmeddelande i statusbehållaren.
   *
   * @param {string} message Statusmeddelande att visa.
   * @param {string} [type]  Klassnamn för behållaren.
   */
  showStatus(message, type = null) {
    this.#status.textContent = message;
    this.#status.className = type;
    this.#status.tabIndex = -1;
  }

  /**
   * Visa ett kvittensmeddelande i statusbehållaren.
   *
   * @param {string} message Kvittensmeddelande att visa.
   */
  showSuccess(message) {
    this.#status.textContent = message;
    this.#status.className = 'success closable';
    this.#status.tabIndex = 0;
  }

  /**
   * Registrera en observatör.
   *
   * Vyn meddelar egistrerade observatörer när händelser inträffar i användar-
   * gränssnittet.
   *
   * @see unsubscribe
   * @param {callback} notify Funktion att anrop vid meddelande.
   */
  subscribe(notify) {
    this.#observers.push(notify);
  }

  // Åtkomstmetoder för sidtiteln.
  get title() {
    return this._doc.title;
  }

  set title(text) {
    this._doc.title = `${text} ${ViewBase.#TITLE}`;
  }

  /**
   * Avregistrera en observatör.
   *
   * @see subscribe
   * @param {callback} notify Registrerad funktion att avregistrera.
   */
  unsubscribe(notify) {
    const index = this.#observers.indexOf(notify);
    if (index in this.#observers) {
      this.#observers.splice(index, 1);
    }
  }

  /**
   * Lägg till specifika stilmallar.
   *
   * Spara de angivna namnen, som används när sidinnehållet laddats.
   *
   * Metoden måste anropas före `open()` för att ha någon verkan.
   *
   * @see #addStyles
   * @protected
   * @param {...string} names Filnamn, utan suffixet ".css".
   */
  _addStyles(...names) {
    this.#css = this.#css.concat(names);
  }

  /**
   * Skapa och infoga en elementnod i DOM-trädet.
   *
   * @protected
   * @param {(HTMLElement|null)} parent       Eventuellt föräldralement.
   * @param {string}             tag          Taggnamn.
   * @param {object}             [attributes] Attribut.
   * @param {string}             [text]       Textinnehåll.
   * @return {HTMLElement}
   */
  _element(parent, tag, attributes = {}, text = null) {
    const element = this._doc.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
      element.setAttribute(name, value);
    }
    text && (element.textContent = String(text));
    parent && parent.appendChild(element);
    return element;
  }

  /**
   * Meddela observatörer vid klick på funktionsknappar.
   *
   * Händelseinformationsobjektets `action`-fält är `value`-attributvärdet för
   * knappen som initierade händelsem och fältet `path` är `null`.
   *
   * @protected
   * @param {Event}       event               Händelseinformation.
   * @param {EventTarget} event.currentTarget Den klickade knappen.
   */
  _notifyAction({ currentTarget: button }) {
    this._notifyObservers({
      action: button.value,
      path: null,
      trigger: button,
      type: 'form',
    });
  }

  /**
   * Meddela alla registrerade observatörer om en hÄndelse.
   *
   * @protected
   * @param {object} info Händelseinformation.
   */
  _notifyObservers(info) {
    this.#observers.forEach((observer) => observer(info));
  }

  /**
   * Lägg till länkstig ("brödsmulor").
   *
   * @private
   * @param {BreadcrumbTrail} breadcrumbs Länkstig.
   */
  #addBreadcrumbs(breadcrumbs) {
    const header = this._doc.querySelector('body > header');
    if (!header) return;

    const nav = this._element(header, 'nav', { class: 'breadcrumbs' });
    const ol = this._element(nav, 'ol');

    breadcrumbs.links.forEach(({ title, url: href }) => {
      const li = this._element(ol, 'li');
      const a = this._element(li, 'a', { href }, title);
    });

    const li = this._element(ol, 'li');
    const strong = this._element(li, 'strong', {}, breadcrumbs.current);

    this.#crumbsNav = nav;
  }

  /**
   * Lägg till specifika stilmallar.
   *
   * Skapa och infoga ett `link`-element för varje angiven stilmall.
   *
   * @private
   */
  #addStyles() {
    this.#styles = this.#css.map((css) => {
      const link = this._doc.createElement('link');
      link.rel = 'stylesheet';
      link.href = `../css/${css}.css`;
      return this._doc.head.appendChild(link);
    });
  }

  /**
   * Lägg till händelslyssnare för funktionsknappar.
   *
   * Meddela registrerade observatörer vid klick på knappar med
   * `type="button"`.
   *
   * @private
   */
  #buttonListeners() {
    const buttons = this._article.querySelectorAll('button[type="button"]');
    const notify = (event) => this._notifyAction(event);
    for (const button of buttons) {
      if (!button.dataset.handler) {
        this._listeners.add(button, 'click', notify);
      }
    }
  }

  /**
   * Lägg till händelselyssnare för ändringar av värden i formulärfält.
   *
   * Meddela registrerade observatörer.
   *
   * Händelseinformationsobjektets `state`-fält har ett booleskt värde som
   * representerar markeringstillståndet för kryssrutor. För andra typer av
   * fält är det odefinierat.
   *
   * `target`-fältet innehåller namnet eller identiteten för fältet vars värde
   * ändrats och `value`-fältet är dess värde. Värdet är ett datum för
   * datumfält och ett tal för numeriska fält, annars en sträng.
   *
   * @private
   */
  #changeListeners() {
    const valueOf = (element) =>
      ({
        date: (e) => e.valueAsDate,
        'datetime-local': (e) => new Date(e.valueAsNumber),
        number: (e) => e.valueAsNumber,
      })[element.type]?.(element) ?? element.value;

    this._listeners.add(this._form, 'change', ({ target }) => {
      const state = 'checkbox' === target.type ? target.checked : undefined;

      target.setCustomValidity?.('');
      this.#ignore = target;
      if (target.checkValidity?.() ?? true) {
        this._notifyObservers({
          state,
          target: target.name || target.id,
          type: 'change',
          value: valueOf(target),
        });
      }
      setTimeout(() => (this.#ignore = null), 100);
    });
  }

  /**
   * Lägg till händelselyssnare för formulär.
   *
   * Lägg till lyssnare för giltiga och ogiltiga inskick av formulär.
   *
   * Vid giltiga inskick, meddela registrerade observatörer.
   * Vid ogiltigt inskick, sätt klassen "validated" på formuläret för att
   * visuellt formge ogiltiga fält.
   *
   * @private
   */
  #formListeners() {
    this._listeners.add(this._form, 'submit', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.#notifyFormEvent(event);
    });

    this._listeners.add(
      this._form,
      'invalid',
      (event) => {
        if (this.#ignore === event.target) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          return;
        }
        this._form.classList.add('validated');
      },
      true
    );
  }

  /**
   * Initiera bekräftelsedialogrutan.
   *
   * Säkerställ att korrekt identitet är angiven och lägg till händelselyss-
   * nare för knappar.
   *
   * @private
   * @return {HTMLDialogElement}
   * @throws {TypeError} Ogiltigt dialogelement eller -id.
   */
  #initConfirm() {
    if (!this._confirmID) {
      console.error('Ange dialog-ID i ViewBase._confirmID.');
      throw new TypeError('Ingen dialog angiven för bekräftelse.');
    }

    const dialog = this._doc.getElementById(this._confirmID);
    if (!dialog) {
      console.error(`Dialog-ID '${this._confirmID}' finns inte.`);
      throw new TypeError('Ogiltig dialog angiven för bekräftelse.');
    }

    dialog.querySelectorAll('button').forEach((btn) => {
      this._listeners.add(btn, 'click', () => dialog.close(btn.value));
    });

    return dialog;
  }

  /**
   * Populera vyn med hämtat innehåll.
   *
   * @private
   * @param {string} html Innehåll i artikelelementet.
   */
  #insertContent(html) {
    this._doc.title = `${this.#title} ${ViewBase.#TITLE}`;
    this.hideStatus();
    this._article.innerHTML = html;
    this._form = this._article.querySelector('form');
    this.#markAdvanced(this.#advanced);

    // Lägg till eventuell automatisk innehållsmeny.
    if (this._autoMenu) {
      this._menu = new AutoContentMenu();
      this._menu.build(this.#startOfContent(), this._article);
    }

    // Återställ pekaren och tona in innehållet.
    this.busy = false;
    this._article.classList.remove('changing');
  }

  /**
   * Lägg till händelselyssnare för "interna" länkar.
   *
   * Lägg till lyssnare för klick på granskningslänkar. Lyssnaren ska meddela
   * alla registrerade observatörer.
   *
   * @private
   */
  #linkListeners() {
    const a = (n) => 'A' === n.nodeName;
    const hash = (n) => a.hash !== '';
    const intr = (a) => a.pathname.endsWith(ViewBase.#PATH);
    const link = (n) => (!n ? false : a(n) ? n : link(p(n)));
    const mods = (e) => e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;
    const p = (n) => n.parentNode;

    this._listeners.add(this._doc.body, 'click', (event) => {
      const target = link(event.target);
      if (target && intr(target) && !hash(target) && !mods(event)) {
        event.preventDefault();
        event.stopPropagation();
        this._notifyObservers({
          path: target.search,
          type: 'link',
        });
      }
    });
  }

  /**
   * Sätt eller ta bort markering för avancerat visningsläge.
   *
   * Uppdatera klassnamnet på artikelelementet. Om artikeln innehåller ett
   * formulär, gör fält som bara är synliga i avancerat läge icke-
   * obligatoriska i förenklat visningsläge.
   *
   * @private
   * @param {boolean} flag Avancerat visningsläge?
   */
  #markAdvanced(flag) {
    this.#advanced = flag;

    if (this.#advanced) {
      this._doc.body.classList.add('advanced-mode');
      this._article.classList.remove('simplified');
      this._article.classList.add('advanced');
    } else {
      this._doc.body.classList.remove('advanced-mode');
      this._article.classList.remove('advanced');
      this._article.classList.add('simplified');
      if (this._form) {
        this._form
          .querySelectorAll('.advanced [required]')
          .forEach((field) => (field.required = false));
      }
    }
  }

  /**
   * Meddela observatörer vid formulärinskick.
   *
   * Händelseinformationsobjektets `action`-fält är `value`-attributvärdet för
   * knappen som initierade händelsem och fältet `path` är dess `formaction`-
   * attribut om det är satt, annars formulärets `action`-attribut.
   *
   * @private
   * @param {SubmitEvent} event           Händelseinformation.
   * @param {HTMLElement} event.submitter Initierande knapp.
   * @param {EventTarget} event.target    Formuläret.
   */
  #notifyFormEvent({ submitter, target }) {
    const a = (t, n) => t.getAttribute(n);
    const path = a(submitter, 'formaction') || a(target, 'action');
    this._notifyObservers({
      action: submitter?.value,
      path: path,
      trigger: submitter,
      type: 'form',
    });
  }

  /**
   * Ändra innehåll i bekräftelsedialogens knappar.
   *
   * Uppdatera texter och sätt eventuell klass för att dölja ikoner.
   *
   * @private
   * @param {string[]} texts   Knapptexter.
   * @param {boolean}  icons   Visa ikoner?
   * @param {boolean}  restore Återställning?
   * @return {string[]} De texter som ersatts.
   */
  #setConfirmButtons(texts, icons, restore) {
    const replaced = [];
    const method = icons || restore ? 'remove' : 'add';
    this.#confirm.querySelectorAll('button').forEach((btn, index) => {
      btn.classList[method]('no-icon');
      if (index in texts) {
        replaced.push(btn.lastChild.textContent);
        btn.lastChild.textContent = texts[index];
      }
    });
    return replaced;
  }

  /**
   * Lägg till händelselyssnare för skipplänken.
   *
   * @private
   */
  #skipLink() {
    const skip = this._doc.querySelector('body > header > a');
    if (!skip) return;
    const id = skip.hash.slice(1);
    const target = this._doc.getElementById(id);
    target && (target.tabIndex = -1);
    this._listeners.add(skip, 'click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      target?.focus();
      target?.scrollIntoView();
    });
  }

  /**
   * Returnera ankaret som markerar sidinnehållets börjarn.
   *
   * @private
   * @return {HTMLAnchorElement}
   */
  #startOfContent() {
    return this._doc.getElementById('start-of-content');
  }

  /**
   * Lägg till händelselyssnare för statusbehållaren..
   *
   * Lägg till lyssnare för klick och tangenttryck på statusbehållaren.
   *
   * @private
   */
  #statusListeners() {
    this._listeners.add(this.#status, 'click', (event) => {
      if (this.#status.classList.contains('closable')) {
        event.preventDefault();
        event.stopPropagation();
        this.hideStatus();
      }
    });

    this._listeners.add(this.#status, 'keypress', (event) => {
      if ('Enter' === event.key) {
        event.preventDefault();
        event.stopPropagation();
        this.hideStatus();
      }
    });
  }
}

// Importera beroenden.
import { AutoContentMenu } from './AutoContentMenu.js';

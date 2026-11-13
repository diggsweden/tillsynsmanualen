/**
 * Vy för listning av krav i ett stickprovsurval.
 *
 * Vyn används för att visa en lista över de krav som ingår i granskningen av
 * ett stickprov. Uppsättningen krav beror dels på vilken typ av stickprov det
 * är (vy i mobil applikation, dokument eller webbsida) och dels vilka typer av
 * innehåll användaren uppgett att stickprovet innehåller. Krav kan dessutom
 * vara villkorsstyrda på dokumentformat eller applikationsplattform.
 *
 * @license CC-BY 4.0
 * @property {boolean}  copyNotes          Anger om kommentarer ska kopieras.
 * @property {string}   edit               Sökväg för redigering av stickprovet.
 * @property {string}   note               Notering gjord för stickprovet.
 * @property {boolean}  partial            Partialgranskningsflagga.
 * @property {string[]} sourceRequirements Krav-id att kopiera.
 * @property {number}   sourceSample       Stickprovs-id att kopiera krav från.
 */
export class SampleDisplayView extends ViewBase {
  // Privata fält.
  #details;
  #list;
  #progress;
  #sections = [];

  /**
   * Konstruera en vyinstans.
   *
   * @param {BreadcrumbTrail}   breadcrumbs Länkstig.
   * @param {EventListenerList} listeners   Händelselyssnarlista.
   * @param {ResourceLoader}    loader      Resursladdare.
   * @param {Document}          [doc]       DOM-dokument vid enhetstester.
   */
  constructor(breadcrumbs, listeners, loader, doc = document) {
    super('sample-display', 'Stickprov', breadcrumbs, listeners, loader, doc);
    this._addStyles('sample');
    this._wide = true;
  }

  /**
   * @inheritDoc
   */
  activate() {
    super.activate();
    const container = this._article.querySelector('.filter');
    const filter = this._doc.forms.filter;
    this._listeners.add(filter, 'change', ({ target }) => {
      container.classList.toggle(event.target.value);
    });

    const $ = (id) => this._doc.getElementById(id);
    this._listeners.add($('copy-btn'), 'click', () =>
      $('copy-dialog').showModal()
    );

    const copy = this._doc.forms.copy;
    this._listeners.add(copy, 'change', ({ target }) => {
      if ('source' === target.name) {
        this._notifyObservers({
          target,
          type: 'change',
          value: target.value,
        });
      }
    });

    this._listeners.add($('check-all'), 'click', (e) =>
      this.#checkOrUncheckAllRequirements(e)
    );

    for (const btn of copy.querySelectorAll('button[data-handler]')) {
      this._listeners.add(btn, 'click', ({ currentTarget: target }) => {
        $('copy-dialog').close(target.value);
      });
    }

    this._listeners.add($('copy-dialog'), 'close', ({ target }) => {
      if ('true' === target.returnValue) {
        this._notifyObservers({
          action: 'copy',
          path: null,
          type: 'form',
        });
      }
    });
  }

  /**
   * Lägg till en ingående komponent.
   *
   * Lägg till angiven komponent i listan med ingående komponenter i artikel-
   * huvdet.
   *
   * @param {string} name Komponentnamn.
   */
  addComponent(name) {
    const ul = this._doc.getElementById('components');
    this._element(ul, 'li', {}, name);
  }

  /**
   * Lägg till en innehållstyp.
   *
   * Lägg till angiven typ i listan med innehållstyper i artikelhuvuded.
   *
   * @param {string} type Innehållstyp.
   */
  addContentType(type) {
    const ul = this._doc.getElementById('content-types');
    this._element(ul, 'li', {}, type);
  }

  /**
   * Lägg till ett krav i aktuell sektionslista.
   *
   * @param {string}  url      Länkadress till granskning av kravet.
   * @param {string}  status   Kravets status (autopass/pass/fail/unchecked).
   * @param {string}  clause   Avsnittsnummer i EN 301 549/föreskriften.
   * @param {string}  title    Kravets titel.
   * @param {boolean} external Har extern anteckning?
   * @param {boolean} internal Har intern anteckning?
   * @throws {TypeError} Ingen sektion finns att lägga till i.
   */
  addRequirement(url, status, clause, title, external, internal) {
    if (!this.#list) {
      throw new TypeError('Skapa en sektion innan du lägger till krav.');
    }

    const template = this._doc.getElementById('requirement-template');
    const fragment = template.content.cloneNode(true);

    const li = fragment.children[0];
    const [icon, req, link, ext, note] = li.children;
    const [svg] = icon.children;
    const [use] = svg.children;

    li.classList.add(status);

    const statusTexts = {
      autopass: 'Autogodkänt',
      fail: 'Underkänt',
      pass: 'Godkänt',
      unchecked: 'Inte granskat',
    };
    svg.setAttribute('class', status);
    use.setAttribute('xlink:href', `../img/ikoner.svg#ico-${status}`);
    icon.append(statusTexts[status]);

    req.textContent = clause;

    link.href = url;
    link.textContent = title;

    if (!external) {
      ext.innerHTML = '';
    } else {
      li.classList.add('ext');
    }

    if (!internal) {
      note.innerHTML = '';
    } else {
      li.classList.add('int');
    }

    this.#list.appendChild(fragment);
  }

  /**
   * Lägg till en sektion med krav.
   *
   * Klona ett mallelement och uppdatera innehållet.
   *
   * @param {string} title Rubrik.
   */
  addSection(title) {
    const template = this._doc.getElementById('section-template');
    const fragment = template.content.cloneNode(true);
    const [h2, ul] = fragment.children;
    h2.textContent = title;
    this.#list = ul;
    template.parentNode.insertBefore(fragment, template);
    this.#sections.push(h2, ul);
  }

  /**
   * Lägg till en undersektion med krav.
   *
   * Klona ett mallelement, ersätt H2-rubriken med en H3-rubrik och uppdatera
   * innehållet.
   *
   * @param {string} title Rubrik.
   * @param {number} level Rubriknivå.
   */
  addSubsection(title, level) {
    const template = this._doc.getElementById('section-template');
    const fragment = template.content.cloneNode(true);
    const [h2, ul] = fragment.children;
    const hSub = this._element(null, `h${level}`, {}, title);
    this.#list = ul;
    fragment.replaceChild(hSub, h2);
    template.parentNode.insertBefore(fragment, template);
    this.#sections.push(hSub, ul);
  }

  /**
   * Radera tillagna kravavsnitt.
   *
   * Metoden används när användaren kopierat krav från ett annat stickprov.
   * I stället för en komplicerad identifiering och uppdatering av ett stort
   * antal kravavsnitt är det enklare att radera alla avsnitt och populera om
   * vyn.
   *
   * @see addSection
   * @see addSubsection
   */
  clear() {
    while (this.#sections.length) {
      this.#sections.shift().remove();
    }
  }

  // Åtkomstmetod för flagga som anger om kommentarer ska kopieras tillsammans
  // med kopierade krav.
  get copyNotes() {
    return this._doc.forms.copy.notes.checked;
  }

  // Åtkomstmetod för redigeringssökväg.
  set edit(url) {
    if (url) {
      this._doc.getElementById('edit').href = String(url);
    } else {
      this._doc.getElementById('edit').removeAttribute('href');
    }
  }

  // Åtkomstmetod för notering.
  set note(text) {
    this._doc.getElementById('note').textContent = String(text);
  }

  // Åtkomstmetoder för partialgranskningsflagga.
  get partial() {
    const button = this._doc.getElementById('partial');
    return 'true' === button.getAttribute('aria-pressed');
  }

  set partial(flag) {
    const button = this._doc.getElementById('partial');
    button.setAttribute('aria-pressed', String(Boolean(flag)));
  }

  /**
   * Sätt text och värde i autogodkännandeknappen.
   *
   * Om texten anges som `null`, deaktivera knappen.
   *
   * @param {(string|null)} text    Knapptext.
   * @param {string}        [value] Värde.
   */
  setApprove(text, value) {
    const button = this._doc.getElementById('approve');
    if (null == text) {
      button.disabled = true;
    } else {
      const [, span] = button.children;
      button.disabled = false;
      button.value = value;
      span.textContent = text;
    }
  }

  /**
   * Sätt länken till granskningsöversikten.
   *
   * @param {string} url   Sökväg.
   * @param {string} audit Granskningsnamn.
   */
  setAuditLink(url, text) {
    const link = this._doc.getElementById('audit');
    link.textContent = text;
    link.setAttribute('href', url);
  }

  /**
   * Populera stickprovslistan i kopieringsdialogen.
   *
   * Argumentet är en vektor med objekt som åtminstone har nycklarna `id`
   * (numeriskt värde) och `name` (strängvärde).
   *
   * Om argumentet är en tom vektor, avaktivera knappen som öppnar kopierings-
   * dialogen.
   *
   * @param {object[]} samples Stickprovsinformation.
   */
  setCopyableSamples(samples) {
    const select = this._doc.forms.copy.source;
    while (select.children.length > 1) {
      select.children[1].remove();
    }
    for (const { id, name } of samples ?? []) {
      select.appendChild(new Option(name, String(id)));
    }
    this._doc.getElementById('copy-btn').disabled = 0 === samples.length;
  }

  /**
   * Populera kopieringsdialogen med krav.
   *
   * Lägg till varje krav som en kryssruta i en lista.
   * Avaktivera kryssrutan för kommentarer om inget krav har någon kommentar.
   *
   * Första argumentet är en vektor med objekt som åtminstone har nycklarna
   * `id`, `clause` och `title` (alla strängar).
   *
   * @param {object[]} requirements Kravinformation.
   * @param {boolean}  notes        Anger om något krav har kommentarer.
   */
  setCopyableRequirements(requirements, notes) {
    const form = this._doc.forms.copy;
    const ul = form.querySelector('fieldset ul');
    ul.innerHTML = '';
    for (const { id, clause, title } of requirements ?? []) {
      const li = this._element(ul, 'li');
      const label = this._element(li, 'label', { class: 'cb' });
      const name = `cp-${id}`;
      this._element(label, 'input', { name, type: 'checkbox', value: id });
      this._element(label, 'span', {}, clause);
      this._element(label, 'span', {}, title);
    }
    form.notes.disabled = !notes;
  }

  /**
   * Sätt ikon och stickprovsnamn i sidrubriken.
   *
   * Om en länkadress angivits, lägg till ett `details`-element med en QR-kod
   * av adressen.
   *
   * @param {string} type  Stickprovstyp (document/screen/webpage).
   * @param {string} name  Stickprovets namn/titel.
   * @param {string} [url] Länkadress.
   */
  setHeading(type, name, url = null) {
    const h1 = this._article.querySelector('h1');
    const [svg, span] = h1.children;
    const types = {
      component: 'Komponent',
      document: 'Dokument',
      screen: 'Vy',
      webpage: 'Webbsida',
    };
    const ico = '../img/ikoner.svg';
    svg.setAttribute('aria-label', types[type] ?? 'okänd typ');
    svg.children[0].setAttribute('xlink:href', `${ico}#ico-${type}`);
    if (url) {
      const attrs = { href: url, target: '_blank' };
      const link = this._element(null, 'a', attrs, name);
      span.replaceWith(link);

      // Skapa `details`, ladda skript och generera QR-kod.
      const details = this._element(h1, 'details');
      this._element(details, 'summary', {}, 'QR-kod');
      const qr = this._element(details, 'div');
      try {
        new QRCodeGenerator(qr, { text: url, width: 128, height: 128 });
      } catch (err) {
        details.remove();
      }
    } else {
      span.textContent = name;
    }
  }

  /**
   * Uppdaterar förloppsindikatorn.
   *
   * @param {number} value Aktuellt värde.
   * @param {number} max   Maxvärde.
   * @param {string} label Ledtext.
   */
  setProgress(value, max, label) {
    const progress = this._article.querySelector('progress');
    progress.max = max;
    progress.value = value;
    progress.setAttribute('aria-label', label);
  }

  /**
   * Sätt länken för påbörja/fortsätt granskning.
   *
   * Sätt sökväg och textinnehåll  i länken. Om sökvägen är `null`, ta bort
   * `href`-attributet.
   *
   * @param {string} url  Sökväg.
   * @param {string} text Textinnehåll.
   */
  setResumeLink(url, text) {
    const link = this._doc.getElementById('resume');
    const span = link.children[1];
    span.textContent = text;

    if (null !== url) {
      link.href = url;
    } else {
      link.removeAttribute('href');
    }
  }

  // Åtkomstmetod för krav-id att kopiera.
  get sourceRequirements() {
    return [...this._doc.forms.copy.querySelectorAll('fieldset li')]
      .map((li) => li.children[0].children[0])
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);
  }

  // Åtkomstmetod för stickprovs-id att kopiera krav från.
  get sourceSample() {
    const value = this._doc.forms.copy.source.value;
    return '' === value ? -1 : Number(value);
  }

  /**
   * Markera eller avmarkera alla krav i kopieringsdialogen.
   *
   * Om alla krav är ikryssade, avmarkera alla. I annat fall, markera alla.
   *
   * @private
   * @param {Event} event Händelseinformation.
   */
  #checkOrUncheckAllRequirements(event) {
    const btn = event.currentTarget;
    const cbs = [...this._doc.forms.copy.querySelectorAll('fieldset li')].map(
      (li) => li.children[0].children[0]
    );
    const checked = 'check' === btn.dataset.value;
    cbs.forEach((cb) => (cb.checked = checked));

    const verb = checked ? 'Avmarkera' : 'Markera';
    btn.textContent = `${verb} alla`;
    btn.dataset.value = checked ? 'uncheck' : 'check';
  }
}

// Importera beroenden.
import { QRCodeGenerator } from './QRCodeGenerator.js';
import { ViewBase } from './ViewBase.js';

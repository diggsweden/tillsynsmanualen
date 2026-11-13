/**
 * Sök efter ord in Svenska Akademiens ordböcker.
 *
 * @license CC-BY 4.0
 * @see {@link https://svenska.se|Svenska Akademiens ordböcker}
 */

/**
 * Skapa och infoga sökformuläret.
 *
 * @param {HTMLElement} parent Element att infoga formuläret i.
 */
export default function initSAO(parent) {
  const fieldID = 'sao-search';
  const formID = 'sao-form';
  let p = parent.appendChild(document.createElement('p'));
  p.textContent =
    'Sök i Svenska Akademiens ordböcker för att avgöra om ' +
    'ett lånord kan anses etablerat i svenska språket.';
  p = parent.appendChild(document.createElement('p'));
  p.className = 'sao';
  form(document, formID);
  label(document, p, fieldID);
  search(document, p, formID, fieldID);
  button(document, p, formID);
}

/*
 * Skapa sökknappen.
 *
 * @param {Documetnt}   doc    DOM-dokument.
 * @param {HTMLElement} parent Föräldraelement.
 * @param {string}      id     Formuläridentitet.
 */
function button(doc, parent, id) {
  const button = parent.appendChild(doc.createElement('button'));
  button.textContent = 'Sök';
  button.setAttribute('form', id);
}

/**
 * Skapa formuläret.
 *
 * @param {Documetnt} doc DOM-dokument.
 * @param {string}    id  Formuläridentitet.
 */
function form(doc, id) {
  if (null === doc.getElementById(id)) {
    const article = doc.querySelector('article');
    const form = article.appendChild(doc.createElement('form'));
    form.action = 'https://svenska.se/tre/';
    form.hidden = true;
    form.id = id;
    form.target = 'sao';
  }
}

/**
 * Skapa ledtexten.
 *
 * @param {Documetnt}   doc    DOM-dokument.
 * @param {HTMLElement} parent Föräldraelement.
 * @param {string}      id     Fältidentitet.
 */
function label(doc, parent, id) {
  const label = parent.appendChild(doc.createElement('label'));
  label.htmlFor = id;
  label.textContent = 'Sökord';
}

/**
 * Skapa sökfältet.
 *
 * @param {Documetnt}   doc    DOM-dokument.
 * @param {HTMLElement} parent Föräldraelement.
 * @param {string}      form   Formulärdentitet.
 * @param {string}      id     Fältidentitet.
 */
function search(doc, parent, form, id) {
  const input = parent.appendChild(doc.createElement('input'));
  input.autocomplete = 'off';
  input.id = id;
  input.name = 'sok';
  input.type = 'search';
  input.setAttribute('form', form);
}

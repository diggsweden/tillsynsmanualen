/**
 * Modul för att spara användarinställngingar.
 *
 * @license CC-BY 4.0
 */

/**
 * Tillämpa användarens inställningar.
 *
 * @param {HTMLInputElement} focus Kryssruta för fokusmarkering.
 * @param {HTMLInputElement} font  Kryssruta för teckensnitt.
 */
function applySettings(focus, font) {
  const body = document.body.classList;
  const method = (input) => (input.checked ? 'add' : 'remove');
  body[method(focus)]('focus');
  body[method(font)]('font');
}

/**
 * Begär bekräftelse från användaren.
 *
 * @param {HTMLDialogElement} dialog  Dialogelement.
 * @param {HTMLButtonElement} trigger Knapp att fokusera vid stängning.
 * @return {Promise} Ett löfte som infrias med en acceptansflagga när användaren
 *                   stänger dialogen.
 */
function confirmDelete(dialog, trigger) {
  return new Promise((resolve) => {
    const onCancel = () => {
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('close', onClose);
      trigger?.focus();
      resolve(false);
    };

    const onClose = () => {
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('close', onClose);
      trigger?.focus();
      resolve('true' === dialog.returnValue);
    };

    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('close', onClose);
    dialog.showModal();
  });
}

/**
 * Radera all lagrad information.
 *
 * @param {HTMLDialogElement} dialog Bekräftelsedialog.
 * @param {HTMLButtonElement} button Återkallningsknappen.
 */
async function deleteStoredInformation(dialog, button) {
  const ok = await confirmDelete(dialog, button);
  if (!ok) return;
  settings.clear();
  await ConnectionFactory.destroy();
  showStatus('Alla lagrade uppgifter har raderats.');
}

/**
 * Dölj statusmeddelandet.
 */
function hideStatus() {
  const status = document.querySelector('[role="status"]');
  if ('' !== status.textContent) {
    status.textContent = '';
    status.classList.remove('success');
  }
}

/**
 * Visa ett statusmeddelande.
 *
 * @param {string} msg Statusmeddelande att visa.
 */
function showStatus(msg) {
  const status = document.querySelector('[role="status"]');
  status.textContent = msg;
  status.classList.add('success');
}

const [focus, font] = document.querySelectorAll('input[type="checkbox"]');
const [preview, save] = document.querySelectorAll('form button');
const settings = new SettingStorage();
const preferences = {
  focus: 'false' !== settings.read('styleFocus'),
  font: 'false' !== settings.read('styleFont'),
};

focus.checked = preferences.focus;
font.checked = preferences.font;

// Händelselyssnare för förhandsgranska-knappen.
preview.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  applySettings(focus, font);
  showStatus('Ändringarna är nu tillämpade.');
});

// Händelselyssnare för spara-knappen.
save.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  settings.write('styleFocus', String(focus.checked));
  settings.write('styleFont', String(font.checked));
  applySettings(focus, font);
  showStatus('Ändringarna har sparats i webbläsaren.');
});

// Dölj status vid ändringar.
document.forms[0].addEventListener('input', () => hideStatus());

if (settings.read('consent')) {
  document.getElementById('delete').hidden = false;
  const form = document.getElementById('recall-consent');
  const dialog = document.getElementById('confirm-dialog');
  dialog.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => dialog.close(btn.value));
  });
  form.addEventListener('submit', (event) => {
    event.stopPropagation();
    event.preventDefault();
    deleteStoredInformation(dialog, event.submitter);
  });
}

// Importera beroenden.
import { ConnectionFactory } from './db/ConnectionFactory.js';
import { SettingStorage } from './common/SettingStorage.js';

/**
 * Funktion för att visa/dölja ändringar i tillämpningsanvisningar.
 *
 * @license CC-BY 4.0
 */

/**
 * Växla mellan synliga och osynliga ändringar.
 *
 * @param {Event} event Händelseinformation.
 */
function toggleTrace(event) {
  event.preventDefault();
  event.stopPropagation();
  const button = event.target;
  const pressed = 'true' === button.getAttribute('aria-pressed');
  button.setAttribute('aria-pressed', String(!pressed));
  button.textContent = `${pressed ? 'Visa' : 'Dölj'} ändringar`;
  button.parentNode.parentNode.classList.toggle('trace');
}

document.querySelectorAll('.trace').forEach((p) => {
  const button = p.appendChild(document.createElement('button'));
  button.type = 'button';
  button.textContent = 'Visa ändringar';
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', toggleTrace);
});

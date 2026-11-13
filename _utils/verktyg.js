class UIControl {
  constructor(parent, controller, model) {
    this.#setUpOptions();
    this.#setUpLoad(parent, controller, model);
  }

  #addOption(name, value) {
    const template = document.getElementById('tool-option-template');
    const fragment = template.content.cloneNode(true);
    const [n, v, b] = fragment.children[0].children;
    n.innerText = name;
    v.innerText = value;
    b.setAttribute('aria-label', name);
    template.parentNode.insertBefore(fragment, template);
  }

  #checkRequired(field, message) {
    field.setCustomValidity('');
    if ('' === field.value) {
      field.setCustomValidity(message);
      field.reportValidity();
      return false;
    }
    return true;
  }

  async #loadModule(parent, controller, model) {
    const module = document.getElementById('tool-module');
    const status = document.querySelector('article > [role="status"]');
    const tbody = document.getElementById('tool-options');
    const options = { controller, model };
    status.innerText = '';
    parent.innerHTML = '<h3>Verktyg</h3>';
    for (const tr of tbody.rows) {
      options[tr.cells[0].innerText] = tr.cells[1].innerText;
    }
    try {
      const tool = await import(`../js/tools/${module.value}.js`);
      await tool.default(parent, options);
    } catch (err) {
      console.error(err);
      status.innerText = err.message;
    }
  }

  #setUpLoad(parent, controller, model) {
    const button = document.getElementById('tool-load');
    const module = document.getElementById('tool-module');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const ok = this.#checkRequired(module, 'Fyll i ett modulnamn.');
      if (ok) {
        this.#loadModule(parent, controller, model);
      }
    });
  }

  #setUpOptions() {
    const button = document.getElementById('tool-opt-add');
    const name = document.getElementById('tool-opt-name');
    const tbody = document.getElementById('tool-options');
    const value = document.getElementById('tool-opt-value');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const ok =
        this.#checkRequired(name, 'Fyll i ett parameternamn.') ||
        this.#checkRequired(value, 'Fyll i ett parametervärde.');
      if (ok) {
        this.#addOption(name.value, value.value);
        name.value = value.value = '';
        name.focus();
      }
    });
    tbody.addEventListener('click', (event) => {
      if ('BUTTON' === event.target.tagName) {
        event.preventDefault();
        event.stopPropagation();
        event.target.parentNode.parentNode.remove();
        name.focus();
      }
    });
  }
}

const ctrl = { setCheck: (id, state) => {} };
const model = {
  getAudit: async () => new Audit(42),
  getSample: async () => ({ auditID: 42 }),
};
const parent = document.querySelector('.tools');
new UIControl(parent, ctrl, model);

import { Audit } from '../js/model/Audit.js';

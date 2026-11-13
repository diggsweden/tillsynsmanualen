/**
 * Enhetstestfall för menybyggaren.
 *
 * @license CC-BY 4.0
 * @see MenuBuilder
 */

let builder;
let doc;
let placeholder;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Resursladdare.
  const response = {
    ok: true,
    json: async () => ({
      menu: [
        {
          label: 'Start',
          content: [
            { label: 'Start', url: '' },
            { label: 'About', url: 'start/about' },
          ],
        },
        {
          label: 'Audit',
          content: [
            { label: 'Welcome', url: 'audit/welcome' },
            {
              label: 'Checks',
              content: [
                { label: 'Web', url: 'audit/web' },
                { label: 'App', url: 'audit/app' },
              ],
            },
            { label: 'Instructions', url: 'audit/instr' },
          ],
        },
        {
          label: 'Legal',
          content: [{ label: 'Process', url: 'legal/process' }],
        },
      ],
    }),
  };

  const loader = async (url) =>
    ({
      '../../js/config/menu.json': response,
      '../../../js/config/menu.json': response,
    })[url];

  // Platshållarelementet.
  placeholder = {
    parentNode: mock({ replaceChild: (n, c) => c }),
  };

  // DOM-dokumentet.
  const element = (tag) => {
    const e = {
      tagName: tag,
      _attrs: [],
      _children: [],
      appendChild: (c) => (e._children.push(c), c),
      setAttribute: (n, v) => (e._attrs[n] = v),
    };
    doc._created.push(e);
    return e;
  };

  doc = {
    scripts: [{ src: 'https://digg.se/test/js/menu.module.js' }],
    _created: [],
    createElement: (t) => element(t),
  };

  // Skapa en byggarinstans.
  builder = new MenuBuilder(doc, loader);
});

it.with(
  ['https://digg.se/test/', '../..', 'startsidan'],
  ['https://digg.se/test/audit/web', '../../..', 'en undersida']
)(
  'bygger en menystruktur med {2} som aktiv sida',
  async (pathname, relPath) => {
    const label = 'Test';
    await builder.build(pathname, label, placeholder);

    // Ska ha skapat elementstrukturen.
    const c = doc._created;
    let i = 0;
    expect(c.length).toBe(28);

    expect(c[i].tagName).toBe('nav');
    expect(c[i++]._attrs['aria-label']).toBe(label);

    expect(c[i++].tagName).toBe('ul');

    expect(c[i++].tagName).toBe('li');
    expect(c[i].tagName).toBe('a');
    expect(c[i].href).toBe('#');
    expect(c[i++].textContent).toBe('Start');
    expect(c[i++].tagName).toBe('ul');
    expect(c[i++].tagName).toBe('li');
    expect(c[i].tagName).toBe('a');
    expect(c[i].href).toBe(`${relPath}/`);
    expect(c[i++].textContent).toBe('Start');
    expect(c[i++].tagName).toBe('li');
    expect(c[i].tagName).toBe('a');
    expect(c[i].href).toBe(`${relPath}/start/about`);
    expect(c[i++].textContent).toBe('About');

    expect(c[i++].tagName).toBe('li');
    expect(c[i].tagName).toBe('a');
    expect(c[i].href).toBe('#');
    expect(c[i++].textContent).toBe('Audit');
    expect(c[i++].tagName).toBe('ul');
    expect(c[i++].tagName).toBe('li');
    expect(c[i].tagName).toBe('a');
    expect(c[i].href).toBe(`${relPath}/audit/welcome`);
    expect(c[i++].textContent).toBe('Welcome');

    expect(c[i++].tagName).toBe('li');
    expect(c[i].tagName).toBe('a');
    expect(c[i].href).toBe('#');
    expect(c[i++].textContent).toBe('Checks');
    expect(c[i++].tagName).toBe('ul');
    expect(c[i++].tagName).toBe('li');
    expect(c[i].tagName).toBe('a');
    expect(c[i].href).toBe(`${relPath}/audit/web`);
    expect(c[i++].textContent).toBe('Web');
    expect(c[i++].tagName).toBe('li');
    expect(c[i].tagName).toBe('a');
    expect(c[i].href).toBe(`${relPath}/audit/app`);
    expect(c[i++].textContent).toBe('App');

    expect(c[i++].tagName).toBe('li');
    expect(c[i].tagName).toBe('a');
    expect(c[i].href).toBe(`${relPath}/audit/instr`);
    expect(c[i++].textContent).toBe('Instructions');

    expect(c[i++].tagName).toBe('li');
    expect(c[i].tagName).toBe('a');
    expect(c[i].href).toBe('#');
    expect(c[i++].textContent).toBe('Legal');
    expect(c[i++].tagName).toBe('ul');
    expect(c[i++].tagName).toBe('li');
    expect(c[i].tagName).toBe('a');
    expect(c[i].href).toBe(`${relPath}/legal/process`);
    expect(c[i++].textContent).toBe('Process');

    // Ska ha ersatt platshållarelementet med menyn.
    expect(placeholder.parentNode.replaceChild).toHaveBeenCalled.once();
  }
);

// Importera beroenden.
import { MenuBuilder } from '../../js/menu/MenuBuilder.js';
import { beforeEach, expect, it, mock } from '../functions.js';

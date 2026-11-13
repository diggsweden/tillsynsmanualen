/**
 * Enhetstestfall för resursladdaren.
 *
 * @license CC-BY 4.0
 * @see ResourceLoader
 */

const fetchAPI = (obj) => async (p) =>
  Object.entries(obj).reduce(
    (o, [method, map]) => ((o[method] = async () => map[p]), o),
    { ok: Object.values(obj).some((m) => Object.keys(m).includes(p)) }
  );

it('hämtar en konfiguration (JSON)', async () => {
  const config = { key: 'value' };
  const name = 'config';
  const path = `../js/config/${name}.json`;
  const mockLoader = fetchAPI({ json: { [path]: config } });
  const loader = new ResourceLoader(mockLoader);
  const result = await loader.configuration(name);
  expect(result).toBe(config);
});

it('hämtar ett innehållsfragment (HTML)', async () => {
  const content = '<p>Hello, World!</p>';
  const name = 'fragment';
  const path = `./pages/${name}.html`;
  const mockLoader = fetchAPI({ text: { [path]: content } });
  const loader = new ResourceLoader(mockLoader);
  const result = await loader.pageContent(name);
  expect(result).toBe(content);
});

it('hämtar ett malldokument (HTML)', async () => {
  const content = '<head></head><body></body>';
  const name = 'template';
  const path = `./templates/${name}.html`;
  const mockLoader = fetchAPI({ text: { [path]: content } });
  const loader = new ResourceLoader(mockLoader);
  const result = await loader.pageTemplate(name);
  expect(result).toBe(content);
});

it('hämtar en resursfil (text)', async () => {
  const content = 'Hello, World!';
  const name = 'dir/resource.js';
  const path = `../js/${name}`;
  const mockLoader = fetchAPI({ text: { [path]: content } });
  const loader = new ResourceLoader(mockLoader);
  const result = await loader.resource(name);
  expect(result).toBe(content);
});

it('importerar en JavaScript-modul', async () => {
  const module = { default: () => {} };
  const name = 'module.mjs';
  const path = `../${name}`;
  const mockLoader = async (p) => ({ [path]: module })[p];
  const loader = new ResourceLoader(mockLoader);
  const result = await loader.loadModule(name);
  expect(result).toBe(module);
});

// Importera beroenden.
import { ResourceLoader } from '../../js/common/ResourceLoader.js';
import { expect, it, mock } from '../functions.js';

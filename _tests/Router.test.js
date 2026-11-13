/**
 * Enhetstestfall för begäransväxeln.
 *
 * @license CC-BY 4.0
 * @see Router
 */

let content = { test: 'test-module.js' };
let loader;

// Skapa förustättningarna för varje test.
beforeEach(() => {
  loader = { configuration: async () => content };
});

it('växlar en begäran från kontexten', async () => {
  const context = { page: 'test', path: '?page=test' };
  const router = new Router('', loader);
  await router.loadConfig('test.json');
  expect(router.route(context)).toBe('../test-module.js');
});

it('växlar en begäran från modellen', async () => {
  const context = { page: 'test', path: '' };
  const path = '?page=test&foo=bar';
  const model = mock({ lastPath: path });
  const router = new Router('', loader);
  await router.loadConfig('test.json');
  expect(router.route(context, model)).toBe('../test-module.js');
  expect(context.path).toBe(path);
});

it('växlar en begäran från initial begäran', async () => {
  const context = { page: 'test', path: '' };
  const path = '?page=test';
  const router = new Router(path, loader);
  await router.loadConfig('test.json');
  expect(router.route(context)).toBe('../test-module.js');
  expect(context.path).toBe(path);
});

// Importera beroenden.
import { Router } from '../js/Router.js';
import { beforeEach, expect, it, mock } from './functions.js';

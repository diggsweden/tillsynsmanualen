/**
 * Enhetstestfall för tillsynskatalogredigeringssidans controller.
 *
 * @license CC-BY 4.0
 * @see DirectoryController
 */

let context;
let controller;
let form;
let model;
let view;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Modellen.
  model = mock.model({ caseDirectory: null }, {});

  // Formuläret.
  form = { action: '' };

  // Vyn.
  view = mock.view(
    {
      dir: '',
      form,
    },
    {}
  );

  // Applikationskontexten.
  context = mock.appContext();

  // Skapa en controller-instans.
  controller = new DirectoryController(model, view, mock.globals());
});

it('sparar en ny tillsynskatalog', async () => {
  const path = 'G:\\Test';
  await controller.prepare(context);
  expect(view.breadcrumbs.current).toBe('Ärendekatalog');

  // Simulera att användaren fyller i fältet och klickar på sparaknappen.
  view.dir = path;
  view.notify({ action: 'save', path: '?page=other', type: 'form' });

  await controller.handle(context);

  expect(model.caseDirectory).toBe(path);
  //2022-11-10: expect(context.status).not.toBe("");
});

it('populerar formuläret med befintlig tillsynskatalog', async () => {
  model.caseDirectory = 'G:\\Test';
  await controller.prepare(context);
  expect(view.breadcrumbs.current).toBe('Ärendekatalog');
  expect(view.dir).toBe(model.caseDirectory);
});

// Importera beroenden.
import { DirectoryController } from '../../js/controller/DirectoryController.js';
import { beforeEach, expect, it, mock } from '../functions.js';

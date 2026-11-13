/**
 * Enhetstestfall för fillagring.
 *
 * @license CC-BY 4.0
 * @see FileStorage
 */

it('sparar en strängvektor som CSV till fil', async () => {
  const data = ['foo\r\n', 'bar\r\n'];
  const name = 'test.csv';
  const link = mock(
    {
      download: '',
      href: '',
    },
    {
      click: () => {},
      remove: () => {},
    }
  );
  const doc = mock({ createElement: (tag) => ('a' === tag ? link : null) });
  const storage = new FileStorage();
  await storage.saveToCSVFile(name, data, doc);
  expect(link.download).toBe(name);
  expect(link.click).toHaveBeenCalled.once();
  expect(link.remove).toHaveBeenCalled.once();
});

it('sparar ett dokument som HTML till fil', async () => {
  const dataDoc = {
    documentElement: {
      outerHTML: '<html><head></head><body></body></html>',
    },
  };
  const name = 'test.html';
  const link = mock(
    {
      download: '',
      href: '',
    },
    {
      click: () => {},
      remove: () => {},
    }
  );
  const doc = mock({ createElement: (tag) => ('a' === tag ? link : null) });
  const storage = new FileStorage();
  await storage.saveToHTMLFile(name, dataDoc, doc);
  expect(link.download).toBe(name);
  expect(link.click).toHaveBeenCalled.once();
  expect(link.remove).toHaveBeenCalled.once();
});

it('sparar ett objekt som JSON till fil', async () => {
  const data = { foo: 'bar' };
  const name = 'test.json';
  const link = mock(
    {
      download: '',
      href: '',
    },
    {
      click: () => {},
      remove: () => {},
    }
  );
  const doc = mock({ createElement: (tag) => ('a' === tag ? link : null) });
  const storage = new FileStorage();
  await storage.saveToJSONFile(name, data, doc);
  expect(link.download).toBe(name);
  expect(link.click).toHaveBeenCalled.once();
  expect(link.remove).toHaveBeenCalled.once();
});

// Importera beroenden.
import { FileStorage } from '../../js/common/FileStorage.js';
import { expect, it, mock } from '../functions.js';

/**
 * Enhetestestfall för URL-parametrar.
 *
 * @license CC-BY 4.0
 * @see URLParameters
 */

it('omvandlar till en URI-kodad parametersträng', () => {
  const expected = 'space%20key=value&encoded=foo%3Dbar%26quux&baz';
  const params = new URLParameters();
  params.add('space key', 'value');
  params.add('encoded', 'foo=bar&quux');
  params.add('baz');
  expect(params.toString()).toBe(expected);
});

it('kopierar en annan instans', () => {
  const expected = 'space%20key=value&encoded=foo%3Dbar%26quux&baz';
  const p1 = new URLParameters();
  p1.add('space key', 'value');
  p1.add('encoded', 'foo=bar&quux');
  const p2 = new URLParameters(p1);
  p1.add('irrelevant');
  p2.add('baz');
  expect(p2.toString()).toBe(expected);
});

it('tar bort en tillagd parameter', () => {
  const expected = 'encoded=foo%3Dbar%26quux&baz';
  const params = new URLParameters();
  params.add('space key', 'value');
  params.add('encoded', 'foo=bar&quux');
  params.add('baz');
  params.delete('space key');
  expect(params.toString()).toBe(expected);
});

// Importera beroenden.
import { URLParameters } from '../../js/controller/URLParameters.js';
import { expect, it } from '../functions.js';

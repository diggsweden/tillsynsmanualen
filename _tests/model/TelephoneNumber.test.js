/**
 * Enhetstestfall för telefonnummer.
 *
 * @license CC-BY 4.0
 * @see TelephoneNumber
 */

it.with(
  ['häst'],
  ['0'],
  ['12345678'],
  ['0012345678']
)("refuserar '{0}' som värde", (value) => {
  expect.exception(() => new TelephoneNumber(value));
});

it.with(
  ['010-123 456', '010-12 34 56'],
  ['0123/45678', '0123-456 78'],
  ['070-123-4567', '070-123 45 67'],
  ['0771234567', '0771-23 45 67'],
  ['081234567', '08-123 45 67']
)("formaterar '{0}' som '{1}'", (input, output) => {
  const num = new TelephoneNumber(input);
  expect(num.toString()).toBe(output);
});

// Importera beroenden.
import { TelephoneNumber } from '../../js/model/TelephoneNumber.js';
import { describe, expect, it } from '../functions.js';

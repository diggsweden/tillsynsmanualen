/**
 * Enhetstestfall för organisationsnummer.
 *
 * @license CC-BY 4.0
 * @see RegistrationNumber
 */

// Ogiltiga organisationsnummer ska generera fel i konstruktorn.
it.with(
  ['häst'],
  ['202100688'],
  ['2021006882'],
  ['2021006884']
)("refuserar '{0}' som värde", (value) => {
  expect
    .exception(() => new RegistrationNumber(value))
    .toBeAnInstanceOf(ValidationError);
});

// Giltiga organisationsnummer ska formateras i konstruktorn.
it('formaterar med bindestreck före 7:e siffran', () => {
  const num = new RegistrationNumber('2021006883');
  expect(num.toString()).toBe('202100-6883');
});

// Importera beroenden.
import { RegistrationNumber } from '../../js/model/RegistrationNumber.js';
import { ValidationError } from '../../js/model/ValidationError.js';
import { describe, expect, it } from '../functions.js';

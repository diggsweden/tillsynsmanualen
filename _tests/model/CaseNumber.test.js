/**
 * Enhetstestfall för ärendenummer.
 *
 * @license CC-BY 4.0
 * @see CaseNumber
 */

it.with(
  ['häst'],
  ['0'],
  ['1-2'],
  ['1234-5678'],
  ['2020-0'],
  [`${new Date().getFullYear() + 1}-1`]
)("refuserar '{0}' som värde", (value) => {
  expect.exception(() => new CaseNumber(value));
});

it.with(
  ['2020-1', '2020-1'],
  ['2020-0001', '2020-0001'],
  ['2020-12', '2020-12'],
  ['2020-123', '2020-123'],
  ['2020-1234', '2020-1234'],
  ['2025-123456', '2025-123456'],
  [20200001, '2020-0001'],
  [20200012, '2020-0012'],
  [20200123, '2020-0123'],
  [20201234, '2020-1234']
)("formaterar '{0}' som '{1}'", (input, output) => {
  const num = new CaseNumber(input);
  expect(num.toString()).toBe(output);
});

it.with(
  ['2020-1', 2020, 1, 20201],
  [20200001, 2020, 1, 20200001],
  ['2021-0001', 2021, 1, 20210001],
  ['2022-12', 2022, 12, 202212],
  [20220012, 2022, 12, 20220012],
  ['2020-123', 2020, 123, 2020123],
  [20200123, 2020, 123, 20200123],
  ['2021-1234', 2021, 1234, 20211234],
  [20211234, 2021, 1234, 20211234],
  ['2025-123456', 2025, 123456, 2025123456],
  [2025123456, 2025, 123456, 2025123456]
)("identifierar '{0}' som '{3}'", (input, year, serial, id) => {
  const num = new CaseNumber(input);
  expect(num.year).toBe(year);
  expect(num.serial).toBe(serial);
  expect(num.id).toBe(id);
});

// Importera beroenden.
import { CaseNumber } from '../../js/model/CaseNumber.js';
import { describe, expect, it } from '../functions.js';

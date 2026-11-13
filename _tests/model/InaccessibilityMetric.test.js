/**
 * Enhetstestfall för mätetal för otillgänglgihet hos webbsidor.
 *
 * @license CC-BY 4.0
 * @see InaccessibilityMetric
 */

it('returnerar 0 om inget krav är underkänt', () => {
  const metric = new InaccessibilityMetric();
  expect(metric.score(20, {})).toBe(0);
});

it('returnerar 500 om alla krav är underkända', () => {
  const data = {
    '1.1.1': 20,
    '1.2.1': 20,
    '1.2.2': 20,
    '1.2.3': 20,
    '1.2.4': 20,
    '1.2.5': 20,
    '1.3.1': 20,
    '1.3.2': 20,
    '1.3.3': 20,
    '1.3.4': 20,
    '1.3.5': 20,
    '1.4.1': 20,
    '1.4.2': 20,
    '1.4.3': 20,
    '1.4.4': 20,
    '1.4.5': 20,
    '1.4.10': 20,
    '1.4.11': 20,
    '1.4.12': 20,
    '1.4.13': 20,
    '2.1.1': 20,
    '2.1.2': 20,
    '2.1.4': 20,
    '2.2.1': 20,
    '2.2.2': 20,
    '2.3.1': 20,
    '2.4.1': 20,
    '2.4.2': 20,
    '2.4.3': 20,
    '2.4.4': 20,
    '2.4.5': 20,
    '2.4.6': 20,
    '2.4.7': 20,
    '2.5.1': 20,
    '2.5.2': 20,
    '2.5.3': 20,
    '2.5.4': 20,
    '3.1.1': 20,
    '3.1.2': 20,
    '3.2.1': 20,
    '3.2.2': 20,
    '3.2.3': 20,
    '3.2.4': 20,
    '3.3.1': 20,
    '3.3.2': 20,
    '3.3.3': 20,
    '3.3.4': 20,
    '4.1.1': 20,
    '4.1.2': 20,
    '4.1.3': 20,
  };
  const metric = new InaccessibilityMetric();
  expect(Math.abs(500 - metric.score(20, data)) < 1e-5).toBe(true);
});

it('ignorerar krav utanför WACG 2.1 A/AA', () => {
  const metric = new InaccessibilityMetric();
  expect(metric.score(20, { 5.3: 20, 11.7: 20 })).toBe(0);
});

it('beräknar ett kravs inverkan på resultatet', () => {
  const data = { '1.1.1': 20, '1.2.1': 0 };
  const metric = new InaccessibilityMetric();
  const score = metric.score(20, data);
  const imp = metric.impact(20, data);
  expect(Object.keys(imp)).toEqual(['1.1.1']);
  expect(Math.abs(imp['1.1.1'] - score) < 1e-5).toBe(true);
});

it.with(
  [0, 'full', 'helt'],
  [9, 'full', 'helt'],
  [10, 'partial', 'delvis'],
  [79, 'partial', 'delvis'],
  [80, 'none', 'inte']
)('returnerar {2} förenlig för mätetal {0}', (score, compliance) => {
  const metric = new InaccessibilityMetric();
  expect(metric.compliance(score)).toBe(compliance);
});

// Importera beroenden.
import { InaccessibilityMetric } from '../../js/model/InaccessibilityMetric.js';
import { expect, it } from '../functions.js';

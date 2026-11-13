/**
 * Enhetstestfall för tillsynsplaner.
 *
 * @license CC-BY 4.0
 * @see Schedule
 */

describe('Åtkomstmetoder och validering', () => {
  it('refuserar ett ogiltigt ärendenummer', () => {
    const schedule = new Schedule();
    expect
      .exception(() => (schedule.caseNumber = 'invalid'))
      .toBeAnInstanceOf(ValidationError);
  });

  it('returnerar ett formaterat giltigt ärendenummer', () => {
    const schedule = new Schedule();
    schedule.caseNumber = '20201234';
    expect(schedule.caseNumber.toString()).toBe('2020-1234');
  });

  it('returnerar angiven identitet', () => {
    const id = 42;
    const schedule = new Schedule();
    schedule.id = id;
    expect(schedule.id).toBe(id);
  });

  it('ignorerar försök att ändra identitet', () => {
    const id = 42;
    const schedule = new Person();
    schedule.id = id;
    schedule.id = 69; // Ska ignoreras.
    expect(schedule.id).toBe(id);
  });

  it.with(
    ['begins'],
    ['date'],
    ['ends']
  )("returnerar ett giltigt datum för fältet '{0}'", (field) => {
    const now = new Date();
    const schedule = new Schedule();
    schedule[field] = now;
    expect(schedule[field]).toEqual(now);
  });

  it('refuserar ett framtida beslutsdatum', () => {
    const schedule = new Schedule();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect
      .exception(() => (schedule.date = tomorrow))
      .toBeAnInstanceOf(ValidationError);
  });

  it('returnerar tillsynsansvarig', () => {
    const schedule = new Schedule();
    const supervisor = {};
    schedule.supervisor = supervisor;
    expect(schedule.supervisor).toBe(supervisor);
  });

  it.with(
    ['2020-01-01', '2021-12-22', '2020–2021'],
    ['2022-01-01', '2022-12-22', '2022']
  )("formaterar period som '{2}'", (begins, ends, period) => {
    const schedule = new Schedule();
    schedule.begins = new Date(begins);
    schedule.ends = new Date(ends);
    expect(schedule.period).toBe(period);
  });
});

describe('Omvandling', () => {
  let data;

  beforeEach(() => {
    data = {
      begins: 1577836800000,
      case: 20201388,
      date: 1599004800000,
      ends: 1640131200000,
      supervisor: { email: 'a@b', fName: '', gName: '' },
    };
  });

  it('återskapar en instans från ett dataobjekt', () => {
    const schedule = new Schedule(data);
    expect(schedule).toBeAnInstanceOf(Schedule);
    expect(schedule.begins.getTime()).toBe(data.begins);
    expect(schedule.date.getTime()).toBe(data.date);
    expect(schedule.ends.getTime()).toBe(data.ends);
    expect(schedule.caseNumber.id).toBe(data.case);
    expect(schedule.supervisor).toBeAnInstanceOf(Person);
  });

  it('serialiserar en instans för lagring i databasen', () => {
    const schedule = new Schedule(data);
    expect(schedule.serialize()).toEqual(data);
  });

  it('genererar ett objekt vid omvandling till JSON', () => {
    const schedule = new Schedule(data);
    expect(schedule.toJSON()).toEqual(data);
  });

  it('omvandlar till sträng som <ärendenummer>', () => {
    const caseNo = '2020-1234';
    const schedule = new Schedule();
    schedule.caseNumber = caseNo;
    expect(schedule.toString()).toBe(caseNo);
  });
});

// Importera beroenden.
import { Person } from '../../js/model/Person.js';
import { Schedule } from '../../js/model/Schedule.js';
import { ValidationError } from '../../js/model/ValidationError.js';
import { beforeEach, describe, expect, it } from '../functions.js';

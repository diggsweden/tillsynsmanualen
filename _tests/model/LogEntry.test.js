/**
 * Enhetstestfall för loggnotering i ärendeloggen.
 *
 * @license CC-BY 4.0
 * @see LogEntry
 */

describe('Åtkomstmetoder och validering', () => {
  it('returnerar en angiven ärendeideentitet', () => {
    const id = 20201234;
    const entry = new LogEntry(id);
    expect(entry.caseID).toBe(id);
  });

  it('returnerar ett angivet datavärde', () => {
    const entry = new LogEntry(20201234);
    const data = 42;
    entry.data = data;
    expect(entry.data).toBe(data);
  });

  it.with(
    [LogEntry.Direction.None],
    [LogEntry.Direction.Received],
    [LogEntry.Direction.Sent]
  )("returnerar en giltig kommunikationsriktning för '{0}'", (dir) => {
    const entry = new LogEntry(20201234);
    entry.direction = dir;
    expect(entry.direction).toBe(dir);
  });

  it('ignorerar en ogiltig kommunikationsriktning', () => {
    const entry = new LogEntry(20201234);
    entry.direction = 'invalid';
    expect(entry.direction).toBe('');
  });

  it('returnerar identitet i databasen', () => {
    const entry = new LogEntry(20201234);
    const id = 42;
    entry.id = id;
    expect(entry.id).toBe(id);
  });

  it('returnerar en trimmad sammanfattning', () => {
    const entry = new LogEntry(20201234);
    const summary = 'test summary';
    entry.summary = ` ${summary} `;
    expect(entry.summary).toBe(summary);
  });

  it('returnerar en trimmad anteckningstext', () => {
    const entry = new LogEntry(20201234);
    const text = 'test text';
    entry.text = ` ${text} `;
    expect(entry.text).toBe(text);
  });

  it('returnerar en angiven tidsstämpel', () => {
    const entry = new LogEntry(20201234);
    const date = new Date('2020-09-23T12:34:56+02:00');
    entry.timestamp = date;
    expect(entry.timestamp).toEqual(date);
  });

  it.with(
    [LogEntry.EntryType.ActionPlan],
    [LogEntry.EntryType.AuditStart],
    [LogEntry.EntryType.AuditFinish],
    [LogEntry.EntryType.AuditStart],
    [LogEntry.EntryType.CaseOpen],
    [LogEntry.EntryType.Deferment],
    [LogEntry.EntryType.Email],
    [LogEntry.EntryType.Injunction],
    [LogEntry.EntryType.Letter],
    [LogEntry.EntryType.Minutes],
    [LogEntry.EntryType.Note],
    [LogEntry.EntryType.Notification],
    [LogEntry.EntryType.Other],
    [LogEntry.EntryType.Remarks],
    [LogEntry.EntryType.Telephone]
  )("returnerar en giltig noteringstyp för '{0}'", (type) => {
    const entry = new LogEntry(20201234);
    entry.type = type;
    expect(entry.type).toBe(type);
  });

  it('ignorerar en ogiltig anteckningstyp', () => {
    const entry = new LogEntry(20201234);
    entry.type = 'invalid';
    expect(entry.type).toBe('');
  });
});

describe('Omvandling', () => {
  it('återskapar en minimal instans från ett dataobjekt', () => {
    const data = { time: 1600857296000 };
    const entry = new LogEntry(20201234, data);
    expect(entry.data).toBe(undefined);
    expect(entry.direction).toBe('');
    expect(entry.summary).toBe('');
    expect(entry.text).toBe('');
    expect(entry.timestamp.getTime()).toBe(data.time);
    expect(entry.type).toBe('');
  });

  it('återskapar en maximal instans från ett dataobjekt', () => {
    const data = {
      caseID: 20201234,
      data: 'test data',
      dir: LogEntry.Direction.Sent,
      summary: 'test',
      text: 'test text',
      time: 1600857296000,
      type: LogEntry.EntryType.Other,
    };
    const entry = new LogEntry(20201234, data);
    expect(entry.data).toBe(data.data);
    expect(entry.direction).toBe(data.dir);
    expect(entry.summary).toBe(data.summary);
    expect(entry.text).toBe(data.text);
    expect(entry.timestamp.getTime()).toBe(data.time);
    expect(entry.type).toBe(data.type);
  });

  it('refuserar att återskapa om ärendeidentiteten misstämmer', () => {
    const data = {
      caseID: 20202345,
      time: 1600857296000,
    };
    expect.exception(() => new LogEntry(20201234, data));
  });

  it('serialiserar en minimal instans för lagring i databasen', () => {
    const caseID = 20201234;
    const entry = new LogEntry(caseID);
    const id = 42;
    const time = new Date('2020-09-23T12:34:56+02:00');
    const type = LogEntry.EntryType.Other;
    entry.id = id; // Ska ignoreras.
    entry.timestamp = time;
    expect(entry.serialize()).toEqual({
      caseID,
      time: time.getTime(),
      type,
    });
  });

  it('serialiserar en maximal instans för lagring i databasen', () => {
    const caseID = 20201234;
    const data = 'test data';
    const dir = LogEntry.Direction.Sent;
    const entry = new LogEntry(caseID);
    const id = 42;
    const summary = 'Test';
    const text = 'test';
    const time = new Date('2020-09-23T12:34:56+02:00');
    const type = LogEntry.EntryType.Other;
    entry.data = data;
    entry.direction = dir;
    entry.id = id; // Ska ignoreras.
    entry.summary = summary;
    entry.text = text;
    entry.timestamp = time;
    entry.type = type;
    expect(entry.serialize()).toEqual({
      caseID,
      data,
      dir,
      summary,
      text,
      time: time.getTime(),
      type,
    });
  });

  it('returnerar ett objekt vid omvandling till JSON (minimalt)', () => {
    const entry = new LogEntry(20201234);
    const time = new Date('2020-09-23T12:34:56+02:00');
    const type = LogEntry.EntryType.Other;
    entry.timestamp = time;
    expect(entry.toJSON()).toEqual({
      time: time.getTime(),
      type,
    });
  });

  it('returnerar ett objekt vid omvandling till JSON (maximalt)', () => {
    const data = 42;
    const dir = LogEntry.Direction.Sent;
    const entry = new LogEntry(20201234);
    const summary = 'Test';
    const text = 'test';
    const time = new Date('2020-09-23T12:34:56+02:00');
    const type = LogEntry.EntryType.Other;
    entry.data = data;
    entry.direction = dir;
    entry.summary = summary;
    entry.text = text;
    entry.timestamp = time;
    entry.type = type;
    expect(entry.toJSON()).toEqual({
      data,
      dir,
      summary,
      text,
      time: time.getTime(),
      type,
    });
  });

  it('omvandlar en loggnotering till en sträNg', () => {
    const entry = new LogEntry(20201234);
    const time = entry.timestamp.toLocaleString('sv');
    expect(entry.toString()).toBe(time);
  });
});

// Importera beroenden.
import { LogEntry } from '../../js/model/LogEntry.js';
import { beforeEach, describe, expect, it } from '../functions.js';

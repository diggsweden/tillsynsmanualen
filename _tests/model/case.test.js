/**
 * Enhetstestfall för gransknings- och tillsynsärenden.
 *
 * @license CC-BY 4.0
 * @see AuditCasse
 * @see CasseFactory
 * @see ComplaintCase
 * @see MonitoringCase
 */

describe('AuditCase', () => {
  it('refuserar ett ogiltigt ärendenummer', () => {
    const aCase = new AuditCase();
    expect.exception(() => (aCase.caseNumber = 'invalid'));
  });

  it('returnerar ett formaterat giltigt ärendenummer', () => {
    const aCase = new AuditCase();
    aCase.caseNumber = '20201234';
    expect(aCase.caseNumber.toString()).toBe('2020-1234');
  });

  it('returnerar angiven identitet', () => {
    const aCase = new AuditCase();
    const id = 42;
    aCase.id = id;
    expect(aCase.id).toBe(id);
  });

  it('ignorerar försök att ändra identitet', () => {
    const aCase = new AuditCase();
    const id = 42;
    aCase.id = id;
    aCase.id = 69; // Ska ignoreras.
    expect(aCase.id).toBe(id);
  });

  it('returnerar en angiven organisation', () => {
    const aCase = new AuditCase();
    const org = {};
    aCase.organization = org;
    expect(aCase.organization).toBe(org);
  });

  it('returnerar en angiven digital service', () => {
    const aCase = new AuditCase();
    const app = {};
    aCase.service = app;
    expect(aCase.service).toBe(app);
  });

  it("returnerar 'namnlös.json' som filnamn utan ärendenummer", () => {
    const aCase = new AuditCase();
    expect(aCase.filename).toBe('namnlös.json');
  });

  it("returnerar '<ärendenr>.json' som filnamn utan tjänstenamn", () => {
    const aCase = new AuditCase();
    const caseNo = '2020-1234';
    aCase.caseNumber = caseNo;
    expect(aCase.filename).toBe(`${caseNo}.json`);
  });

  it("returnerar '<ärendenr> <tjänst>.json' som komplett filnamn", () => {
    const aCase = new AuditCase();
    const caseNo = '2020-1234';
    const service = 'example.com';
    aCase.caseNumber = caseNo;
    aCase.service = { name: `*${service}?` }; // Ska filtreras.
    expect(aCase.filename).toBe(`${caseNo} ${service}.json`);
  });

  it('returnerar tidigare satt filnamn', () => {
    const aCase = new AuditCase();
    const name = 'test.json';
    aCase.filename = name;
    expect(aCase.filename).toBe(name);
  });

  it('identifierar sig inte som tillsynsärende', () => {
    const aCase = new AuditCase();
    expect(aCase.monitoring).toBe(false);
  });

  it("returnerar 'granskningsärende' som ärendetyp", () => {
    const aCase = new AuditCase();
    expect(aCase.type).toBe('audit');
  });

  it('signalerar fel vid försök att ändra ärendetyp', () => {
    const aCase = new AuditCase();
    expect.exception(() => (aCase.type = 'monitoring'));
  });

  it('öppnar ett ärende', () => {
    const aCase = new AuditCase();
    expect(aCase.opened).toBe(undefined);
    aCase.open();
    expect(aCase.opened).not.toBe(undefined);
  });

  it('öppnar ett ärende med angiven tidsstämpel', () => {
    const aCase = new AuditCase();
    const date = new Date('2020-09-23T12:34:56+02:00');
    aCase.open(date);
    expect(aCase.opened).toEqual(date);
  });

  it('signalerar fel vid öppning av ett redan öppet ärende', () => {
    const aCase = new AuditCase();
    aCase.open();
    expect.exception(() => aCase.open());
  });

  it('refuserar tillägg av loggnotering utan id', () => {
    const aCase = new AuditCase();
    expect.exception(() => aCase.setEntry({ foo: 'bar' }));
  });

  it('lägger till en notering i ärendeloggen', () => {
    const aCase = new AuditCase();
    aCase.setEntry({ id: 13 });
    expect(aCase.logSize).toBe(1);
  });

  it('returnerar loggnoteringen med angiven identitet', () => {
    const aCase = new AuditCase();
    const entry = { id: 13 };
    aCase.setEntry(entry);
    expect(aCase.entry(entry.id)).toBe(entry);
    expect(aCase.entry(42)).toBe(undefined);
  });

  it('genererar alla tillagda loggnoteringar', () => {
    const aCase = new AuditCase();
    const entries = [{ id: 13 }, { id: 42 }, { id: 69 }];
    entries.forEach((entry) => aCase.setEntry(entry));
    expect(Array.from(aCase.log())).toEqual(entries);
  });

  it('tar bort angiven loggnotering', () => {
    const aCase = new AuditCase();
    const entry = { id: 13 };
    aCase.setEntry(entry);
    expect(aCase.entry(entry.id)).toBe(entry);
    expect(aCase.deleteEntry(entry)).toBe(true);
    expect(aCase.deleteEntry(entry)).toBe(false);
    expect(aCase.entry(entry.id)).toBe(undefined);
  });

  it('returnerar antalet noteringar i ärendeloggen', () => {
    const aCase = new AuditCase();
    expect(aCase.logSize).toBe(0);
    aCase.setEntry({ id: 13 });
    aCase.setEntry({ id: 42 });
    expect(aCase.logSize).toBe(2);
  });

  it('refuserar tillägg av granskning utan id', () => {
    const aCase = new AuditCase();
    expect.exception(() => aCase.setAudit({ foo: 'bar' }));
  });

  it('returnerar angiven granskning', () => {
    const aCase = new AuditCase();
    const audit = { id: 13 };
    aCase.setAudit(audit);
    expect(aCase.audit(audit.id)).toBe(audit);
    expect(aCase.audit(42)).toBe(undefined);
  });

  it('tar bort angiven granskning', () => {
    const aCase = new AuditCase();
    const audit = { id: 13 };
    aCase.setAudit(audit);
    expect(aCase.audit(audit.id)).toBe(audit);
    aCase.deleteAudit(audit);
    expect(aCase.audit(audit.id)).toBe(undefined);
  });

  it('genererar alla tillagda granskningar', () => {
    const aCase = new AuditCase();
    const audits = [{ id: 13 }, { id: 42 }, { id: 69 }];
    audits.forEach((audit) => aCase.setAudit(audit));
    expect(Array.from(aCase.audits())).toEqual(audits);
  });

  it('omvandlar till sträng som <ärendenummer>', () => {
    const aCase = new AuditCase();
    const caseNo = '2020-1234';
    aCase.caseNumber = caseNo;
    expect(aCase.toString()).toBe(caseNo);
  });

  it('returnerar "namnlöst ärende" vid omvandling utan ärendenr', () => {
    const aCase = new AuditCase();
    const caseNo = '2020-1234';
    aCase.caseNumber = caseNo;
    expect(aCase.toString()).toBe(caseNo);
  });

  it('serialiserar ett minimalt ärende för lagring i databasen', () => {
    const aCase = new AuditCase();
    const caseNo = 20201234;
    aCase.caseNumber = caseNo;
    expect(aCase.serialize()).toEqual({
      class: 'AuditCase',
      cn: caseNo,
      org: {},
      service: undefined,
    });
  });

  it('serialiserar ett maximalt ärende för lagring i databasen', () => {
    const aCase = new AuditCase();
    const caseNo = 20201234;
    const date = new Date('2020-09-23T12:34:56+02:00');
    const filename = 'test.json';
    aCase.caseNumber = caseNo;
    aCase.filename = filename;
    aCase.open(date);
    aCase.setEntry({ id: 13 }); // Ska ignoreras.
    aCase.setAudit({ id: 42 }); // Ska ignoreras.
    expect(aCase.serialize()).toEqual({
      class: 'AuditCase',
      file: filename,
      cn: caseNo,
      opened: date.getTime(),
      org: {},
      service: undefined,
    });
  });

  it('rekonstruerar ett minimalt ärende från ett dataobjekt', () => {
    const caseNo = 20201234;
    const org = null;
    const service = null;
    const data = {
      class: 'AuditCase',
      cn: caseNo,
      org,
      service,
    };
    const aCase = new AuditCase(data);
    expect(aCase.caseNumber.id).toBe(caseNo);
    expect(aCase.filename).toBe('2020-1234.json');
    expect(aCase.opened).toBe(undefined);
  });

  it('rekonstruerar ett maximalt ärende från ett dataobjekt', () => {
    const caseNo = 20201234;
    const date = new Date('2020-09-23T12:34:56+02:00');
    const filename = 'test.json';
    const org = null;
    const service = null;
    const data = {
      class: 'AuditCase',
      file: filename,
      cn: caseNo,
      opened: date.getTime(),
      org,
      service,
    };
    const aCase = new AuditCase(data);
    expect(aCase.caseNumber.id).toBe(caseNo);
    expect(aCase.filename).toBe(filename);
    expect(aCase.opened).toEqual(date);
  });

  it('genererar ett objekt vid omvandling till JSON (minimalt)', () => {
    const aCase = new AuditCase();
    const caseNo = 20201234;
    aCase.caseNumber = caseNo;
    expect(aCase.toJSON()).toEqual({
      class: 'AuditCase',
      cn: caseNo,
      org: {},
      service: undefined,
    });
  });

  it('genererar ett objekt vid omvandling till JSON (maximalt)', () => {
    const aCase = new AuditCase();
    const audit = { id: 13, toJSON: () => ({ id: 13 }) };
    const caseNo = 20201234;
    const date = new Date('2020-09-23T12:34:56+02:00');
    const entry = { id: 42, toJSON: () => ({ id: 42 }) };
    const filename = 'test.json';
    aCase.caseNumber = caseNo;
    aCase.filename = filename;
    aCase.open(date);
    aCase.setEntry(entry);
    aCase.setAudit(audit);
    expect(aCase.toJSON()).toEqual({
      audits: [audit.toJSON()],
      class: 'AuditCase',
      entries: [entry.toJSON()],
      file: filename,
      cn: caseNo,
      opened: date.getTime(),
      org: {},
      service: undefined,
    });
  });

  it('rekonstruerar en instans från JSON-data (minimalt)', () => {
    const caseNo = 20201234;
    const org = null;
    const service = null;
    const data = {
      class: 'AuditCase',
      cn: caseNo,
      org,
      service,
    };
    const aCase = new AuditCase(data);
    expect(aCase.caseNumber.id).toBe(caseNo);
    expect(aCase.filename).toBe('2020-1234.json');
    expect(aCase.opened).toBe(undefined);
  });

  it('rekonstruerar en instans från JSON-data (maximalt)', () => {
    const caseNo = 20201234;
    const date = new Date('2020-09-23T12:34:56+02:00');
    const filename = 'test.json';
    const org = null;
    const service = null;
    const data = {
      audits: [{}],
      class: 'AuditCase',
      entries: [{}],
      file: filename,
      cn: caseNo,
      opened: date.getTime(),
      org,
      service,
    };
    const aCase = new AuditCase(data);
    expect(aCase.caseNumber.id).toBe(caseNo);
    expect(aCase.filename).toBe(filename);
    expect(aCase.opened).toEqual(date);
  });
});

describe('ComplaintCase', () => {
  it('returnerar ett giltigt beslutsdatum', () => {
    const aCase = new ComplaintCase();
    const date = new Date('2020-09-23');
    aCase.date = date;
    expect(aCase.date).toEqual(date);
  });

  it('refuserar ett framtida beslutsdatum', () => {
    const aCase = new ComplaintCase();
    const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect
      .exception(() => (aCase.date = date))
      .toBeAnInstanceOf(ValidationError);
  });

  it('returnerar tillsynsansvarig', () => {
    const aCase = new ComplaintCase();
    const supervisor = {};
    aCase.supervisor = supervisor;
    expect(aCase.supervisor).toBe(supervisor);
  });

  it('identifierar sig som tillsynsärende', () => {
    const aCase = new ComplaintCase();
    expect(aCase.monitoring).toBe(true);
  });

  it('returnerar rättslig grund', () => {
    const aCase = new ComplaintCase();
    expect(aCase.sections).toEqual([[16], [18]]);
  });

  it("returnerar 'anmälningsärende' som ärendetyp", () => {
    const aCase = new ComplaintCase();
    expect(aCase.type).toBe('complaint');
  });

  it('serialiserar ett anmälningsärende för lagring i databasen', () => {
    const aCase = new ComplaintCase();
    const caseNo = 20201388;
    const date = new Date('2020-09-02');
    aCase.caseNumber = caseNo;
    aCase.date = date;
    expect(aCase.serialize()).toEqual({
      class: 'ComplaintCase',
      date: date.getTime(),
      cn: caseNo,
      org: {},
      service: undefined,
      supervisor: undefined,
    });
  });

  it.with(
    [
      {
        auth: true,
        class: 'MobileApp',
        name: 'Test',
        os: 'iOS',
      },
      MobileApp,
      'mobil applikation',
    ],
    [
      {
        access: 'intranet',
        class: 'Website',
        name: 'Intranätet',
      },
      Website,
      'webbplats',
    ]
  )(
    'bygger ett anmälningsärende för en {2} från ett dataobjekt',
    (service, serviceClass) => {
      const data = {
        class: 'ComplaintCase',
        cn: 20201234,
        date: 1600819200000,
        org: {
          email: 'info@digg.se',
          name: 'Myndigheten för digital förvaltning',
          regNo: '202100-6883',
          tel: '0771-11 44 00',
        },
        supervisor: {
          email: 'julia.jurist@digg.se',
          familyName: 'Jurist',
          givenName: 'Julia',
          roles: ['supervisor'],
          telephone: '0771-11 44 00',
        },
      };
      data.service = service;
      const aCase = new ComplaintCase(data);
      expect(aCase).toBeAnInstanceOf(ComplaintCase);
      expect(aCase.caseNumber.id).toBe(data.cn);
      expect(aCase.date.getTime()).toBe(data.date);
      expect(aCase.service).toBeAnInstanceOf(serviceClass);
      expect(aCase.supervisor.email).toBe(data.supervisor.email);
    }
  );

  it.with(
    [
      {
        auth: true,
        class: 'MobileApp',
        name: 'Test',
        os: 'iOS',
      },
      MobileApp,
      'mobil applikation',
    ],
    [
      {
        access: 'intranet',
        class: 'Website',
        name: 'Intranätet',
      },
      Website,
      'webbplats',
    ]
  )(
    'rekonstruerar ett anmälningsärende för en {2} från ett dataobjekt',
    (service, serviceClass) => {
      const data = {
        class: 'ComplaintCase',
        cn: 20201234,
        date: 1600819200000,
        org: {
          email: 'info@digg.se',
          name: 'Myndigheten för digital förvaltning',
          regNo: '202100-6883',
          tel: '0771-11 44 00',
        },
        supervisor: {
          email: 'julia.jurist@digg.se',
          familyName: 'Jurist',
          givenName: 'Julia',
          roles: ['supervisor'],
          telephone: '0771-11 44 00',
        },
      };
      data.service = service;
      const aCase = new ComplaintCase(data);
      expect(aCase.caseNumber.id).toBe(data.cn);
      expect(aCase.date.getTime()).toBe(data.date);
      expect(aCase.service).toBeAnInstanceOf(serviceClass);
      expect(aCase.supervisor.email).toBe(data.supervisor.email);
    }
  );

  it('omvandlar ett övervakningsärende', () => {
    const fromCase = new MonitoringCase({
      class: 'MonitoringCase',
      cn: 20201234,
      org: {
        abbr: 'DIGG',
        addr: 'Box 14\n85102 Sundsvall',
        email: 'info@digg.se',
        name: 'Myndigheten för digital förvaltning',
        regNo: '202100-6883',
        tel: '0771-11 44 00',
      },
      schedule: {
        begins: '2020-01-01',
        date: '2020-09-02',
        ends: '2021-12-22',
        id: 20201388,
        supervisor: {
          email: 'julia.jurist@digg.se',
          fName: 'Jurist',
          gName: 'Julia',
          roles: ['supervisor'],
          tel: '0771-11 44 00',
        },
      },
      service: {
        class: 'Website',
        name: 'digg.se',
      },
    });
    fromCase.id = 42;
    const toCase = new ComplaintCase(fromCase);
    expect(toCase.date).toBe(null);
    expect(toCase.id).toBe(fromCase.id);
    expect(toCase.organization.name).toBe(fromCase.organization.name);
    expect(toCase.service.name).toBe(fromCase.service.name);
    expect(toCase.supervisor).toBe(null);
  });

  it('genererar ett objekt vid omvandling till JSON', () => {
    const aCase = new ComplaintCase();
    const caseNo = 20201388;
    const date = new Date('2020-09-02');
    aCase.caseNumber = caseNo;
    aCase.date = date;
    expect(aCase.toJSON()).toEqual({
      class: 'ComplaintCase',
      date: date.getTime(),
      cn: caseNo,
      org: {},
      service: undefined,
      supervisor: undefined,
    });
  });
});

describe('MonitoringCase', () => {
  it('returnerar tillsynsplan', () => {
    const aCase = new MonitoringCase();
    const schedule = {};
    aCase.schedule = schedule;
    expect(aCase.schedule).toBe(schedule);
  });

  it('identifierar sig som tillsynsärende', () => {
    const aCase = new MonitoringCase();
    expect(aCase.monitoring).toBe(true);
  });

  it('returnerar rättslig grund', () => {
    const aCase = new MonitoringCase();
    expect(aCase.sections).toEqual([[16, 17]]);
  });

  it("returnerar 'övervakningsärende' som ärendetyp", () => {
    const aCase = new MonitoringCase();
    expect(aCase.type).toBe('monitoring');
  });

  it.with(
    [
      {
        auth: true,
        class: 'MobileApp',
        name: 'Test',
        os: 'iOS',
      },
      MobileApp,
      'mobil applikation',
    ],
    [
      {
        access: 'intranet',
        class: 'Website',
        name: 'Intranätet',
      },
      Website,
      'webbplats',
    ]
  )(
    'bygger ett övervakningsärende för en {2} från ett dataobjekt',
    (service, serviceClass) => {
      const data = {
        class: 'MonitoringCase',
        cn: 20201234,
        org: {
          email: 'info@digg.se',
          name: 'Myndigheten för digital förvaltning',
          regNo: '202100-6883',
          tel: '0771-11 44 00',
        },
        schedule: {
          begins: 1577836800000,
          case: 20201388,
          date: 1599004800000,
          ends: 1640131200000,
          supervisor: {
            email: 'julia.jurist@digg.se',
            fName: 'Jurist',
            gName: 'Julia',
            roles: ['supervisor'],
            tel: '0771-11 44 00',
          },
        },
      };
      data.service = service;
      const aCase = new MonitoringCase(data);
      expect(aCase).toBeAnInstanceOf(MonitoringCase);
      expect(aCase.caseNumber.id).toBe(data.cn);
      expect(aCase.service).toBeAnInstanceOf(serviceClass);
      expect(aCase.schedule.caseNumber.id).toBe(data.schedule.case);
    }
  );

  it.with(
    [
      {
        auth: true,
        class: 'MobileApp',
        name: 'Test',
        os: 'iOS',
      },
      MobileApp,
      'mobil applikation',
    ],
    [
      {
        access: 'intranet',
        class: 'Website',
        name: 'Intranätet',
      },
      Website,
      'webbplats',
    ]
  )(
    'rekonstruerar ett övervakningsärende för en {2} från ett dataobjekt',
    (service, serviceClass) => {
      const data = {
        class: 'MonitoringCase',
        cn: 20201234,
        org: {
          email: 'info@digg.se',
          name: 'Myndigheten för digital förvaltning',
          regNo: '202100-6883',
          tel: '0771-11 44 00',
        },
        schedule: {
          begins: 1577836800000,
          case: 20201388,
          date: 1599004800000,
          ends: 1640131200000,
          supervisor: {
            email: 'julia.jurist@digg.se',
            fName: 'Jurist',
            gName: 'Julia',
            roles: ['supervisor'],
            tel: '0771-11 44 00',
          },
        },
      };
      data.service = service;
      const aCase = new MonitoringCase(data);
      expect(aCase.caseNumber.id).toBe(data.cn);
      expect(aCase.service).toBeAnInstanceOf(serviceClass);
      expect(aCase.schedule.caseNumber.id).toBe(data.schedule.case);
    }
  );

  it('omvandlar ett anmälningsärende', () => {
    const fromCase = new ComplaintCase({
      class: 'ComplaintCase',
      date: 1600819200000,
      cn: 20201234,
      org: {
        abbr: 'DIGG',
        addr: 'Box 14\n85102 Sundsvall',
        email: 'info@digg.se',
        name: 'Myndigheten för digital förvaltning',
        regNo: '202100-6883',
        tel: '0771-11 44 00',
      },
      service: {
        class: 'Website',
        name: 'digg.se',
      },
      supervisor: {
        email: 'julia.jurist@digg.se',
        fName: 'Jurist',
        gName: 'Julia',
        roles: ['supervisor'],
        tel: '0771-11 44 00',
      },
    });
    fromCase.id = 42;
    const toCase = new MonitoringCase(fromCase);
    expect(toCase.schedule).toBe(null);
    expect(toCase.id).toBe(fromCase.id);
    expect(toCase.organization.name).toBe(fromCase.organization.name);
    expect(toCase.service.name).toBe(fromCase.service.name);
  });

  it('genererar ett objekt vid omvandling till JSON', () => {
    const aCase = new MonitoringCase();
    const caseNo = 20201234;
    const date = new Date('2020-09-23');
    aCase.caseNumber = caseNo;
    expect(aCase.toJSON()).toEqual({
      class: 'MonitoringCase',
      cn: caseNo,
      org: {},
      schedule: undefined,
      service: undefined,
    });
  });
});

describe('CaseFactory', () => {
  let data;

  // Skapa förutsättningarna för varje test.
  beforeEach(() => {
    data = {
      cn: 20201234,
      org: {},
      service: { class: 'Website' },
    };
  });

  it('bygger ett granskningsärende', () => {
    data.class = 'AuditCase';
    const aCase = CaseFactory.build(data);
    expect(aCase).toBeAnInstanceOf(AuditCase);
  });

  it('bygger ett anmälningsärende', () => {
    data.class = 'ComplaintCase';
    data.date = 1600819200000;
    data.supervisor = {};
    const aCase = CaseFactory.build(data);
    expect(aCase).toBeAnInstanceOf(ComplaintCase);
  });

  it('bygger ett övervakningsärende', () => {
    data.class = 'MonitoringCase';
    data.schedule = {};
    const aCase = CaseFactory.build(data);
    expect(aCase).toBeAnInstanceOf(MonitoringCase);
  });

  it('refuserar en ogiltig typ av tjänst', () => {
    data.class = 'invalid';
    expect.exception(() => CaseFactory.build(data));
  });
});

// Importera beroenden.
import {
  AuditCase,
  CaseFactory,
  ComplaintCase,
  MonitoringCase,
} from '../../js/model/case.js';
import { Organization } from '../../js/model/Organization.js';
import { Person } from '../../js/model/Person.js';
import { Schedule } from '../../js/model/Schedule.js';
import { MobileApp, Website } from '../../js/model/service.js';
import { ValidationError } from '../../js/model/ValidationError.js';
import { beforeEach, describe, expect, it } from '../functions.js';

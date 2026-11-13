/**
 * Enhetstestfall för applikationens modell.
 *
 * @license CC-BY 4.0
 * @see Model
 */

describe('Lagringsutrymmet (inställningar)', () => {
  let model;
  let settings;

  beforeEach(() => {
    // Lagringsutrymmet (localStorage).
    settings = {
      data: {},
      read: (k) => settings.data[k] ?? null,
      write: (k, v) => (settings.data[k] = v),
    };

    // Skapa en modellinstans.
    model = new Model({}, settings);
  });

  it('sparar flaggan för avancerat visningsläge i lagringsutrymmet', () => {
    model.advancedMode = true;
    expect(settings.data.advancedMode).toBe('true');
  });

  it('ignorerar obestämd flagga för avancerat visningsläge', () => {
    model.advancedMode = null;
    expect(settings.data.advancedMode).toBe(undefined);
  });

  it('hämtar flaggan för avancerat visningsläge ur lagringsutrymmet', () => {
    expect(model.advancedMode).toBe(false);
    settings.data.advancedMode = 'true';
    expect(model.advancedMode).toBe(true);
    settings.data.advancedMode = 'false';
    expect(model.advancedMode).toBe(false);
  });

  it('returnerar ärendekatalogen', () => {
    const path = 'C:\\Documents\\Audits';
    expect(model.caseDirectory).toBe(null);
    model.caseDirectory = path;
    expect(model.caseDirectory).toBe(path);
  });

  it('returnerar senast besökta granskningssida', () => {
    const path = '?page=test&foo=bar';
    expect(model.lastPath).toBe(null);
    model.lastPath = path;
    expect(model.lastPath).toBe(path);
  });

  it('sparar flaggan för att bekräfta komponenter i lagringsutrymet', () => {
    model.confirmComponents = false;
    expect(settings.data.confirmComponents).toBe('false');
  });

  it('hämtar flaggan för att bekräfta komponenter ur lagringsutrymet', () => {
    expect(model.confirmComponents).toBe(true);
    settings.data.confirmComponents = 'false';
    expect(model.confirmComponents).toBe(false);
    settings.data.confirmComponents = 'true';
    expect(model.confirmComponents).toBe(true);
  });
});

describe('Objektdatabasen', () => {
  let cursor;
  let data;
  let db;
  let model;
  let transaction;

  beforeEach(() => {
    const $A = (o) => Array.from(Object.values(o));

    // Databascursor.
    cursor = (content, keyName, id) =>
      mock(
        {
          value: null,
          *[Symbol.asyncIterator]() {
            for (const [key, value] of Object.entries(content)) {
              if (undefined === id || value[keyName] === id) {
                this.value = value;
                this.primaryKey = Number(key);
                yield this;
              }
            }
          },
        },
        {
          delete: async () => {},
          update: async () => {},
        }
      );

    // Objektlager för granskningar.
    const audits = {
      content: {
        13: { caseID: 1, started: 1600819200000 },
        42: { caseID: 1, started: 1624406400000 },
      },
      cursor: null,
      add: async (c) => ((audits.content[69] = c), 69),
      delete: async (i) => delete audits.content[i],
      get: async (i) => audits.content[i],
      index: (i) =>
        ({
          by_case: {
            openCursor: () => (audits.cursor = cursor(audits.content)),
          },
        })[i],
      put: async (c, i) => (audits.content[i] = c),
    };

    // Objektlager för ärenden.
    const cases = {
      content: {
        1: { class: 'AuditCase', cn: 20220001 },
        2: { class: 'AuditCase', cn: 20201234 },
        3: { class: 'AuditCase', cn: 20202345 },
      },
      add: async (c) => ((cases.content[4] = c), 4),
      delete: async (i) => delete cases.content[i],
      get: async (i) => cases.content[i],
      openCursor: () => cursor(cases.content),
      put: async (c) => (cases.content[c.id] = c),
    };

    // Objektlager för loggnoteringar.
    const entries = {
      content: {
        1: { caseID: 1, type: 'open case' },
        2: { caseID: 1, type: 'other' },
      },
      cursor: null,
      add: async (e) => ((entries.content[3] = e), 3),
      delete: async (i) => delete entries.content[i],
      get: async (i) => entries.content[i],
      index: (i) =>
        ({
          by_case: {
            openCursor: () => (entries.cursor = cursor(entries.content)),
          },
        })[i],
      put: async (e, i) => (entries.content[i] = e),
    };

    // Objektlager för personer
    const makePerson = (email, gName, fName, role, tel) => {
      const person = {
        email,
        gName,
        fName,
        roles: [role],
        tel,
        hasRole: (r) => person.roles.includes(r),
        get name() {
          return `${person.fName}, ${person.gName}`;
          j;
        },
      };
      return person;
    };

    // Objektlager för personer.
    const people = {
      content: {
        1: makePerson('gg@digg.se', 'G', 'G', 'officer'),
        2: makePerson('jj@digg.se', 'J', 'J', 'supervisor'),
      },
      add: async (p) => ((people.content[3] = p), 3),
      delete: async (i) => delete people.content[i],
      get: async (i) => people.content[i],
      getAll: async () => $A(people.content),
      openCursor: () => cursor(people.content),
      put: async (p) => (people.content[p.id] = p),
    };

    // Objektlager för krav.
    const requirements = {
      content: {
        1: { id: 'foo', sampleID: 1 },
        2: { id: 'bar', sampleID: 2 },
      },
      cursors: [],
      add: async (r) => {
        const i = Object.keys(requirements.content).length + 1;
        requirements.content[i] = r;
        return i;
      },
      delete: async (k) => delete requirements.content[k],
      get: async (k) => requirements.content[k],
      index: (i) =>
        ({
          by_sample: {
            openCursor: (s) => {
              const c = cursor(requirements.content, 'sampleID', s);
              requirements.cursors.push(c);
              return c;
            },
          },
        })[i],
      put: async (c, k) => (requirements.content[k] = c),
    };

    // Objektlager för stickprov.
    const makeSample = (auditID, category, name) => ({
      auditID,
      category,
      class: 'Webpage',
      name,
    });

    const samples = {
      content: {
        1: makeSample(13, 'start', 'foo'),
        2: makeSample(42, 'login', 'bar'),
      },
      cursors: [],
      add: async (c) => {
        const i = Object.keys(samples.content).length + 1;
        samples.content[i] = c;
        return i;
      },
      delete: async (i) => delete samples.content[i],
      get: async (i) => samples.content[i],
      index: (i) =>
        ({
          by_audit: {
            openCursor: (a) => {
              const c = cursor(samples.content, 'auditID', a);
              samples.cursors.push(c);
              return c;
            },
          },
        })[i],
      put: async (c, i) => (samples.content[i] = c),
    };

    // Objektlager för tillsynsplaner.
    const makeSchedule = (begins, ends) => ({
      begins: new Date(begins).getTime(),
      ends: new Date(ends).getTime(),
    });

    const schedules = {
      content: {
        1: makeSchedule('2020-01-01', '2021-12-22'),
        2: makeSchedule('2022-01-01', '2022-12-31'),
      },
      add: async (s) => ((schedules.content[3] = s), 3),
      delete: async (i) => delete schedules.content[i],
      get: async (i) => schedules.content[i],
      getAll: async () => $A(schedules.content),
      openCursor: () => cursor(schedules.content),
      put: async (s) => (schedules.content[s.id] = s),
    };

    // Databasinnehåll.
    data = {
      audits: audits.content,
      cases: cases.content,
      entries: entries.content,
      people: people.content,
      requirements: requirements.content,
      samples: samples.content,
      schedules: schedules.content,
    };

    // Databastransaktion.
    transaction = {
      complete: async () => {},
      objectStore: (s) =>
        ({
          audits,
          cases,
          entries,
          people,
          requirements,
          samples,
          schedules,
        })[s],
    };

    // Objektdatabasen.
    db = mock({ close: () => {}, transaction: () => transaction });

    // Skapa en modellinstans.
    model = new Model(db, {});
  });

  it('stänger objektdatabasen', () => {
    model.close();
    expect(db.close).toHaveBeenCalled.once();
  });

  describe('Ärenden', () => {
    it('hämtar alla ärenden', async () => {
      const cases = await model.allCases();
      const d = Object.keys(data.cases);
      expect(cases.length).toBe(d.length);
      for (const aCase of cases) {
        expect(aCase).toBeAnInstanceOf(AuditCase);
      }
      expect(cases[0].caseNumber.id).toBe(20201234);
      expect(cases[1].caseNumber.id).toBe(20202345);
      expect(cases[2].caseNumber.id).toBe(20220001);
    });

    it('hämatar ett ärende med granskningar och logg', async () => {
      const aCase = await model.getCase(1);
      expect(aCase).not.toBe(null);
      expect(aCase).toBeAnInstanceOf(AuditCase);
      const a = data.audits;
      for (const audit of aCase.audits()) {
        expect(audit.started.getTime()).toBe(a[audit.id].started);
      }
      const e = data.entries;
      for (const entry of aCase.log()) {
        expect(entry.type).toBe(e[entry.id].type);
      }
    });

    it('populerar ett ärende med alla uppgifter', async () => {
      const aCase = await model.getCase(1);
      await model.populate(aCase);
      const s1 = aCase.audit(13).sample(1);
      const s2 = aCase.audit(42).sample(2);
      const r1 = s1.requirement('foo');
      const r2 = s2.requirement('bar');
      expect(s1).toBeAnInstanceOf(Webpage);
      expect(s2).toBeAnInstanceOf(Webpage);
      expect(r1).toBeAnInstanceOf(Requirement);
      expect(r2).toBeAnInstanceOf(Requirement);
    });

    it('sparar ett ärende', async () => {
      const aCase = new AuditCase();
      const caseNo = 20220002;
      const org = 'DIGG';
      const service = 'digg.se';
      aCase.caseNumber = caseNo;
      aCase.organization = new Organization({ name: org });
      aCase.service = new Website({ name: service });
      await model.setCase(aCase);
      expect(aCase.id).toBe(4);
      const c = data.cases[4];
      expect(c).not.toBe(undefined);
      expect(c.org.name).toBe(org);
      expect(c.service.name).toBe(service);
    });

    it('raderar ett ärende och dess granskningar', async () => {
      await model.deleteCase(1);
      expect(Object.keys(data.cases)).toEqual(['2', '3']);

      let { cursor } = transaction.objectStore('entries');
      expect(cursor.delete).toHaveBeenCalled.times(2);

      ({ cursor } = transaction.objectStore('audits'));
      expect(cursor.delete).toHaveBeenCalled.times(2);

      let { cursors } = transaction.objectStore('samples');
      expect(cursors.length).toBe(2);
      cursors.forEach((c) => expect(c.delete).toHaveBeenCalled.times(1));

      ({ cursors } = transaction.objectStore('requirements'));
      expect(cursors.length).toBe(2);
      cursors.forEach((c) => expect(c.delete).toHaveBeenCalled.times(1));
    });

    it('återställer ett helt ärende med innehåll', async () => {
      const obj = {
        class: 'AuditCase',
        filename: '2020-1234 digg.se.json',
        cn: 20203456,
        opened: 1600857296000,
        org: {
          abbr: 'DIGG',
          addr: 'Box 14\n85102 Sundsvall',
          email: 'registrator@digg.se',
          name: 'Myndigheten för digital förvaltning',
          regMo: '202100-6883',
          tel: '0771-11 44 00',
        },
        service: {
          class: 'Website',
          name: 'digg.se',
        },
        entries: [
          {
            dir: 'internal',
            summary: 'Case opened',
            time: 1600857296000,
            type: 'open case',
          },
        ],
        audits: [
          {
            colours: [['#5a6751', 'green']],
            officer: {
              email: 'greta.granskare@digg.se',
              fName: 'Granskare',
              gName: 'Greta',
            },
            started: 1600857296000,
            samples: [
              {
                category: 'component',
                class: 'Component',
                content: ['bar'],
                name: 'footer',
                parent: 'webpage',
                req: [
                  {
                    clause: '9.1.4.3',
                    id: 'contrast',
                    title: 'Contrast',
                    checks: [
                      {
                        class: 'SingleCheck',
                        id: 'contrast',
                        ok: true,
                      },
                    ],
                  },
                ],
              },
              {
                category: 'start',
                class: 'Webpage',
                components: ['footer'],
                content: ['bar', 'foo'],
                name: 'Start',
                req: [
                  {
                    clause: '9.1.1.1',
                    content: ['img'],
                    id: 'alt',
                    intNote: '#$%!',
                    title: 'Alt text',
                    checks: [
                      {
                        class: 'SingleCheck',
                        id: 'alt',
                        obs: 'Missing',
                      },
                    ],
                  },
                ],
                url: 'https://www.digg.se/',
              },
            ],
          },
        ],
      };

      const aCase = await model.unserialize(obj);
      expect(aCase).toBeAnInstanceOf(AuditCase);
      expect(data.cases[4].service.name).toBe('digg.se');
      expect(data.entries[3].caseID).toBe(4);
      expect(data.entries[3].type).toBe('open case');
      expect(data.audits[69].caseID).toBe(4);
      expect(data.audits[69].started).toBe(1600857296000);
      expect(data.samples[3].category).toBe('component');
      expect(data.samples[4].category).toBe('start');
      expect(data.samples[4].components).toEqual([3]);
      expect(data.requirements[3].clause).toBe('9.1.4.3');
      expect(data.requirements[4].clause).toBe('9.1.1.1');
    });
  });

  describe('Granskningar', () => {
    it('hämtar en granskning och dess stickprov', async () => {
      const audit = await model.getAudit(42);
      expect(audit).not.toBe(null);
      expect(audit).toBeAnInstanceOf(Audit);
      expect(audit.id).toBe(42);
      const s = data.samples;
      for (const sample of audit.samples('login')) {
        expect(sample.name).toBe(s[sample.id].name);
        expect(sample.hasRequirements).toBe(false);
      }
    });

    it('hämtar en komplett granskning', async () => {
      const audit = await model.getAudit(42, true);
      expect(audit).not.toBe(null);
      expect(audit).toBeAnInstanceOf(Audit);
      expect(audit.id).toBe(42);
      const s = data.samples;
      for (const sample of audit.samples('login')) {
        expect(sample.name).toBe(s[sample.id].name);
        expect(sample.hasRequirements).toBe(true);
      }
    });

    it('sparar en befintling granskning', async () => {
      const caseID = 1;
      const id = 69;
      const audit = new Audit(caseID);
      const email = 'greta.granskare@digg.se';
      audit.id = id;
      audit.officer = new Person({ email });
      await model.setAudit(audit);
      const a = data.audits[id];
      expect(a).not.toBe(undefined);
      expect(a.caseID).toBe(caseID);
      expect(a.officer.email).toBe(email);
    });

    it('sparar en ny granskning', async () => {
      const caseID = 1;
      const audit = new Audit(caseID);
      const email = 'greta.granskare@digg.se';
      audit.officer = new Person({ email });
      await model.setAudit(audit);
      expect(audit.id).toBe(69);
      const a = data.audits[69];
      expect(a).not.toBe(undefined);
      expect(a.caseID).toBe(caseID);
      expect(a.officer.email).toBe(email);
    });

    it('raderar en granskning och dess stickprov', async () => {
      await model.deleteAudit(42);
      expect(Object.keys(data.audits)).toEqual(['13']);

      let { cursors } = transaction.objectStore('samples');
      expect(cursors.length).toBe(1);
      cursors.forEach((c) => expect(c.delete).toHaveBeenCalled.times(1));

      ({ cursors } = transaction.objectStore('requirements'));
      expect(cursors.length).toBe(1);
      cursors.forEach((c) => expect(c.delete).toHaveBeenCalled.times(1));
    });
  });

  describe('Stickprov', () => {
    it('hämtar ett stickprov och dess krav', async () => {
      const sample = await model.getSample(1);
      expect(sample).not.toBe(null);
      expect(sample).toBeAnInstanceOf(Webpage);
      expect(sample.id).toBe(1);
      const r = data.requirements;
      for (const req of sample.requirements()) {
        expect(req.id).toBe(r[req.key].id);
      }
    });

    it('sparar ett befintligt stickprov', async () => {
      const auditID = 42;
      const category = 'start';
      const sample = new Webpage(auditID, category);
      sample.id = 13;
      await model.setSample(sample);
      const s = data.samples[13];
      expect(s).not.toBe(undefined);
      expect(s.auditID).toBe(auditID);
      expect(s.category).toBe(category);
    });

    it('sparar ett nytt stickprov', async () => {
      const auditID = 42;
      const category = 'start';
      const sample = new Webpage(auditID, category);
      await model.setSample(sample);
      expect(sample.id).toBe(3);
      const s = data.samples[3];
      expect(s).not.toBe(undefined);
      expect(s.auditID).toBe(auditID);
      expect(s.category).toBe(category);
    });

    it('sparar alla stickprov i en granskning', async () => {
      const audit = new Audit(13);
      audit.id = 42;
      const sample1 = new Webpage(audit.id, 'start');
      sample1.id = 1;
      sample1.name = 'First';
      const sample2 = new Webpage(audit.id, 'special');
      sample2.id = 2;
      sample2.name = 'Second';
      audit.setSample(sample1);
      audit.setSample(sample2);
      await model.setAuditSamples(audit);
      expect(data.samples[1].name).toBe(sample1.name);
      expect(data.samples[2].name).toBe(sample2.name);
    });

    it('raderar ett stickprov och dess krav', async () => {
      await model.deleteSample(1);
      expect(Object.keys(data.samples)).toEqual(['2']);

      let { cursors } = transaction.objectStore('requirements');
      expect(cursors.length).toBe(1);
      cursors.forEach((c) => expect(c.delete).toHaveBeenCalled.times(1));
    });
  });

  describe('Krav', () => {
    it('hämtar ett krav', async () => {
      const requirement = await model.getRequirement(1, {});
      expect(requirement).not.toBe(null);
      expect(requirement).toBeAnInstanceOf(Requirement);
      expect(requirement.key).toBe(1);
    });

    it('sparar ett befintligt krav', async () => {
      const sampleID = 2;
      const requirement = new Requirement(sampleID);
      requirement.id = 'quux';
      requirement.key = 2;
      await model.setRequirement(requirement);
      const r = data.requirements[2];
      expect(r.id).toBe('quux');
    });

    it('sparar ett nytt krav', async () => {
      const sampleID = 2;
      const requirement = new Requirement(sampleID);
      requirement.id = 'quux';
      await model.setRequirement(requirement);
      expect(requirement.key).toBe(3);
      const r = data.requirements[3];
      expect(r).not.toBe(undefined);
      expect(r.sampleID).toBe(sampleID);
      expect(r.id).toBe('quux');
    });

    it('raderar ett krav', async () => {
      await model.deleteRequirement(1);
      expect(Object.keys(data.requirements)).toEqual(['2']);
    });

    it('raderar alla krav i ett stickprov', async () => {
      await model.deleteRequirements(1);
      const { cursors } = transaction.objectStore('requirements');
      expect(cursors.length).toBe(1);
      expect(cursors[0].delete).toHaveBeenCalled.once();
    });
  });

  describe('Loggnoteringar', () => {
    it('hämtar en loggnotering', async () => {
      const entry = await model.getLogEntry(2);
      expect(entry).not.toBe(null);
      expect(entry).toBeAnInstanceOf(LogEntry);
      expect(entry.id).toBe(2);
      expect(entry.type).toBe('other');
    });

    it('sparar en befintlig loggnotering', async () => {
      const caseID = 1;
      const id = 69;
      const type = 'other';
      const entry = new LogEntry(caseID);
      entry.id = id;
      entry.type = type;
      await model.setLogEntry(entry);
      const e = data.entries[id];
      expect(e).not.toBe(undefined);
      expect(e.caseID).toBe(caseID);
      expect(e.type).toBe(type);
    });

    it('sparar en ny loggnotering', async () => {
      const caseID = 1;
      const type = 'other';
      const entry = new LogEntry(caseID);
      entry.type = type;
      await model.setLogEntry(entry);
      expect(entry.id).toBe(3);
      const e = data.entries[3];
      expect(e).not.toBe(undefined);
      expect(e.caseID).toBe(caseID);
      expect(e.type).toBe(type);
    });

    it('raderar en loggnotering', async () => {
      await model.deleteLogEntry(2);
      expect(Object.keys(data.entries)).toEqual(['1']);
    });
  });

  describe('Personer', () => {
    it('hämtar alla personer', async () => {
      const people = await model.allPeople();
      const p = Object.keys(data.people);
      expect(people.length).toBe(p.length);
      for (const person of people) {
        expect(person).toBeAnInstanceOf(Person);
      }
      expect(people[0].email).toBe('gg@digg.se');
      expect(people[1].email).toBe('jj@digg.se');
    });

    it('hämtar alla personer med angiven roll', async () => {
      const people = await model.peopleByRole('officer');
      expect(people.length).toBe(1);
      expect(people[0]).toBeAnInstanceOf(Person);
      expect(people[0].email).toBe('gg@digg.se');
    });

    it('hämtar en person', async () => {
      const person = await model.getPerson(2);
      expect(person).not.toBe(null);
      expect(person).toBeAnInstanceOf(Person);
      expect(person.email).toBe('jj@digg.se');
    });

    it('sparar en person', async () => {
      const person = new Person();
      person.email = 'hanna.handlaggare@digg.se';
      person.givenName = 'Hanna';
      person.familyName = 'Handläggare';
      person.telephone = '0771-11 44 00';
      person.addRole('officer');
      await model.setPerson(person);
      expect(person.id).toBe(3);
      const p = data.people[3];
      expect(p).not.toBe(undefined);
      expect(p.email).toBe(person.email);
      expect(p.gName).toBe(person.givenName);
      expect(p.fName).toBe(person.familyName);
      expect(p.roles).toEqual(['officer']);
      expect(p.tel).toBe(person.telephone);
    });

    it('raderar en person', async () => {
      await model.deletePerson(1);
      expect(Object.keys(data.people)).toEqual(['2']);
    });
  });

  describe('Tillsynsplaner', () => {
    it('hämtar alla tillsynsplaner', async () => {
      const schedules = await model.allSchedules();
      const s = Object.keys(data.schedules);
      expect(schedules.length).toBe(s.length);
      for (const schedule of schedules) {
        expect(schedule).toBeAnInstanceOf(Schedule);
      }
      expect(schedules[0].id).toBe(1);
      expect(schedules[1].id).toBe(2);
    });

    it('hämtar en tillsynsplan', async () => {
      const schedule = await model.getSchedule(1);
      expect(schedule).not.toBe(null);
      expect(schedule).toBeAnInstanceOf(Schedule);
    });

    it('sparar en tillsynsplan', async () => {
      const schedule = new Schedule();
      schedule.caseNumber = 20221234;
      schedule.begins = new Date('2023-01-01');
      schedule.date = new Date('2022-07-11');
      schedule.ends = new Date('2023-12-31');
      schedule.supervisor = new Person(data.people[2]);
      await model.setSchedule(schedule);
      expect(schedule.id).toBe(3);
      const s = data.schedules[3];
      expect(s).not.toBe(undefined);
      expect(s.begins).toBe(schedule.begins.getTime());
      expect(s.date).toBe(schedule.date.getTime());
      expect(s.ends).toBe(schedule.ends.getTime());
      expect(s.supervisor.email).toBe('jj@digg.se');
    });

    it('raderar en tillsynsplan', async () => {
      await model.deleteSchedule(2);
      expect(Object.keys(data.schedules)).toEqual(['1']);
    });
  });
});

// Importera beroenden.
import { Audit } from '../../js/model/Audit.js';
import { AuditCase } from '../../js/model/case.js';
import { LogEntry } from '../../js/model/LogEntry.js';
import { Model } from '../../js/model/Model.js';
import { Organization } from '../../js/model/Organization.js';
import { Person } from '../../js/model/Person.js';
import { Requirement } from '../../js/model/Requirement.js';
import { Schedule } from '../../js/model/Schedule.js';
import { SingleCheck } from '../../js/model/check.js';
import { Webpage } from '../../js/model/sample.js';
import { Website } from '../../js/model/service.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

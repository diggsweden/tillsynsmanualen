/**
 * Enhetstestfall för information om en granskning i ett ärende.
 *
 * @license CC-BY 4.0
 * @see Audit
 */

describe('Information om granskningen', () => {
  it('returnerar angiven ärendeidentitet', () => {
    const id = 42;
    const audit = new Audit(id);
    expect(audit.caseID).toBe(id);
  });

  it('refuserar konstruktion utan ärendeidentitet', () => {
    expect.exception(() => new Audit());
  });

  it('returnerar angiven starttid', () => {
    const audit = new Audit(42);
    const date = new Date('2020-09-23T12:34:56+02:00');
    audit.started = date;
    expect(audit.started).toEqual(date);
  });

  it('returnerar angiven granskare', () => {
    const audit = new Audit(42);
    const officer = {};
    audit.officer = officer;
    expect(audit.officer).toBe(officer);
  });

  it('returnerar en trimmad appversion', () => {
    const audit = new Audit(42);
    const version = '3.14';
    audit.version = ` ${version} `;
    expect(audit.version).toBe(version);
  });
});

describe('Kategorier', () => {
  it('räknar antalet stickprov i angiven kategori', () => {
    const audit = new Audit(42);
    audit.setSample({ category: 'start', id: 13, name: 'test 1' });
    audit.setSample({ category: 'start', id: 42, name: 'test 2' });
    expect(audit.count('start')).toBe(2);
    expect(audit.count('random')).toBe(0);
  });

  it.with(
    [null, 'start'],
    ['start', 'login'],
    ['login', 'sitemap'],
    ['sitemap', 'contact'],
    ['contact', 'help'],
    ['help', 'legal'],
    ['legal', 'statement'],
    ['statement', 'feedback'],
    ['feedback', 'special'],
    ['special', 'service'],
    ['service', 'relevant'],
    ['relevant', 'doc'],
    ['doc', 'support'],
    ['support', 'random'],
    ['random', undefined, 'start']
  )(
    "returnerar '{1}' som nästa kategori om senast ifyllda är '{0}'",
    (current, next, next2 = next) => {
      const audit = new Audit(42);
      current && expect(audit.nextCategory(current)).toBe(next);

      if (current) {
        const sample = { category: current, id: 42, name: 'test' };
        audit.setSample(sample);
      }
      expect(audit.nextCategory()).toBe(next2);
    }
  );

  it.with(
    ['start', undefined],
    ['login', 'start'],
    ['sitemap', 'login'],
    ['contact', 'sitemap'],
    ['help', 'contact'],
    ['legal', 'help'],
    ['statement', 'legal'],
    ['feedback', 'statement'],
    ['special', 'feedback'],
    ['service', 'special'],
    ['relevant', 'service'],
    ['doc', 'relevant'],
    ['support', 'doc'],
    ['random', 'support']
  )(
    "returnerar '{1}' som föregående kategori om aktuell kategori är '{0}'",
    (current, prev) => {
      const audit = new Audit(42);
      expect(audit.previousCategory(current)).toBe(prev);
    }
  );
});

describe('Stickprov', () => {
  it('refuserar tillägg av stickprov utan identitet', () => {
    const audit = new Audit(42);
    const sample = { category: 'start', name: 'test' };
    expect.exception(() => audit.setSample(sample));
  });

  it('refuserar tillägg av stickprov utan kategori', () => {
    const audit = new Audit(42);
    const sample = { id: 42, name: 'test' };
    expect.exception(() => audit.setSample(sample));
  });

  it('refuserar dubblettnamn för stickprov', () => {
    const audit = new Audit(42);
    const sample1 = { category: 'start', id: 13, name: 'test' };
    const sample2 = { category: 'login', id: 42, name: 'test' };
    audit.setSample(sample1);
    expect
      .exception(() => audit.setSample(sample2))
      .toBeAnInstanceOf(DuplicateNameError);
  });

  it('realiserar komponenter vid tillägg av stickprov', () => {
    const audit = new Audit(42);
    const component = { category: 'component', id: 13, name: 'comp' };
    const sample = mock(
      {
        category: 'login',
        id: 42,
        name: 'test',
        pending: [{ id: 13 }],
      },
      {
        addComponent: () => {},
      }
    );
    audit.setSample(component);
    audit.setSample(sample);
    expect(sample.addComponent).toHaveBeenCalled.once().with(component);
  });

  it('returnerar angivet stickprov', () => {
    const audit = new Audit(42);
    const sample1 = { category: 'start', id: 13, name: 'test 1' };
    const sample2 = { category: 'login', id: 42, name: 'test 2' };
    audit.setSample(sample1);
    audit.setSample(sample2);
    expect(audit.sample(13).name).toBe(sample1.name);
    expect(audit.sample(42).name).toBe(sample2.name);
  });

  it('itererar över stickprov per kategori i ordning', () => {
    const audit = new Audit(42);
    let length = 0;
    const order = ['bertil', 'åke', 'adam', 'östen'];
    const samples = [
      { category: 'start', id: 13, name: 'östen', follows: 'adam' },
      { category: 'start', id: 42, name: 'adam', follows: 'åke' },
      { category: 'start', id: 69, name: 'åke' },
      { category: 'start', id: 99, name: 'bertil' },
    ];
    samples.forEach((s) => audit.setSample(s));
    for (const sample of audit.samples('start')) {
      expect(sample.name).toBe(order[length++]);
    }
    expect(length).toBe(samples.length);
  });

  it('byter kategori för ett stickprov', () => {
    const audit = new Audit(42);
    audit.setSample({ category: 'start', id: 13, name: 'test' });
    audit.setSample({ category: 'random', id: 13, name: 'test' });
    expect(Array.from(audit.samples('start')).length).toBe(0);
    expect(Array.from(audit.samples('random')).length).toBe(1);
  });

  it('itererar över samtliga stickprov', () => {
    const audit = new Audit(42);
    let length = 0;
    const samples = [
      { category: 'start', id: 13, name: 'östen', follows: 'adam' },
      { category: 'login', id: 42, name: 'adam', follows: 'åke' },
      { category: 'random', id: 69, name: 'åke' },
      { category: 'special', id: 99, name: 'bertil' },
    ];
    samples.forEach((s) => audit.setSample(s));
    for (const sample of audit.allSamples()) {
      expect(sample).toEqual(samples[length++]);
    }
    expect(length).toBe(samples.length);
  });

  it('kontrollerar om granskningen innehåller namngivet stickprov', () => {
    const audit = new Audit(42);
    const name = 'test';
    audit.setSample({ category: 'start', id: 42, name });
    expect(audit.contains(name)).toBe(true);
    expect(audit.contains('other')).toBe(false);
  });

  it('returnera namngivet stickprov', () => {
    const audit = new Audit(42);
    const name = 'test';
    const sample = { category: 'start', id: 42, name };
    audit.setSample(sample);
    expect(audit.getSampleByName(name)).toBe(sample);
  });

  it('returnerar antalet stickprov av angiven klass', () => {
    class Doc {}
    class Page {}
    const sample = (type, category, id, name) =>
      Object.assign(new type(), { category, id, name });
    const audit = new Audit(42);
    const samples = [
      sample(Page, 'start', 1, 'page 1'),
      sample(Page, 'service', 2, 'page 2'),
      sample(Doc, 'service', 3, 'doc 1'),
      sample(Page, 'statement', 4, 'page 3'),
    ];
    samples.forEach((sample) => audit.setSample(sample));
    expect(audit.countType(Page)).toBe(3);
    expect(audit.countType(Doc)).toBe(1);
    expect(audit.countType(Date)).toBe(0);
  });

  it('returnerar antalet komponenter av angiven typ', () => {
    class Comp {}
    class Page {}
    class Scrn {}
    const sample = (type, category, id, name, parentType) => {
      const o = new type();
      Object.assign(o, { category, id, name });
      parentType && (o.parentType = parentType);
      return o;
    };
    const audit = new Audit(42);
    const samples = [
      sample(Comp, 'component', 1, 'comp 1', 'scrn'),
      sample(Comp, 'component', 2, 'comp 2', 'scrn'),
      sample(Scrn, 'start', 3, 'scrn 1'),
      sample(Page, 'statement', 4, 'page 1'),
    ];
    samples.forEach((samp) => audit.setSample(samp));
    expect(audit.countType(Comp, 'scrn')).toBe(2);
    expect(audit.countType(Comp, 'page')).toBe(0);
    expect(audit.countType(Scrn, 'scrn')).toBe(0);
    expect(audit.countType(Page, 'page')).toBe(0);
  });

  it('returnerar alla färdiggranskade stickprov av angiven klass', () => {
    class Doc {}
    class Page {}
    const sample = (type, category, id, name, done) =>
      Object.assign(new type(), { category, id, name, done });
    const audit = new Audit(42);
    const samples = [
      sample(Page, 'start', 1, 'page 1', true),
      sample(Page, 'service', 2, 'page 2', true),
      sample(Doc, 'service', 3, 'doc 1', true),
      sample(Page, 'statement', 4, 'page 3', false),
    ];
    samples.forEach((sample) => audit.setSample(sample));
    const docs = Array.from(audit.doneSamples(Doc));
    const pages = Array.from(audit.doneSamples(Page));
    expect(docs).toEqual([samples[2]]);
    expect(pages).toEqual([samples[0], samples[1]]);
  });

  it('tar bort ett stickprov ur granskningen', () => {
    const audit = new Audit(42);
    const sample = { category: 'start', id: 13, name: 'test' };
    const sample2 = { category: 'login', id: 42, name: 'test' };
    audit.setSample(sample);
    expect(audit.count('start')).toBe(1);
    expect.exception(() => audit.setSample(sample2));
    expect(audit.deleteSample(sample.id)).toBe(true);
    expect(audit.deleteSample(sample.id)).toBe(false);
    expect(audit.count('start')).toBe(0);
    // Det ska nu gå att lägga till ett stickprov med detta namn.
    audit.setSample(sample2);
  });

  it('returnerar nästa stickprov att granska', () => {
    const sample = (category, id, name, done) => ({ category, id, name, done });
    const audit = new Audit(42);
    const sample1 = sample('start', 13, 'test 1', true);
    const sample2 = sample('login', 42, 'test 2', false);
    audit.setSample(sample1);
    audit.setSample(sample2);
    expect(audit.nextSample()).toBe(sample2);
  });

  it('returnerar första stickprovet', () => {
    const audit = new Audit(42);
    const sample = { category: 'login', id: 42, name: 'test' };
    audit.setSample(sample);
    expect(audit.firstSample).toBe(sample);
  });

  it('returnerar urvalsförloppet', () => {
    const sample = (category, id, name) => ({ category, id, name });
    const audit = new Audit(42);
    audit.setSample(sample('start', 13, 'test 1'));
    audit.setSample(sample('login', 42, 'test 2'));
    expect(audit.sampleProgress()).toEqual([2, Audit.SampleCategories.length]);
  });

  it.with(
    [0, 0, 0],
    [1, 0, 1],
    [10, 1, 0],
    [25, 1, 2]
  )(
    'anger återstående slumpurval som {2} om urval={0} och slumpade={1}',
    (total, random, remaining) => {
      const sample = (category, id, name) => ({ category, id, name });
      const audit = new Audit(42);
      for (let i = 1; i <= total; ++i) {
        audit.setSample(sample('service', i, `test ${i}`));
      }
      for (let i = 1; i <= random; ++i) {
        audit.setSample(sample('random', total + i, `random ${i}`));
      }
      expect(audit.randomCount()).toBe(remaining);
    }
  );

  it.with([true, [1, 3], 'med'], [false, [0, 2], 'utan'])(
    'returnerar antalet färdiggranskade stickprov, {2} komponenter',
    (flag, expected) => {
      const sample = (category, id, name, done) => ({
        category,
        id,
        name,
        done,
      });
      const audit = new Audit(42);
      audit.setSample(sample('component', 13, 'test 1', true));
      audit.setSample(sample('start', 42, 'test 2', false));
      audit.setSample(sample('login', 69, 'test 3', false));
      expect(audit.auditProgress(flag)).toEqual(expected);
    }
  );

  it('returnerar antalet färdiggranskade av angivna typer', () => {
    class Test1 {}
    class Test2 {}
    const sample = (type, category, id, name, done) =>
      Object.assign(new type(), { category, id, name, done });
    const audit = new Audit(42);
    audit.setSample(sample(Test1, 'component', 13, 'test 1', true));
    audit.setSample(sample(Test2, 'start', 42, 'test 2', true));
    audit.setSample(sample(Test2, 'login', 69, 'test 3', false));
    expect(audit.countDone(Test1)).toBe(1);
    expect(audit.countDone(Test2)).toBe(1);
    expect(audit.countDone(Test1, Test2)).toBe(2);
  });

  it('returnerar antalet underkända stickprov per krav', () => {
    class Comp1 {
      failures(s) {
        s.add('r1').add('r3');
      }
    }
    class Test1 {
      get components() {
        return [comp];
      }
      failures(s) {
        s.add('r1');
      }
    }
    class Test2 {
      failures(s) {
        s.add('r1').add('r2');
      }
    }
    const sample = (type, category, id, name, done) =>
      Object.assign(new type(), { category, id, name, done });
    const audit = new Audit(42);
    const comp = sample(Comp1, 'component', 13, 'comp 1', true);
    audit.setSample(comp);
    audit.setSample(sample(Test1, 'start', 42, 'test 1', true));
    audit.setSample(sample(Test2, 'login', 69, 'test 2', true));
    audit.setSample(sample(Test2, 'random', 99, 'test 3', false));
    expect(audit.failures(Test1)).toEqual({ r1: 1, r3: 1 });
    expect(audit.failures(Test2)).toEqual({ r1: 1, r2: 1 });
    expect(audit.failures(Test1, Test2)).toEqual({ r1: 2, r2: 1, r3: 1 });
  });

  it('returnerar observationer för underkänd kontroll', () => {
    const check = (id, failed, observation) => ({
      id,
      failed,
      observation,
    });
    const req = (id, chk = {}) => ({
      id,
      check: (id) => chk[id],
    });
    const sample = (type, id, name, reqs = {}) => ({
      type,
      id,
      name,
      category: 'special',
      requirement: (id) => reqs[id],
    });
    const audit = new Audit(42);
    audit.setSample(sample('component', 1, 'comp'));
    audit.setSample(
      sample('webpage', 2, 'page 1', {
        foo: req('foo', { bar: check('bar', false) }),
      })
    ); // ignorera: kontrollen inte underkänd
    audit.setSample(
      sample('webpage', 3, 'page 2', {
        bar: req('bar', { baz: check('baz', true, 'n/a') }),
      })
    ); // ignorera: har inte kravet "foo"
    audit.setSample(
      sample('webpage', 4, 'page 3', {
        foo: req('foo', {
          bar: check('bar', true, 'first'),
          baz: check('baz', true, 'n/a'),
        }),
      })
    ); // matcha kontrollen "bar"
    audit.setSample(
      sample('webpage', 5, 'page 4', {
        foo: req('foo', { bar: check('bar', true, 'second') }),
      })
    );
    audit.setSample(
      sample('document', 6, 'doc', {
        foo: req('foo', { bar: check('bar', true, 'n/a') }),
      })
    );
    const current = sample('webpage', 7, 'current page', {
      foo: req('foo', { bar: check('bar', true, 'n/a') }),
    });
    audit.setSample(current);
    const observations = audit.observations(current, 'foo', 'bar');
    expect(observations).toEqual(['first', 'second']);
  });
});

describe('Komponenter', () => {
  it('itererar över tillagda komponenter', () => {
    const audit = new Audit(42);
    audit.id = 69;
    const components = [
      new Component(audit, { name: 'test 1', parentClass: 'Webpage' }),
      new Component(audit, { name: 'test 2', parentClass: 'Webpage' }),
    ];
    components[0].id = 13;
    components[1].id = 42;
    components.forEach((c) => audit.setSample(c));
    expect(Array.from(audit.components())).toEqual(components);
  });

  it('returnerar antal stickprov som innehåller angiven komponent', () => {
    const audit = new Audit(42);
    audit.id = 69;
    const samples = [
      { id: 13, category: 'test', name: 'foo', hasComponent: () => true },
      { id: 99, category: 'test', name: 'bar' },
    ];
    audit.setSample(samples[0]);
    audit.setSample(samples[1]);
    expect(audit.useCount(42)).toBe(1);
  });

  it('tar bort en komponent och raderar den ur alla stickprov', () => {
    const audit = new Audit(42);
    audit.id = 69;
    const component = new Component(audit, { name: 'test 1', parentClass: '' });
    const sample = mock(
      {
        category: 'start',
        id: 42,
        name: 'test',
      },
      {
        deleteComponent: () => {},
      }
    );
    component.id = 13;
    audit.setSample(component);
    audit.setSample(sample);
    expect(audit.deleteSample(13)).toBe(true);
    expect(audit.deleteSample(13)).toBe(false);
    expect(audit.count('component')).toBe(0);
    expect(sample.deleteComponent).toHaveBeenCalled.once().with(13);
  });
});

describe('Färger', () => {
  it('sparar en färg', () => {
    const audit = new Audit(42);
    const name = 'Test';
    const value = 'hsl(179, 7%, 38%)';
    expect(audit.hasColour(value)).toBe(false);
    audit.setColour(name, value);
    expect(audit.hasColour(value)).toBe(true);
  });

  it('itererar över sparade färger', () => {
    const audit = new Audit(42);
    const colours = [
      ['hsl(179, 7%, 38%)', 'Test 1'],
      ['#5a675c', 'Test 2'],
    ];
    for (const [value, name] of colours) {
      audit.setColour(name, value);
    }
    expect(Array.from(audit.colours())).toEqual(colours);
  });

  it('raderar en sparad färg', () => {
    const audit = new Audit(42);
    const name = 'Test';
    const value = 'hsl(179, 7%, 38%)';
    audit.setColour(name, value);
    expect(audit.hasColour(value)).toBe(true);
    audit.deleteColour(value);
    expect(audit.hasColour(value)).toBe(false);
  });
});

describe('Omvandling', () => {
  it('återskapar en minimal instans från ett dataobjekt', () => {
    const id = 42;
    const officer = { email: 'greta.granskare@digg.se' };
    const started = new Date('2020-09-23T12:34:56+02:00');
    const data = { id, officer, started: started.getTime() };
    const audit = new Audit(42, data);
    expect(audit.failed).toBe(undefined);
    expect(audit.finished).toBe(null);
    expect(audit.id).not.toBe(id);
    expect(audit.injunctions.length).toBe(0);
    expect(audit.officer.email).toBe(officer.email);
    expect(audit.remarks.length).toBe(0);
    expect(audit.started).toEqual(started);
    expect(audit.version).toBe(undefined);
  });

  it('återskapar en maximal instans från ett dataobjekt', () => {
    const dates = (c, d) => [new Date(c), new Date(d)];
    const time = ([c, d]) => [c.getTime(), d.getTime()];
    const caseID = 42;
    const colours = [['#5a675c', 'Test']];
    const failed = true;
    const finished = new Date('2020-09-30T23:45:00+0200');
    const id = 42;
    const injunctions = [dates('2021-01-01', '2021-06-30')];
    const officer = { email: 'greta.granskare@digg.se' };
    const remarks = [dates('2020-10-01', '2020-12-31')];
    const started = new Date('2020-09-23T12:34:56+02:00');
    const version = '3.14';
    const data = {
      caseID,
      colours,
      failed,
      finished: finished.getTime(),
      id,
      injunctions: injunctions.map(time),
      officer,
      remarks: remarks.map(time),
      samples: [{}], // Ska ignoreras.
      started: started.getTime(),
      version,
    };
    const audit = new Audit(42, data);
    expect(audit.failed).toBe(failed);
    expect(audit.finished).toEqual(finished);
    expect(audit.id).not.toBe(id);
    expect(audit.injunctions).toEqual(injunctions);
    expect(audit.officer.email).toBe(officer.email);
    expect(audit.remarks).toEqual(remarks);
    expect(audit.started).toEqual(started);
    expect(audit.version).toBe(version);
  });

  it('refuserar att återskapa om ärendeidentiteten misstämmer', () => {
    expect.exception(
      () =>
        new Audit(42, {
          caseID: 69,
          started: 1600819200000,
        })
    );
  });

  it('serialiserar en minimal instans för lagring i databasen', () => {
    const caseID = 42;
    const officer = { email: 'greta.granskare@digg.se' };
    const started = new Date('2020-09-23T12:34:56+02:00');
    const audit = new Audit(caseID);
    officer.serialize = () => officer;
    audit.id = 42; // Ska ignoreras.
    audit.started = started;
    audit.officer = officer;
    expect(audit.serialize()).toEqual({
      caseID,
      officer,
      started: started.getTime(),
    });
  });

  it('serialiserar en maximal instans för lagring i databasen', () => {
    const caseID = 42;
    const colours = [['#5a675c', 'Test']];
    const officer = { email: 'greta.granskare@digg.se' };
    const started = new Date('2020-09-23T12:34:56+02:00');
    const version = '3.14';
    const audit = new Audit(caseID);
    officer.serialize = () => officer;
    audit.id = 42; // Ska ignoreras.
    audit.started = started;
    audit.officer = officer;
    audit.version = version;
    colours.forEach(([v, n]) => audit.setColour(n, v));
    expect(audit.serialize()).toEqual({
      caseID,
      colours,
      officer,
      started: started.getTime(),
      version,
    });
  });

  it('returnerar ett objekt vid omvandling till JSON (minimalt)', () => {
    const officer = { email: 'greta.granskare@digg.se' };
    const started = new Date('2020-09-23T12:34:56+02:00');
    const audit = new Audit(42);
    officer.serialize = () => officer;
    audit.id = 42; // Ska ignoreras.
    audit.started = started;
    audit.officer = officer;
    expect(audit.toJSON()).toEqual({
      officer,
      started: started.getTime(),
    });
  });

  it('returnerar ett objekt vid omvandling till JSON (maximalt)', () => {
    const sample = (category, id, name) => {
      const s = {
        category,
        id,
        name,
        toJSON: () => s,
      };
      return s;
    };
    const colours = [['#5a675c', 'Test']];
    const id = 42;
    const officer = { email: 'greta.granskare@digg.se' };
    const sample1 = sample('component', 13, 'test 1');
    const sample2 = sample('start', 42, 'test 2');
    const sample3 = sample('login', 69, 'test 3');
    const samples = [sample1, sample2, sample3];
    const started = new Date('2020-09-23T12:34:56+02:00');
    const version = '3.14';
    const audit = new Audit(42);
    officer.serialize = () => officer;
    audit.id = 42; // Ska ignoreras.
    audit.started = started;
    audit.officer = officer;
    audit.version = version;
    colours.forEach(([v, n]) => audit.setColour(n, v));
    audit.setSample(sample1);
    audit.setSample(sample2);
    audit.setSample(sample3);
    expect(audit.toJSON()).toEqual({
      colours,
      officer,
      samples,
      started: started.getTime(),
      version,
    });
  });

  it('omvandlar en pågående granskning till sträng', () => {
    const audit = new Audit(42);
    const start = '2020-09-23';
    audit.started = new Date(start);
    expect(audit.toString()).toBe(start);
  });
});

describe('Slutför granskning', () => {
  it.with([false, 'godkänd'], [true, 'underkänd'])(
    'slutför en {1} granskning',
    (failed) => {
      const sample = (category, id, name) => ({
        category,
        id,
        name,
        done: true,
        failed,
      });
      const audit = new Audit(42);
      audit.setSample(sample('start', 13, 'test 1'));
      audit.setSample(sample('login', 42, 'test 2'));
      audit.finish();
      expect(audit.finished).not.toBe(null);
      expect(audit.failed).toBe(failed);
      expect(audit.sampleProgress()).toEqual([2, 14]);
    }
  );

  it('refuserar slutförande av en redan slutförd granskning', () => {
    const audit = new Audit(42);
    audit.finish();
    expect.exception(() => audit.finish());
  });

  it('öppna en slutförd granskning', () => {
    const audit = new Audit(42);
    audit.finish();
    audit.reopen();
    expect(audit.finished).toBe(null);
  });

  it('returnerar tillagda påpekanden', () => {
    const audit = new Audit(42);
    const deadline = new Date('2021-12-31');
    const times = [new Date('2020-09-23'), new Date('2021-06-23')];
    audit.finish();
    audit.addRemarks(times[0], deadline);
    audit.addRemarks(times[1], deadline);
    expect(audit.remarks).toEqual(times.map((c) => [c, deadline]));
  });

  it('raderar ett tillagt påpekande', () => {
    const audit = new Audit(42);
    const deadline = new Date('2021-12-31');
    const times = [new Date('2020-09-23'), new Date('2021-06-23')];
    audit.finish();
    audit.addRemarks(times[0], deadline);
    audit.addRemarks(times[1], deadline);
    audit.deleteRemarks(times[0]);
    expect(audit.remarks).toEqual([[times[1], deadline]]);
  });

  it('refuserar tillägg av påpekande i en ej slutförd granskning', () => {
    const audit = new Audit(42);
    expect.exception(() => audit.addRemarks(new Date(), new Date()));
  });

  it('returnerar tillagda förelägganden', () => {
    const audit = new Audit(42);
    const deadline = new Date('2021-12-31');
    const times = [
      new Date('2020-09-23').getTime(),
      new Date('2021-06-23').getTime(),
    ];
    audit.finish();
    audit.addInjunction(times[0], deadline);
    audit.addInjunction(times[1], deadline);
    expect(audit.injunctions).toEqual(times.map((c) => [c, deadline]));
  });

  it('raderar ett tillagt föreläggande', () => {
    const audit = new Audit(42);
    const deadline = new Date('2021-12-31');
    const times = [new Date('2020-09-23'), new Date('2021-06-23')];
    audit.finish();
    audit.addInjunction(times[0], deadline);
    audit.addInjunction(times[1], deadline);
    audit.deleteInjunction(times[0]);
    expect(audit.injunctions).toEqual([[times[1], deadline]]);
  });

  it('refuserar tillägg av föreläggande i en ej slutförd granskning', () => {
    const audit = new Audit(42);
    expect.exception(() => audit.addInjunction(new Date(), new Date()));
  });

  it('serialiserar en slutförd instans för lagring i databasen', () => {
    const dates = (c, d) => [new Date(c), new Date(d)];
    const time = ([c, d]) => [c.getTime(), d.getTime()];
    const caseID = 42;
    const injunctions = [dates('2021-01-01', '2021-06-30')];
    const officer = { email: 'greta.granskare@digg.se' };
    const remarks = [dates('2020-10-01', '2020-12-31')];
    const started = new Date('2020-09-23T12:34:56+02:00');
    const audit = new Audit(caseID);
    officer.serialize = () => officer;
    audit.started = started;
    audit.officer = officer;
    audit.finish();
    injunctions.forEach(([c, d]) => audit.addInjunction(c, d));
    remarks.forEach(([c, d]) => audit.addRemarks(c, d));
    expect(audit.serialize()).toEqual({
      caseID,
      failed: false,
      finished: audit.finished.getTime(),
      injunctions: injunctions.map(time),
      officer,
      remarks: remarks.map(time),
      started: started.getTime(),
    });
  });

  it('returnerar ett objekt vid omvandling till JSON (slutförd)', () => {
    const dates = (c, d) => [new Date(c), new Date(d)];
    const time = ([c, d]) => [c.getTime(), d.getTime()];
    const sample = (category, id, name, failed) => {
      const s = {
        category,
        done: true,
        failed,
        id,
        name,
        toJSON: () => s,
      };
      return s;
    };
    const id = 42;
    const injunctions = [dates('2021-01-01', '2021-06-30')];
    const officer = { email: 'greta.granskare@digg.se' };
    const remarks = [dates('2020-10-01', '2020-12-31')];
    const sample1 = sample('component', 13, 'test 1', false);
    const sample2 = sample('start', 42, 'test 2', false);
    const sample3 = sample('login', 69, 'test 3', true);
    const samples = [sample1, sample2, sample3];
    const started = new Date('2020-09-23T12:34:56+02:00');
    const audit = new Audit(42);
    officer.serialize = () => officer;
    audit.id = 42; // Ska ignoreras.
    audit.started = started;
    audit.officer = officer;
    audit.setSample(sample1);
    audit.setSample(sample2);
    audit.setSample(sample3);
    audit.finish();
    injunctions.forEach(([c, d]) => audit.addInjunction(c, d));
    remarks.forEach(([c, d]) => audit.addRemarks(c, d));
    expect(audit.toJSON()).toEqual({
      failed: true,
      finished: audit.finished.getTime(),
      injunctions: injunctions.map(time),
      officer,
      remarks: remarks.map(time),
      samples,
      started: started.getTime(),
    });
  });

  it('omvandlar en slutförd granskning till sträng', () => {
    const audit = new Audit(42);
    const start = '2020-09-23';
    audit.started = new Date(start);
    audit.finish();
    const end = audit.finished.toLocaleDateString('sv');
    expect(audit.toString()).toBe(`${start}–${end}`);
  });
});

// Importera beroenden.
import { Audit, DuplicateNameError } from '../../js/model/Audit.js';
import { Component } from '../../js/model/sample.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

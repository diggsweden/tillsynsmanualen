/**
 * Enhetstestfall för stickprovsurval i en granskning.
 *
 * @license CC-BY 4.0
 * @see AppScreen
 * @see Component
 * @see NonWebDocument
 * @see Webpage
 */

/**
 * Skapa en ersättare för ett krav.
 *
 * @param {string} id Kravidentitet
 * @return {object}
 */
function mkReq(id) {
  return {
    dependencies: null,
    hasChecks: true,
    id,
    matchCategory: () => true,
    matchContentType: () => true,
    matchFormat: () => true,
    matchMode: () => true,
    matchPlatform: () => true,
  };
}

describe('Sample', () => {
  it('refuserar konstruktion utan granskningsidentitet', () => {
    expect.exception(() => new Webpage({}));
  });

  it('refuserar konstruktion utan kategori', () => {
    expect.exception(() => new Webpage(42));
  });

  it('returnerar angiven granskningidentitet', () => {
    const id = 42;
    const sample = new Webpage(id, 'start');
    expect(sample.auditID).toBe(id);
  });

  it('returnerar angiven urvalskategori', () => {
    const category = 'start';
    const cat2 = 'relevant';
    const sample = new Webpage(42, category);
    expect(sample.category).toBe(category);
    sample.category = cat2;
    expect(sample.category).toBe(cat2);
  });

  it('returnerar angiven identitet i databasen', () => {
    const id = 13;
    const sample = new Webpage(42, 'start');
    sample.id = id;
    expect(sample.id).toBe(id);
  });

  it('returnerar angiven partialgranskningsflagga', () => {
    const sample = new Webpage(42, 'start');
    expect(sample.partial).toBe(false);
    sample.partial = true;
    expect(sample.partial).toBe(true);
  });

  it('lägger till och tar bort innehållstyper', () => {
    const sample = new Webpage(42, 'start');
    sample.addContentType('foo');
    sample.addContentType('bar');
    expect(sample.contentTypes.length).toBe(2);
    expect(sample.contentTypes).toEqual(['bar', 'foo']);
    expect(sample.contains('foo')).toBe(true);
    expect(sample.contains('baz', 'bar')).toBe(true);
    expect(sample.contains('quux')).toBe(false);
    expect(sample.contains('baz', 'zyx')).toBe(false);
    sample.deleteContentType('bar');
    expect(sample.contentTypes.length).toBe(1);
    expect(sample.contentTypes).toEqual(['foo']);
    expect(sample.contains('foo')).toBe(true);
    expect(sample.contains('baz', 'bar')).toBe(false);
  });

  it('har default inget föregående stickprov', () => {
    const sample = new Webpage(42, 'start');
    expect(sample.follows).toBe(undefined);
  });

  it('returnerar angivet föregående stickprov', () => {
    const previous = 'prev';
    const sample = new Webpage(42, 'start');
    sample.follows = previous;
    expect(sample.follows).toBe(previous);
  });

  it('returnerar angivet visningsläge', () => {
    const mode = 'advanced';
    const sample = new Webpage(42, 'start');
    sample.mode = mode;
    expect(sample.mode).toBe(mode);
  });

  it('returnerar en trimmad anteckning', () => {
    const sample = new Webpage(42, 'start');
    const text = 'test';
    sample.note = ` ${text} `;
    expect(sample.note).toBe(text);
  });

  it('returnerar ett trimmat namn', () => {
    const name = 'test';
    const sample = new Webpage(42, 'start');
    sample.name = ` ${name} `;
    expect(sample.name).toBe(name);
  });

  it('returnerar en trimmad typ av tjänst', () => {
    const sample = new Webpage(42, 'start');
    const service = 'test';
    sample.service = ` ${service} `;
    expect(sample.service).toBe(service);
  });

  it('returnerar huruvida externa anteckningar finns', () => {
    const req1 = { id: 'bar' };
    const req2 = { id: 'foo', externalNote: '' };
    const req3 = { id: 'quux', externalNote: 'note' };
    const sample = new Webpage(42, 'start');
    sample.setRequirement(req1);
    sample.setRequirement(req2);
    expect(sample.hasExternalNotes).toBe(false);
    sample.setRequirement(req3);
    expect(sample.hasExternalNotes).toBe(true);
  });

  it('returnerar huruvida krav lagts till', () => {
    const req = { id: 'bar' };
    const sample = new Webpage(42, 'start');
    expect(sample.hasRequirements).toBe(false);
    sample.setRequirement(req);
    expect(sample.hasRequirements).toBe(true);
  });

  it('sätter kravfunktion i tillagt krav', () => {
    const req = { id: 'bar', dependencies: null };
    const sample = new Webpage(42, 'start');
    sample.setRequirement(req);
    expect(req.dependencies).not.toBe(null);
  });

  it('returnerar angivet krav', () => {
    const req1 = mkReq('bar');
    const req2 = mkReq('foo');
    const sample = new Webpage(42, 'start');
    sample.setRequirement(req1);
    sample.setRequirement(req2);
    expect(sample.requirement(req1.id)).toBe(req1);
    expect(sample.requirement(req2.id)).toBe(req2);
  });

  it.with(
    ['matchCategory', 'urvalskategori'],
    ['matchContentType', 'innehållstyper'],
    ['matchMode', 'visningsläge']
  )('returnerar inte krav som inte matchar {1}', (filter) => {
    const req = mkReq('foo');
    const sample = new Webpage(42, 'start');
    req[filter] = () => false;
    sample.setRequirement(req);
    expect(sample.requirement(req.id)).toBe(null);
  });

  it('returnerar inte krav som inte matchar dokumenttyp', () => {
    const req = mkReq('foo');
    const sample = new NonWebDocument(42, 'service');
    req.matchFormat = () => false;
    sample.setRequirement(req);
    expect(sample.requirement(req.id)).toBe(null);
  });

  it('returnerar inte krav som inte matchar plattform', () => {
    const req = mkReq('foo');
    const sample = new AppScreen(42, 'service');
    req.matchPlatform = () => false;
    sample.setRequirement(req);
    expect(sample.requirement(req.id)).toBe(null);
  });

  it('itererar över tillagda krav', () => {
    const req1 = mkReq('bar');
    const req2 = mkReq('foo');
    const sample = new Webpage(42, 'start');
    sample.setRequirement(req1);
    sample.setRequirement(req2);
    expect(Array.from(sample.requirements())).toEqual([req1, req2]);
  });

  it('itererar över krav med filtrering på urvalskategori', () => {
    const req1 = mkReq('bar');
    const req2 = mkReq('foo');
    const sample = new Webpage(42, 'start');
    req2.matchCategory = () => false;
    sample.setRequirement(req1);
    sample.setRequirement(req2);
    expect(Array.from(sample.requirements())).toEqual([req1]);
  });

  it('itererar över krav med filtrering på innehållstyper', () => {
    const req1 = mkReq('bar');
    const req2 = mkReq('foo');
    const sample = new Webpage(42, 'start');
    req2.matchContentType = () => false;
    sample.setRequirement(req1);
    sample.setRequirement(req2);
    expect(Array.from(sample.requirements())).toEqual([req1]);
  });

  it('itererar över krav med filtrering på visningsläge', () => {
    const req1 = mkReq('bar');
    const req2 = mkReq('foo');
    const sample = new Webpage(42, 'start');
    req2.matchMode = () => false;
    sample.setRequirement(req1);
    sample.setRequirement(req2);
    expect(Array.from(sample.requirements())).toEqual([req1]);
  });

  it('itererar över krav utan filter', () => {
    const req1 = mkReq('bar');
    const req2 = mkReq('foo');
    const sample = new Webpage(42, 'start');
    req1.matchCategory = () => false;
    req2.matchContentType = () => false;
    sample.setRequirement(req1);
    sample.setRequirement(req2);
    expect(Array.from(sample.requirements(true))).toEqual([req1, req2]);
  });

  it("returnernar 'påbörjat' om minst ett krav är påbörjat", () => {
    const req1 = mkReq('bar');
    const req2 = mkReq('foo');
    const sample = new Webpage(42, 'start');
    req1.hasChecks = false;
    req2.hasChecks = false;
    sample.setRequirement(req1);
    sample.setRequirement(req2);
    expect(sample.started).toBe(false);
    req2.hasChecks = true;
    expect(sample.started).toBe(true);
  });

  it("returnerar 'påbörjat' om markerat som partiellt", () => {
    const sample = new Webpage(42, 'start');
    expect(sample.started).toBe(false);
    sample.partial = true;
    expect(sample.started).toBe(true);
  });

  it("returnernar 'klar' om alla krav är kontrollerade", () => {
    const req1 = mkReq('bar');
    const req2 = mkReq('foo');
    const req3 = mkReq('quuz');
    const sample = new Webpage(42, 'start');
    req1.done = true;
    req2.done = false;
    req3.done = false;
    req3.matchContentType = () => false;
    sample.setRequirement(req1);
    sample.setRequirement(req2);
    sample.setRequirement(req3);
    expect(sample.done).toBe(false);
    req2.done = true;
    expect(sample.done).toBe(true);
  });

  it("returnerar 'klar' om markerat som partiellt", () => {
    const sample = new Webpage(42, 'start');
    expect(sample.done).toBe(false);
    sample.partial = true;
    expect(sample.done).toBe(true);
  });

  it('returnerar antal granskade krav och totalt antal', () => {
    const req1 = mkReq('bar');
    const req2 = mkReq('foo');
    const req3 = mkReq('quux');
    const sample = new Webpage(42, 'start');
    req1.done = true;
    req2.done = false;
    req3.matchContentType = () => false;
    sample.setRequirement(req1);
    sample.setRequirement(req2);
    sample.setRequirement(req3);
    expect(sample.progress()).toEqual([1, 2]);
  });

  it('returnerar nästa krav att granska', () => {
    const req1 = mkReq('bar');
    const req2 = mkReq('foo');
    const req3 = mkReq('quux');
    const sample = new Webpage(42, 'start');
    req1.done = true;
    req3.done = false;
    req2.matchContentType = () => false;
    sample.setRequirement(req1);
    sample.setRequirement(req2);
    sample.setRequirement(req3);
    expect(sample.nextRequirement()).toBe(req3);
  });

  it('returnerar underkända kravavsnittsnummer', () => {
    const req1 = mkReq('bar');
    const req2 = mkReq('foo');
    const req3 = mkReq('quux');
    const sample = new Webpage(42, 'start');
    req1.clause = '0.1';
    req1.failed = true;
    req2.clause = '0.2';
    req3.clause = '0.3';
    req3.failed = false;
    req2.matchContentType = () => false;
    sample.setRequirement(req1);
    sample.setRequirement(req2);
    sample.setRequirement(req3);
    const fails = new Set();
    sample.failures(fails);
    expect(fails.has('0.1')).toBe(true);
    expect(fails.has('0.2')).toBe(false);
    expect(fails.has('0.3')).toBe(false);
  });

  it('kopierar ett befintligt stickprov', () => {
    const content = ['bar', 'foo'];
    const follows = 'prev';
    const id = 13;
    const name = 'test';
    const note = 'test note';
    const source = new Webpage(42, 'start');
    const service = 'test service';
    source.follows = follows;
    source.id = id;
    source.name = name;
    source.note = note;
    source.service = service;
    content.forEach((type) => source.addContentType(type));
    const target = new Webpage(42, source);
    expect(target.id).toBe(id);
    expect(target.name).toBe(name);
    expect(target.contentTypes).toEqual(content);
    expect(target.follows).toBe(follows);
    expect(target.id).toBe(id);
    expect(target.name).toBe(name);
    expect(target.note).toBe(note);
    expect(target.service).toBe(service);
  });

  it('refuserar att kopiera om granskningsidentiteten misstämmer', () => {
    const source = new Webpage(42, 'start');
    expect.exception(() => new Webpage(69, source));
  });

  it('återskapar en minimal instans från ett dataobjekt', () => {
    const auditID = 42;
    const category = 'start';
    const name = 'test';
    const data = { auditID, category, name };
    const sample = new Webpage(auditID, data);
    expect(sample.auditID).toBe(auditID);
    expect(sample.category).toBe(category);
    expect(sample.name).toBe(name);
  });

  it('återskapar en maximal instans från ett dataobjekt', () => {
    const auditID = 42;
    const category = 'start';
    const content = ['bar', 'foo'];
    const follows = 'prev';
    const name = 'test';
    const note = 'test note';
    const partial = true;
    const service = 'test service';
    const data = {
      auditID,
      category,
      name,
      content,
      follows,
      note,
      partial,
      service,
    };
    const sample = new Webpage(auditID, data);
    expect(sample.auditID).toBe(auditID);
    expect(sample.category).toBe(category);
    expect(sample.contentTypes).toEqual(content);
    expect(sample.follows).toBe(follows);
    expect(sample.name).toBe(name);
    expect(sample.note).toBe(note);
    expect(sample.done).toBe(partial);
    expect(sample.service).toBe(service);
  });

  it('refuserar att återskapa om ärendeidentiteten misstämmer', () => {
    const data = { auditID: 13, category: 'start' };
    expect.exception(() => new Webpage(42, data));
  });

  it('serialiserar en minimal instans för lagring i databasen', () => {
    const auditID = 42;
    const category = 'start';
    const name = 'test';
    const sample = new Webpage(auditID, category);
    sample.id = 13; // Ska ignoreras.
    sample.name = name;
    expect(sample.serialize()).toEqual({
      auditID,
      category,
      class: 'Webpage',
      name,
    });
  });

  it('serialiserar en maximal instans för lagring i databasen', () => {
    const auditID = 42;
    const category = 'start';
    const content = ['bar', 'foo'];
    const follows = 'prev';
    const id = 13;
    const name = 'test';
    const note = 'test note';
    const partial = true;
    const sample = new Webpage(auditID, category);
    const service = 'test service';
    sample.partial = partial;
    sample.follows = follows;
    sample.id = 13; // Ska ignoreras.
    sample.name = name;
    sample.note = note;
    sample.service = service;
    content.forEach((type) => sample.addContentType(type));
    expect(sample.serialize()).toEqual({
      auditID,
      category,
      class: 'Webpage',
      name,
      content,
      follows,
      note,
      partial,
      service,
    });
  });

  it('returnerar ett objekt vid omvandling till JSON (minimalt)', () => {
    const category = 'start';
    const name = 'test';
    const sample = new Webpage(42, category);
    sample.id = 13; // Ska ignoreras.
    sample.name = name;
    expect(sample.toJSON()).toEqual({
      category,
      class: 'Webpage',
      name,
    });
  });

  it('returnerar ett objekt vid omvandling till JSON (maximalt)', () => {
    const category = 'start';
    const content = ['bar', 'foo'];
    const follows = 'prev';
    const name = 'test';
    const note = 'test note';
    const partial = true;
    const req = (id) => {
      const r = { id, toJSON: () => r };
      return r;
    };
    const req1 = req('bar');
    const req2 = req('foo');
    const sample = new Webpage(42, category);
    const service = 'test service';
    sample.partial = partial;
    sample.follows = follows;
    sample.id = 13; // Ska ignoreras.
    sample.name = name;
    sample.note = note;
    sample.service = service;
    content.forEach((type) => sample.addContentType(type));
    sample.setRequirement(req1);
    sample.setRequirement(req2);
    expect(sample.toJSON()).toEqual({
      category,
      class: 'Webpage',
      name,
      content,
      follows,
      note,
      partial,
      service,
      req: [req1, req2],
    });
  });

  it('omvandlar till sträng som stickprovets namn', () => {
    const name = 'test';
    const sample = new Webpage(42, 'start');
    expect(sample.toString()).toBe('namnlös');
    sample.name = name;
    expect(sample.toString()).toBe(name);
  });
});

describe('CompositeSample', () => {
  it('returnerar huruvida en komponent lagts till', () => {
    const comp = { id: 13, parentType: 'webpage' };
    const sample = new Webpage(42, 'start');
    sample.addComponent(comp);
    expect(sample.hasComponent(comp.id)).toBe(true);
    expect(sample.hasComponent(comp.id + 1)).toBe(false);
  });

  it('returnerar tillagda komponenter', () => {
    const comp1 = { id: 13, parentType: 'webpage' };
    const comp2 = { id: 69, parentType: 'webpage' };
    const sample = new Webpage(42, 'start');
    sample.addComponent(comp1);
    sample.addComponent(comp2);
    expect(Array.from(sample.components)).toEqual([comp1, comp2]);
  });

  it('returnerar antal komponenter', () => {
    const comp1 = { id: 13, parentType: 'webpage' };
    const comp2 = { id: 69, parentType: 'webpage' };
    const sample = new Webpage(42, 'start');
    sample.addComponent(comp1);
    sample.addComponent(comp2);
    expect(sample.numComponents).toEqual(2);
  });

  it('tar bort en tillagd komponent', () => {
    const comp = { id: 13 };
    const sample = new Webpage(42, 'start');
    sample.addComponent(comp);
    sample.deleteComponent(comp.id);
    expect(sample.hasComponent(comp.id)).toBe(false);
  });

  it.with([false, 'utan att beakta'], [true, 'och inkluderar'])(
    'returnerar ett krav {1} komponenter',
    (flag) => {
      const audit = {
        id: 42,
        sample: (n) => ({ 13: component })[n],
      };
      const component = {
        id: 13,
        parentType: 'webpage',
        requirement: () => compReq,
      };
      const compReq = mkReq('foo');
      const expected = [];
      const req = mkReq('foo');
      const sample = new Webpage(audit, 'start');
      flag && expected.push(compReq);
      expected.push(req);
      sample.addComponent(component);
      sample.setRequirement(req);
      expect(req.dependencies('foo', flag)).toEqual(expected);
    }
  );

  it('återskapar en instans från databasen', () => {
    const auditID = 42;
    const category = 'start';
    const components = [13, 69];
    const name = 'test';
    const pending = components.map((id) => ({ id }));
    const data = { auditID, category, components, name };
    const sample = new Webpage(auditID, data);
    expect(sample.pending).toEqual(pending);
    expect(sample.numComponents).toBe(components.length);
  });

  it('återskapar en instans från JSON', () => {
    const audit = {
      id: 42,
      *components() {
        yield { id: 13, name: 'bar' };
        yield { id: 69, name: 'foo' };
      },
    };
    const category = 'start';
    const components = ['bar', 'foo'];
    const name = 'test';
    const pending = components.map((name) => ({ name }));
    const data = { auditID: audit.id, category, components, name };
    const sample = new Webpage(audit.id, data);
    expect(sample.pending).toEqual(pending);
    expect(sample.numComponents).toBe(components.length);
  });

  it('realiserar bara komponenter av rätt typ', () => {
    const component = { id: 13, name: 'Bar', parentType: 'screen' };
    const name = 'Foo';
    const source = new AppScreen(42, 'start');
    source.name = name;
    source.addComponent(component);
    const dest = new Webpage(42, source.serialize());
    dest.addComponent(component);
    expect(dest.components.length).toBe(0);
    expect(dest.pending.length).toBe(0);
  });

  it('serialiserar en instans för lagring i databasen', () => {
    const ids = [13, 69];
    const sample = new Webpage(42, 'start');
    ids.forEach((id) => sample.addComponent({ id, parentType: 'webpage' }));
    const obj = sample.serialize();
    expect(obj.components).toEqual(ids);
  });

  it('returnerar ett objekt vid omvandling till JSON', () => {
    const audit = {
      id: 42,
      sample: (id) =>
        ({
          13: { id: 13, name: 'bar', parentType: 'webpage' },
          69: { id: 69, name: 'foo', parentType: 'webpage' },
        })[id] ?? null,
    };
    const category = 'start';
    const name = 'test';
    const sample = new Webpage(audit.id, category);
    sample.name = name;
    sample.addComponent(audit.sample(13));
    sample.addComponent(audit.sample(69));
    expect(sample.toJSON()).toEqual({
      category,
      components: ['bar', 'foo'],
      class: 'Webpage',
      name,
    });
  });
});

describe('AppScreen', () => {
  it("returnerar typen 'screen'", () => {
    const sample = new AppScreen(42, 'start');
    expect(sample.type).toBe('screen');
  });

  it('indikerar sammansatt stickprov', () => {
    const sample = new AppScreen(42, 'start');
    expect(sample.isComposite).toBe(true);
  });

  it('returnerar angiven plattform med gemener', () => {
    const sample = new AppScreen(42, 'start');
    sample.platform = 'iOS';
    expect(sample.platform).toBe('ios');
  });

  it.with([true, 'stängd'], [false, 'öppen'])(
    'returnerar angiven flagga för {1}/stängd funktionalitet',
    (flag) => {
      const sample = new AppScreen(42, 'start');
      sample.closed = flag;
      expect(sample.closed).toBe(flag);
    }
  );

  it('itererar över krav med filtrering på plattform', () => {
    const req1 = mkReq('bar');
    const req2 = mkReq('foo');
    const sample = new AppScreen(42, 'start');
    req2.matchPlatform = () => false;
    sample.setRequirement(req1);
    sample.setRequirement(req2);
    expect(Array.from(sample.requirements())).toEqual([req1]);
  });

  it('kopierar ett befintligt stickprov', () => {
    const platform = 'android';
    const source = new AppScreen(42, 'start');
    source.closed = true;
    source.platform = platform;
    const target = new AppScreen(42, source);
    expect(target.closed).toBe(true);
    expect(target.platform).toBe(platform);
  });

  it('kopierar inte komponenter av fel typ vid omvandling', () => {
    const comp = new Component(42, 'webpage');
    comp.id = 13;
    const source = new Webpage(42, 'statement');
    source.addComponent(comp); // Ska ignoreras.
    const target = new AppScreen(42, source);
    expect(target.numComponents).toBe(0);
  });

  it('återskapar en instans från ett dataobjekt', () => {
    const auditID = 42;
    const category = 'start';
    const closed = true;
    const id = 13;
    const name = 'test';
    const platform = 'ios';
    const data = { auditID, category, closed, id, name, platform };
    const sample = new AppScreen(auditID, data);
    expect(sample.closed).toBe(closed);
    expect(sample.platform).toBe(platform);
  });

  it('serialiserar en instans för lagring i databasen', () => {
    const auditID = 42;
    const category = 'start';
    const closed = true;
    const name = 'test';
    const platform = 'ios';
    const sample = new AppScreen(auditID, category);
    sample.closed = closed;
    sample.name = name;
    sample.platform = platform;
    expect(sample.serialize()).toEqual({
      auditID,
      category,
      class: 'AppScreen',
      closed,
      name,
      platform,
    });
  });

  it('returnerar ett objekt vid omvandling till JSON (appvy)', () => {
    const category = 'start';
    const closed = true;
    const name = 'test';
    const platform = 'ios';
    const sample = new AppScreen(42, category);
    sample.closed = closed;
    sample.name = name;
    sample.platform = platform;
    expect(sample.toJSON()).toEqual({
      category,
      class: 'AppScreen',
      closed,
      name,
      platform,
    });
  });
});

describe('Component', () => {
  it("returnerar typen 'component'", () => {
    const sample = new Component(42, 'webpage');
    expect(sample.type).toBe('component');
  });

  it('indikerar icke sammansatt stickprov', () => {
    const sample = new Component(42, 'start');
    expect(sample.isComposite).not.toBe(true);
  });

  it.with([true, 'stängd'], [false, 'öppen'])(
    'returnerar angiven flagga för {1}/stängd funktionalitet',
    (flag) => {
      const sample = new Component(42, 'screen');
      sample.closed = flag;
      expect(sample.closed).toBe(flag);
    }
  );

  it('ignorerar stängd funktionalitet för webbkomponent', () => {
    const sample = new Component(42, 'webpage');
    sample.closed = true;
    expect(sample.closed).toBe(false);
  });

  it('returnerar förvalsmarkeringen', () => {
    const sample = new Component(42, 'webpage');
    sample.default = true;
    expect(sample.default).toBe(true);
  });

  it('returnerar stickprovstypen som komponenten ingår i', () => {
    const parent = 'webpage';
    const sample = new Component(42, parent);
    expect(sample.parentType).toBe(parent);
  });

  it('kopierar en befintlig komponent', () => {
    const source = new Component(42, 'screen');
    source.closed = true;
    source.default = true;
    source.platform = 'ios';
    const target = new Component(42, source);
    expect(target.closed).toBe(true);
    expect(target.default).toBe(true);
    expect(target.parentType).toBe('screen');
    expect(target.platform).toBe('ios');
  });

  it('återskapar en instans från ett dataobjekt', () => {
    const auditID = 42;
    const closed = true;
    const id = 13;
    const name = 'test';
    const parent = 'screen';
    const platform = 'ios';
    const data = {
      auditID,
      id,
      name,
      closed,
      default: true,
      parent,
      platform,
    };
    const sample = new Component(auditID, data);
    expect(sample.closed).toBe(true);
    expect(sample.default).toBe(true);
    expect(sample.parentType).toBe(parent);
    expect(sample.platform).toBe(platform);
  });

  it('serialiserar en instans för lagring i databasen', () => {
    const auditID = 42;
    const name = 'test';
    const parent = 'screen';
    const platform = 'ios';
    const sample = new Component(auditID, parent);
    sample.closed = true;
    sample.default = true;
    sample.name = name;
    sample.platform = platform;
    expect(sample.serialize()).toEqual({
      auditID,
      category: 'component',
      class: 'Component',
      name,
      closed: true,
      default: true,
      parent,
      platform,
    });
  });

  it('returnerar ett objekt vid omvandling till JSON (komponent)', () => {
    const name = 'test';
    const parent = 'screen';
    const platform = 'ios';
    const sample = new Component(42, parent);
    sample.closed = true;
    sample.default = true;
    sample.name = name;
    sample.platform = platform;
    expect(sample.toJSON()).toEqual({
      category: 'component',
      class: 'Component',
      closed: true,
      name,
      default: true,
      parent,
      platform,
    });
  });
});

describe('NonWebDocument', () => {
  it("returnerar typen 'document'", () => {
    const sample = new NonWebDocument(42, 'service');
    expect(sample.type).toBe('document');
  });

  it('indikerar icke sammansatt stickprov', () => {
    const sample = new NonWebDocument(42, 'start');
    expect(sample.isComposite).not.toBe(true);
  });

  it('returnerar ett trimmat gement dokumentformat utan punkt', () => {
    const sample = new NonWebDocument(42, 'service');
    sample.format = ' .TesT ';
    expect(sample.format).toBe('test');
  });

  it('returnerar en giltig sökväg', () => {
    const sample = new NonWebDocument(42, 'service');
    const url = 'https://digg.se/test.pdf';
    sample.url = url;
    expect(sample.url).toBe(url);
  });

  it('refuserar en ogiltig sökväg', () => {
    const sample = new NonWebDocument(42, 'service');
    expect
      .exception(() => (sample.url = '/etc/passwd'))
      .toBeAnInstanceOf(ValidationError);
  });

  it('kopierar ett befintligt stickprov', () => {
    const source = new Webpage(42, 'service');
    source.url = 'https://digg.se';
    const target = new NonWebDocument(42, source);
    expect(target.url).toBe(source.url);
  });

  it('återskapar en instans från ett dataobjekt', () => {
    const auditID = 42;
    const category = 'service';
    const format = 'docx';
    const name = 'test';
    const url = 'https://digg.se/test.docx';
    const data = { auditID, category, name, format, url };
    const sample = new NonWebDocument(auditID, data);
    expect(sample.format).toBe(format);
    expect(sample.url).toBe(url);
  });

  it('serialiserar en instans för lagring i databasen', () => {
    const auditID = 42;
    const category = 'special';
    const format = 'pdf';
    const name = 'test';
    const url = 'https://digg.se/test.docx';
    const sample = new NonWebDocument(auditID, category);
    sample.format = format;
    sample.name = name;
    sample.url = url;
    expect(sample.serialize()).toEqual({
      auditID,
      category,
      class: 'NonWebDocument',
      name,
      format,
      url,
    });
  });

  it('returnerar ett objekt vid omvandling till JSON (dokument)', () => {
    const category = 'special';
    const format = 'pdf';
    const name = 'test';
    const url = 'https://digg.se/test.docx';
    const sample = new NonWebDocument(42, category);
    sample.format = format;
    sample.name = name;
    sample.url = url;
    expect(sample.toJSON()).toEqual({
      category,
      class: 'NonWebDocument',
      name,
      format,
      url,
    });
  });
});

describe('Webpage', () => {
  it("returnerar typen 'webpage'", () => {
    const sample = new Webpage(42, 'start');
    expect(sample.type).toBe('webpage');
  });

  it('indikerar sammansatt stickprov', () => {
    const sample = new Webpage(42, 'start');
    expect(sample.isComposite).toBe(true);
  });

  it('returnerar en giltig sökväg', () => {
    const sample = new Webpage(42, 'start');
    const url = 'https://digg.se/';
    sample.url = url;
    expect(sample.url).toBe(url);
  });

  it('refuserar en ogiltig sökväg', () => {
    const sample = new Webpage(42, 'start');
    expect
      .exception(() => (sample.url = '/etc/passwd'))
      .toBeAnInstanceOf(ValidationError);
  });

  it('kopierar ett befintligt stickprov', () => {
    const source = new NonWebDocument(42, 'service');
    source.format = 'pdf'; // Ska ignoreras.
    source.url = 'https://digg.se/test.pdf';
    const target = new Webpage(42, source);
    expect(target.url).toBe(source.url);
  });

  it('kopierar inte komponenter av fel typ vid omvandling', () => {
    const comp = new Component(42, 'screen');
    comp.id = 13;
    const source = new AppScreen(42, 'statement');
    source.addComponent(comp); // Ska ignoreras.
    const target = new Webpage(42, source);
    expect(target.numComponents).toBe(0);
  });

  it('återskapar en instans från ett dataobjekt', () => {
    const auditID = 42;
    const category = 'start';
    const id = 13;
    const name = 'test';
    const url = 'https://digg.se/';
    const data = { auditID, category, id, name, url };
    const sample = new Webpage(auditID, data);
    expect(sample.url).toBe(url);
  });

  it('serialiserar en instans för lagring i databasen', () => {
    const auditID = 42;
    const category = 'start';
    const id = 13;
    const name = 'test';
    const url = 'https://digg.se/';
    const sample = new Webpage(auditID, category);
    sample.id = id;
    sample.name = name;
    sample.url = url;
    expect(sample.serialize()).toEqual({
      auditID,
      category,
      class: 'Webpage',
      name,
      url,
    });
  });

  it('returnerar ett objekt vid omvandling till JSON (webbsida)', () => {
    const category = 'start';
    const name = 'test';
    const url = 'https://digg.se/';
    const sample = new Webpage(42, category);
    sample.name = name;
    sample.url = url;
    expect(sample.toJSON()).toEqual({
      category,
      class: 'Webpage',
      name,
      url,
    });
  });
});

describe('SampleFactory', () => {
  let data;

  beforeEach(() => {
    data = {
      category: 'random',
      content: ['bar', 'foo'],
      follows: 'prev',
      name: 'test',
      note: 'test note',
      req: [{}],
      service: 'test service',
    };
  });

  it.with(
    [AppScreen, { platform: 'ios' }, 'en vy i en app'],
    [Component, { default: true }, 'en komponent'],
    [
      NonWebDocument,
      { format: 'pdf', url: 'https://dig.se/test.pdf' },
      'ett dokument',
    ],
    [Webpage, { url: 'https://dig.se' }, 'en webbsida']
  )('bygger {2} från JSON-data', (sampleClass, extra) => {
    data.class = sampleClass.name;
    for (const [key, value] of Object.entries(extra)) {
      data[key] = value;
    }
    const sample = SampleFactory.build(42, data);
    expect(sample).toBeAnInstanceOf(sampleClass);
    expect(sample.contentTypes).toEqual(data.content);
    expect(sample.name).toBe(data.name);
    expect(sample.note).toBe(data.note);
    expect(sample.service).toBe(data.service);
    for (const [key, value] of Object.entries(extra)) {
      expect(sample[key]).toBe(value);
    }
  });
});

// Importera beroenden.
import { ValidationError } from '../../js/model/ValidationError.js';
import {
  AppScreen,
  Component,
  NonWebDocument,
  SampleFactory,
  Webpage,
} from '../../js/model/sample.js';
import { beforeEach, describe, expect, it } from '../functions.js';

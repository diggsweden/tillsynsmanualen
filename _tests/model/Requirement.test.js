/**
 * Enhetstestfall för ett krav som ingår i en granskning.
 *
 * @license CC-BY 4.0
 * @see Requirement
 */

describe('Åtkomstmetoder och validering', () => {
  const mkCheck = (id, state, options = {}) => ({
    id,
    applicable: options.applicable ?? true,
    control: options.control ?? false,
    derived: options.derived ?? false,
    state,
  });

  it('returnerar angiven primärnyckel', () => {
    const key = 13;
    const requirement = new Requirement(42);
    requirement.key = key;
    expect(requirement.key).toBe(key);
  });

  it('returnerar angiven stickprovsidentitet', () => {
    const id = 42;
    const requirement = new Requirement(id);
    expect(requirement.sampleID).toBe(id);
  });

  it('returnerar angiven kravidentitet', () => {
    const id = 'test';
    const requirement = new Requirement(42);
    requirement.id = id;
    expect(requirement.id).toBe(id);
  });

  it('returnerar ett trimmat kravavsnittsnummer', () => {
    const clause = '9.1.2.3';
    const requirement = new Requirement(42);
    requirement.clause = ` ${clause} `;
    expect(requirement.clause).toBe(clause);
  });

  it('returnerar en trimmad extern anteckning', () => {
    const requirement = new Requirement(42);
    const text = 'Test';
    requirement.externalNote = ` ${text} `;
    expect(requirement.externalNote).toBe(text);
  });

  it('returnerar en trimmad intern anteckning', () => {
    const requirement = new Requirement(42);
    const text = 'Test';
    requirement.internalNote = ` ${text} `;
    expect(requirement.internalNote).toBe(text);
  });

  it('returnerar en trimmad titel', () => {
    const requirement = new Requirement(42);
    const text = 'Test';
    requirement.title = ` ${text} `;
    expect(requirement.title).toBe(text);
  });

  it('returnerar flagga för automatiskt godkännande', () => {
    const requirement = new Requirement(42);
    expect(requirement.approved).toBe(false);
    requirement.approved = true;
    expect(requirement.approved).toBe(true);
  });

  it('ignorerar flagga för automatiskt godkännande', () => {
    const requirement = new Requirement(42);
    expect(requirement.approvable).toBe(true);
    requirement.approvable = false;
    expect(requirement.approvable).toBe(false);
    requirement.approved = true;
    expect(requirement.approved).toBe(false);
  });

  it('returnerar huruvida kontroller lagts till', () => {
    const check = { id: 'foo' };
    const requirement = new Requirement(42);
    expect(requirement.hasChecks).toBe(false);
    requirement.setCheck(check);
    expect(requirement.hasChecks).toBe(true);
  });

  it('sätter kravfunktion vid tillägg av härledd kontroll', () => {
    const checks = [
      { id: 's1' },
      { id: 'd1', dependencies: null, derived: true },
    ];
    const dependencies = () => [];
    const requirement = new Requirement(42);
    requirement.dependencies = dependencies;
    requirement.setCheck(checks[0]);
    requirement.setCheck(checks[1]);
    expect(checks[0].dependencies).toBe(undefined);
    expect(checks[1].dependencies).toBe(dependencies);
  });

  it('sätter kravfunktion i tillagd härledd kontroll', () => {
    const checks = [
      { id: 's1' },
      { id: 'd1', dependencies: null, derived: true },
    ];
    const dependencies = () => [];
    const requirement = new Requirement(42);
    requirement.setCheck(checks[0]);
    requirement.setCheck(checks[1]);
    requirement.dependencies = dependencies;
    expect(checks[0].dependencies).toBe(undefined);
    expect(checks[1].dependencies).toBe(dependencies);
  });

  it('returnerar angiven kontroll', () => {
    const id = 'foo';
    const check = { id };
    const requirement = new Requirement(42);
    expect(requirement.check(id)).toBe(undefined);
    requirement.setCheck(check);
    expect(requirement.check(id)).toBe(check);
  });

  it('itererar över tillagda kontroller', () => {
    const check1 = { id: 'foo' };
    const check2 = { id: 'bar' };
    const requirement = new Requirement(42);
    requirement.setCheck(check1);
    requirement.setCheck(check2);
    expect(Array.from(requirement.checks())).toEqual([check1, check2]);
  });

  it('returnerar tillstånd=obestämt om ej populerat', () => {
    const requirement = new Requirement(42);
    expect(requirement.state).toBe(undefined);
  });

  it('returnerar tillstånd=obestämt om relevant kontroll är obestämd', () => {
    const check1 = mkCheck('foo', true);
    const check2 = mkCheck('bar', undefined);
    const requirement = new Requirement(42);
    requirement.setCheck(check1);
    requirement.setCheck(check2);
    expect(requirement.state).toBe(undefined);
  });

  it('returnerar tillstånd=underkänt om relevant kontroll är underkänd', () => {
    const check1 = mkCheck('foo', true);
    const check2 = mkCheck('bar', false);
    const requirement = new Requirement(42);
    requirement.setCheck(check1);
    requirement.setCheck(check2);
    expect(requirement.state).toBe(false);
  });

  it('returnerar tillstånd=godkänt om relevanta kontroller är godkända', () => {
    const check1 = mkCheck('foo', true);
    const check2 = mkCheck('bar', true);
    const requirement = new Requirement(42);
    requirement.setCheck(check1);
    requirement.setCheck(check2);
    expect(requirement.state).toBe(true);
  });

  it('returnerar tillstånd=godkänt om inga kontroller är relevanta', () => {
    const check1 = mkCheck('foo', false, { applicable: false });
    const check2 = mkCheck('bar', false, { applicable: false });
    const requirement = new Requirement(42);
    requirement.setCheck(check1);
    requirement.setCheck(check2);
    expect(requirement.state).toBe(true);
  });

  it('ignorerar ej tillämpliga kontroller vid tillståndsberäkning', () => {
    const check1 = mkCheck('foo', true);
    const check2 = mkCheck('bar', false, { applicable: false });
    const requirement = new Requirement(42);
    requirement.setCheck(check1);
    requirement.setCheck(check2);
    expect(requirement.state).toBe(true);
  });

  it('ignorerar ej villkorsstyrkontroller vid tillståndsberäkning', () => {
    const check1 = mkCheck('foo', true);
    const check2 = mkCheck('bar', false, { control: true });
    const requirement = new Requirement(42);
    requirement.setCheck(check1);
    requirement.setCheck(check2);
    expect(requirement.state).toBe(true);
  });

  it('returnerar tillstånd=godkänt om automatiskt godkänt', () => {
    const check = mkCheck('foo', undefined);
    const requirement = new Requirement(42);
    requirement.approved = true;
    expect(requirement.state).toBe(true);
    requirement.setCheck(check);
    expect(requirement.state).toBe(true);
  });

  it('returnerar klar om alla kontroller är granskade', () => {
    const check1 = mkCheck('foo', true);
    const check2 = mkCheck('bar', undefined);
    const requirement = new Requirement(42);
    expect(requirement.done).toBe(false);
    requirement.setCheck(check1);
    requirement.setCheck(check2);
    expect(requirement.done).toBe(false);
    check2.state = false;
    expect(requirement.done).toBe(true);
  });

  it('returnerar klar om automatiskt godkänt', () => {
    const check = mkCheck('foo', undefined);
    const requirement = new Requirement(42);
    requirement.approved = true;
    expect(requirement.done).toBe(true);
    requirement.setCheck(check);
    expect(requirement.done).toBe(true);
  });

  it('returnerar underkänt om någon manuell kontroll är underkänd', () => {
    const check1 = mkCheck('foo', true);
    const check2 = mkCheck('bar', false);
    const check3 = mkCheck('quux', false, { control: true, derived: true });
    const requirement = new Requirement(42);
    requirement.dependencies = () => [];
    expect(requirement.failed).toBe(false);
    requirement.setCheck(check1);
    requirement.setCheck(check2);
    requirement.setCheck(check3);
    expect(requirement.failed).toBe(true);
    check2.state = true;
    expect(requirement.failed).toBe(false);
  });

  it('returnerar underkänt om en reell härledd kontroll är underkänd', () => {
    const checkCtrl = mkCheck('foo', false, { control: true, derived: true });
    const checkReal = mkCheck('bar', false, { derived: true });
    const requirement = new Requirement(42);
    requirement.dependencies = (i) => [{ foo: checkCtrl, bar: checkReal }[i]];
    expect(requirement.failed).toBe(false);
    requirement.setCheck(checkCtrl);
    expect(requirement.failed).toBe(false);
    requirement.setCheck(checkReal);
    expect(requirement.failed).toBe(true);
  });

  it('returnerar angiven kravfunktion', () => {
    let calls = 0;
    const dependencies = () => ++calls;
    const requirement = new Requirement(42);
    requirement.dependencies = dependencies;
    expect(requirement.dependencies()).toBe(1);
  });
});

describe('Villkor', () => {
  it('returnerar angivna villkor för urvalskategori', () => {
    const category = 'statement';
    const requirement = new Requirement(42);
    requirement.categories = [category];
    expect(requirement.categories).toEqual([category]);
  });

  it('returnerar angivna villkor för innehållstyper', () => {
    const requirement = new Requirement(42);
    const types = ['bar', 'foo'];
    requirement.contentTypes = types;
    expect(requirement.contentTypes).toEqual(types);
  });

  it('returnerar angivna villkor för dokumentformat', () => {
    const format = 'pdf';
    const requirement = new Requirement(42);
    requirement.formats = [format];
    expect(requirement.formats).toEqual([format]);
  });

  it('returnerar angivna villkor för applikationsplattform', () => {
    const platform = 'android';
    const requirement = new Requirement(42);
    requirement.platforms = [platform];
    expect(requirement.platforms).toEqual([platform]);
  });

  it('returnerar angivna villkor för visningslägen', () => {
    const mode = 'advanced';
    const requirement = new Requirement(42);
    requirement.modes = [mode];
    expect(requirement.modes).toEqual([mode]);
  });

  it('matchar urvalskategori', () => {
    const category = 'statement';
    const requirement = new Requirement(42);
    expect(requirement.matchCategory('other')).toBe(true);
    requirement.categories = [category];
    expect(requirement.matchCategory(category)).toBe(true);
    expect(requirement.matchCategory('other')).toBe(false);
  });

  it('matchar innehållstyper', () => {
    const requirement = new Requirement(42);
    const types = ['bar', 'foo'];
    expect(requirement.matchContentType(['baz', 'quux'])).toBe(true);
    requirement.contentTypes = types;
    expect(requirement.matchContentType(types)).toBe(true);
    expect(requirement.matchContentType([types[0]])).toBe(true);
    expect(requirement.matchContentType([types[1]])).toBe(true);
    expect(requirement.matchContentType([types[0], 'baz'])).toBe(true);
    expect(requirement.matchContentType(['baz', types[1]])).toBe(true);
    expect(requirement.matchContentType(['baz'])).toBe(false);
    expect(requirement.matchContentType(['baz', 'quux'])).toBe(false);
  });

  it('matchar dokumentformat', () => {
    const formats = ['docx', 'pptx', 'xlsx'];
    const requirement = new Requirement(42);
    expect(requirement.matchFormat('pdf')).toBe(true);
    requirement.formats = formats;
    expect(requirement.matchFormat(formats[0])).toBe(true);
    expect(requirement.matchFormat(formats[1])).toBe(true);
    expect(requirement.matchFormat(formats[2])).toBe(true);
    expect(requirement.matchFormat('pdf')).toBe(false);
  });

  it('matchar applikationsplattform', () => {
    const platform = 'android';
    const requirement = new Requirement(42);
    expect(requirement.matchPlatform('ios')).toBe(true);
    requirement.platforms = [platform];
    expect(requirement.matchPlatform(platform)).toBe(true);
    expect(requirement.matchPlatform('ios')).toBe(false);
  });

  it('matchar visningsläge', () => {
    const mode = 'advanced';
    const requirement = new Requirement(42);
    expect(requirement.matchMode('simplified')).toBe(true);
    requirement.modes = [mode];
    expect(requirement.matchMode(mode)).toBe(true);
    expect(requirement.matchMode('simplified')).toBe(false);
  });
});

describe('Omvandling', () => {
  it('återskapar en minimal instans från ett dataobjekt', () => {
    const clause = '0.1';
    const id = 'test';
    const sampleID = 42;
    const title = 'Test';
    const data = { clause, id, sampleID, title };
    const requirement = new Requirement(sampleID, data);
    expect(requirement.approved).toBe(false);
    expect(requirement.clause).toBe(clause);
    expect(requirement.id).toBe(id);
    expect(requirement.title).toBe(title);
  });

  it('återskapar en maximal instans från ett dataobjekt', () => {
    const approved = true;
    const cat = ['category'];
    const checks = [{ class: 'SingleCheck', id: 'foo', ok: true }];
    const clause = '0.1';
    const content = ['bar', 'foo'];
    const extNote = 'ext';
    const fmt = ['format'];
    const id = 'test';
    const intNote = 'int';
    const mod = ['advanced'];
    const platf = ['platform'];
    const sampleID = 42;
    const title = 'Test';
    const data = {
      approved,
      cat,
      checks,
      clause,
      content,
      extNote,
      fmt,
      id,
      intNote,
      mod,
      platf,
      sampleID,
      title,
    };
    const requirement = new Requirement(sampleID, data);
    expect(requirement.approved).toBe(approved);
    expect(requirement.categories).toEqual(cat);
    expect(requirement.clause).toBe(clause);
    expect(requirement.contentTypes).toEqual(content);
    expect(requirement.externalNote).toBe(extNote);
    expect(requirement.id).toBe(id);
    expect(requirement.formats).toEqual(fmt);
    expect(requirement.internalNote).toBe(intNote);
    expect(requirement.modes).toEqual(mod);
    expect(requirement.platforms).toEqual(platf);
    expect(requirement.title).toBe(title);
    expect(requirement.check('foo')).toBeAnInstanceOf(SingleCheck);
  });

  it('refuserar att återskapa om stickprovsidentiteten misstämmer', () => {
    expect.exception(() => new Requirement(42, { sampleID: 13 }));
  });

  it('serialiserar en minimal instans för lagring i databasen', () => {
    const clause = '0.1';
    const id = 'test';
    const sampleID = 42;
    const title = 'Test';
    const requirement = new Requirement(sampleID);
    requirement.clause = clause;
    requirement.id = id;
    requirement.key = 13; // Ska ignoreras
    requirement.title = title;
    expect(requirement.serialize()).toEqual({
      clause,
      id,
      sampleID,
      title,
    });
  });

  it('serialiserar en maximal instans för lagring i databasen', () => {
    const approved = true;
    const cat = ['category'];
    const clause = '0.1';
    const check = (id) => {
      const c = { id, serialize: () => c };
      return c;
    };
    const chk1 = check('bar');
    const chk2 = check('foo');
    const content = ['bar', 'foo'];
    const extNote = 'ext';
    const fmt = ['format'];
    const id = 'test';
    const intNote = 'int';
    const mod = ['advanced'];
    const platf = ['platform'];
    const sampleID = 42;
    const title = 'Test';
    const requirement = new Requirement(sampleID);
    requirement.approved = approved;
    requirement.categories = cat;
    requirement.clause = clause;
    requirement.contentTypes = content;
    requirement.externalNote = extNote;
    requirement.formats = fmt;
    requirement.id = id;
    requirement.internalNote = intNote;
    requirement.key = 13; // Ska ignoreras
    requirement.modes = mod;
    requirement.platforms = platf;
    requirement.title = title;
    requirement.setCheck(chk1);
    requirement.setCheck(chk2);
    expect(requirement.serialize()).toEqual({
      approved,
      cat,
      clause,
      content,
      extNote,
      fmt,
      id,
      intNote,
      mod,
      platf,
      sampleID,
      title,
      checks: [chk1, chk2],
    });
  });

  it('returnerar ett objekt vid omvandling till JSON (minimalt)', () => {
    const clause = '0.1';
    const id = 'test';
    const title = 'Test';
    const requirement = new Requirement(42);
    requirement.clause = clause;
    requirement.id = id;
    requirement.key = 13; // Ska ignoreras
    requirement.title = title;
    expect(requirement.toJSON()).toEqual({
      clause,
      id,
      title,
    });
  });

  it('returnerar ett objekt vid omvandling till JSON (maximalt)', () => {
    const approved = true;
    const cat = ['category'];
    const check = (id) => {
      const c = { id, serialize: () => c };
      return c;
    };
    const chk1 = check('bar');
    const chk2 = check('foo');
    const clause = '0.1';
    const content = ['bar', 'foo'];
    const extNote = 'ext';
    const fmt = ['format'];
    const id = 'test';
    const intNote = 'int';
    const mod = ['advancded'];
    const platf = ['platform'];
    const title = 'Test';
    const requirement = new Requirement(42);
    requirement.approved = approved;
    requirement.categories = cat;
    requirement.clause = clause;
    requirement.contentTypes = content;
    requirement.externalNote = extNote;
    requirement.formats = fmt;
    requirement.id = id;
    requirement.internalNote = intNote;
    requirement.key = 13; // Ska ignoreras
    requirement.modes = mod;
    requirement.platforms = platf;
    requirement.title = title;
    requirement.setCheck(chk1);
    requirement.setCheck(chk2);
    expect(requirement.toJSON()).toEqual({
      approved,
      cat,
      clause,
      content,
      extNote,
      fmt,
      id,
      intNote,
      mod,
      platf,
      title,
      checks: [chk1, chk2],
    });
  });

  it('omvandlar till sträng som kravets identitet', () => {
    const id = 'test';
    const requireemnt = new Requirement(42);
    expect(requireemnt.toString()).toBe('namnlös');
    requireemnt.id = id;
    expect(requireemnt.toString()).toBe(id);
  });
});

// Importera beroenden.
import { Requirement } from '../../js/model/Requirement.js';
import { SingleCheck } from '../../js/model/check.js';
import { beforeEach, describe, expect, it } from '../functions.js';

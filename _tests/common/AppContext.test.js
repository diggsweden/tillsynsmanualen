/**
 * Enhetstestfall för applikationskontextklassen.
 *
 * @license CC-BY 4.0
 * @see AppContext
 */

describe('Åtkomstmetoder', () => {
  it('har tomma fel-/statusvärden', () => {
    const context = new AppContext();
    expect(context.error).toBe('');
    expect(context.status).toBe('');
  });

  it('rensar felmeddelande när statusmeddelande sätts', () => {
    const context = new AppContext();
    const error = 'ERROR';
    const status = 'STATUS';

    context.error = error;
    expect(context.error).toBe(error);
    expect(context.status).toBe('');

    context.status = status;
    expect(context.error).toBe('');
    expect(context.status).toBe(status);
  });

  it('rensar statusmeddelande när felmeddelande sätts', () => {
    const context = new AppContext();
    const error = 'ERROR';
    const status = 'STATUS';

    context.status = status;
    expect(context.error).toBe('');
    expect(context.status).toBe(status);

    context.error = error;
    expect(context.error).toBe(error);
    expect(context.status).toBe('');
  });

  it.with([true], [false])("sätter historiknavigering till '{0}'", (flag) => {
    const context = new AppContext();
    context.isHistoryNav = flag;
    expect(context.isHistoryNav).toBe(flag);
  });
});

describe('Sökväg och parametrar', () => {
  let doc;
  let fixture;
  const path = '?a=b&foo=bar&x=y#z';

  beforeEach(() => {
    doc = {
      _cookie: '',
      get cookie() {
        return doc._cookie;
      },
    };

    fixture = new AppContext(doc);
    fixture.path = path;
  });

  it('returnerar ändringsflagga', () => {
    expect(fixture.modified).toBe(false);
    fixture.path = '?c=d';
    expect(fixture.modified).toBe(true);
  });

  it('återställer ändringsflagga', () => {
    fixture.path = '?c=d';
    expect(fixture.modified).toBe(true);
    fixture.reset();
    expect(fixture.modified).toBe(false);
  });

  it('returnerar falskt/tom sträng för saknad parameter', () => {
    expect(fixture.hasParam('quz')).toBe(false);
    expect(fixture.param('quz')).toBe('');
  });

  it('returnerar true/värde för en angiven parameter', () => {
    expect(fixture.hasParam('foo')).toBe(true);
    expect(fixture.param('foo')).toBe('bar');
  });

  it('exkluderar fragmentidentifierare från parametervärde', () => {
    expect(fixture.param('x')).toBe('y');
  });

  it('returnerar mål från fragmentidentifierare', () => {
    expect(fixture.target).toBe('z');
  });

  it.with(
    ['mode', false],
    ['mode=advanced', true],
    ['mode=simplified', false],
    ['mode=invalid', undefined],
    ['', true] // eg. undefined
  )(
    "returnerar '{1}' för avancerat visningsläge med parametern '{0}'",
    (param, flag) => {
      fixture.path = `?a=b&${param}`;
      expect(fixture.advanced).toBe(flag);
    }
  );

  it.with(['advanced', true], ['simplified', false])(
    "hämtar '{1}' för avancerat läge från sessionskaka",
    (mode, flag) => {
      doc._cookie = `mode=${mode}`;
      expect(fixture.advanced).toBe(flag);
    }
  );
});

describe('Kända parametrar', () => {
  const audit = 42;
  const caseID = 13;
  let fixture;
  const page = 'test';
  const requirement = 'test-req';
  const sample = 69;
  const target = 'target';

  beforeEach(() => {
    const a = `&audit=${audit}`;
    const c = `&case=${caseID}`;
    const p = `?page=${page}`;
    const r = `&requirement=${requirement}`;
    const s = `&sample=${sample}`;
    const t = `&target=${target}`;
    fixture = new AppContext();
    fixture.path = `${p}${c}${a}${s}${r}${t}`;
  });

  it('returnerar sidnamn', () => {
    expect(fixture.page).toBe(page);
  });

  it('returnerar ärendenummer', () => {
    expect(fixture.case).toBe(caseID);
  });

  it('returnerar granskning', () => {
    expect(fixture.audit).toBe(audit);
  });

  it('returnerar stickprov', () => {
    expect(fixture.sample).toBe(sample);
  });

  it('returnerar krav', () => {
    expect(fixture.requirement).toBe(requirement);
  });

  it('returnerar mål från target-parameter', () => {
    expect(fixture.target).toBe(target);
  });
});

describe('Serialisering och återställning', () => {
  it('återställer en serialiserad kontext', () => {
    const ctx1 = new AppContext();
    ctx1.error = 'ERROR';
    ctx1.path = '?page=test&foo=bar';
    ctx1.status = 'STATUS';
    const obj = ctx1.serialize();
    const ctx2 = new AppContext();
    ctx2.unserialize(obj);

    expect(ctx2.error).toBe(ctx1.error);
    expect(ctx2.path).toBe(ctx1.path);
    expect(ctx2.status).toBe(ctx1.status);
  });
});

// Importera beroenden.
import { AppContext } from '../../js/common/AppContext.js';
import { beforeEach, describe, expect, it, mock } from '../functions.js';

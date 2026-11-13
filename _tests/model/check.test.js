/**
 * Enhetstestfall för kontroller i ett krav i en granskning.
 *
 * @license CC-BY 4.0
 * @see DerivedCheck
 * @see MultipleCheck
 * @see SingleCheck
 */

describe('Check', () => {
  it('returnerar angiven inaktiveringsflagga', () => {
    const check = new SingleCheck();
    const flag = true;
    check.disabled = flag;
    expect(check.disabled).toBe(flag);
  });

  it('returnerar angiven kontrollidentitet', () => {
    const check = new SingleCheck();
    const id = 'test';
    check.id = id;
    expect(check.id).toBe(id);
  });

  it('returnerar en trimmad observation', () => {
    const check = new SingleCheck();
    const observation = 'test';
    check.observation = `  ${observation}\n\n `;
    expect(check.observation).toBe(observation);
  });

  it('returnerar en trimmad sökväg till en skärmavbildning', () => {
    const check = new SingleCheck();
    const path = 'test.png';
    check.setScreenshot(`  ${path}\n\n `, 'alt');
    expect(check.screenshot.path).toBe(path);
  });

  it('returnerar ett trimmat textalternativ till en skärmavbildning', () => {
    const check = new SingleCheck();
    const alt = 'alt text';
    check.setScreenshot('test.png', `  ${alt}\n\n `);
    expect(check.screenshot.alt).toBe(alt);
  });

  it('omvandlar till sträng som kontrollidentitet', () => {
    const check = new SingleCheck();
    const id = 'test';
    expect(check.toString()).toBe('namnlös');
    check.id = id;
    expect(check.toString()).toBe(id);
  });
});

describe('SingleCheck', () => {
  it('indikerar manuell kontroll', () => {
    const check = new SingleCheck();
    expect(check.derived).not.toBe(true);
  });

  it.with(
    [undefined],
    [true],
    [false]
  )('returnerar angiven tillämplighet: {0}', (applicable) => {
    const check = new SingleCheck();
    check.applicable = applicable;
    expect(check.applicable).toBe(applicable);
  });

  it.with(
    [undefined, 'obestämd'],
    [true, 'positiv'],
    [false, 'negativ']
  )('beräknar tillämplighet om styrande kontroll är {1}', (state) => {
    const check = new SingleCheck();
    const ctrl = { state };
    check.applicable = true;
    check.controlledBy(ctrl, true);
    expect(check.applicable).toBe(state);
  });

  it.with(
    [undefined, false, undefined, 'obestämd tillämplighet'],
    [false, false, undefined, 'ej tillämplig'],
    [true, undefined, undefined, 'ej granskad'],
    [true, false, true, 'godkänd'],
    [true, true, false, 'underkänd']
  )('returnerar tillstand för {3}', (appl, failed, expected) => {
    const check = new SingleCheck();
    check.applicable = appl;
    check.failed = failed;
    expect(check.state).toBe(expected);
  });

  it.with(
    [undefined, false, false, 'obestämd tillämplighet'],
    [false, false, false, 'ej tillämplig'],
    [true, undefined, false, 'ej granskad'],
    [true, false, false, 'godkänd'],
    [true, true, true, 'underkänd']
  )('returnerar underkännande för {3}', (appl, failed, expected) => {
    const check = new SingleCheck();
    check.applicable = appl;
    check.failed = failed;
    expect(check.failed).toBe(expected);
  });

  it('returnerar antal alternativ som 1', () => {
    const check = new SingleCheck();
    expect(check.cardinality).toBe(1);
  });

  it.with(
    [undefined, false, false, 'obestämd tillämplighet'],
    [false, false, true, 'ej tillämplig'],
    [true, undefined, false, 'ej granskad'],
    [true, false, true, 'godkänd'],
    [true, true, true, 'underkänd']
  )('returnerar beräknad klarmarkering för {3}', (appl, failed, expected) => {
    const check = new SingleCheck();
    check.applicable = appl;
    check.failed = failed;
    expect(check.done).toBe(expected);
  });

  it.with(
    [{}, undefined, undefined, false, 'obestämd'],
    [{ na: true }, false, undefined, false, 'ej tillämplig'],
    [{ dis: true }, false, true, false, 'inaktiverad'],
    [{ dis: false }, true, false, false, 'aktiverad'],
    [{ na: false }, true, undefined, false, 'ej granskad'],
    [{ ok: true }, true, false, false, 'godkänd'],
    [{ obs: 'test' }, true, false, true, 'underkänd']
  )(
    'återskapar en {4} instans från ett dataobjekt',
    (data, applicable, disabled, failed) => {
      const alt = 'alt text';
      const empty = { alt: '', path: '' };
      const id = 'test';
      const path = 'screenshot.png';
      data.id = id;
      failed && (data.alt = alt);
      failed && (data.path = path);
      const check = new SingleCheck(data);
      expect(check.applicable).toBe(applicable);
      expect(check.disabled).toBe(disabled);
      expect(check.failed).toBe(failed);
      expect(check.id).toBe(id);
      expect(check.screenshot).toEqual(failed ? { alt, path } : empty);
      data.obs && expect(check.observation).toBe(data.obs);
    }
  );

  it.with(
    [undefined, undefined, undefined, {}, 'obestämd'],
    [false, undefined, undefined, { na: true }, 'ej tillämplig'],
    [false, true, undefined, { dis: true }, 'inaktiverad'],
    [true, false, undefined, { dis: false }, 'aktiverad'],
    [true, undefined, undefined, { na: false }, 'ej granskad'],
    [true, false, false, { ok: true }, 'godkänd'],
    [true, false, true, { obs: 'test' }, 'underkänd']
  )(
    'serialiserar en {4} instans för lagring i databasen',
    (applicable, disabled, failed, data) => {
      const alt = 'alt text';
      const id = 'test';
      const check = new SingleCheck();
      const path = 'screenshot.png';
      check.applicable = applicable;
      check.disabled = disabled;
      check.failed = failed;
      check.id = id;
      failed && (check.observation = data.obs);
      failed && check.setScreenshot(path, alt);
      data.class = 'SingleCheck';
      data.id = id;
      failed && (data.alt = alt);
      failed && (data.path = path);
      expect(check.serialize()).toEqual(data);
    }
  );

  it.with(
    [undefined, undefined, undefined, {}, 'obestämd'],
    [false, undefined, undefined, { na: true }, 'ej tillämplig'],
    [false, true, undefined, { dis: true }, 'inaktiverad'],
    [true, false, undefined, { dis: false }, 'aktiverad'],
    [true, undefined, undefined, { na: false }, 'ej granskad'],
    [true, false, false, { ok: true }, 'godkänd'],
    [true, false, true, { obs: 'test' }, 'underkänd']
  )(
    'returnerar ett {4} objekt vid omvandling till JSON',
    (applicable, disabled, failed, data) => {
      const alt = 'alt text';
      const id = 'test';
      const check = new SingleCheck();
      const path = 'screenshot.png';
      check.applicable = applicable;
      check.disabled = disabled;
      check.failed = failed;
      check.id = id;
      failed && (check.observation = data.obs);
      failed && check.setScreenshot(path, alt);
      data.class = 'SingleCheck';
      data.id = id;
      failed && (data.alt = alt);
      failed && (data.path = path);
      expect(check.toJSON()).toEqual(data);
    }
  );
});

describe('MultipleCheck', () => {
  it('indikerar manuell kontroll', () => {
    const check = new MultipleCheck();
    expect(check.derived).not.toBe(true);
  });

  it.with([1, '< 2'], [33, '> 32'])(
    'refuserar konstruktion med {1} alternativ',
    (length) => {
      expect.exception(() => new MultipleCheck(length));
    }
  );

  it.with(
    [undefined],
    [true],
    [false]
  )('returnerar angiven tillämplighet: {0}', (applicable) => {
    const check = new MultipleCheck(2);
    check.applicable = applicable;
    expect(check.applicable).toBe(applicable);
  });

  it.with(
    [undefined, 'obestämd'],
    [true, 'positiv'],
    [false, 'negativ']
  )('beräknar tillämplighet om styrande kontroll är {1}', (state) => {
    const check = new MultipleCheck(2);
    const ctrl = { state };
    check.applicable = true;
    check.controlledBy(ctrl, true);
    expect(check.applicable).toBe(state);
  });

  it.with(
    [undefined, [], undefined, 'obestämd tillämplighet'],
    [false, [], undefined, 'ej tillämplig'],
    [true, [true], undefined, 'ej granskad'],
    [true, [true, false], true, 'godkänd'],
    [true, [true, true], false, 'underkänd']
  )('returnerar tillstand för {3}', (appl, fails, expected) => {
    const check = new MultipleCheck(2);
    check.applicable = appl;
    fails.forEach((flag, index) => check.fail(index, flag));
    expect(check.state).toBe(expected);
  });

  it.with(
    [undefined, [], false, 'obestämd'],
    [false, [], false, 'ej tillämplig'],
    [true, [true], false, 'ej granskad'],
    [true, [true, false], false, 'godkänd'],
    [true, [true, true], true, 'underkänd']
  )('returnerar underkännande för {3}', (appl, fails, expected) => {
    const check = new MultipleCheck(2);
    check.applicable = appl;
    fails.forEach((flag, index) => check.fail(index, flag));
    expect(check.failed).toBe(expected);
  });

  it('returnerar underkännande per alternativ', () => {
    const check = new MultipleCheck(3);
    check.applicable = true;
    check.fail(0, true);
    check.fail(1, false);
    expect(check.fails(0)).toBe(true);
    expect(check.fails(1)).toBe(false);
    expect(check.fails(2)).toBe(undefined);
  });

  it('returnerar antal alternativ', () => {
    const size = 3;
    const check = new MultipleCheck(size);
    expect(check.cardinality).toBe(size);
  });

  it.with(
    [undefined, [], false, 'obestämd tillämplighet'],
    [false, [], true, 'ej tillämplig'],
    [true, [], false, 'ej granskad'],
    [true, [true, false], true, 'godkänd'],
    [true, [true, true], true, 'underkänd']
  )('returnerar beräknad klarmarkering för {3}', (appl, fails, expected) => {
    const check = new MultipleCheck(2);
    check.applicable = appl;
    fails.forEach((flag, index) => check.fail(index, flag));
    expect(check.done).toBe(expected);
  });

  it.with(
    [{}, undefined, undefined, [], 'obestämd'],
    [{ na: true }, false, undefined, [], 'ej tillämplig'],
    [{ dis: true }, false, true, [], 'inaktiv'],
    [{ dis: false }, true, false, [], 'aktiv'],
    [{ m: 0 }, true, false, [], 'ej granskad'],
    [{ m: 3, f: 2 }, true, false, [false, true], 'godkänd'],
    [{ obs: 'test' }, true, false, [true, true], 'underkänd']
  )(
    'återskapar en {4} instans från ett dataobjekt',
    (data, applicable, disabled, fails) => {
      const alt = 'alt text';
      const empty = { alt: '', path: '' };
      const id = 'test';
      const path = 'screenshot.png';
      data.id = id;
      data.n = 2;
      data.obs && (data.alt = alt);
      data.obs && (data.path = path);
      const check = new MultipleCheck(data);
      expect(check.applicable).toBe(applicable);
      expect(check.disabled).toBe(disabled);
      if (applicable) {
        for (let i = 0; i < check.cardinality; ++i) {
          expect(check.fails(i)).toBe(fails[i]);
        }
      }
      expect(check.id).toBe(id);
      expect(check.screenshot).toEqual(data.obs ? { alt, path } : empty);
      data.obs && expect(check.observation).toBe(data.obs);
    }
  );

  it.with(
    [undefined, undefined, [], {}, 'obestämd'],
    [false, undefined, [], { na: true }, 'ej tillämplig'],
    [false, true, [], { dis: true }, 'inaktiv'],
    [true, false, [], { dis: false }, 'aktiv'],
    [true, undefined, [], { na: false }, 'ej granskad'],
    [true, false, [false, false], { ok: true }, 'helt godkänd'],
    [true, false, [true, false], { m: 3, f: 1 }, 'godkänd'],
    [true, false, [true, true], { obs: 'test' }, 'underkänd']
  )(
    'serialiserar en {4} instans för lagring i databasen',
    (applicable, disabled, fails, data) => {
      const alt = 'alt text';
      const id = 'test';
      const check = new MultipleCheck(2);
      const path = 'screenshot.png';
      check.applicable = applicable;
      check.disabled = disabled;
      check.id = id;
      data.obs && (check.observation = data.obs);
      fails.forEach((flag, index) => check.fail(index, flag));
      data.obs && check.setScreenshot(path, alt);
      data.class = 'MultipleCheck';
      data.id = id;
      data.n = check.cardinality;
      data.obs && (data.alt = alt);
      data.obs && (data.path = path);
      expect(check.serialize()).toEqual(data);
    }
  );

  it.with(
    [undefined, undefined, [], {}, 'obestämd'],
    [false, undefined, [], { na: true }, 'ej tillämplig'],
    [false, true, [], { dis: true }, 'inaktiv'],
    [true, false, [], { dis: false }, 'aktiv'],
    [true, undefined, [], { na: false }, 'ej granskad'],
    [true, false, [false, false], { ok: true }, 'helt godkänd'],
    [true, false, [true, false], { m: 3, f: 1 }, 'godkänd'],
    [true, false, [true, true], { obs: 'test' }, 'underkänd']
  )(
    'returnerar ett {4} objekt vid omvandling till JSON',
    (applicable, disabled, fails, data) => {
      const alt = 'alt text';
      const id = 'test';
      const check = new MultipleCheck(2);
      const path = 'screenshot.png';
      check.applicable = applicable;
      check.disabled = disabled;
      check.id = id;
      data.obs && (check.observation = data.obs);
      fails.forEach((flag, index) => check.fail(index, flag));
      data.obs && check.setScreenshot(path, alt);
      data.class = 'MultipleCheck';
      data.id = id;
      data.n = check.cardinality;
      data.obs && (data.alt = alt);
      data.obs && (data.path = path);
      expect(check.toJSON()).toEqual(data);
    }
  );
});

describe('DerivedCheck', () => {
  it('indikerar härledd kontroll', () => {
    const check = new DerivedCheck();
    expect(check.derived).toBe(true);
  });

  it('returnerar angiven flagga för globala beroenden', () => {
    const check = new DerivedCheck();
    expect(check.global).toBe(false);
    for (const flag of [true, false]) {
      check.global = flag;
      expect(check.global).toBe(flag);
    }
  });

  it('returnerar flagga för villkorsstyrning', () => {
    const check = new DerivedCheck();
    expect(check.control).toBe(true);
    check.observation = 'text';
    expect(check.control).toBe(false);
  });

  it.with(
    [undefined, 'obestämd'],
    [true, 'positiv'],
    [false, 'negativ']
  )('beräknar tillämplighet för {1} styrande kontroll', (state) => {
    const sample = {
      _req: { foo: {} },
      dependency: (id) => (id in sample._req ? [sample._req[id]] : []),
    };
    const check = new DerivedCheck();
    const ctrl = { state };
    check.dependencies = (id) => sample.dependency(id);
    check.controlledBy(ctrl, true);
    check.dependsOn('bar'); // Exkluderad pga filter.
    expect(check.applicable).toBe(state && false);
    check.dependsOn('foo');
    expect(check.applicable).toBe(state);
  });

  it("returnerar 'inte tillämplig' om inaktiv", () => {
    const sample = {
      _req: { foo: { applicable: true } },
      dependency: (id) => (id in sample._req ? [sample._req[id]] : []),
    };
    const check = new DerivedCheck();
    check.dependencies = (id) => sample.dependency(id);
    check.disabled = true;
    check.dependsOn('foo');
    expect(check.applicable).toBe(false);
  });

  it('ignorerar försök att ändra tillämplighet', () => {
    const sample = {
      _req: { foo: { applicable: true } },
      dependency: (id) => (id in sample._req ? [sample._req[id]] : []),
    };
    const check = new DerivedCheck();
    check.dependencies = (id) => sample.dependency(id);
    check.dependsOn('foo');
    check.applicable = false;
    expect(check.applicable).toBe(true);
  });

  it('returnerar angivna källkravsidentiteter', () => {
    const check = new DerivedCheck();
    const sources = ['foo', 'bar'];
    sources.forEach((s) => check.dependsOn(s));
    expect(check.sources).toEqual(sources);
  });

  it('beräknar tillstånd', () => {
    const sample = {
      _req: { bar: { state: false }, foo: { state: true } },
      dependency: (id) => (id in sample._req ? [sample._req[id]] : []),
    };
    const check = new DerivedCheck();
    check.dependencies = (id) => sample.dependency(id);
    expect(check.state).toBe(undefined); // Inga beroenden.
    check.dependsOn('foo');
    expect(check.state).toBe(true); // Alla beroenden godkända.
    check.dependsOn('bar');
    expect(check.state).toBe(false); // Underkänt beroende.
    sample._req.bar.state = undefined;
    expect(check.state).toBe(undefined); // Obestämt beroende.
  });

  it('beräknar underkännande', () => {
    const sample = {
      _req: { bar: { state: false }, foo: { state: true } },
      dependency: (id) => (id in sample._req ? [sample._req[id]] : []),
    };
    const check = new DerivedCheck();
    check.dependencies = (id) => sample.dependency(id);
    expect(check.failed).toBe(false); // Inga beroenden.
    check.dependsOn('foo');
    expect(check.failed).toBe(false); // Alla beroenden godkända.
    check.dependsOn('bar');
    expect(check.failed).toBe(true); // Underkänt beroende.
    sample._req.bar.state = undefined;
    expect(check.failed).toBe(false); // Obestämt beroende.
  });

  it('returnerar antal alternativ som 1', () => {
    const check = new DerivedCheck({});
    expect(check.cardinality).toBe(1);
  });

  it.with(
    [false, true, true, 'med icke tillämplig källa'],
    [true, undefined, false, 'för ogranskad källa'],
    [true, true, true, 'för underkänd källa'],
    [true, false, true, 'för godkänd källa']
  )('returnerar beräknad klarmarkering {3}', (appl, state, expected) => {
    const sample = {
      _req: { foo: { state } },
      dependency: (id) => (id in sample._req ? [sample._req[id]] : []),
    };
    const check = new DerivedCheck();
    check.dependencies = (id) => sample.dependency(id);
    check.dependsOn('foo');
    expect(check.done).toBe(expected);
  });

  it.with([true, 'godkänt'], [false, 'underkänt'])(
    'återskapar en instans från ett {1} dataobjekt',
    (state) => {
      const dep = ['bar', 'foo'];
      const id = 'test';
      const obs = 'observation';
      const data = { class: 'DerivedCheck', dep, id };
      const sample = { dependency: () => [{ state }] };
      state || (data.global = true);
      state || (data.obs = obs);
      const check = new DerivedCheck(data);
      check.dependencies = () => sample.dependency();
      expect(check.id).toBe(id);
      expect(check.global).toBe(false === state);
      state || expect(check.observation).toBe(obs);
      expect(check.serialize()).toEqual(data);
    }
  );

  it('återskapar en kontrollerande instans från ett dataobjekt', () => {
    const dep = ['bar', 'foo'];
    const id = 'test';
    const data = { class: 'DerivedCheck', dep, id };
    const sample = { dependency: () => [{ failed: false }] };
    const check = new DerivedCheck(data);
    check.dependencies = () => sample.dependency();
    expect(check.id).toBe(id);
    expect(check.control).toBe(true);
    expect(check.serialize()).toEqual(data);
  });

  it.with([true, 'godkänd'], [false, 'underkänd'])(
    'serialiserar en {1} instans för lagring i databasen',
    (state) => {
      const dep = ['bar', 'foo'];
      const id = 'test';
      const obs = 'observation';
      const check = new DerivedCheck();
      const sample = { dependency: () => [{ state }] };
      check.dependencies = () => sample.dependency();
      check.id = id;
      check.observation = obs;
      dep.forEach((id) => check.dependsOn(id));
      const data = {
        class: 'DerivedCheck',
        dep,
        id,
      };
      state || (data.obs = obs);
      expect(check.serialize()).toEqual(data);
    }
  );

  it.with([true, 'godkänt'], [false, 'underkänt'])(
    'returnerar ett {1} objekt vid omvandling till JSON',
    (state) => {
      const dep = ['bar', 'foo'];
      const id = 'test';
      const obs = 'observation';
      const check = new DerivedCheck();
      const sample = { dependency: () => [{ state }] };
      check.dependencies = () => sample.dependency();
      check.id = id;
      check.observation = obs;
      check.sample = sample;
      dep.forEach((id) => check.dependsOn(id));
      const data = {
        class: 'DerivedCheck',
        dep,
        id,
      };
      state || (data.obs = obs);
      expect(check.toJSON()).toEqual(data);
    }
  );
});

describe('CheckFactory', () => {
  it('bygger en singulär kontroll från JSON-data', () => {
    const data = {
      class: 'SingleCheck',
      id: 'test',
      ok: true,
    };
    const check = CheckFactory.build(data);
    expect(check).toBeAnInstanceOf(SingleCheck);
    expect(check.failed).toBe(false);
    expect(check.id).toBe(data.id);
  });

  it('bygger en multipel kontroll från JSON-data', () => {
    const data = {
      class: 'MultipleCheck',
      id: 'test',
      n: 2,
      ok: true,
    };
    const check = CheckFactory.build(data);
    expect(check).toBeAnInstanceOf(MultipleCheck);
    expect(check.failed).toBe(false);
    expect(check.id).toBe(data.id);
  });

  it('bygger en härledd kontroll från JSON-data', () => {
    const data = {
      class: 'DerivedCheck',
      dep: ['bar', 'foo'],
      id: 'test',
    };
    const check = CheckFactory.build(data);
    const sample = { dependency: () => [{ failed: false }] };
    expect(check).toBeAnInstanceOf(DerivedCheck);
    check.dependencies = () => sample.dependency();
    expect(check.failed).toBe(false);
    expect(check.id).toBe(data.id);
  });
});

// Importera beroenden.
import {
  CheckFactory,
  DerivedCheck,
  MultipleCheck,
  SingleCheck,
} from '../../js/model/check.js';
import { beforeEach, describe, expect, it } from '../functions.js';

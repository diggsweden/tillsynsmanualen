/**
 * Enhetstestfall för villkorsstruktur.
 *
 * @license CC-BY 4.0
 * @see ConditionTree
 */

const mkCheck = (id, disabled, options = {}) => ({
  id,
  applicable: options.a,
  control: options.c,
  derived: options.d,
  disabled,
  state: options.s,
});

let config;
let req;
let tree;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Kravkonfiguration.
  config = {
    requirements: {
      req: { checks: [{ condition: 'main' }] },
    },
    conditions: {
      main: {},
    },
  };

  // Krav.
  req = {
    id: 'req',
    _checks: {},
    check: (id) => req._checks[id],
  };

  // Skapa en villkorsträdsinstans.
  tree = new ConditionTree();
  tree.configuration = config;
  tree.requirement = req;
});

describe('Populera och initiera manuellt villkor', () => {
  it('initierar undervillkor vid aktivering', () => {
    config.conditions.main.yes = [{ condition: 'sub' }];
    config.conditions.sub = { yes: [{ check: 'sub' }] };
    req._checks.sub = mkCheck('sub', false);
    tree.build();
    tree.apply();
    expect(tree.get('sub').state).toBe(true);
  });

  it('anger obestämt tillstånd om inget aktivt innehåll', () => {
    config.conditions.main.yes = [{ check: 'yes' }, { condition: 'sub' }];
    config.conditions.main.no = [{ check: 'no' }];
    config.conditions.sub = { yes: [{ check: 'sub' }] };
    req._checks.yes = mkCheck('yes'); // Obestämd.
    req._checks.no = mkCheck('no'); // Obestämd.
    req._checks.sub = mkCheck('sub'); // Obestämd.
    tree.build();
    tree.apply();
    expect(tree.get('main').state).toBe(undefined);
  });

  it("anger tillstånd 'ja' om aktiv kontroll i gren 1", () => {
    config.conditions.main.yes = [{ check: 'yes' }];
    config.conditions.main.no = [{ check: 'no' }];
    req._checks.yes = mkCheck('yes', false); // Aktiv.
    req._checks.no = mkCheck('no', true); // Inaktiv.
    tree.build();
    tree.apply();
    expect(tree.get('main').state).toBe(true);
  });

  it("anger tillstånd 'ja' om aktivt villkor i gren 1", () => {
    config.conditions.main.yes = [{ condition: 'sub' }];
    config.conditions.sub = { yes: [{ check: 'sub' }] };
    req._checks.sub = mkCheck('sub', false); // Aktiv.
    tree.build();
    tree.apply();
    expect(tree.get('main').state).toBe(true);
  });

  it("anger tillstånd 'ja' om enbart inaktivt innehåll i gren 2", () => {
    config.conditions.main.no = [{ check: 'no' }, { condition: 'sub' }];
    config.conditions.sub = { yes: [{ check: 'sub' }] };
    req._checks.no = mkCheck('no', true); // Inaktiv.
    req._checks.sub = mkCheck('sub', undefined, { a: false });
    tree.build();
    tree.apply();
    expect(tree.get('main').state).toBe(true);
    expect(tree.get('sub').disabled).toBe(true);
  });

  it('anger tillstånd=gren om 1 gren med tillämpliga villkor', () => {
    config.conditions.main.no = [{ condition: 'sub' }];
    config.conditions.sub = { yes: [{ check: 'sub' }] };
    req._checks.sub = mkCheck('sub', undefined, { a: true });
    tree.build();
    tree.apply();
    expect(tree.get('main').state).toBe(false);
    expect(tree.get('sub').disabled).toBe(false);
  });

  it('anger tillstånd=icke-gren om 1 gren med otillämpliga villkor', () => {
    config.conditions.main.no = [{ condition: 'sub' }];
    config.conditions.sub = { yes: [{ check: 'sub' }] };
    req._checks.sub = mkCheck('sub', undefined, { a: false });
    tree.build();
    tree.apply();
    expect(tree.get('main').state).toBe(true);
    expect(tree.get('sub').disabled).toBe(true);
  });

  it("anger tillstånd 'nej' om aktiv kontroll i gren 2", () => {
    config.conditions.main.yes = [{ check: 'yes' }];
    config.conditions.main.no = [{ check: 'no' }];
    req._checks.yes = mkCheck('yes', true); // Inaktiv.
    req._checks.no = mkCheck('no', false); // Aaktiv.
    tree.build();
    tree.apply();
    expect(tree.get('main').state).toBe(false);
  });

  it("anger tillstånd 'nej' om aktivt villkor i gren 2", () => {
    config.conditions.main.no = [{ condition: 'sub' }];
    config.conditions.sub = { yes: [{ check: 'sub' }] };
    req._checks.sub = mkCheck('sub', false); // Aktiv.
    tree.build();
    tree.apply();
    expect(tree.get('main').state).toBe(false);
  });

  it("anger tillstånd 'nej' om enbart inaktivt innehåll i gren 1", () => {
    config.conditions.main.yes = [{ check: 'yes' }, { condition: 'sub' }];
    config.conditions.sub = { yes: [{ check: 'sub' }] };
    req._checks.yes = mkCheck('yes', true); // Inaktiv.
    req._checks.sub = mkCheck('sub', undefined, { a: false });
    tree.build();
    tree.apply();
    expect(tree.get('main').state).toBe(false);
    expect(tree.get('sub').disabled).toBe(true);
  });
});

describe('Populera och initiera härlett villkor', () => {
  beforeEach(() => {
    config.conditions.main.sources = ['first', 'second'];
    req._checks.first = {};
    req._checks.second = {};
  });

  it('anger obestämt tillstånd om obestämt ej otillämpligt beroende', () => {
    req._checks.first.state = true;
    req._checks.second.state = undefined;
    tree.build();
    tree.apply();
    expect(tree.get('main').state).toBe(undefined);
  });

  it('anger tillstånd=nej om ej otillämpligt beroende är negativt', () => {
    req._checks.first.state = true;
    req._checks.second.state = false;
    tree.build();
    tree.apply();
    expect(tree.get('main').state).toBe(false);
  });

  it('anger tillstånd=ja om alla ej otillämpliga beroenden är positiva', () => {
    req._checks.first.state = true;
    req._checks.second = { applicable: false, state: false };
    tree.build();
    tree.apply();
    expect(tree.get('main').state).toBe(true);
  });
});

describe('Hantera interaktion för manuellt villkor', () => {
  it('returnerar angivet tillstånd', () => {
    tree.build();
    tree.apply();
    const main = tree.get('main');
    for (const state of [undefined, true, false]) {
      main.state = state;
      expect(main.state).toBe(state);
    }
  });

  it('aktiverar innehåll i vald gren, avaktiverar i ej vald', () => {
    config.conditions.main.yes = [{ check: 'yes' }, { condition: 'yes' }];
    config.conditions.main.no = [{ check: 'no' }, { condition: 'no' }];
    config.conditions.yes = { yes: [{ check: 'sub1' }] };
    config.conditions.no = { no: [{ check: 'sub2' }] };
    req._checks.yes = mkCheck('yes'); // Obestämd.
    req._checks.no = mkCheck('no'); // Obestämd.
    req._checks.sub1 = mkCheck('sub1'); // Obestämd.
    req._checks.sub2 = mkCheck('sub2'); // Obestämd.
    tree.build();
    tree.apply();
    const main = tree.get('main');
    for (const state of [true, false]) {
      main.state = state;
      expect(req._checks.yes.disabled).toBe(false === state);
      expect(req._checks.no.disabled).toBe(true === state);
      expect(tree.get('yes').disabled).toBe(false === state);
      expect(tree.get('no').disabled).toBe(true === state);
    }
  });
});

describe('Hantera uppdateringar av härlett villkor', () => {
  beforeEach(() => {
    config.conditions.main.sources = ['first', 'second'];
    req._checks.first = {};
    req._checks.second = {};
  });

  it('uppdaterar aktuellt tillstånd', () => {
    tree.build();
    tree.apply();
    const condition = tree.get('main');
    expect(condition.state).toBe(undefined);
    req._checks.first.state = true;
    req._checks.second.state = true;
    condition.update();
    expect(condition.state).toBe(true);
  });

  it('aktiverar innehåll i vald gren, avaktiverar i ej vald', () => {
    config.conditions.main.yes = [{ check: 'yes' }];
    config.conditions.main.no = [{ check: 'no' }];
    req._checks.first.state = true;
    req._checks.second.state = true;
    req._checks.yes = {};
    req._checks.no = {};
    tree.build();
    tree.apply();
    expect(req._checks.yes.disabled).toBe(false);
    expect(req._checks.no.disabled).toBe(true);
    req._checks.first.state = false;
    tree.get('main').update();
    expect(req._checks.yes.disabled).toBe(true);
    expect(req._checks.no.disabled).toBe(false);
  });
});

describe('Villkorsträd', () => {
  it('refuserar byggning utan konfiguration', () => {
    tree = new ConditionTree();
    expect.exception(() => tree.build());
  });

  it('refuserar byggning utan krav', () => {
    tree = new ConditionTree();
    tree.configuration = {};
    expect.exception(() => tree.build());
  });

  it('aktiverar toppnivåvillkor vid initiering', () => {
    tree.build();
    tree.apply();
    expect(tree.get('main').disabled).toBe(false);
  });

  it('returnerar angivet villkor', () => {
    tree.build();
    tree.apply();
    expect(tree.get('main')).not.toEqual(null);
  });

  it('itererar över uppdaterade villkor för angiven kontroll', () => {
    config.conditions.main.sources = ['first'];
    req._checks.first = { id: 'first' };
    tree.build();
    tree.apply();
    expect(Array.from(tree.update('first')).length).toBe(1);
    expect(Array.from(tree.update('other')).length).toBe(0);
  });
});

// Importera beroenden.
import { ConditionTree } from '../../js/controller/ConditionTree.js';
import { beforeEach, describe, expect, it } from '../functions.js';

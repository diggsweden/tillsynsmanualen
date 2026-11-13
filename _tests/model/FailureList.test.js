/**
 * Enhetstestfall för lista med underkända krav i en granskning.
 *
 * @license CC-BY 4.0
 * @see FailureList
 */

let audit;
let list;
let samples = {};

// Fejka stickprovsklass.
const Fake = (type) =>
  class {
    static [Symbol.hasInstance](obj) {
      return type === obj?.type;
    }
  };

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Komponenter.
  const comp1 = {
    done: true,
    failed: true,
    hasExternalNotes: true,
    id: 1,
    name: 'comp1',
    type: 'component',
    *requirements() {
      yield { clause: '9.1.1.1', failed: true };
      yield { clause: '9.1.2.1', failed: false };
      yield { clause: '9.1.4.3', failed: false, externalNote: 'NOTE' };
    },
  };
  samples.comp1 = comp1;

  const comp2 = { done: false, id: 2 };
  const comp3 = { done: true, failed: false, id: 3 };

  // Dokument.
  const doc1 = {
    name: 'doc1',
    failed: true,
    id: 4,
    type: 'document',
    *requirements() {
      yield { clause: '10.1.1.1', failed: true };
      yield { clause: '10.2.4.4', failed: false };
    },
  };
  samples.doc1 = doc1;

  // Webbsidor
  const page1 = {
    name: 'page1',
    failed: true,
    id: 5,
    isComposite: true,
    type: 'webpage',
    components: [comp1],
    *requirements() {
      yield { clause: '9.1.4.3', failed: true };
    },
  };
  samples.page1 = page1;

  const page2 = {
    name: 'page2',
    failed: true,
    id: 6,
    isComposite: true,
    type: 'webpage',
    components: [comp2, comp3],
    *requirements() {
      yield { clause: '9.1.4.3', failed: true };
      yield { clause: 'SFS2018:1937 13 § 3 st', failed: true };
    },
  };
  samples.page2 = page2;

  // Granskning.
  audit = {
    failures: () => ({
      '9.1.1.1': 1,
      '9.1.4.3': 3,
      '10.1.1.1': 1,
      'SFS2018:1937 13 § 3 st': 1,
    }),
    *components() {
      yield comp1;
      yield comp2;
      yield comp3;
    },
    *doneSamples(c) {
      const samples = {
        AppScreen: [],
        NonWebDocument: [doc1],
        Webpage: [page1, page2],
      };
      for (const sample of samples[c.name]) {
        yield sample;
      }
    },
  };

  list = new FailureList(audit);
});

describe('Underkända krav per stickprov', () => {
  it('returnerar om angivet stickprov ingår i listan', () => {
    expect(list.contains(samples.comp1)).toBe(true);
    expect(list.contains(samples.page1)).toBe(true);
    expect(list.contains({ id: 99 })).toBe(false);
  });

  it('itererar över granskade komponenter med brister', () => {
    const names = [];
    for (const comp of list.components()) {
      names.push(comp.name);
    }
    expect(names).toEqual(['comp1']);
  });

  it.with(
    [Fake('screen'), [], 'appvyer'],
    [Fake('document'), ['doc1'], 'dokument'],
    [Fake('webpage'), ['page1', 'page2'], 'webbsidor']
  )('itererar över granskade {2} med brister', (cls, expected) => {
    const names = [];
    for (const sample of list.samples(cls)) {
      names.push(sample.name);
    }
    expect(names).toEqual(expected);
  });

  it('itererar över underkända krav för en komponent', () => {
    const clauses = [];
    for (const [id, clause, reqs, s] of list.clauses(samples.comp1)) {
      clauses.push({ id, clause, reqs, sampleID: s });
    }
    expect(clauses.length).toBe(2);
    expect(clauses[0].id).toBe(1);
    expect(clauses[0].clause).toBe('9.1.1.1');
    expect(clauses[0].reqs.length).toBe(1);
    expect(clauses[0].sampleID).toBe(samples.comp1.id);
    expect(clauses[1].id).toBe(2);
    expect(clauses[1].clause).toBe('9.1.4.3');
    expect(clauses[1].reqs.length).toBe(1);
    expect(clauses[1].sampleID).toBe(samples.comp1.id);
  });

  it('itererar över underkända krav för en webbsida med komponenter', () => {
    const clauses = [];
    for (const [id, clause, reqs, s] of list.clauses(samples.page1)) {
      clauses.push({ id, clause, reqs, sampleID: s });
    }
    expect(clauses.length).toBe(3);
    expect(clauses[0].id).toBe(1);
    expect(clauses[0].clause).toBe('9.1.1.1');
    expect(clauses[0].reqs.length).toBe(1);
    expect(clauses[0].sampleID).toBe(samples.comp1.id);
    expect(clauses[1].id).toBe(2);
    expect(clauses[1].clause).toBe('9.1.4.3');
    expect(clauses[1].reqs.length).toBe(1);
    expect(clauses[1].sampleID).toBe(samples.comp1.id);
    expect(clauses[2].id).toBe(4);
    expect(clauses[2].clause).toBe('9.1.4.3');
    expect(clauses[2].reqs.length).toBe(1);
    expect(clauses[2].sampleID).toBe(samples.page1.id);
  });

  it('itererar över underkända krav för ett dokument', () => {
    const clauses = [];
    for (const [id, clause, reqs, s] of list.clauses(samples.doc1)) {
      clauses.push({ id, clause, reqs, sampleID: s });
    }
    expect(clauses.length).toBe(1);
    expect(clauses[0].id).toBe(3);
    expect(clauses[0].clause).toBe('10.1.1.1');
    expect(clauses[0].sampleID).toBe(samples.doc1.id);
  });
});

describe('Underkända stickprov per krav', () => {
  it('itererar över underkända kravavsnitt', () => {
    const clauses = [];
    for (const clause of list.allClauses()) {
      clauses.push(clause);
    }
    expect(clauses).toEqual([
      'SFS2018:1937 13 § 3 st',
      '9.1.1.1',
      '9.1.4.3',
      '10.1.1.1',
    ]);
  });

  it('itererar över underkända stickprov för ett  krav', () => {
    const results = [...list.fails('9.1.4.3')];
    // Ska ignorera comp1 där 9.1.4.3 bara har en notering.
    expect(results.length).toBe(2);
    expect(results[0][0].name).toBe('page1');
    expect(results[0][1].length).toBe(1);
    expect(results[0][1][0].clause).toBe('9.1.4.3');
    expect(results[0][2]).toBe(4);
    expect(results[1][0].name).toBe('page2');
    expect(results[1][1].length).toBe(1);
    expect(results[1][1][0].clause).toBe('9.1.4.3');
    expect(results[1][2]).toBe(6);
  });
});

// Importera beroenden.
import { AppScreen, NonWebDocument, Webpage } from '../../js/model/sample.js';
import { FailureList } from '../../js/model/FailureList.js';
import { beforeEach, describe, expect, it } from '../functions.js';

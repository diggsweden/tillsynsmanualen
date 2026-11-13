/**
 * Enhetstestfall för SVG-diagram.
 *
 * @license CC-BY 4.0
 * @see SVGChart
 */

let data;
let doc;

// Skapa förutsättningarna för varje test.
beforeEach(() => {
  // Datauppsättningar.
  data = [
    [
      ['utan syn', 84],
      ['nedsatt syn', 62],
      ['nedsatt färgseende', 71],
      ['utan hörsel', 4],
      ['nedsatt hörsel', 3],
      ['utan talförmåga', 12],
      ['nedsatt motorik', 58],
      ['begränsad räckvidd', 12],
      ['känslighet för flimmer', 0],
      ['nedsatt kognition', 71],
    ],
    [
      ['1.1.1', 12.3],
      ['2.4.2', 11.8],
      ['4.1.1', 7.5],
      ['2.2.2', 1],
    ],
  ];

  // DOM-dokumentet.
  const makeElement = (tag) => {
    const e = {
      attrs: [],
      children: [],
      tagName: tag,
      appendChild: (c) => (e.children.push(c), c),
      setAttribute: (n, v) => (e.attrs[n] = v),
    };
    return e;
  };

  doc = {
    createElementNS: (n, t) => makeElement(t),
    createTextNode: (t) => t,
  };
});

it('sätter DOM-dokument', () => {
  const c = new SVGChart();
  expect(c.document).not.toBe(doc);
  c.document = doc;
  expect(c.document).toBe(doc);
});

describe('HorizontalBarChart', () => {
  let chart;

  beforeEach(() => {
    // Skapa en diagraminstans.
    const c = new SVGChart();
    c.document = doc;
    chart = c.horizontalBarChart();
  });

  it('sätter CSS-klass', () => {
    const name = 'test';
    expect(chart.cssClass).not.toBe(name);
    chart.cssClass = name;
    expect(chart.cssClass).toBe(name);
  });

  it.with(
    [-1, 0],
    [0, 0],
    [1, 1],
    [2, 2]
  )('sätter antal decimaler till {0}', (actual, expected) => {
    chart.decimals = actual;
    expect(chart.decimals).toBe(expected);
  });

  it('sätter indikatorvärde', () => {
    const value = 42;
    expect(chart.indicator).toBe(undefined);
    chart.indicator = value;
    expect(chart.indicator).toBe(value);
  });

  it.with(['en'], ['sv'])("sätter språk till '{0}'", (lang) => {
    chart.locale = lang;
    expect(chart.locale).toBe(lang);
  });

  it('sätter minsta ändvärde', () => {
    const value = 42;
    expect(chart.minEnd).not.toBe(value);
    chart.minEnd = value;
    expect(chart.minEnd).toBe(value);
  });

  it('refuserar rendering utan data', () => {
    chart.document = doc;
    expect.exception(() => chart.render());
  });

  it.with([0, 'långa', 'heltalsvärden'], [1, 'korta', 'decimalvärden'])(
    'skapar ett SVG-element med {1} etiketter och {2}',
    (dataSet) => {
      chart.cssClass = 'test';
      for (const [label, value] of data[dataSet]) {
        chart.addBar(label, value);
      }
      chart.document = doc;
      const result = chart.render();
      expect(result.attrs.class).toBe('test');
      expect(result.attrs.role).toBe('table');
      expect(result.children.length).toBe(data[dataSet].length);
      expect(result.children[0].children.length).toBe(3);
    }
  );

  it.with(
    ['sv', 0, 42, '42', 'svenska', 'heltal'],
    ['sv', 1, 3.14, '3,1', 'svenska', '1 decimal'],
    ['en', 2, 3.14, '3.14', 'engelska', '2 decimaler']
  )('formaterar datavärden, {4}, {5}', (lang, dec, inp, out) => {
    chart.locale = lang;
    chart.decimals = dec;
    chart.addBar('test', inp);
    chart.document = doc;
    const result = chart.render();
    const text = result.children[0].children[2];
    expect(text.tagName).toBe('text');
    expect(text.children.length).toBe(1);
    expect(text.children[0]).toBe(out);
  });

  it('positionerar datavärden utanför korta staplar', () => {
    chart.addBar('long descriptive label', 42);
    chart.addBar('short', 0);
    chart.document = doc;
    const result = chart.render();
    expect(result.children[0].children[2].attrs.class).toBe('inside');
    expect(result.children[1].children[2].attrs.class).toBe('outside');
  });

  it.with([0, 6, 100], [1, 5, 20])(
    'lägger till en X-axel med ändpunkten {2}',
    (dataSet, cnt, end) => {
      for (const [label, value] of data[dataSet]) {
        chart.addBar(label, value);
      }
      chart.axis = true;
      expect(chart.axis).toBe(true);
      chart.document = doc;
      const result = chart.render();
      expect(result.children.length).toBe(data[dataSet].length + 1);
      expect(result.children[0].children.length).toBe(cnt + 1);
    }
  );

  it.with([0, 6, 100], [1, 5, 20])(
    'lägger till {1} stödlinjer',
    (dataSet, cnt, end) => {
      for (const [label, value] of data[dataSet]) {
        chart.addBar(label, value);
      }
      chart.lines = true;
      expect(chart.lines).toBe(true);
      chart.document = doc;
      const result = chart.render();
      expect(result.children.length).toBe(data[dataSet].length + 1);
      expect(result.children[0].children.length).toBe(cnt);
    }
  );

  it('lägger till en indikatorlinje', () => {
    for (const [label, value] of data[1]) {
      chart.addBar(label, value);
    }
    chart.indicator = 42;
    chart.lines = true;
    chart.document = doc;
    const result = chart.render();

    // Ska ha ändrat ändpunkten från 20 till 50, så stödlinjer ska ritas vid
    // 0, 10, 20, 30, 40, 50 (6 st) i stället för 0, 5, 10, 15, 20 (5 st).
    expect(result.children.length).toBe(data[1].length + 2);
  });

  it('lägger till zoner', () => {
    for (const [label, value] of data[0]) {
      chart.addBar(label, value);
    }
    chart.addZone(0, 10, 'test-1');
    chart.addZone(10, 200, 'test-2');
    chart.addZone(1000, 2000, 'test-3');
    chart.document = doc;
    const result = chart.render();
    expect(result.children.length).toBe(data[0].length + 1);
    expect(result.children[0].children.length).toBe(2);
    expect(result.children[0].children[0].attrs['class']).toBe('test-1');
    expect(result.children[0].children[1].attrs['class']).toBe('test-2');
  });

  it('bygger lager: zoner, stödlinjer, X-axel, indikator, data', () => {
    for (const [label, value] of data[0]) {
      chart.addBar(label, value);
    }
    chart.indicator = 42;
    chart.axis = true;
    chart.lines = true;
    chart.addZone(0, 10, 'test-1');
    chart.addZone(10, 200, 'test-2');
    chart.document = doc;
    const result = chart.render();
    expect(result.children.length).toBe(data[0].length + 4);
    expect(result.children[0].children[0].attrs['class']).toBe('test-1');
    expect(result.children[1].attrs['class']).toBe('grid');
    expect(result.children[2].attrs['class']).toBe('axis');
    expect(result.children[3].tagName).toBe('line');
  });
});

// Importera beroenden.
import { SVGChart } from '../../js/view/SVGChart.js';
import { beforeEach, describe, expect, it } from '../functions.js';

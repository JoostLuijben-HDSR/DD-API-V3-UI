import { collectColumns, flattenRecord } from './flatten';

describe('flattenRecord', () => {
  it('expands nested objects with dotted names', () => {
    const row = flattenRecord({
      Id: 'a',
      Parameter: { Quantity: 'BEDKG', Organisation: 'HSR' },
      Result: { Measure: { Value: 2, Uom: 'PROCENT' } }
    });
    expect(row).toEqual({
      'Id': 'a',
      'Parameter.Quantity': 'BEDKG',
      'Parameter.Organisation': 'HSR',
      'Result.Measure.Value': 2,
      'Result.Measure.Uom': 'PROCENT'
    });
  });

  it('splits a GeoJSON point into X and Y columns', () => {
    const row = flattenRecord({ Foi: { Code: 'NL14_1', Geography: { type: 'Point', coordinates: [4.87, 52.12] } } });
    expect(row).toEqual({ 'Foi.Code': 'NL14_1', 'Foi.Geography.X': 4.87, 'Foi.Geography.Y': 52.12 });
  });

  it('keeps other GeoJSON geometries as JSON text', () => {
    const polygon = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
    const row = flattenRecord({ Geography: polygon });
    expect(row).toEqual({ 'Geography': JSON.stringify(polygon) });
  });

  it('joins arrays of simple values and skips empty arrays', () => {
    const row = flattenRecord({ Metadata: { Projects: ['OMS25-220', 'OMS25-108'] }, Foi: { MonitoringNetworks: [] } });
    expect(row).toEqual({ 'Metadata.Projects': 'OMS25-220|OMS25-108' });
  });

  it('keeps arrays of objects as JSON text', () => {
    const row = flattenRecord({ Items: [{ a: 1 }] });
    expect(row).toEqual({ 'Items': '[{"a":1}]' });
  });

  it('keeps null values as null', () => {
    const row = flattenRecord({ Parameter: { Parameter: null } });
    expect(row).toEqual({ 'Parameter.Parameter': null });
  });

  it('flattens a categorical (VocabTerm) result', () => {
    const row = flattenRecord({ Result: { Vocab: { Vocabulary: 'KWELIDCTE', Verb: 'NVT' } } });
    expect(row).toEqual({ 'Result.Vocab.Vocabulary': 'KWELIDCTE', 'Result.Vocab.Verb': 'NVT' });
  });
});

describe('collectColumns', () => {
  it('returns the union of columns in order of first appearance', () => {
    expect(collectColumns([{ a: 1, b: 2 }, { b: 3, c: 4 }, { a: 5 }])).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty list for no rows', () => {
    expect(collectColumns([])).toEqual([]);
  });
});

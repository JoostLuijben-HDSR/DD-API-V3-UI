import { defaultVisibleColumns, keepVisibleColumns, UNIT_COLUMN, VALUE_COLUMN, withCombinedValue } from './table-columns';

describe('withCombinedValue', () => {
  it('uses the measure value and unit', () => {
    const row = withCombinedValue({ 'Result.Measure.Value': 2, 'Result.Measure.Uom': 'PROCENT' });
    expect(row[VALUE_COLUMN]).toBe(2);
    expect(row[UNIT_COLUMN]).toBe('PROCENT');
    expect(row['Result.Measure.Value']).toBe(2);
  });

  it('uses the vocab term for categorical results (Verb as returned by AquaDesk)', () => {
    const row = withCombinedValue({ 'Result.Vocab.Vocabulary': 'KWELIDCTE', 'Result.Vocab.Verb': 'NVT' });
    expect(row[VALUE_COLUMN]).toBe('NVT');
    expect(row[UNIT_COLUMN]).toBeNull();
  });

  it('uses the vocab term when it is called Term', () => {
    expect(withCombinedValue({ 'Result.Vocab.Term': 'JA' })[VALUE_COLUMN]).toBe('JA');
  });

  it('uses count and truth results', () => {
    expect(withCombinedValue({ 'Result.Count': 7 })[VALUE_COLUMN]).toBe(7);
    expect(withCombinedValue({ 'Result.Truth': false })[VALUE_COLUMN]).toBe(false);
  });

  it('puts the combined columns first', () => {
    const row = withCombinedValue({ Id: 'a', 'Result.Count': 1 });
    expect(Object.keys(row)).toEqual([VALUE_COLUMN, UNIT_COLUMN, 'Id', 'Result.Count']);
  });

  it('leaves rows without a result unchanged (for example references)', () => {
    const row = { Type: 'Quantity', Code: 'BEDKG' };
    expect(withCombinedValue(row)).toEqual(row);
  });
});

describe('defaultVisibleColumns', () => {
  it('picks readable observation columns that exist', () => {
    const available = ['Id', 'Foi.Code', 'Parameter.Quantity', 'Value', 'Unit', 'Result.Id'];
    expect(defaultVisibleColumns('observations', available)).toEqual(['Foi.Code', 'Parameter.Quantity', 'Value', 'Unit']);
  });

  it('picks reference columns', () => {
    expect(defaultVisibleColumns('references', ['Id', 'Code', 'Name', 'Type', 'ModifiedOn'])).toEqual(['Type', 'Code', 'Name']);
  });

  it('falls back to the first columns for unknown end points', () => {
    expect(defaultVisibleColumns('other', ['a', 'b'])).toEqual(['a', 'b']);
  });
});

describe('keepVisibleColumns', () => {
  it('keeps earlier choices that still exist', () => {
    expect(keepVisibleColumns(['Foi.Code', 'Gone'], 'observations', ['Foi.Code', 'Value'])).toEqual(['Foi.Code']);
  });

  it('falls back to defaults when nothing is left', () => {
    expect(keepVisibleColumns(['Gone'], 'references', ['Code', 'Type'])).toEqual(['Type', 'Code']);
  });
});

import { toReferenceOption, toReferenceOptions } from './reference-option';

describe('toReferenceOption', () => {
  it('shows the name next to the code', () => {
    expect(toReferenceOption({ Code: 'PT.BD', Name: 'Planten bedekking' }, 'Code'))
      .toEqual({ value: 'PT.BD', label: 'PT.BD - Planten bedekking' });
  });

  it('uses Description when there is no Name', () => {
    expect(toReferenceOption({ Code: 'HSR', Description: 'HHRS De Stichtse Rijnlanden' }, 'Code'))
      .toEqual({ value: 'HSR', label: 'HSR - HHRS De Stichtse Rijnlanden' });
  });

  it('shows only the value when there is no description or it is the same', () => {
    expect(toReferenceOption({ Code: 'T' }, 'Code')).toEqual({ value: 'T', label: 'T' });
    expect(toReferenceOption({ Code: 'X', Name: 'X' }, 'Code')).toEqual({ value: 'X', label: 'X' });
  });

  it('returns null for records without the property', () => {
    expect(toReferenceOption({ Name: 'n' }, 'Code')).toBeNull();
    expect(toReferenceOption(null, 'Code')).toBeNull();
  });
});

describe('toReferenceOptions', () => {
  it('skips duplicates and empty values', () => {
    const options = toReferenceOptions([
      { Code: 'ME.VL', Name: 'Macroevertebraten Volume' },
      { Code: 'ME.VL', Name: 'Macroevertebraten Volume' },
      { Code: '' },
      { Code: 'PT.BD', Name: 'Planten bedekking' }
    ], 'Code');
    expect(options.map(o => o.value)).toEqual(['ME.VL', 'PT.BD']);
  });

  it('handles a missing list', () => {
    expect(toReferenceOptions(undefined, 'Code')).toEqual([]);
  });
});

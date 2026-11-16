import {
  buildSimpleFilter, emptySimpleSearchState, isPeriodValid, odataString, optionLabel,
  referencesToOptions, searchOptions
} from './simple-search';
import type { PickerOption } from './simple-search';

const option = (value: string, label: string = value, isTaxon?: boolean): PickerOption =>
  isTaxon === undefined ? { value, label } : { value, label, isTaxon };

describe('buildSimpleFilter', () => {
  it('is empty without choices', () => {
    expect(buildSimpleFilter(emptySimpleSearchState())).toBe('');
  });

  it('builds the macrophytes 2025 query for HDSR', () => {
    const state = {
      ...emptySimpleSearchState('HSR'),
      from: '2025-01-01',
      to: '2025-12-31',
      measurementPackages: [option('PT.AB'), option('PT.BD'), option('PT.KG')]
    };
    expect(buildSimpleFilter(state)).toBe(
      "Parameter/Organisation eq 'HSR'"
      + ' and PhenomenonTime/BeginPosition ge 2025-01-01T00:00:00Z'
      + ' and PhenomenonTime/BeginPosition lt 2026-01-01T00:00:00Z'
      + " and Parameter/MeasurementPackage in ('PT.AB','PT.BD','PT.KG')");
  });

  it('uses eq for one value and leaves out duplicates', () => {
    const state = { ...emptySimpleSearchState('HSR'), quantities: [option('BEDKG'), option('BEDKG')] };
    expect(buildSimpleFilter(state)).toBe("Parameter/Organisation eq 'HSR' and Parameter/Quantity eq 'BEDKG'");
  });

  it('filters measurement objects and compartments', () => {
    const state = { ...emptySimpleSearchState('HSR'), measurementObjects: [option('NL14_1'), option('NL14_2')], compartments: [option('OW')] };
    expect(buildSimpleFilter(state)).toBe("Parameter/Organisation eq 'HSR' and Parameter/Compartment eq 'OW' and Foi/Code in ('NL14_1','NL14_2')");
  });

  it('matches taxa including variants, and other parameters exactly', () => {
    const state = { ...emptySimpleSearchState('HSR'), parameters: [option('Galium palustre', 'Galium palustre', true), option('Cd', 'Cadmium', false)] };
    expect(buildSimpleFilter(state)).toBe(
      "Parameter/Organisation eq 'HSR' and (startswith(Parameter/Parameter,'Galium palustre') or Parameter/Parameter eq 'Cd')");
  });

  it('escapes single quotes', () => {
    expect(odataString("d'Hondt")).toBe("'d''Hondt'");
    const state = { ...emptySimpleSearchState("O'X") };
    expect(buildSimpleFilter(state)).toBe("Parameter/Organisation eq 'O''X'");
  });

  it('allows an open start or end of the period', () => {
    expect(buildSimpleFilter({ ...emptySimpleSearchState(), to: '2025-06-30' })).toBe('PhenomenonTime/BeginPosition lt 2025-07-01T00:00:00Z');
    expect(buildSimpleFilter({ ...emptySimpleSearchState(), from: '2025-06-30' })).toBe('PhenomenonTime/BeginPosition ge 2025-06-30T00:00:00Z');
  });
});

describe('isPeriodValid', () => {
  it('rejects an end before the start', () => {
    expect(isPeriodValid({ ...emptySimpleSearchState(), from: '2025-02-01', to: '2025-01-31' })).toBeFalse();
    expect(isPeriodValid({ ...emptySimpleSearchState(), from: '2025-01-01', to: '2025-01-01' })).toBeTrue();
  });
});

describe('searchOptions', () => {
  const options = [
    option('HSR', 'HHRS De Stichtse Rijnlanden (HSR)'),
    option('HRL', 'HHRS van Rijnland (HRL)'),
    option('WRL', 'WS Rivierenland (WRL)'),
    option('PT.BD', 'Planten bedekking (PT.BD)'),
    option('Zoö', 'Zoöplankton (Zoö)')
  ];

  it('shows the first options when nothing is typed', () => {
    expect(searchOptions(options, '', 2).map(o => o.value)).toEqual(['HSR', 'HRL']);
  });

  it('finds on a word in the name, ignoring case', () => {
    expect(searchOptions(options, 'stichtse', 10).map(o => o.value)).toEqual(['HSR']);
  });

  it('puts options that start with the text first', () => {
    expect(searchOptions(options, 'rijnland', 10).map(o => o.value)).toEqual(['HSR', 'HRL']);
    expect(searchOptions(options, 'h', 10).map(o => o.value)).toEqual(['HSR', 'HRL']);
  });

  it('ignores accents', () => {
    expect(searchOptions(options, 'zooplankton', 10).map(o => o.value)).toEqual(['Zoö']);
  });

  it('finds on the code', () => {
    expect(searchOptions(options, 'pt.bd', 10).map(o => o.value)).toEqual(['PT.BD']);
  });
});

describe('referencesToOptions', () => {
  it('makes "Name (CODE)" labels, skips duplicates and sorts by label', () => {
    const options = referencesToOptions([
      { Code: 'PT.BD', Name: 'Planten bedekking' },
      { Code: 'PT.BD', Name: 'Planten bedekking' },
      { Code: 'ME.AB', Name: 'Macro-evertebraten abundantie' },
      { Code: '', Name: 'leeg' }
    ]);
    expect(options).toEqual([
      { value: 'ME.AB', label: 'Macro-evertebraten abundantie (ME.AB)' },
      { value: 'PT.BD', label: 'Planten bedekking (PT.BD)' }
    ]);
  });

  it('marks taxa and keeps the parameter type as detail', () => {
    const options = referencesToOptions([
      { Code: 'Galium palustre', Name: 'Galium palustre', ParameterType: 'Taxon' },
      { Code: 'Cd', Name: 'Cadmium', ParameterType: 'Chemical' }
    ]);
    expect(options).toEqual([
      { value: 'Cd', label: 'Cadmium (Cd)', detail: 'Chemical', isTaxon: false },
      { value: 'Galium palustre', label: 'Galium palustre', detail: 'Taxon', isTaxon: true }
    ]);
  });
});

describe('optionLabel', () => {
  it('shows only the code when the name is missing or the same', () => {
    expect(optionLabel('T', '')).toBe('T');
    expect(optionLabel('X', 'X')).toBe('X');
    expect(optionLabel('ZICHT', 'Doorzicht')).toBe('Doorzicht (ZICHT)');
  });
});

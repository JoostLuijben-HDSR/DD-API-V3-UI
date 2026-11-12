import {
  CODE_LIST_GROUPS, CODE_LISTS, filterCodeLists, groupName, latestVersions, listName, networkLocations, referenceToRow, searchRows
} from './code-lists';

describe('code list catalogue', () => {
  it('has a unique type, a known group and both languages for every list', () => {
    const types = CODE_LISTS.map(l => l.type);
    expect(new Set(types).size).toBe(types.length);
    const groups = CODE_LIST_GROUPS.map(g => g.id);
    for (const list of CODE_LISTS) {
      expect(groups.includes(list.group)).toBeTrue();
      expect(list.name.every(n => n.length > 0)).toBeTrue();
      expect(list.description.every(d => d.length > 0)).toBeTrue();
      expect(list.columns.length > 0).toBeTrue();
    }
  });

  it('gives names per language', () => {
    const packages = CODE_LISTS.find(l => l.type === 'MeasurementPackage')!;
    expect(listName(packages, 'nl')).toBe('Meetpakketten');
    expect(listName(packages, 'en')).toBe('Measurement packages');
    expect(groupName('where', 'nl')).toBe('Waar');
  });

  it('finds lists by name, explanation or type', () => {
    expect(filterCodeLists(CODE_LISTS, 'meetpakket', 'nl').map(l => l.type)).toContain('MeasurementPackage');
    expect(filterCodeLists(CODE_LISTS, 'taxa', 'nl').map(l => l.type)).toContain('Parameter');
    expect(filterCodeLists(CODE_LISTS, 'oms', 'nl').map(l => l.type)).toEqual(['Project']);
    expect(filterCodeLists(CODE_LISTS, '', 'nl').length).toBe(CODE_LISTS.length);
  });
});

describe('referenceToRow', () => {
  it('shortens dates and counts network locations', () => {
    const row = referenceToRow({
      Code: 'OMS25-220', Name: 'Groenblauwe diensten', ProjectStart: '2024-12-31T23:00:00+00:00', ProjectEnd: '2025-12-30T23:00:00+00:00'
    });
    expect(row['ProjectStart']).toBe('2024-12-31');
    expect(row['ProjectEnd']).toBe('2025-12-30');
    const network = referenceToRow({ Code: 'KRW', MeasurementObjects: ['A', 'B', 'C'] });
    expect(network['MeasurementObjectCount']).toBe(3);
  });

  it('splits coordinates into X and Y', () => {
    const row = referenceToRow({ Code: 'NL14_1', Geography: { type: 'Point', coordinates: [5.2, 52.0] } });
    expect(row['Geography.X']).toBe(5.2);
    expect(row['Geography.Y']).toBe(52.0);
  });
});

describe('networkLocations', () => {
  it('returns the location codes of a network', () => {
    expect(networkLocations({ MeasurementObjects: ['A', '', 'B', 3] })).toEqual(['A', 'B']);
    expect(networkLocations({})).toEqual([]);
  });
});

describe('searchRows', () => {
  const rows = [
    { Code: 'NL14_01_01', Name: 'Langbroekerwetering laatste brug' },
    { Code: 'NL14_20548', Name: 'Groenblauwe dienst referentie-2' }
  ];

  it('matches several words in any order over the given columns', () => {
    expect(searchRows(rows, ['Code', 'Name'], 'brug langbroek').map(r => r['Code'])).toEqual(['NL14_01_01']);
    expect(searchRows(rows, ['Code', 'Name'], '20548').map(r => r['Code'])).toEqual(['NL14_20548']);
  });

  it('returns all rows without a search', () => {
    expect(searchRows(rows, ['Code'], ' ').length).toBe(2);
  });
});

describe('latestVersions', () => {
  it('keeps only the newest version per code and organisation, in the original order', () => {
    const records = [
      { Code: 'PT.BD', Organisation: 'AquaDesk', ModifiedOn: '2021-05-20T10:52:56Z', Id: 'old' },
      { Code: 'ME.AB', Organisation: 'AquaDesk', ModifiedOn: '2021-01-01T00:00:00Z', Id: 'me' },
      { Code: 'PT.BD', Organisation: 'AquaDesk', ModifiedOn: '2025-01-27T14:20:25Z', Id: 'new' },
      { Code: 'PT.BD', Organisation: 'Other', ModifiedOn: '2020-01-01T00:00:00Z', Id: 'other' }
    ];
    expect(latestVersions(records).map(r => (r as { Id: string }).Id)).toEqual(['new', 'me', 'other']);
  });
});

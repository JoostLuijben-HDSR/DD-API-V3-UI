import {
  groupByCodePrefix, highlightParts, matchOptions, normaliseText, orderByAvailability,
  rememberRecent, searchTokens, withRecentFirst
} from './list-search';
import type { PickerOption } from './simple-search';

const o = (value: string, label: string = value): PickerOption => ({ value, label });

const locations = [
  o('NL14_01_01', 'Langbroekerwetering laatste brug (01_01 = a10) (NL14_01_01)'),
  o('NL14_01_03', 'Langbroekerwetering ter hoogte van kruising Zwarteweg (NL14_01_03)'),
  o('NL14_20548', 'Groenblauwe dienst referentie-2 (NL14_20548)')
];
const packages = [
  o('ME.AB', 'Macro-evertebraten abundantie (ME.AB)'),
  o('ME.VL', 'Macroevertebraten Volume (ME.VL)'),
  o('PT.AB', 'Planten abundantie (PT.AB)'),
  o('PT.BD', 'Planten bedekking (PT.BD)'),
  o('NVT', 'Niet van toepassing (NVT)')
];

describe('normaliseText and searchTokens', () => {
  it('keeps the length and turns punctuation into spaces', () => {
    expect(normaliseText('Zoö-PT.BD')).toBe('zoo pt bd');
    expect(normaliseText('Zoö-PT.BD').length).toBe('Zoö-PT.BD'.length);
  });

  it('splits on spaces and punctuation', () => {
    expect(searchTokens('  PT.BD   planten ')).toEqual(['pt', 'bd', 'planten']);
  });
});

describe('matchOptions', () => {
  it('returns everything for an empty search', () => {
    expect(matchOptions(packages, '  ').length).toBe(5);
  });

  it('matches several words in any order', () => {
    expect(matchOptions(locations, 'brug langbroek').map(x => x.value)).toEqual(['NL14_01_01']);
    expect(matchOptions(locations, 'zwarteweg kruising').map(x => x.value)).toEqual(['NL14_01_03']);
  });

  it('ignores punctuation and finds compact codes', () => {
    expect(matchOptions(packages, 'ptbd').map(x => x.value)).toEqual(['PT.BD']);
    expect(matchOptions(packages, 'pt.bd').map(x => x.value)).toEqual(['PT.BD']);
    expect(matchOptions(packages, 'macroevertebraten').map(x => x.value)).toEqual(['ME.AB', 'ME.VL']);
  });

  it('ranks options that start with the text first, then word starts, then the rest', () => {
    const options = [o('X1', 'Grote planten (X1)'), o('X2', 'Waterplanten (X2)'), o('X3', 'Planten (X3)')];
    expect(matchOptions(options, 'planten').map(x => x.value)).toEqual(['X3', 'X1', 'X2']);
  });

  it('finds a location by its number', () => {
    expect(matchOptions(locations, '20548').map(x => x.value)).toEqual(['NL14_20548']);
  });
});

describe('highlightParts', () => {
  it('marks the matching words, keeping the original text', () => {
    expect(highlightParts('Planten bedekking (PT.BD)', 'bed plan')).toEqual([
      { text: 'Plan', match: true },
      { text: 'ten ', match: false },
      { text: 'bed', match: true },
      { text: 'ekking (PT.BD)', match: false }
    ]);
  });

  it('matches regardless of accents and case', () => {
    expect(highlightParts('Zoöplankton', 'ZOO')).toEqual([{ text: 'Zoö', match: true }, { text: 'plankton', match: false }]);
  });

  it('returns the whole label without a search', () => {
    expect(highlightParts('Planten', '')).toEqual([{ text: 'Planten', match: false }]);
  });
});

describe('groupByCodePrefix', () => {
  it('groups by the part before the dot and names groups after their common words', () => {
    const groups = groupByCodePrefix(packages);
    expect(groups.map(g => g.label)).toEqual(['ME', 'Planten (PT)', '']);
    expect(groups[1].options.map(x => x.value)).toEqual(['PT.AB', 'PT.BD']);
    expect(groups[2].options.map(x => x.value)).toEqual(['NVT']);
  });
});

describe('orderByAvailability', () => {
  it('puts options with data first and without data last', () => {
    const ordered = orderByAvailability(packages, { 'PT.BD': 'yes', 'ME.AB': 'no', 'PT.AB': 'yes' });
    expect(ordered.map(x => x.value)).toEqual(['PT.AB', 'PT.BD', 'ME.VL', 'NVT', 'ME.AB']);
  });

  it('keeps the order without availability', () => {
    expect(orderByAvailability(packages, null).map(x => x.value)).toEqual(packages.map(x => x.value));
  });
});

describe('recently used', () => {
  it('moves recent values to the front', () => {
    const { recent, others } = withRecentFirst(packages, ['PT.BD', 'GONE', 'ME.AB']);
    expect(recent.map(x => x.value)).toEqual(['PT.BD', 'ME.AB']);
    expect(others.map(x => x.value)).toEqual(['ME.VL', 'PT.AB', 'NVT']);
  });

  it('remembers the latest values first, without duplicates, up to a maximum', () => {
    expect(rememberRecent(['A', 'B', 'C'], ['C', 'D'], 4)).toEqual(['C', 'D', 'A', 'B']);
  });
});

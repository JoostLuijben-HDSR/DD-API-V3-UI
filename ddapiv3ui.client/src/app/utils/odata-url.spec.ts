import { readCount, readNextLink, readRecords, withCount, withMinimumTop } from './odata-url';

describe('withCount', () => {
  it('adds $count=true', () => {
    expect(withCount('https://x/v3/odata/observations?$top=10')).toBe('https://x/v3/odata/observations?$top=10&$count=true');
  });

  it('adds a question mark when there is no query string yet', () => {
    expect(withCount('https://x/v3/odata/observations')).toBe('https://x/v3/odata/observations?$count=true');
  });

  it('turns an existing $count=false into true', () => {
    expect(withCount('https://x/o?$top=10&$count=false&$filter=a')).toBe('https://x/o?$top=10&$count=true&$filter=a');
  });
});

describe('withMinimumTop', () => {
  it('raises a small $top', () => {
    expect(withMinimumTop('https://x/o?$top=10&$filter=a', 1000)).toBe('https://x/o?$top=1000&$filter=a');
  });

  it('keeps a larger $top', () => {
    expect(withMinimumTop('https://x/o?$top=5000', 1000)).toBe('https://x/o?$top=5000');
  });

  it('adds $top when it is missing', () => {
    expect(withMinimumTop('https://x/o?$filter=a', 1000)).toBe('https://x/o?$filter=a&$top=1000');
  });
});

describe('response readers', () => {
  it('reads count, records and next link', () => {
    const response = { '@odata.count': 12, '@odata.nextLink': 'https://x/next', value: [{ a: 1 }] };
    expect(readCount(response)).toBe(12);
    expect(readNextLink(response)).toBe('https://x/next');
    expect(readRecords(response)).toEqual([{ a: 1 }]);
  });

  it('returns safe defaults for missing or odd values', () => {
    expect(readCount({})).toBeNull();
    expect(readCount(null)).toBeNull();
    expect(readNextLink({ '@odata.nextLink': '' })).toBeNull();
    expect(readRecords({ error: {} })).toEqual([]);
    expect(readRecords('text')).toEqual([]);
  });
});

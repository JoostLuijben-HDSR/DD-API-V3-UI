import { csvFileName, formatCell, toCsv, UTF8_BOM } from './csv';

describe('formatCell', () => {
  it('writes numbers with a decimal comma for excel-nl and a point for standard', () => {
    expect(formatCell(2.5, 'excel-nl')).toBe('2,5');
    expect(formatCell(2.5, 'standard')).toBe('2.5');
  });

  it('writes empty cells for null and undefined', () => {
    expect(formatCell(null, 'excel-nl')).toBe('');
    expect(formatCell(undefined, 'standard')).toBe('');
  });

  it('quotes text that contains the separator, quotes or line breaks', () => {
    expect(formatCell('a;b', 'excel-nl')).toBe('"a;b"');
    expect(formatCell('a,b', 'excel-nl')).toBe('a,b');
    expect(formatCell('a,b', 'standard')).toBe('"a,b"');
    expect(formatCell('say "hi"', 'standard')).toBe('"say ""hi"""');
    expect(formatCell('line1\nline2', 'standard')).toBe('"line1\nline2"');
  });

  it('neutralizes text that a spreadsheet would read as a formula', () => {
    expect(formatCell('=HYPERLINK("x")', 'standard')).toBe('"\'=HYPERLINK(""x"")"');
    expect(formatCell('@SUM(A1)', 'excel-nl')).toBe("'@SUM(A1)");
    expect(formatCell('-12.5', 'excel-nl')).toBe('-12.5');
  });

  it('writes booleans as true/false', () => {
    expect(formatCell(true, 'excel-nl')).toBe('true');
  });
});

describe('toCsv', () => {
  it('builds a header and one line per row, with byte order mark and CRLF', () => {
    const csv = toCsv(
      [{ 'Foi.Code': 'NL14_1', 'Result.Measure.Value': 2 }, { 'Foi.Code': 'NL14_2' }],
      ['Foi.Code', 'Result.Measure.Value'],
      { format: 'excel-nl' });
    expect(csv).toBe(UTF8_BOM + 'Foi.Code;Result.Measure.Value\r\nNL14_1;2\r\nNL14_2;\r\n');
  });

  it('uses commas for the standard format', () => {
    const csv = toCsv([{ a: 1.5, b: 'x' }], ['a', 'b'], { format: 'standard' });
    expect(csv).toBe(UTF8_BOM + 'a,b\r\n1.5,x\r\n');
  });
});

describe('csvFileName', () => {
  it('combines the end point and a timestamp', () => {
    expect(csvFileName('observations', new Date(2026, 10, 12, 14, 5))).toBe('observations-20261112-1405.csv');
  });

  it('replaces unsafe characters', () => {
    expect(csvFileName('odata/observations', new Date(2026, 0, 2, 3, 4))).toBe('odata_observations-20260102-0304.csv');
  });
});

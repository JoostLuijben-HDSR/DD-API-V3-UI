/**
 * CSV export of flattened rows.
 *
 * Two formats are offered:
 * - `excel-nl`: semicolon separator and decimal comma, so Excel with Dutch
 *   (or other European) regional settings opens the file without an import wizard.
 * - `standard`: comma separator and decimal point (RFC 4180 style).
 *
 * The output starts with a UTF-8 byte order mark, so Excel shows characters such
 * as ë and µ correctly.
 */

import type { FlatRow, FlatValue } from './flatten';

export type CsvFormat = 'excel-nl' | 'standard';

export interface CsvOptions {
  format: CsvFormat;
}

export const UTF8_BOM = '\uFEFF';

const FORMULA_START = /^[=+\-@\t\r]/;
const NUMERIC_TEXT = /^[+-]?\d+([.,]\d+)?([eE][+-]?\d+)?$/;

function separatorFor(format: CsvFormat): string {
  return format === 'excel-nl' ? ';' : ',';
}

function formatNumber(value: number, format: CsvFormat): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  const text = String(value);
  return format === 'excel-nl' ? text.replace('.', ',') : text;
}

/**
 * Prevents spreadsheet formula injection: text that starts with =, +, -, @ or a
 * control character is prefixed with a single quote, unless it is a plain number.
 */
function neutralizeFormula(text: string): string {
  if (FORMULA_START.test(text) && !NUMERIC_TEXT.test(text)) {
    return `'${text}`;
  }
  return text;
}

function quoteIfNeeded(text: string, separator: string): string {
  if (text.includes(separator) || text.includes('"') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function formatCell(value: FlatValue | undefined, format: CsvFormat): string {
  const separator = separatorFor(format);
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return quoteIfNeeded(formatNumber(value, format), separator);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return quoteIfNeeded(neutralizeFormula(value), separator);
}

/** Builds the CSV text (including byte order mark) for the given rows and columns. */
export function toCsv(rows: FlatRow[], columns: string[], options: CsvOptions): string {
  const separator = separatorFor(options.format);
  const lines: string[] = [];
  lines.push(columns.map(c => quoteIfNeeded(neutralizeFormula(c), separator)).join(separator));
  for (const row of rows) {
    lines.push(columns.map(c => formatCell(row[c], options.format)).join(separator));
  }
  return UTF8_BOM + lines.join('\r\n') + '\r\n';
}

/** File name such as `observations-20261112-1405.csv`. */
export function csvFileName(endPoint: string, now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const safeEndPoint = (endPoint || 'result').replace(/[^A-Za-z0-9_-]/g, '_');
  return `${safeEndPoint}-${stamp}.csv`;
}

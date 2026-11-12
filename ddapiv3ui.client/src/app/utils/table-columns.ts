/**
 * Column helpers for showing flattened DD-API records in a table.
 */

import type { FlatRow, FlatValue } from './flatten';

/** Name of the combined value column for observations. */
export const VALUE_COLUMN = 'Value';
/** Name of the combined unit column for observations. */
export const UNIT_COLUMN = 'Unit';

const VALUE_SOURCES = [
  'Result.Measure.Value',
  'Result.Vocab.Term',
  'Result.Vocab.Verb',
  'Result.Category.Code',
  'Result.Count',
  'Result.Truth'
];

/**
 * Adds a `Value` and a `Unit` column to a flattened observation, so numeric results
 * (measure, count) and categorical results (vocab terms) can be read in one column.
 * The original Result columns are kept.
 */
export function withCombinedValue(row: FlatRow): FlatRow {
  const hasResult = Object.keys(row).some(key => key.startsWith('Result.'));
  if (!hasResult) {
    return row;
  }
  let value: FlatValue = null;
  for (const source of VALUE_SOURCES) {
    const candidate = row[source];
    if (candidate !== undefined && candidate !== null && candidate !== '') {
      value = candidate;
      break;
    }
  }
  const unit = row['Result.Measure.Uom'] ?? null;
  return { [VALUE_COLUMN]: value, [UNIT_COLUMN]: unit, ...row };
}

const OBSERVATION_DEFAULTS = [
  'PhenomenonTime.BeginPosition',
  'Foi.Code',
  'Foi.Name',
  'Parameter.MeasurementPackage',
  'Parameter.Quantity',
  'Parameter.Parameter',
  VALUE_COLUMN,
  UNIT_COLUMN
];

const REFERENCE_DEFAULTS = ['Type', 'Organisation', 'Code', 'Name', 'Description'];

const MAX_FALLBACK_COLUMNS = 8;

/**
 * Chooses the columns to show first. Known end points get a readable selection;
 * otherwise the first columns of the result are used.
 */
export function defaultVisibleColumns(endPoint: string, available: string[]): string[] {
  const preferred = endPoint === 'observations' ? OBSERVATION_DEFAULTS
    : endPoint === 'references' ? REFERENCE_DEFAULTS
      : [];
  const chosen = preferred.filter(column => available.includes(column));
  return chosen.length > 0 ? chosen : available.slice(0, MAX_FALLBACK_COLUMNS);
}

/**
 * Keeps the columns the user selected before, as far as they still exist in the new
 * result. Falls back to the defaults when none of them exist.
 */
export function keepVisibleColumns(previous: string[], endPoint: string, available: string[]): string[] {
  const kept = previous.filter(column => available.includes(column));
  return kept.length > 0 ? kept : defaultVisibleColumns(endPoint, available);
}

/**
 * Helpers to turn nested DD-API records (observations, references) into flat rows,
 * so they can be shown in a table or exported to CSV.
 *
 * Nested objects become dotted column names, for example
 * `Parameter.Quantity` or `Result.Measure.Value`.
 */

export type FlatValue = string | number | boolean | null;
export type FlatRow = Record<string, FlatValue>;

/** Separator used when an array of simple values is written into a single cell. */
export const ARRAY_SEPARATOR = '|';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isGeoJsonPoint(value: Record<string, unknown>): boolean {
  const coordinates = value['coordinates'];
  return value['type'] === 'Point'
    && Array.isArray(coordinates)
    && coordinates.length >= 2
    && coordinates.every(c => typeof c === 'number');
}

function isGeoJson(value: Record<string, unknown>): boolean {
  return typeof value['type'] === 'string' && ('coordinates' in value || 'geometries' in value);
}

/**
 * Flattens one record into a single-level object.
 *
 * - Nested objects are expanded with dotted names.
 * - A GeoJSON Point becomes two columns, `<name>.X` and `<name>.Y`.
 * - Other GeoJSON geometries are kept as JSON text in one column.
 * - Arrays of simple values are joined with `|`; other arrays are kept as JSON text.
 * - Empty arrays and empty objects produce no columns.
 */
export function flattenRecord(record: unknown, prefix: string = ''): FlatRow {
  const row: FlatRow = {};
  if (!isPlainObject(record)) {
    if (prefix) {
      row[prefix] = toFlatValue(record);
    }
    return row;
  }

  for (const [key, value] of Object.entries(record)) {
    const name = prefix ? `${prefix}.${key}` : key;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        continue;
      }
      row[name] = value.every(v => v === null || typeof v !== 'object')
        ? value.map(v => (v === null ? '' : String(v))).join(ARRAY_SEPARATOR)
        : JSON.stringify(value);
      continue;
    }

    if (isPlainObject(value)) {
      if (isGeoJsonPoint(value)) {
        const coordinates = value['coordinates'] as number[];
        row[`${name}.X`] = coordinates[0];
        row[`${name}.Y`] = coordinates[1];
      } else if (isGeoJson(value)) {
        row[name] = JSON.stringify(value);
      } else {
        Object.assign(row, flattenRecord(value, name));
      }
      continue;
    }

    row[name] = toFlatValue(value);
  }
  return row;
}

function toFlatValue(value: unknown): FlatValue {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return JSON.stringify(value);
}

/**
 * Returns all column names that occur in the rows, in order of first appearance.
 * Records do not all have the same fields, because empty values are often left out.
 */
export function collectColumns(rows: FlatRow[]): string[] {
  const seen = new Set<string>();
  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  return columns;
}

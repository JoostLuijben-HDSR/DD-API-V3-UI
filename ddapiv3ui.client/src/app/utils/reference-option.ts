/**
 * Turns a reference record into an option for the value autocomplete, so the list shows
 * the description next to the code ("PT.BD - Planten bedekking") while the filter still
 * uses the code.
 */

export interface ReferenceOption {
  value: string;
  label: string;
}

export function toReferenceOption(record: unknown, property: string): ReferenceOption | null {
  if (record === null || typeof record !== 'object') {
    return null;
  }
  const fields = record as Record<string, unknown>;
  const raw = fields[property];
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  const value = String(raw);
  const description = fields['Name'] ?? fields['Description'];
  const text = typeof description === 'string' ? description.trim() : '';
  const label = text && text !== value ? `${value} - ${text}` : value;
  return { value, label };
}

/** Converts a list of references to options, without empty or duplicate values. */
export function toReferenceOptions(records: unknown[] | undefined, property: string): ReferenceOption[] {
  const seen = new Set<string>();
  const options: ReferenceOption[] = [];
  for (const record of records ?? []) {
    const option = toReferenceOption(record, property);
    if (option && !seen.has(option.value)) {
      seen.add(option.value);
      options.push(option);
    }
  }
  return options;
}

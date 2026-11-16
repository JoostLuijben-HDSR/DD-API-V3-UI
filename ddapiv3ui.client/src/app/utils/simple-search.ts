/**
 * Logic of the "simple search" panel: the choices of the user and how they become an
 * OData $filter for the observations end point, plus searching in option lists.
 */

import { nextDay } from './period';
import { matchOptions } from './list-search';

/** One choice in a selection list. The value is sent to the service; the label is shown. */
export interface PickerOption {
  value: string;
  label: string;
  /** Extra information shown in smaller text, for example a parameter type. */
  detail?: string;
  /** Taxa are matched including their variants ([1], [2]) and subspecies. */
  isTaxon?: boolean;
}

export interface SimpleSearchState {
  organisation: string | null;
  /** YYYY-MM-DD or empty. */
  from: string;
  /** YYYY-MM-DD (inclusive) or empty. */
  to: string;
  measurementPackages: PickerOption[];
  compartments: PickerOption[];
  quantities: PickerOption[];
  measurementObjects: PickerOption[];
  parameters: PickerOption[];
}

export function emptySimpleSearchState(organisation: string | null = null): SimpleSearchState {
  return {
    organisation,
    from: '',
    to: '',
    measurementPackages: [],
    compartments: [],
    quantities: [],
    measurementObjects: [],
    parameters: []
  };
}

/** Quotes a value as an OData string literal; single quotes are doubled. */
export function odataString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function equalsOrIn(path: string, values: string[]): string | null {
  const unique = [...new Set(values)];
  if (unique.length === 0) {
    return null;
  }
  return unique.length === 1
    ? `${path} eq ${odataString(unique[0])}`
    : `${path} in (${unique.map(odataString).join(',')})`;
}

function parameterClause(parameters: PickerOption[]): string | null {
  const parts = parameters.map(p => p.isTaxon
    ? `startswith(Parameter/Parameter,${odataString(p.value)})`
    : `Parameter/Parameter eq ${odataString(p.value)}`);
  const unique = [...new Set(parts)];
  if (unique.length === 0) {
    return null;
  }
  return unique.length === 1 ? unique[0] : `(${unique.join(' or ')})`;
}

/** Builds the $filter expression for the choices; empty choices are left out. */
export function buildSimpleFilter(state: SimpleSearchState): string {
  const clauses: (string | null)[] = [
    state.organisation ? `Parameter/Organisation eq ${odataString(state.organisation)}` : null,
    state.from ? `PhenomenonTime/BeginPosition ge ${state.from}T00:00:00Z` : null,
    state.to ? `PhenomenonTime/BeginPosition lt ${nextDay(state.to)}T00:00:00Z` : null,
    equalsOrIn('Parameter/MeasurementPackage', state.measurementPackages.map(o => o.value)),
    equalsOrIn('Parameter/Compartment', state.compartments.map(o => o.value)),
    equalsOrIn('Parameter/Quantity', state.quantities.map(o => o.value)),
    equalsOrIn('Foi/Code', state.measurementObjects.map(o => o.value)),
    parameterClause(state.parameters)
  ];
  return clauses.filter((c): c is string => !!c).join(' and ');
}

/** True when the period is complete enough and in the right order. */
export function isPeriodValid(state: SimpleSearchState): boolean {
  return !(state.from && state.to && state.to < state.from);
}

/**
 * Searches options on code and label: several words in any order, ignoring case, accents
 * and punctuation, best matches first. Returns at most `limit` options.
 */
export function searchOptions(options: PickerOption[], text: string, limit: number): PickerOption[] {
  return matchOptions(options, text).slice(0, limit);
}

/** Label "Name (CODE)", or only the code when the name is empty or the same. */
export function optionLabel(code: string, name: string | null | undefined): string {
  const text = (name ?? '').trim();
  return text && text !== code ? `${text} (${code})` : code;
}

/**
 * Turns reference records into options: no empty or duplicate codes, sorted by label.
 * Taxa (ParameterType 'Taxon') are marked so they are matched with their variants.
 */
export function referencesToOptions(records: unknown[] | undefined): PickerOption[] {
  const byCode = new Map<string, PickerOption>();
  for (const record of records ?? []) {
    if (record === null || typeof record !== 'object') {
      continue;
    }
    const fields = record as Record<string, unknown>;
    const code = typeof fields['Code'] === 'string' ? (fields['Code'] as string) : '';
    if (!code || byCode.has(code)) {
      continue;
    }
    const name = typeof fields['Name'] === 'string' ? fields['Name'] as string
      : typeof fields['Description'] === 'string' ? fields['Description'] as string : '';
    const parameterType = typeof fields['ParameterType'] === 'string' ? fields['ParameterType'] as string : '';
    const option: PickerOption = { value: code, label: optionLabel(code, name) };
    if (parameterType) {
      option.detail = parameterType;
      option.isTaxon = parameterType.toLowerCase() === 'taxon';
    }
    byCode.set(code, option);
  }
  return [...byCode.values()].sort((a, b) => a.label.localeCompare(b.label, 'nl'));
}

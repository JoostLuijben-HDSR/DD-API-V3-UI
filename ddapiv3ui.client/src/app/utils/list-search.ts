/**
 * Searching in long option lists: several words in any order, ignoring case, accents and
 * punctuation, ranked by how well an option matches, with the matching parts marked for
 * highlighting. Also grouping and ordering by data availability.
 */

import type { PickerOption } from './simple-search';

const DIACRITICS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
const SEPARATORS = /[\s._\-/()[\],;:'"]+/;

/** Lower case, without accents; every other character keeps its position. */
function normaliseChar(char: string): string {
  const base = char.normalize('NFD').replace(DIACRITICS, '').toLowerCase();
  return base.length === 1 ? base : (base.charAt(0) || ' ');
}

/** Normalised text with the same length as the input, so positions can be mapped back. */
export function normaliseText(text: string): string {
  let result = '';
  for (const char of text) {
    const n = normaliseChar(char);
    result += SEPARATORS.test(char) ? ' ' : n;
  }
  return result;
}

/** The words of a search text, normalised. "PT.BD planten" gives ['pt', 'bd', 'planten']. */
export function searchTokens(text: string): string[] {
  return normaliseText(text).split(' ').filter(t => t.length > 0);
}

interface Haystack {
  spaced: string;
  compact: string;
}

function haystack(option: PickerOption): Haystack {
  const spaced = ` ${normaliseText(option.value)} ${normaliseText(option.label)} `;
  return { spaced, compact: spaced.replace(/ /g, '') };
}

function tokenMatches(hay: Haystack, token: string): boolean {
  return hay.spaced.includes(token) || hay.compact.includes(token);
}

/**
 * Rank of an option for the search tokens; lower is better, null when it does not match.
 * 0: code or label starts with the whole search text; 1: every word matches the start of
 * a word; 2: every word occurs somewhere.
 */
function rank(option: PickerOption, tokens: string[], query: string): number | null {
  const hay = haystack(option);
  if (!tokens.every(token => tokenMatches(hay, token))) {
    return null;
  }
  const value = normaliseText(option.value).trim();
  const label = normaliseText(option.label).trim();
  const compactQuery = query.replace(/ /g, '');
  const startsWith = (text: string) => text.startsWith(query) || text.replace(/ /g, '').startsWith(compactQuery);
  if (startsWith(value) || startsWith(label)) {
    return 0;
  }
  return tokens.every(token => hay.spaced.includes(' ' + token)) ? 1 : 2;
}

/**
 * All options that match the search text, best matches first; the original order is kept
 * within the same rank. An empty text returns all options.
 */
export function matchOptions(options: PickerOption[], text: string): PickerOption[] {
  const tokens = searchTokens(text);
  if (tokens.length === 0) {
    return options.slice();
  }
  const query = tokens.join(' ');
  const ranked: { option: PickerOption, rank: number, index: number }[] = [];
  options.forEach((option, index) => {
    const r = rank(option, tokens, query);
    if (r !== null) {
      ranked.push({ option, rank: r, index });
    }
  });
  ranked.sort((a, b) => a.rank - b.rank || a.index - b.index);
  return ranked.map(r => r.option);
}

export interface TextPart {
  text: string;
  match: boolean;
}

/** Splits a label into parts, marking the parts that match one of the search words. */
export function highlightParts(label: string, searchText: string): TextPart[] {
  const tokens = searchTokens(searchText);
  if (tokens.length === 0 || !label) {
    return [{ text: label, match: false }];
  }
  const chars = Array.from(label);
  const normalised = Array.from(normaliseText(label)).join('');
  const marked = new Array<boolean>(chars.length).fill(false);
  for (const token of tokens) {
    let from = 0;
    let index = normalised.indexOf(token, from);
    while (index >= 0) {
      for (let i = index; i < index + token.length; i++) {
        marked[i] = true;
      }
      from = index + token.length;
      index = normalised.indexOf(token, from);
    }
  }
  const parts: TextPart[] = [];
  chars.forEach((char, i) => {
    const last = parts[parts.length - 1];
    if (last && last.match === marked[i]) {
      last.text += char;
    } else {
      parts.push({ text: char, match: marked[i] });
    }
  });
  return parts;
}

export interface OptionGroup {
  label: string;
  options: PickerOption[];
}

function commonWords(labels: string[]): string {
  const withoutCode = (label: string) => {
    const open = label.lastIndexOf('(');
    return open > 0 && label.trimEnd().endsWith(')') ? label.substring(0, open) : label;
  };
  const split = labels.map(l => withoutCode(l).trim().split(/\s+/));
  const first = split[0] ?? [];
  const common: string[] = [];
  for (let i = 0; i < first.length; i++) {
    const word = first[i];
    if (split.every(words => (words[i] ?? '').toLowerCase() === word.toLowerCase())) {
      common.push(word);
    } else {
      break;
    }
  }
  return common.join(' ');
}

/**
 * Groups options by the part of the code before the first dot (PT.AB, PT.BD -> PT). The
 * group is named after the words its labels have in common ("Planten"), or the prefix.
 * Groups keep the order of their first option; options without a prefix go last.
 */
export function groupByCodePrefix(options: PickerOption[]): OptionGroup[] {
  const groups = new Map<string, PickerOption[]>();
  const rest: PickerOption[] = [];
  for (const option of options) {
    const dot = option.value.indexOf('.');
    if (dot > 0) {
      const prefix = option.value.substring(0, dot);
      groups.set(prefix, [...(groups.get(prefix) ?? []), option]);
    } else {
      rest.push(option);
    }
  }
  const result: OptionGroup[] = [...groups.entries()].map(([prefix, members]) => {
    const words = members.length > 1 ? commonWords(members.map(m => m.label)) : '';
    return { label: words ? `${words} (${prefix})` : prefix, options: members };
  });
  if (rest.length > 0) {
    result.push({ label: '', options: rest });
  }
  return result;
}

/** Whether an option gave data in a check: 'yes', 'no', or not (yet) known. */
export type Availability = 'yes' | 'no' | 'unknown';

/** Puts options with data first and options without data last; otherwise keeps the order. */
export function orderByAvailability(options: PickerOption[], availability: Record<string, Availability> | null): PickerOption[] {
  if (!availability) {
    return options.slice();
  }
  const weight = (o: PickerOption): number => {
    const state = availability[o.value];
    if (state === 'yes') {
      return 0;
    }
    return state === 'no' ? 2 : 1;
  };
  return options
    .map((option, index) => ({ option, index }))
    .sort((a, b) => weight(a.option) - weight(b.option) || a.index - b.index)
    .map(x => x.option);
}

/** Moves recently used values to the front, in the order they were used. */
export function withRecentFirst(options: PickerOption[], recent: string[]): { recent: PickerOption[], others: PickerOption[] } {
  const byValue = new Map(options.map(o => [o.value, o]));
  const recentOptions = recent.map(v => byValue.get(v)).filter((o): o is PickerOption => !!o);
  const recentSet = new Set(recentOptions.map(o => o.value));
  return { recent: recentOptions, others: options.filter(o => !recentSet.has(o.value)) };
}

/** Adds a value to a list of recently used values (most recent first, at most `max`). */
export function rememberRecent(recent: string[], values: string[], max: number = 5): string[] {
  const result = [...values, ...recent.filter(v => !values.includes(v))];
  return result.slice(0, max);
}

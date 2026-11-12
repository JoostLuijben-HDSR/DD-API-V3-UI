/**
 * Helpers for a "from date / to date (inclusive)" period filter.
 *
 * The period is turned into `ge <from>T00:00` and `lt <day after to>T00:00`, so that
 * every measurement on the last day is included, whatever its time.
 */

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Returns the day after a `YYYY-MM-DD` date, also as `YYYY-MM-DD`. */
export function nextDay(date: string): string {
  const match = DATE.exec(date);
  if (!match) {
    throw new Error(`Invalid date: ${date}`);
  }
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  return utc.toISOString().substring(0, 10);
}

export interface PeriodBounds {
  /** Value for the `ge` filter, in the `datetime-local` format the filter rows use. */
  from: string | null;
  /** Value for the `lt` filter, in the `datetime-local` format the filter rows use. */
  toExclusive: string | null;
}

/**
 * Converts the chosen dates into filter values. Either date may be empty.
 * Returns null when the end date is before the start date.
 */
export function periodBounds(fromDate: string | null, toDateInclusive: string | null): PeriodBounds | null {
  const from = fromDate ? `${fromDate}T00:00` : null;
  const toExclusive = toDateInclusive ? `${nextDay(toDateInclusive)}T00:00` : null;
  if (fromDate && toDateInclusive && toDateInclusive < fromDate) {
    return null;
  }
  return { from, toExclusive };
}

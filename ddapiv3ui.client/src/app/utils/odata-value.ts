/**
 * Formatting of filter values as OData literals.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_HOUR_MINUTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DATE_TIME_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;
const HAS_ZONE = /(Z|[+-]\d{2}:\d{2})$/;

/**
 * Turns the value of a date or `datetime-local` input into a DateTimeOffset literal
 * with seconds and a time zone, for example `2025-01-01T00:00` into
 * `2025-01-01T00:00:00Z`. Some services (such as AquaDesk) reject literals without
 * seconds. Values without a zone are taken as UTC, as before.
 */
export function toDateTimeOffsetLiteral(value: string): string {
  const text = value.trim();
  if (DATE_ONLY.test(text)) {
    return `${text}T00:00:00Z`;
  }
  if (DATE_HOUR_MINUTE.test(text)) {
    return `${text}:00Z`;
  }
  if (DATE_TIME_SECONDS.test(text)) {
    return `${text}Z`;
  }
  if (HAS_ZONE.test(text)) {
    return text;
  }
  return `${text}Z`;
}

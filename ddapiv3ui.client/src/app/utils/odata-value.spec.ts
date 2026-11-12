import { toDateTimeOffsetLiteral } from './odata-value';

describe('toDateTimeOffsetLiteral', () => {
  it('adds seconds and UTC to a datetime-local value', () => {
    expect(toDateTimeOffsetLiteral('2025-01-01T00:00')).toBe('2025-01-01T00:00:00Z');
  });

  it('adds UTC to a value with seconds', () => {
    expect(toDateTimeOffsetLiteral('2025-01-01T12:30:15')).toBe('2025-01-01T12:30:15Z');
    expect(toDateTimeOffsetLiteral('2025-01-01T12:30:15.250')).toBe('2025-01-01T12:30:15.250Z');
  });

  it('turns a date into midnight UTC', () => {
    expect(toDateTimeOffsetLiteral('2025-06-30')).toBe('2025-06-30T00:00:00Z');
  });

  it('keeps values that already have a zone', () => {
    expect(toDateTimeOffsetLiteral('2025-01-01T00:00:00Z')).toBe('2025-01-01T00:00:00Z');
    expect(toDateTimeOffsetLiteral('2025-01-01T01:00:00+01:00')).toBe('2025-01-01T01:00:00+01:00');
  });
});

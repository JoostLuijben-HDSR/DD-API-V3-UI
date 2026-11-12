import { nextDay, periodBounds } from './period';

describe('nextDay', () => {
  it('moves to the next day, month and year', () => {
    expect(nextDay('2025-03-14')).toBe('2025-03-15');
    expect(nextDay('2025-01-31')).toBe('2025-02-01');
    expect(nextDay('2025-12-31')).toBe('2026-01-01');
  });

  it('handles leap years', () => {
    expect(nextDay('2024-02-28')).toBe('2024-02-29');
    expect(nextDay('2025-02-28')).toBe('2025-03-01');
  });

  it('rejects invalid dates', () => {
    let threw = false;
    try { nextDay('31-12-2025'); } catch { threw = true; }
    expect(threw).toBeTrue();
  });
});

describe('periodBounds', () => {
  it('includes the whole last day', () => {
    expect(periodBounds('2025-01-01', '2025-12-31')).toEqual({ from: '2025-01-01T00:00', toExclusive: '2026-01-01T00:00' });
  });

  it('allows an open start or end', () => {
    expect(periodBounds(null, '2025-06-30')).toEqual({ from: null, toExclusive: '2025-07-01T00:00' });
    expect(periodBounds('2025-01-01', null)).toEqual({ from: '2025-01-01T00:00', toExclusive: null });
  });

  it('returns null when the end is before the start', () => {
    expect(periodBounds('2025-02-01', '2025-01-31')).toBeNull();
  });
});

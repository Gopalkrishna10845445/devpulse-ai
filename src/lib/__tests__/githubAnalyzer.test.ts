import { describe, it, expect } from 'vitest';
import { calculateCommitStreak } from '../githubAnalyzer';

// ─── calculateCommitStreak ─────────────────────────────────────────────────────

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

describe('calculateCommitStreak', () => {
  it('returns 0 for empty dates array', () => {
    expect(calculateCommitStreak([])).toBe(0);
  });

  it('returns 1 when only today has a commit', () => {
    expect(calculateCommitStreak([dateStr(0)])).toBe(1);
  });

  it('returns 1 when only yesterday has a commit (allows 1-day gap)', () => {
    expect(calculateCommitStreak([dateStr(1)])).toBe(1);
  });

  it('returns 2 for consecutive today+yesterday', () => {
    const dates = [dateStr(0), dateStr(1)];
    expect(calculateCommitStreak(dates)).toBe(2);
  });

  it('returns 3 for three consecutive days ending today', () => {
    const dates = [dateStr(0), dateStr(1), dateStr(2)];
    expect(calculateCommitStreak(dates)).toBe(3);
  });

  it('handles duplicate dates correctly', () => {
    const dates = [dateStr(0), dateStr(0), dateStr(1), dateStr(1)];
    expect(calculateCommitStreak(dates)).toBe(2);
  });

  it('stops streak at a gap (2 days ago missing)', () => {
    // Today + yesterday → gap at 2 days ago → streak breaks there
    const dates = [dateStr(0), dateStr(1), dateStr(3), dateStr(4)];
    // streak should be 2 (today + yesterday, then gap at d-2)
    expect(calculateCommitStreak(dates)).toBe(2);
  });

  it('returns 0 when most recent commit was 2+ days ago (no recent activity)', () => {
    const dates = [dateStr(3), dateStr(4), dateStr(5)];
    // No commits today or yesterday → streak = 0
    expect(calculateCommitStreak(dates)).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import { computeOverallScore } from '../profileEvaluator';
import type { QuadrantScores } from '../types';

describe('computeOverallScore', () => {
  it('returns null when resume quadrants are null', () => {
    const q: QuadrantScores = {
      atsFormatting: null,
      impactAndStarBullets: null,
      githubProofOfWork: null,
      codeHygieneAndArch: null,
    };
    expect(computeOverallScore(q)).toBeNull();
  });

  it('returns equal 50/50 split of resume scores when GitHub unavailable', () => {
    const q: QuadrantScores = {
      atsFormatting: 80,
      impactAndStarBullets: 60,
      githubProofOfWork: null,
      codeHygieneAndArch: null,
    };
    // When GitHub is null → atsFormatting and impactAndStarBullets each get 50%
    // (80 * 50 + 60 * 50) / 100 = 7000/100 = 70
    expect(computeOverallScore(q)).toBe(70);
  });

  it('returns 25-25-25-25 weighted score when all quadrants available', () => {
    const q: QuadrantScores = {
      atsFormatting: 100,
      impactAndStarBullets: 80,
      githubProofOfWork: 60,
      codeHygieneAndArch: 40,
    };
    // (100*25 + 80*25 + 60*25 + 40*25) / 100 = 7000/100 = 70
    expect(computeOverallScore(q)).toBe(70);
  });

  it('redistributes weight when only GitHub hygiene available (not velocity)', () => {
    const q: QuadrantScores = {
      atsFormatting: 80,
      impactAndStarBullets: 60,
      githubProofOfWork: 75,
      codeHygieneAndArch: null,
    };
    // github available so each resume gets 25, github gets 25
    // (80*25 + 60*25 + 75*25) / 75 = 5375/75 = 71.67 → rounds to 72
    expect(computeOverallScore(q)).toBe(72);
  });

  it('returns 100 when all quadrants are 100', () => {
    const q: QuadrantScores = {
      atsFormatting: 100,
      impactAndStarBullets: 100,
      githubProofOfWork: 100,
      codeHygieneAndArch: 100,
    };
    expect(computeOverallScore(q)).toBe(100);
  });

  it('returns 0 when all quadrants are 0', () => {
    const q: QuadrantScores = {
      atsFormatting: 0,
      impactAndStarBullets: 0,
      githubProofOfWork: 0,
      codeHygieneAndArch: 0,
    };
    expect(computeOverallScore(q)).toBe(0);
  });
});

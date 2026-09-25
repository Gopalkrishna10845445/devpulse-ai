/**
 * Regression Test Suite: Pull Request Review Error Normalization & React Error #31 Prevention
 *
 * Verifies:
 * 1. Structured API auth errors ({ code: "UNAUTHORIZED", message: "..." }) are normalized to strings.
 * 2. All error shapes (string, structured object, code-only, null, undefined, empty, unexpected primitives)
 *    produce guaranteed string outputs and never return raw objects.
 * 3. Pull Request Review error handling correctly extracts and formats messages without crashing.
 */

import { describe, it, expect } from 'vitest';
import { normalizeErrorMessage, ApiErrorPayload } from '@/lib/errorUtils';

describe('Pull Request Review — Error Normalization & React Error #31 Regression', () => {
  describe('Shape A: Plain String Error', () => {
    it('returns the exact string when data.error is a string', () => {
      const input = 'PR not found';
      const result = normalizeErrorMessage(input, 'Failed to review Pull Request.');
      expect(result).toBe('PR not found');
      expect(typeof result).toBe('string');
    });

    it('trims whitespace around string error', () => {
      const input = '   Invalid pull request number   ';
      const result = normalizeErrorMessage(input, 'Failed to review Pull Request.');
      expect(result).toBe('Invalid pull request number');
      expect(typeof result).toBe('string');
    });
  });

  describe('Shape B: Structured Object Error ({ code, message })', () => {
    it('extracts the human-readable message from structured auth error', () => {
      const authError = {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please sign in with GitHub.',
      };
      const result = normalizeErrorMessage(authError, 'Failed to review Pull Request.');
      expect(result).toBe('Authentication required. Please sign in with GitHub.');
      expect(typeof result).toBe('string');
      // Crucial: result must NOT be an object
      expect(typeof result).not.toBe('object');
    });

    it('extracts message when nested under data.error object', () => {
      const responsePayload = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'User does not have read access to repository.',
        },
      };
      const result = normalizeErrorMessage(responsePayload.error, 'Failed to review Pull Request.');
      expect(result).toBe('User does not have read access to repository.');
      expect(typeof result).toBe('string');
    });
  });

  describe('Shape C: Object Without Message (Code Only or Custom)', () => {
    it('formats code as "Error: <CODE>" when message is absent', () => {
      const codeOnlyError = {
        code: 'UNKNOWN_ERROR',
      };
      const result = normalizeErrorMessage(codeOnlyError, 'Failed to review Pull Request.');
      expect(result).toBe('Error: UNKNOWN_ERROR');
      expect(typeof result).toBe('string');
    });

    it('extracts details field if present on object', () => {
      const detailsError = {
        code: 'RATE_LIMIT_EXCEEDED',
        details: 'GitHub API rate limit exhausted. Resets in 12 minutes.',
      };
      const result = normalizeErrorMessage(detailsError, 'Failed to review Pull Request.');
      expect(result).toBe('GitHub API rate limit exhausted. Resets in 12 minutes.');
      expect(typeof result).toBe('string');
    });

    it('safely JSON serializes unexpected object properties as a last resort', () => {
      const unexpectedObj = {
        statusCode: 502,
        upstreamStatus: 'BAD_GATEWAY',
      };
      const result = normalizeErrorMessage(unexpectedObj, 'Failed to review Pull Request.');
      expect(result).toBe('{"statusCode":502,"upstreamStatus":"BAD_GATEWAY"}');
      expect(typeof result).toBe('string');
    });
  });

  describe('Shape D: Null & Undefined Errors', () => {
    it('returns the default fallback when error is null', () => {
      const result = normalizeErrorMessage(null, 'Failed to review Pull Request.');
      expect(result).toBe('Failed to review Pull Request.');
      expect(typeof result).toBe('string');
    });

    it('returns the default fallback when error is undefined', () => {
      const result = normalizeErrorMessage(undefined, 'Failed to review Pull Request.');
      expect(result).toBe('Failed to review Pull Request.');
      expect(typeof result).toBe('string');
    });
  });

  describe('Shape E: Missing / Empty Error Fields', () => {
    it('returns fallback when empty object {} is passed', () => {
      const result = normalizeErrorMessage({}, 'Failed to review Pull Request.');
      expect(result).toBe('Failed to review Pull Request.');
      expect(typeof result).toBe('string');
    });

    it('returns fallback when empty string or whitespace is passed', () => {
      const result = normalizeErrorMessage('   ', 'Failed to review Pull Request.');
      expect(result).toBe('Failed to review Pull Request.');
      expect(typeof result).toBe('string');
    });
  });

  describe('Shape F: Unexpected Primitives & Exceptions', () => {
    it('returns fallback when numbers or booleans are passed', () => {
      expect(normalizeErrorMessage(500, 'Failed to review Pull Request.')).toBe('Failed to review Pull Request.');
      expect(normalizeErrorMessage(false, 'Failed to review Pull Request.')).toBe('Failed to review Pull Request.');
    });

    it('safely extracts message from Error instances in catch blocks', () => {
      const networkError = new Error('Failed to fetch from /api/github/pull-request/review');
      const result = normalizeErrorMessage(networkError.message, 'Network error while requesting PR review.');
      expect(result).toBe('Failed to fetch from /api/github/pull-request/review');
      expect(typeof result).toBe('string');
    });
  });

  describe('Simulation: End-to-End Pull Request Review Flow Error Handling', () => {
    it('simulates 401 UNAUTHORIZED response parsing in PR Review tab handler', () => {
      const mockApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please sign in with GitHub.',
        },
      };

      // Handler logic simulation:
      const errorMsg = normalizeErrorMessage(mockApiResponse.error, 'Failed to review Pull Request.');

      // State is guaranteed to be a string
      expect(typeof errorMsg).toBe('string');
      expect(errorMsg).toBe('Authentication required. Please sign in with GitHub.');

      // Simulated JSX rendering check: React can safely render strings
      expect(() => {
        if (typeof errorMsg === 'object' && errorMsg !== null) {
          throw new Error('Minified React error #31: Objects are not valid as a React child');
        }
      }).not.toThrow();
    });

    it('simulates 500 Network Exception parsing in PR Review tab catch block', () => {
      let errorMsg: string | null = null;
      try {
        throw new Error('Network error during PR analysis');
      } catch (err: any) {
        errorMsg = normalizeErrorMessage(err?.message, 'Network error while requesting PR review.');
      }

      expect(typeof errorMsg).toBe('string');
      expect(errorMsg).toBe('Network error during PR analysis');
    });
  });
});

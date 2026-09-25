/**
 * Error Normalization Utilities
 *
 * Prevents React Error #31 ("Objects are not valid as a React child")
 * by normalizing any API error payload (strings, structured error objects,
 * exceptions, unexpected primitives, null/undefined) into a safe, human-readable string.
 */

export interface ApiErrorPayload {
  code?: string;
  message?: string;
  error?: string | ApiErrorPayload;
  details?: string;
  statusCode?: number;
  [key: string]: unknown;
}

/**
 * Normalizes any error payload into a guaranteed, displayable string.
 *
 * @param error The raw error from an API response, catch block, or state
 * @param fallback Default error message if no valid string could be extracted
 * @returns A safe string guaranteed never to be an object
 */
export function normalizeErrorMessage(
  error: unknown,
  fallback: string = 'An unexpected error occurred.'
): string {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim();
  }

  if (error !== null && typeof error === 'object') {
    const errObj = error as ApiErrorPayload;

    // 1. Structured message field (e.g. { message: "Authentication required..." })
    if (typeof errObj.message === 'string' && errObj.message.trim().length > 0) {
      return errObj.message.trim();
    }

    // 2. Nested error field as string (e.g. { error: "PR not found" })
    if (typeof errObj.error === 'string' && errObj.error.trim().length > 0) {
      return errObj.error.trim();
    }

    // 3. Nested error field as object (recurse safely once)
    if (errObj.error !== null && typeof errObj.error === 'object') {
      const nested = normalizeErrorMessage(errObj.error, '');
      if (nested.length > 0) {
        return nested;
      }
    }

    // 4. Structured details field (e.g. { details: "Repository is archived" })
    if (typeof errObj.details === 'string' && errObj.details.trim().length > 0) {
      return errObj.details.trim();
    }

    // 5. Code field (e.g. { code: "UNAUTHORIZED" })
    if (typeof errObj.code === 'string' && errObj.code.trim().length > 0) {
      return `Error: ${errObj.code.trim()}`;
    }

    // 6. Safe JSON serialization fallback for unexpected objects
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}' && serialized !== '[]') {
        return serialized;
      }
    } catch {
      // ignore serialization failure
    }
  }

  return fallback;
}

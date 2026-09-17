/**
 * Phase 6 — Secret Redaction and Safety Utilities
 *
 * Ensures all detected secrets, tokens, credentials, and sensitive strings
 * are defensively masked before being included in findings, evidence, logs, or UI responses.
 */

/**
 * Masks a secret string keeping only minimal prefix and suffix for identification,
 * replacing the sensitive payload with bullets.
 *
 * Example:
 *  "sk-proj-1234567890abcdef" -> "sk-proj-••••••••cdef"
 *  "AKIA1234567890ABCDEF"    -> "AKIA••••••••CDEF"
 */
export function maskSecret(secret: string): string {
  if (!secret) return '';
  const trimmed = secret.trim();
  if (trimmed.length <= 6) {
    return '••••••••';
  }

  if (trimmed.startsWith('sk-proj-') || trimmed.startsWith('sk-live-')) {
    const prefix = trimmed.slice(0, 8);
    const suffix = trimmed.slice(-4);
    return `${prefix}••••••••${suffix}`;
  }

  if (trimmed.startsWith('ghp_') || trimmed.startsWith('gho_') || trimmed.startsWith('ghu_')) {
    const prefix = trimmed.slice(0, 4);
    const suffix = trimmed.slice(-4);
    return `${prefix}••••••••${suffix}`;
  }

  if (trimmed.startsWith('AKIA')) {
    const prefix = trimmed.slice(0, 4);
    const suffix = trimmed.slice(-4);
    return `${prefix}••••••••${suffix}`;
  }

  // Generic key masking: keep 3 prefix chars, 3 suffix chars if length >= 12
  if (trimmed.length >= 12) {
    const prefix = trimmed.slice(0, 3);
    const suffix = trimmed.slice(-3);
    return `${prefix}••••••••${suffix}`;
  }

  return '••••••••' + trimmed.slice(-2);
}

/**
 * Checks if a candidate secret string is an obvious placeholder or documentation dummy.
 */
export function isPlaceholderSecret(value: string): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  // Obvious placeholder patterns
  const exactPlaceholders = [
    'your_api_key_here',
    'your_api_key',
    'your_secret_key',
    'your_token_here',
    'your_token',
    'your-api-key',
    'your-secret',
    'todo_replace_me',
    'todo',
    'changeme',
    'change_me',
    'dummy',
    'dummy_token',
    'dummy_key',
    'example_secret_token',
    'placeholder',
    'replace_me',
    'replaceme',
    'replace_with_your_key',
    '<api_key>',
    '<token>',
    '<secret>',
    'xxxxxx',
    'xxxxxxxxxxxx',
  ];

  if (exactPlaceholders.includes(lower)) {
    return true;
  }

  // Common prefix / template indicators
  if (
    lower.startsWith('your_') ||
    lower.startsWith('your-') ||
    lower.startsWith('my_secret') ||
    lower.startsWith('insert_') ||
    lower.startsWith('fake_') ||
    lower.startsWith('mock_') ||
    lower.startsWith('test_key') ||
    lower.includes('process.env.') ||
    lower.includes('${')
  ) {
    return true;
  }

  // All repeated characters (e.g. 00000000 or aaaaaaaa)
  if (/^(.)\1{7,}$/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Sanitizes an evidence line or snippet by replacing any raw secret match
 * with its masked counterpart.
 */
export function sanitizeEvidenceSnippet(lineContent: string, rawSecret: string): string {
  if (!lineContent || !rawSecret) return lineContent || '';
  const masked = maskSecret(rawSecret);
  return lineContent.split(rawSecret).join(masked);
}

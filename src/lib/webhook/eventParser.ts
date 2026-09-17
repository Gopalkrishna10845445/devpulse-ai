/**
 * Phase 9 — GitHub Webhook Event Parser
 *
 * Validates, sanitizes, and extracts structured GitHub events from webhook payloads.
 * Protects against prompt injection and path traversal by treating all user text
 * (commit messages, PR descriptions, branch names) as untrusted data.
 */

import {
  AnalysisOperation,
  GitHubWebhookEvent,
  WebhookCommit,
  WebhookEventName,
} from './types';

export class WebhookParsingError extends Error {
  code: 'MALFORMED_JSON' | 'INVALID_EVENT' | 'INVALID_REPOSITORY' | 'UNSUPPORTED_PAYLOAD';

  constructor(code: 'MALFORMED_JSON' | 'INVALID_EVENT' | 'INVALID_REPOSITORY' | 'UNSUPPORTED_PAYLOAD', message: string) {
    super(message);
    this.name = 'WebhookParsingError';
    this.code = code;
  }
}

/**
 * Parses and sanitizes an incoming GitHub webhook request.
 */
export function parseGitHubWebhookEvent(
  rawBody: string,
  eventHeader: string | null | undefined,
  deliveryId: string | null | undefined
): GitHubWebhookEvent {
  if (!rawBody || !rawBody.trim()) {
    throw new WebhookParsingError('MALFORMED_JSON', 'Webhook request body is empty.');
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (err: any) {
    throw new WebhookParsingError('MALFORMED_JSON', `Failed to parse webhook JSON payload: ${err.message}`);
  }

  if (typeof payload !== 'object' || payload === null) {
    throw new WebhookParsingError('MALFORMED_JSON', 'Webhook payload is not a valid JSON object.');
  }

  const effectiveDeliveryId = (deliveryId || '').trim() || `del-${Date.now()}`;
  const rawEventName = (eventHeader || '').trim().toLowerCase();

  let eventName: WebhookEventName = 'unknown';
  if (rawEventName === 'push') eventName = 'push';
  else if (rawEventName === 'pull_request') eventName = 'pull_request';
  else if (rawEventName === 'repository') eventName = 'repository';
  else if (rawEventName === 'installation') eventName = 'installation';
  else if (rawEventName === 'workflow_run') eventName = 'workflow_run';
  else if (rawEventName === 'ping') eventName = 'ping';

  // Handle repository coordinates safely
  const rawRepo = payload.repository || {};
  let fullName = (rawRepo.full_name || '').trim();
  let owner = (rawRepo.owner?.login || rawRepo.owner?.name || '').trim();
  let name = (rawRepo.name || '').trim();

  if (!fullName && owner && name) {
    fullName = `${owner}/${name}`;
  }
  if (fullName && (!owner || !name)) {
    const parts = fullName.split('/');
    if (parts.length === 2) {
      owner = parts[0].trim();
      name = parts[1].trim();
    }
  }

  // Sanitize coordinates (prevent path traversal / injection)
  fullName = fullName.replace(/\.\./g, '').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9._\-\/]/g, '');
  owner = owner.replace(/\.\./g, '').replace(/[^a-zA-Z0-9._\-]/g, '');
  name = name.replace(/\.\./g, '').replace(/[^a-zA-Z0-9._\-]/g, '');

  if (eventName !== 'ping' && (!fullName || !owner || !name)) {
    throw new WebhookParsingError('INVALID_REPOSITORY', 'Webhook payload is missing valid repository identification.');
  }

  const repository = {
    id: typeof rawRepo.id === 'number' ? rawRepo.id : undefined,
    name: name || 'unknown',
    fullName: fullName || 'unknown/repository',
    owner: owner || 'unknown',
    defaultBranch: (rawRepo.default_branch || 'main').replace(/[^a-zA-Z0-9._\-\/]/g, ''),
    private: Boolean(rawRepo.private),
    htmlUrl: rawRepo.html_url,
  };

  const sender = {
    login: (payload.sender?.login || 'unknown').replace(/[^a-zA-Z0-9._\-]/g, ''),
    id: typeof payload.sender?.id === 'number' ? payload.sender.id : undefined,
    avatarUrl: payload.sender?.avatar_url,
  };

  const action = typeof payload.action === 'string' ? payload.action.trim() : undefined;

  // Extract Push details
  let ref: string | undefined;
  let beforeSha: string | undefined;
  let afterSha: string | undefined;
  let commits: WebhookCommit[] | undefined;

  if (eventName === 'push') {
    ref = typeof payload.ref === 'string' ? payload.ref.replace(/[^a-zA-Z0-9._\-\/]/g, '') : undefined;
    beforeSha = typeof payload.before === 'string' ? payload.before.replace(/[^a-fA-F0-9]/g, '') : undefined;
    afterSha = typeof payload.after === 'string' ? payload.after.replace(/[^a-fA-F0-9]/g, '') : undefined;

    if (Array.isArray(payload.commits)) {
      commits = payload.commits.slice(0, 50).map((c: any) => ({
        id: (c.id || '').replace(/[^a-fA-F0-9]/g, ''),
        message: typeof c.message === 'string' ? c.message.slice(0, 500) : '',
        timestamp: c.timestamp,
        author: c.author ? { name: c.author.name || '', email: c.author.email || '' } : undefined,
        added: Array.isArray(c.added) ? c.added : [],
        removed: Array.isArray(c.removed) ? c.removed : [],
        modified: Array.isArray(c.modified) ? c.modified : [],
      }));
    }
  }

  // Extract Pull Request details
  let headSha: string | undefined;
  let baseSha: string | undefined;
  let pullRequestNumber: number | undefined;
  let pullRequestTitle: string | undefined;
  let pullRequestState: 'open' | 'closed' | 'merged' | undefined;

  if (eventName === 'pull_request' && payload.pull_request) {
    const pr = payload.pull_request;
    pullRequestNumber = typeof pr.number === 'number' ? pr.number : typeof payload.number === 'number' ? payload.number : undefined;
    pullRequestTitle = typeof pr.title === 'string' ? pr.title.slice(0, 300) : undefined;
    headSha = typeof pr.head?.sha === 'string' ? pr.head.sha.replace(/[^a-fA-F0-9]/g, '') : undefined;
    baseSha = typeof pr.base?.sha === 'string' ? pr.base.sha.replace(/[^a-fA-F0-9]/g, '') : undefined;
    ref = typeof pr.head?.ref === 'string' ? pr.head.ref.replace(/[^a-zA-Z0-9._\-\/]/g, '') : undefined;

    if (pr.merged_at) {
      pullRequestState = 'merged';
    } else if (pr.state === 'closed') {
      pullRequestState = 'closed';
    } else {
      pullRequestState = 'open';
    }
  }

  return {
    deliveryId: effectiveDeliveryId,
    eventName,
    action,
    repository,
    sender,
    ref,
    beforeSha,
    afterSha,
    headSha,
    baseSha,
    pullRequestNumber,
    pullRequestTitle,
    pullRequestState,
    commits,
    timestamp: payload.head_commit?.timestamp || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    signatureVerified: true,
  };
}

/**
 * Determines which operations should be triggered for a given webhook event.
 */
export function determineRequiredOperations(event: GitHubWebhookEvent): AnalysisOperation[] {
  if (event.eventName === 'push') {
    // Normal branch push triggers full repository ingestion, intelligence, engineering, and security analysis
    return ['INGEST', 'INDEX', 'CODEBASE_ANALYSIS', 'ENGINEERING_ANALYSIS', 'SECURITY_ANALYSIS'];
  }

  if (event.eventName === 'pull_request') {
    const action = event.action || 'opened';
    if (['opened', 'synchronize', 'reopened'].includes(action)) {
      // PR created or updated triggers PR review and security analysis
      return ['PR_REVIEW', 'SECURITY_ANALYSIS'];
    }
  }

  if (event.eventName === 'repository') {
    return ['INGEST'];
  }

  return [];
}

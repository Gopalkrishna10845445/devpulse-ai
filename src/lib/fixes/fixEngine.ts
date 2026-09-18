/**
 * Phase 7 — Central Code Fix Orchestrator & In-Memory Store
 *
 * Coordinates fix request validation, context building, AI proposal generation,
 * patch validation, proposal lifecycle transitions (review/approve/reject),
 * and controlled in-memory patch application.
 */

import { CodebaseIntelligence } from '../intelligence/types';
import { RepositoryIndex } from '../repository/types';
import { applyPatchInMemory } from './diffUtils';
import { buildFixContext } from './fixContextBuilder';
import { CodeFixGenerator } from './fixGenerator';
import { validateProposalPatch } from './patchValidator';
import { ApplyFixRequest, ApplyFixResponse, CodeFixProposal, CodeFixRequest } from './types';

export class CodeFixEngine {
  private proposals: Map<string, CodeFixProposal> = new Map();
  private generator: CodeFixGenerator;

  constructor() {
    this.generator = new CodeFixGenerator();
  }

  /**
   * Generates a new reviewable CodeFixProposal
   */
  async generateFix(
    request: CodeFixRequest,
    options: {
      repoIndex: RepositoryIndex;
      intelligence?: CodebaseIntelligence | null;
    }
  ): Promise<CodeFixProposal> {
    const { repoIndex, intelligence } = options;

    // 1. Validate request parameters
    if (!request.repositoryId) {
      throw new Error('Valid repositoryId is required for fix generation.');
    }
    if (!request.findingId) {
      throw new Error('Valid findingId is required for fix generation.');
    }
    if (!request.filePath) {
      throw new Error('Valid filePath is required for fix generation.');
    }

    // 2. Build grounded context
    const context = buildFixContext(request, repoIndex, intelligence);

    // 3. Generate structured proposal
    const proposal = await this.generator.generateProposal(request, context);

    // 4. Validate patch against source code and repository rules
    const validation = validateProposalPatch(proposal, repoIndex);
    if (!validation.isValid) {
      proposal.status = 'failed';
      proposal.warnings = [...proposal.warnings, ...validation.errors];
    } else if (validation.warnings.length > 0) {
      proposal.warnings = [...proposal.warnings, ...validation.warnings];
    }

    // 5. Store in memory
    this.proposals.set(proposal.id, proposal);

    return proposal;
  }

  /**
   * Retrieves a stored proposal by ID
   */
  getProposal(proposalId: string): CodeFixProposal | undefined {
    return this.proposals.get(proposalId);
  }

  /**
   * Updates proposal review status (Approve or Reject)
   */
  async reviewFix(
    proposalId: string,
    action: 'approve' | 'reject',
    reason?: string
  ): Promise<CodeFixProposal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal with ID '${proposalId}' not found.`);
    }

    if (proposal.status === 'applied') {
      throw new Error(`Cannot review proposal '${proposalId}' as it has already been applied.`);
    }

    proposal.status = action === 'approve' ? 'approved' : 'rejected';
    if (action === 'reject' && reason) {
      proposal.rejectionReason = reason;
    }

    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  /**
   * Applies an approved proposal in memory to produce a controlled patched working copy
   */
  async applyFix(
    request: ApplyFixRequest,
    repoIndex: RepositoryIndex
  ): Promise<ApplyFixResponse> {
    const { proposalId, repositoryId, commitSha, expectedDiffHash, confirmedByUser } = request;

    if (!confirmedByUser) {
      throw new Error('User confirmation is required to apply the code fix proposal.');
    }

    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal with ID '${proposalId}' not found.`);
    }

    // 1. Repository isolation check
    const repoFullName = repoIndex.repository?.fullName || `${repoIndex.repository?.owner}/${repoIndex.repository?.name}`;
    if (proposal.repositoryId !== repositoryId || proposal.repositoryId !== repoFullName) {
      throw new Error(`Repository isolation violation: Proposal repository '${proposal.repositoryId}' does not match target '${repositoryId}'.`);
    }

    // 2. Stale patch / diff hash check
    if (proposal.diffHash !== expectedDiffHash) {
      proposal.status = 'stale';
      throw new Error('Diff hash mismatch: The proposal has been modified or invalidated.');
    }

    // 3. Stale commit check
    if (proposal.commitSha !== commitSha) {
      proposal.status = 'stale';
      throw new Error(`Repository state changed. The proposal was generated for commit '${proposal.commitSha}', but requested commit is '${commitSha}'. Regenerate the fix.`);
    }
    const indexCommitSha = (repoIndex as any).commitSha;
    if (indexCommitSha && indexCommitSha !== proposal.commitSha) {
      proposal.status = 'stale';
      throw new Error(`Repository state changed. The proposal was generated for commit '${proposal.commitSha}', but current repository index is at commit '${indexCommitSha}'. Regenerate the fix.`);
    }

    // 4. Status check
    if (proposal.status === 'rejected' || proposal.status === 'failed') {
      throw new Error(`Cannot apply proposal with status '${proposal.status}'.`);
    }

    // 5. Apply in-memory patch to target file
    const fileNode = (repoIndex.files || []).find(f => f.path === proposal.targetFile);
    if (!fileNode || typeof fileNode.content !== 'string') {
      throw new Error(`Target file '${proposal.targetFile}' was not found in repository index.`);
    }

    const patchResult = applyPatchInMemory(fileNode.content, proposal.beforeCode, proposal.afterCode);
    if (!patchResult.success) {
      proposal.status = 'stale';
      throw new Error(`Failed to apply patch in memory: ${patchResult.error}`);
    }

    // Update proposal status
    proposal.status = 'applied';
    proposal.appliedAt = new Date().toISOString();
    this.proposals.set(proposal.id, proposal);

    return {
      success: true,
      proposal,
      modifiedFiles: [
        {
          path: proposal.targetFile,
          patchedContent: patchResult.patchedContent,
        },
      ],
      message: `Successfully applied fix proposal '${proposal.title}' to ${proposal.targetFile} in memory.`,
    };
  }

  /**
   * Clears in-memory proposals (used for tests)
   */
  clear() {
    this.proposals.clear();
  }
}

export const globalFixEngine = new CodeFixEngine();

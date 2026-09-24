/**
 * Phase 10 — DevPilot Agent Planner & Intent Classifier
 *
 * Classifies developer intent into one of 7 canonical modes and constructs
 * bounded, deterministic step-by-step execution plans using typed tools.
 */

import { AGENT_LIMITS } from './policy';
import { AgentMode, AgentRequest } from './types';

export interface PlannedStep {
  stepIndex: number;
  toolName: string;
  description: string;
  inputGenerator: (request: AgentRequest, priorData?: any) => any;
}

export interface AgentExecutionPlan {
  mode: AgentMode;
  intentRationale: string;
  steps: PlannedStep[];
}

export class AgentPlanner {
  /**
   * Classifies user intent deterministically based on message keywords and context.
   */
  public static classifyIntent(request: AgentRequest): { mode: AgentMode; rationale: string } {
    if (request.requestedMode) {
      return {
        mode: request.requestedMode,
        rationale: `Explicitly requested mode: ${request.requestedMode}`,
      };
    }

    const msg = (request.userMessage || '').toLowerCase();
    const context = request.context;

    // 1. Explicit PR review context or keywords
    if (context?.activePRNumber || /review pr|pr\s*#|pull request|review pull/i.test(msg)) {
      return {
        mode: 'REVIEW',
        rationale: 'User requested evaluation or review of a GitHub Pull Request.',
      };
    }

    // 2. Fix / Remediation keywords or finding context
    if (context?.activeFindingId || /\bfix\b|\bremediate\b|\bpatch\b|\bresolve issue\b|\bgenerate fix\b/i.test(msg)) {
      return {
        mode: 'FIX',
        rationale: 'User requested generating a code remediation fix proposal.',
      };
    }

    // 3. Security keywords
    if (
      /\bsecurity\b|\bvulnerab\w*|\bsecrets?\b|\bcves?\b|\bxss\b|\bsql injection\b|\bauth bypass\b|\bsensitive file\b/i.test(
        msg
      )
    ) {
      return {
        mode: 'SECURITY',
        rationale: 'User requested security intelligence or vulnerability audit.',
      };
    }

    // 4. Engineering health keywords
    if (
      /\bengineering\b|\bmaintainab|\bcoupling\b|\bhotspot\b|\bcomplexity\b|\btest coverage\b|\bcode smell\b|\btechnical debt\b/i.test(
        msg
      )
    ) {
      return {
        mode: 'ENGINEERING',
        rationale: 'User requested engineering intelligence, health metrics, or hotspot inspection.',
      };
    }

    // 5. Explain / Architecture keywords
    if (/\bexplain\b|\barchitecture\b|\bhow does .* work\b|\bwalkthrough\b|\bwhere is\b|\bwhat handles\b|\bhow is .* handled\b|\bdesign pattern\b/i.test(msg)) {
      return {
        mode: 'EXPLAIN',
        rationale: 'User requested architectural explanation or conceptual codebase walkthrough.',
      };
    }

    // 6. Summarize keywords
    if (/\bsummarize\b|\boverview\b|\bhealth report\b|\bstatus\b|\bwhat is this repo\b/i.test(msg)) {
      return {
        mode: 'SUMMARIZE',
        rationale: 'User requested a comprehensive repository status summary.',
      };
    }

    // Default to INVESTIGATE for general queries
    return {
      mode: 'INVESTIGATE',
      rationale: 'User requested general code investigation or debugging query.',
    };
  }

  /**
   * Constructs a bounded execution plan tailored to the classified mode.
   */
  public static createPlan(request: AgentRequest): AgentExecutionPlan {
    const { mode, rationale } = this.classifyIntent(request);
    const steps: PlannedStep[] = [];

    switch (mode) {
      case 'EXPLAIN':
        steps.push(
          {
            stepIndex: 1,
            toolName: 'repository_info',
            description: 'Inspect repository structure and entrypoints',
            inputGenerator: (req) => ({ repositoryId: req.repositoryId }),
          },
          {
            stepIndex: 2,
            toolName: 'architecture_analysis',
            description: 'Analyze architectural layers, boundaries, and coupling',
            inputGenerator: (req) => ({ repositoryId: req.repositoryId }),
          },
          {
            stepIndex: 3,
            toolName: 'rag_query',
            description: 'Retrieve semantic code chunks explaining the query',
            inputGenerator: (req) => ({
              repositoryId: req.repositoryId,
              question: req.userMessage,
            }),
          }
        );
        break;

      case 'SECURITY':
        steps.push(
          {
            stepIndex: 1,
            toolName: 'repository_info',
            description: 'Inspect repository metadata',
            inputGenerator: (req) => ({ repositoryId: req.repositoryId }),
          },
          {
            stepIndex: 2,
            toolName: 'security_analysis',
            description: 'Execute deterministic security scans for secrets, patterns, and CVEs',
            inputGenerator: (req) => ({ repositoryId: req.repositoryId }),
          }
        );
        break;

      case 'ENGINEERING':
        steps.push(
          {
            stepIndex: 1,
            toolName: 'repository_info',
            description: 'Inspect repository files and statistics',
            inputGenerator: (req) => ({ repositoryId: req.repositoryId }),
          },
          {
            stepIndex: 2,
            toolName: 'engineering_analysis',
            description: 'Compute maintainability, hotspots, coupling, and test metrics',
            inputGenerator: (req) => ({ repositoryId: req.repositoryId }),
          },
          {
            stepIndex: 3,
            toolName: 'architecture_analysis',
            description: 'Check circular dependencies and boundary violations',
            inputGenerator: (req) => ({ repositoryId: req.repositoryId }),
          }
        );
        break;

      case 'REVIEW':
        const prNumberMatch = request.userMessage.match(/#(\d+)/);
        const prNumber =
          request.context?.activePRNumber || (prNumberMatch ? parseInt(prNumberMatch[1], 10) : 1);

        steps.push(
          {
            stepIndex: 1,
            toolName: 'pr_review',
            description: `Review Pull Request #${prNumber} diff and impact`,
            inputGenerator: (req) => ({
              repositoryId: req.repositoryId,
              pullRequestNumber: prNumber,
            }),
          },
          {
            stepIndex: 2,
            toolName: 'security_analysis',
            description: 'Correlate PR with repository security baseline',
            inputGenerator: (req) => ({ repositoryId: req.repositoryId }),
          }
        );
        break;

      case 'FIX':
        const targetFile = request.context?.currentFile || 'src/auth/middleware.ts';
        const findingId = request.context?.activeFindingId || 'finding-auto-1';

        steps.push(
          {
            stepIndex: 1,
            toolName: 'security_analysis',
            description: 'Retrieve baseline security findings to identify root cause',
            inputGenerator: (req) => ({ repositoryId: req.repositoryId }),
          },
          {
            stepIndex: 2,
            toolName: 'generate_fix',
            description: 'Generate grounded CodeFixProposal with unified diff',
            inputGenerator: (req, prior) => {
              const secFindings = prior?.security_analysis?.findings || [];
              const matchedFinding = secFindings.find((f: any) => f.id === findingId) || secFindings[0];

              return {
                repositoryId: req.repositoryId,
                findingId: matchedFinding?.id || findingId,
                category: (matchedFinding?.category || 'security') as 'security' | 'engineering',
                filePath: matchedFinding?.filePath || targetFile,
                symbol: matchedFinding?.symbol || req.context?.symbol,
                lineRange: matchedFinding?.lineRange || '2',
                findingRule: matchedFinding?.ruleId || 'RULE_SECRET_GITHUB_TOKEN',
                findingTitle: matchedFinding?.title || 'Remediate code issue',
                requestedAction: req.userMessage,
              };
            },
          }
        );
        break;

      case 'SUMMARIZE':
        steps.push(
          {
            stepIndex: 1,
            toolName: 'repository_info',
            description: 'Inspect repository structure and languages',
            inputGenerator: (req) => ({ repositoryId: req.repositoryId }),
          },
          {
            stepIndex: 2,
            toolName: 'engineering_analysis',
            description: 'Analyze engineering health and hotspots',
            inputGenerator: (req) => ({ repositoryId: req.repositoryId }),
          },
          {
            stepIndex: 3,
            toolName: 'security_analysis',
            description: 'Audit security posture and secret hygiene',
            inputGenerator: (req) => ({ repositoryId: req.repositoryId }),
          }
        );
        break;

      case 'INVESTIGATE':
      default:
        steps.push(
          {
            stepIndex: 1,
            toolName: 'repository_info',
            description: 'Inspect repository metadata and structure',
            inputGenerator: (req) => ({ repositoryId: req.repositoryId }),
          },
          {
            stepIndex: 2,
            toolName: 'symbol_lookup',
            description: 'Look up relevant AST symbols',
            inputGenerator: (req) => {
              const words = req.userMessage.split(/\s+/).filter((w) => w.length > 3);
              return {
                repositoryId: req.repositoryId,
                query: words[0] || 'app',
              };
            },
          },
          {
            stepIndex: 3,
            toolName: 'rag_query',
            description: 'Perform grounded hybrid retrieval for question context',
            inputGenerator: (req) => ({
              repositoryId: req.repositoryId,
              question: req.userMessage,
            }),
          }
        );
        break;
    }

    // Enforce max step limit
    const boundedSteps = steps.slice(0, AGENT_LIMITS.MAX_STEPS);

    return {
      mode,
      intentRationale: rationale,
      steps: boundedSteps,
    };
  }
}

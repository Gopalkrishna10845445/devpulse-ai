/**
 * Profile Evaluator
 *
 * Orchestrates the full engineering profile analysis:
 *   1. Deterministic resume heuristics (text parsing)
 *   2. Real GitHub telemetry (live API calls)
 *   3. Skill congruence matrix (resume claims vs GitHub evidence)
 *   4. Repository investigation questions (gap analysis)
 *   5. Quadrant scoring (transparent, component-based)
 *   6. Overall engineering profile score (computed from real signals)
 *
 * This file contains NO LLM calls. AI-powered features (bullet rewriting,
 * deep code review) are planned for Phase 4+.
 */

import {
  DeterministicMetrics,
  GitHubTelemetry,
  SkillCongruenceItem,
  BulletRewrite,
  InvestigationQuestion,
  QuadrantScores,
  FullEvaluationReport,
  EngineeringAssessment,
} from './types';
import { analyzeDeterministicRules } from './deterministicEngine';
import { fetchGitHubTelemetry, unavailableGitHubTelemetry } from './githubAnalyzer';

// ─── Main Evaluation Entry Point ──────────────────────────────────────────────

export async function analyzeProfile(
  resumeText: string,
  githubUsername?: string,
  targetRoleTitle: string = 'Software Engineer'
): Promise<FullEvaluationReport> {

  // ── 1. Deterministic resume heuristics ─────────────────────────────────────
  const deterministic = analyzeDeterministicRules(resumeText);

  // ── 2. Resolve GitHub username ──────────────────────────────────────────────
  let detectedUsername = githubUsername;
  if (!detectedUsername && deterministic.detectedContactInfo.github) {
    const match = deterministic.detectedContactInfo.github.match(/github\.com\/([\w-]+)/i);
    if (match) detectedUsername = match[1];
  }

  const github = detectedUsername
    ? await fetchGitHubTelemetry(detectedUsername)
    : unavailableGitHubTelemetry('', 'No GitHub username provided');

  // ── 3. Technology congruence matrix ────────────────────────────────────────
  const skillMatrix = buildSkillCongruenceMatrix(resumeText, github);

  // ── 4. Bullet rewrites — requires real model (Phase 4+) ────────────────────
  // Do not fabricate AI improvements. Return empty until a real model is connected.
  const bulletRewrites: BulletRewrite[] = [];

  // ── 5. Investigation questions from observed gaps ───────────────────────────
  const investigationQuestions = generateInvestigationQuestions(skillMatrix, deterministic, github);

  // ── 6. Quadrant scores ─────────────────────────────────────────────────────
  const githubLive = !github.isFallbackData;

  // atsFormatting: resume compliance (always available from text)
  const atsFormatting = deterministic.atsComplianceScore;

  // impactAndStarBullets: quantification + power verb score (always available from text)
  const impactAndStarBullets = Math.round(
    deterministic.quantificationScore * 0.6 + deterministic.actionVerbScore * 0.4
  );

  // githubProofOfWork: hygiene score from real GitHub signals (null if unavailable)
  const githubProofOfWork = githubLive ? (github.overallHygieneScore ?? null) : null;

  // codeHygieneAndArch: commit velocity normalized to 0–100 (null if unavailable)
  // Formula: min(100, velocity * 10)  → 10 commits/week = 100 pts
  const codeHygieneAndArch = (githubLive && github.recentCommitVelocity !== null)
    ? Math.min(100, Math.round(github.recentCommitVelocity * 10))
    : null;

  const quadrants: QuadrantScores = {
    atsFormatting,
    impactAndStarBullets,
    githubProofOfWork,
    codeHygieneAndArch,
  };

  // ── 7. Overall engineering profile score ────────────────────────────────────
  // Weighted average of available quadrants. Weights are redistributed if GitHub
  // quadrants are unavailable — resume quadrants each get 50% in that case.
  const overallScore = computeOverallScore(quadrants);

  // ── 8. Key takeaways ────────────────────────────────────────────────────────
  const { strengths, gaps } = buildTakeaways(deterministic, github, skillMatrix, quadrants);

  const engineeringAssessment = determineAssessment(githubLive, quadrants, overallScore);

  // ── 9. Profile name extraction from resume text ────────────────────────────
  const firstLine = resumeText.split('\n')[0]?.trim() || 'Unknown Profile';
  const profileName = firstLine.length < 40 && !firstLine.includes('@')
    ? firstLine
    : 'Engineering Profile';

  return {
    profileName,
    targetRole: targetRoleTitle,
    overallScore,
    quadrants,
    deterministic,
    github,
    skillMatrix,
    bulletRewrites,
    investigationQuestions,
    keyTakeaways: {
      strengths,
      gaps,
      engineeringAssessment,
    },
    generatedAt: new Date().toISOString(),
  };
}

// ─── Overall Score Calculation ────────────────────────────────────────────────

/**
 * Computes a weighted overall score from available quadrant scores.
 *
 * Base weights: 25% each quadrant (100% total).
 * When GitHub quadrants are null, their weight is redistributed to resume quadrants.
 *
 * Returns null only if ALL quadrants are null (impossible in practice since
 * resume quadrants are always computed).
 */
export function computeOverallScore(quadrants: QuadrantScores): number | null {
  const { atsFormatting, impactAndStarBullets, githubProofOfWork, codeHygieneAndArch } = quadrants;

  const resumeAvailable = atsFormatting !== null && impactAndStarBullets !== null;
  const githubAvailable = githubProofOfWork !== null;
  const velocityAvailable = codeHygieneAndArch !== null;

  if (!resumeAvailable) return null;

  let totalWeight = 0;
  let weightedSum = 0;

  if (atsFormatting !== null) {
    const weight = githubAvailable || velocityAvailable ? 25 : 50;
    weightedSum += atsFormatting * weight;
    totalWeight += weight;
  }

  if (impactAndStarBullets !== null) {
    const weight = githubAvailable || velocityAvailable ? 25 : 50;
    weightedSum += impactAndStarBullets * weight;
    totalWeight += weight;
  }

  if (githubProofOfWork !== null) {
    weightedSum += githubProofOfWork * 25;
    totalWeight += 25;
  }

  if (codeHygieneAndArch !== null) {
    weightedSum += codeHygieneAndArch * 25;
    totalWeight += 25;
  }

  if (totalWeight === 0) return null;
  return Math.round(weightedSum / totalWeight);
}

// ─── Engineering Assessment ────────────────────────────────────────────────────

function determineAssessment(
  githubLive: boolean,
  quadrants: QuadrantScores,
  overallScore: number | null
): EngineeringAssessment {
  if (!githubLive) return 'Insufficient Data';
  if (overallScore === null) return 'Insufficient Data';
  if (overallScore >= 75) return 'Strong';
  if (overallScore >= 50) return 'Conditional';
  return 'Insufficient Data';
}

// ─── Skill Congruence Matrix ───────────────────────────────────────────────────

const KNOWN_TECHNOLOGIES: { name: string; category: SkillCongruenceItem['category'] }[] = [
  { name: 'TypeScript', category: 'Frontend' },
  { name: 'React',      category: 'Frontend' },
  { name: 'Next.js',    category: 'Frontend' },
  { name: 'Tailwind CSS', category: 'Frontend' },
  { name: 'Vue',        category: 'Frontend' },
  { name: 'Angular',    category: 'Frontend' },
  { name: 'Svelte',     category: 'Frontend' },
  { name: 'Jest',       category: 'Frontend' },
  { name: 'Go',         category: 'Backend'  },
  { name: 'Python',     category: 'Backend'  },
  { name: 'FastAPI',    category: 'Backend'  },
  { name: 'Node.js',    category: 'Backend'  },
  { name: 'Rust',       category: 'Backend'  },
  { name: 'Java',       category: 'Backend'  },
  { name: 'Kafka',      category: 'Backend'  },
  { name: 'gRPC',       category: 'Backend'  },
  { name: 'GraphQL',    category: 'Backend'  },
  { name: 'PostgreSQL', category: 'Database' },
  { name: 'Redis',      category: 'Database' },
  { name: 'MongoDB',    category: 'Database' },
  { name: 'MySQL',      category: 'Database' },
  { name: 'Docker',     category: 'DevOps'   },
  { name: 'Kubernetes', category: 'DevOps'   },
  { name: 'AWS',        category: 'DevOps'   },
  { name: 'Terraform',  category: 'DevOps'   },
];

function buildSkillCongruenceMatrix(
  resumeText: string,
  github: GitHubTelemetry
): SkillCongruenceItem[] {
  const githubLanguagesLower = github.languages.map(l => l.name.toLowerCase());
  const repoContext = github.topRepositories
    .map(r => `${r.name} ${r.description}`.toLowerCase())
    .join(' ');

  const items: SkillCongruenceItem[] = [];

  for (const tech of KNOWN_TECHNOLOGIES) {
    const techLower = tech.name.toLowerCase();
    const techRegex = new RegExp(`\\b${techLower.replace('.', '\\.').replace('+', '\\+')}\\b`, 'i');
    const mentionedInResume = techRegex.test(resumeText);

    if (!mentionedInResume) continue;

    const isPrimaryLanguage = githubLanguagesLower.some(l => l.includes(techLower));
    const inRepoContext = repoContext.includes(techLower);

    if (isPrimaryLanguage || inRepoContext) {
      const langMatch = github.languages.find(l => l.name.toLowerCase().includes(techLower));
      items.push({
        skill: tech.name,
        category: tech.category,
        claimedLevel: 'Expert',
        status: 'VERIFIED',
        evidenceType: isPrimaryLanguage ? 'Repository Language' : 'README Mention',
        evidenceDetails: isPrimaryLanguage
          ? `Primary language on inspected GitHub repositories${langMatch ? ` (${langMatch.percentage}% of repo bytes)` : ''}`
          : `Found in repository names/descriptions on GitHub profile @${github.username}`,
        githubRepoName: github.topRepositories[0]?.name,
      });
    } else {
      items.push({
        skill: tech.name,
        category: tech.category,
        claimedLevel: 'Proficient',
        status: 'RESUME_ONLY',
        evidenceType: undefined,
        evidenceDetails: github.isFallbackData
          ? 'GitHub profile unavailable — cannot verify against code evidence.'
          : `No matching repositories or languages found on @${github.username}'s public GitHub profile.`,
      });
    }
  }

  return items;
}

// ─── Investigation Questions ───────────────────────────────────────────────────

function generateInvestigationQuestions(
  skillMatrix: SkillCongruenceItem[],
  deterministic: DeterministicMetrics,
  github: GitHubTelemetry
): InvestigationQuestion[] {
  const questions: InvestigationQuestion[] = [];

  // Question from unverified skill claims
  const unverifiedSkill = skillMatrix.find(s => s.status === 'RESUME_ONLY');
  if (unverifiedSkill) {
    questions.push({
      question: `You list ${unverifiedSkill.skill} on your profile, but your public GitHub repositories don't show active ${unverifiedSkill.skill} projects. Walk me through a production system where you applied ${unverifiedSkill.skill} — what constraints shaped your implementation?`,
      category: 'Code Verification',
      targetSkillOrClaim: unverifiedSkill.skill,
      suggestedAnswerKey: `Look for specifics: library choices, trade-offs, configuration challenges, and real-world constraints that distinguish hands-on experience from theoretical familiarity.`,
    });
  }

  // Question from metrics in the resume
  if (deterministic.metricCount > 0) {
    questions.push({
      question: `Your profile references performance improvements and quantifiable outcomes. What diagnostic tools (e.g., profilers, APM dashboards, p99 metrics) did you use to establish the baseline and measure the improvement?`,
      category: 'Metrics & Impact',
      targetSkillOrClaim: 'Quantified Performance Claims',
      suggestedAnswerKey: 'Strong answers identify specific tooling (Datadog, Prometheus, Chrome DevTools), explain the measurement methodology, and describe the baseline → target → result arc.',
    });
  }

  // Question from a real GitHub repo (if data available)
  const topRepo = github.topRepositories.find(r => !r.isFork && !r.isArchived);
  if (topRepo && !github.isFallbackData) {
    const ciStatus = topRepo.hasCiWorkflow === true ? 'CI/CD configured' : 'no CI detected';
    const testStatus = topRepo.hasTests === true ? 'test files detected' : 'no test files detected';
    questions.push({
      question: `Looking at your repository "${topRepo.name}" (${topRepo.language} — ${ciStatus}, ${testStatus}): how did you approach testing strategy and automation? What trade-offs did you make given the project's constraints?`,
      category: 'System Architecture',
      targetSkillOrClaim: `${topRepo.name} (${topRepo.language})`,
      suggestedAnswerKey: `Should cover test granularity (unit vs integration vs e2e), CI pipeline design, coverage decisions, and why specific automation tools were selected.`,
    });
  }

  // Question on production incident handling
  questions.push({
    question: `Describe a production incident or unexpected behavior you diagnosed under pressure. How did you identify the root cause, and what did you put in place to prevent recurrence?`,
    category: 'Ownership & Process',
    targetSkillOrClaim: 'Production Reliability & Incident Response',
    suggestedAnswerKey: 'Strong candidates discuss observability tooling, rollback strategies, blameless post-mortems, and concrete regression prevention (tests, alerts, runbooks).',
  });

  return questions;
}

// ─── Takeaways Builder ────────────────────────────────────────────────────────

function buildTakeaways(
  deterministic: DeterministicMetrics,
  github: GitHubTelemetry,
  skillMatrix: SkillCongruenceItem[],
  quadrants: QuadrantScores
): { strengths: string[]; gaps: string[] } {
  const strengths: string[] = [];
  const gaps: string[] = [];

  // Resume heuristics
  if (quadrants.atsFormatting !== null && quadrants.atsFormatting >= 80) {
    strengths.push('Strong resume structure with complete contact information and standard section headers.');
  }
  if (quadrants.impactAndStarBullets !== null && quadrants.impactAndStarBullets >= 80) {
    strengths.push('High density of quantifiable impact metrics and strong engineering power verbs.');
  } else if (deterministic.weakVerbCount > 2) {
    gaps.push(`${deterministic.weakVerbCount} passive verbs detected ("worked on", "helped with") — replace with active engineering verbs.`);
  }

  // GitHub signals
  if (!github.isFallbackData) {
    strengths.push(`GitHub profile active: ${github.publicReposCount} public repos, ${github.totalStars} total stars, ${github.deepInspectedRepos} repos deeply analyzed.`);
    if (github.commitCount30Days !== null && github.commitCount30Days > 0) {
      strengths.push(`${github.commitCount30Days} commits in the last 30 days — active contributor.`);
    }
    if (github.overallHygieneScore !== null && github.overallHygieneScore >= 70) {
      strengths.push(`Repository hygiene score: ${github.overallHygieneScore}/100 — good engineering practices observed.`);
    }
    if (github.prMergeRatio !== null) {
      if (github.prMergeRatio >= 80) {
        strengths.push(`High PR merge ratio (${github.prMergeRatio}%) — suggests disciplined code review workflow.`);
      } else if (github.prMergeRatio < 50) {
        gaps.push(`Low PR merge ratio (${github.prMergeRatio}%) — many closed PRs were not merged. Review PR workflow.`);
      }
    }
    if (github.rateLimited) {
      gaps.push('Some GitHub signals were unavailable due to API rate limiting. Set GITHUB_TOKEN for complete analysis.');
    }
  } else {
    gaps.push(github.unavailableReason || 'GitHub telemetry unavailable — live profile data could not be retrieved.');
  }

  // Skill gaps
  const unverifiedCount = skillMatrix.filter(s => s.status === 'RESUME_ONLY').length;
  if (unverifiedCount > 0) {
    const examples = skillMatrix
      .filter(s => s.status === 'RESUME_ONLY')
      .slice(0, 2)
      .map(s => s.skill)
      .join(', ');
    gaps.push(`${unverifiedCount} claimed skills (${examples}) have no public code evidence on GitHub.`);
  }

  // Metric density
  if (deterministic.metricCount < 3) {
    gaps.push('Low quantification density — add measurable outcomes (%, $, ms, user scale) to experience bullets.');
  }

  return { strengths, gaps };
}

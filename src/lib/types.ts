// ─── Skill Congruence ────────────────────────────────────────────────────────

export type SkillStatus = 'VERIFIED' | 'PARTIAL' | 'RESUME_ONLY';

export interface SkillCongruenceItem {
  skill: string;
  category: 'Frontend' | 'Backend' | 'Database' | 'DevOps' | 'AI/ML' | 'General';
  claimedLevel: 'Expert' | 'Intermediate' | 'Proficient' | 'Mentioned';
  status: SkillStatus;
  evidenceType?: 'Repository Language' | 'Package Dependency' | 'Commit Activity' | 'README Mention';
  evidenceDetails: string;
  githubRepoName?: string;
}

// ─── Resume Text Analysis (Deterministic) ────────────────────────────────────

export interface MetricOccurrence {
  raw: string;
  type: 'Percentage' | 'Currency' | 'Latency' | 'UserScale' | 'GeneralNumber';
  contextSnippet: string;
}

export interface PowerVerbAnalysis {
  word: string;
  category: 'Leadership' | 'Engineering' | 'Optimization' | 'WeakPassive';
  contextSnippet: string;
}

export interface DeterministicMetrics {
  atsComplianceScore: number; // 0-100
  hasEmail: boolean;
  hasPhone: boolean;
  hasLinkedIn: boolean;
  hasGitHub: boolean;
  hasStandardSections: boolean;
  detectedContactInfo: {
    email?: string;
    phone?: string;
    linkedIn?: string;
    github?: string;
  };
  quantificationScore: number; // 0-100
  metricCount: number;
  extractedMetrics: MetricOccurrence[];
  actionVerbScore: number; // 0-100
  strongVerbCount: number;
  weakVerbCount: number;
  powerVerbs: PowerVerbAnalysis[];
  sectionHealthScore: number; // 0-100
  totalWordCount: number;
  bulletCount: number;
  averageBulletLength: number;
  warnings: string[];
}

// ─── GitHub Repository Metadata ───────────────────────────────────────────────

export interface RepositoryMetadata {
  name: string;
  owner: string;
  description: string;
  url: string;
  defaultBranch: string;
  language: string;
  stars: number;
  forks: number;
  openIssues: number;
  size: number; // repository size in KB (from GitHub API)
  isArchived: boolean;
  isFork: boolean;
  createdAt: string;
  updatedAt: string;
  hasReadme: boolean | null;        // null = API call failed (not determinable)
  hasCiWorkflow: boolean | null;    // null = API call failed
  hasTests: boolean | null;         // null = API call failed
  hasLicense: boolean;
  commitCount30Days: number | null; // null = could not be fetched
  prMergeRatio: number | null;      // merged/closed*100, null if no closed PRs or API error
  codeQualityScore: number | null;  // null until Phase 3+ deep analysis
  dependencyManifests: string[];    // detected manifest filenames e.g. ['package.json']
}

// ─── GitHub Engineering Hygiene Score ─────────────────────────────────────────
/**
 * Transparent, deterministic breakdown of the overallHygieneScore.
 *
 * Scoring model (max 100 points):
 *   README present     → 20 pts
 *   CI workflow        → 20 pts
 *   Tests detected     → 20 pts
 *   Recent activity    → 0–20 pts (based on commitCount30Days)
 *   License present    → 10 pts
 *   Dependency manifest→ 10 pts
 *
 * Unavailable signals (null) are excluded from both numerator and denominator.
 * Missing data does NOT automatically penalize. Score = earned / maxPossible * 100.
 */
export interface HygieneScoreBreakdown {
  readmePoints: number;         // 0 or 20
  ciPoints: number;             // 0 or 20
  testsPoints: number;          // 0 or 20
  activityPoints: number;       // 0-20
  licensePoints: number;        // 0 or 10
  dependencyPoints: number;     // 0 or 10
  maxPossiblePoints: number;    // sum of signals that could be determined
  earnedPoints: number;         // actual points scored
  total: number;                // Math.round(earned / maxPossible * 100), or null
  unavailableSignals: string[]; // list of signals that could not be checked
}

// ─── GitHub Profile Telemetry ──────────────────────────────────────────────────

export interface GitHubTelemetry {
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
  publicReposCount: number;
  totalStars: number;
  totalForks: number;
  accountAgeYears: number;
  // Language data from GitHub's language API (byte-weighted percentages)
  languages: { name: string; percentage: number; color: string }[];
  // Raw byte counts for the most precise representation
  languageBytes: { name: string; bytes: number; color: string }[];
  topRepositories: RepositoryMetadata[];
  // Commit metrics (across deeply-inspected repos)
  commitCount30Days: number | null;      // sum of commits in last 30 days (top repos)
  recentCommitVelocity: number | null;   // commits per week = commitCount30Days / 4.3
  activeCommitStreakDays: number | null;  // consecutive days with ≥1 commit (most recent)
  prMergeRatio: number | null;           // aggregated merged/closed*100 across top repos
  // Repository signals
  dependencyManifests: string[];         // unique manifests detected across top repos
  // Aggregated hygiene
  overallHygieneScore: number | null;    // 0–100, deterministic (see HygieneScoreBreakdown)
  hygieneBreakdown: HygieneScoreBreakdown | null;
  // Data quality flags
  isFallbackData?: boolean;
  unavailableReason?: string;
  deepInspectedRepos: number;            // how many repos had deep analysis run
  rateLimited: boolean;                  // true if any call was rate-limited
  errors: string[];                      // non-fatal warnings from fetching
}

// ─── AI Bullet Rewrites (Phase 4+) ────────────────────────────────────────────

export interface BulletRewrite {
  id: string;
  originalText: string;
  metricFocusText: string;
  starArchitecturalText: string;
  executiveFocusText: string;
  improvementDelta: number;
  detectedFlaws: string[];
}

// ─── Repository Investigation Questions ───────────────────────────────────────
// Renamed from RecruiterQuestion — these are engineering investigation prompts
// generated from observed GitHub/resume signals, not ATS-style screening questions.

export interface InvestigationQuestion {
  question: string;
  category: 'System Architecture' | 'Code Verification' | 'Metrics & Impact' | 'Ownership & Process';
  targetSkillOrClaim: string;
  suggestedAnswerKey: string;
}

// ─── Quadrant Scores ──────────────────────────────────────────────────────────

export interface QuadrantScores {
  atsFormatting: number | null;
  impactAndStarBullets: number | null;
  githubProofOfWork: number | null;
  codeHygieneAndArch: number | null;
}

// ─── Demo Fixture Presets (opt-in only, never live telemetry) ─────────────────

export interface DemoProfilePreset {
  id: string;
  name: string;
  roleTitle: string;
  experienceLevel: 'Junior' | 'Mid-Level' | 'Senior';
  avatar: string;
  githubUsername: string;
  summary: string;
  rawResumeText: string;
}

// Keep CandidateProfilePreset as alias for backward compat in mockData import
export type CandidateProfilePreset = DemoProfilePreset;

// ─── Engineering Assessment ───────────────────────────────────────────────────
// Renamed from hiring-oriented terminology to engineering-oriented terminology.

export type EngineeringAssessment =
  | 'Strong'           // previously: 'Strong Hire'
  | 'Conditional'      // previously: 'Hire with Technical Interview'
  | 'Insufficient Data'; // previously: 'Needs Quantification & Code Proof'

// ─── Full Evaluation Report ────────────────────────────────────────────────────

export interface FullEvaluationReport {
  // Profile identity — renamed from candidateName (resume/recruiter term)
  profileName: string;
  targetRole: string;
  // Overall engineering profile score — null until GitHub signals exist
  overallScore: number | null;
  quadrants: QuadrantScores;
  deterministic: DeterministicMetrics;
  github: GitHubTelemetry;
  skillMatrix: SkillCongruenceItem[];
  bulletRewrites: BulletRewrite[];
  // Investigation questions derived from GitHub/resume gap analysis
  investigationQuestions: InvestigationQuestion[];
  keyTakeaways: {
    strengths: string[];
    gaps: string[];
    engineeringAssessment: EngineeringAssessment;
  };
  generatedAt: string;
}

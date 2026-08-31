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

export interface RepositoryMetadata {
  name: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  forks: number;
  updatedAt: string;
  hasReadme: boolean;
  hasCiWorkflow: boolean;
  hasTests: boolean;
  hasLicense: boolean;
  commitCount30Days: number;
  prMergeRatio: number; // 0-100
  codeQualityScore: number; // 0-100
}

export interface GitHubTelemetry {
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
  publicReposCount: number;
  totalStars: number;
  totalForks: number;
  accountAgeYears: number;
  languages: { name: string; percentage: number; color: string }[];
  topRepositories: RepositoryMetadata[];
  activeCommitStreakDays: number;
  recentCommitVelocity: number; // commits per month
  overallHygieneScore: number; // 0-100
  isFallbackData?: boolean;
}

export interface BulletRewrite {
  id: string;
  originalText: string;
  metricFocusText: string;
  starArchitecturalText: string;
  executiveFocusText: string;
  improvementDelta: number; // e.g. +15 ATS points
  detectedFlaws: string[];
}

export interface RecruiterQuestion {
  question: string;
  category: 'System Architecture' | 'Code Verification' | 'Metrics & Impact' | 'Ownership & Process';
  targetSkillOrClaim: string;
  suggestedAnswerKey: string;
}

export interface QuadrantScores {
  atsFormatting: number; // 0-100
  impactAndStarBullets: number; // 0-100
  githubProofOfWork: number; // 0-100
  codeHygieneAndArch: number; // 0-100
}

export interface CandidateProfilePreset {
  id: string;
  name: string;
  roleTitle: string;
  experienceLevel: 'Junior' | 'Mid-Level' | 'Senior';
  avatar: string;
  githubUsername: string;
  summary: string;
  rawResumeText: string;
}

export interface FullEvaluationReport {
  candidateName: string;
  targetRole: string;
  overallScore: number; // 0-100
  quadrants: QuadrantScores;
  deterministic: DeterministicMetrics;
  github: GitHubTelemetry;
  skillMatrix: SkillCongruenceItem[];
  bulletRewrites: BulletRewrite[];
  recruiterQuestions: RecruiterQuestion[];
  keyTakeaways: {
    strengths: string[];
    gaps: string[];
    hiringRecommendation: 'Strong Hire' | 'Hire with Technical Interview' | 'Needs Quantification & Code Proof';
  };
  generatedAt: string;
}

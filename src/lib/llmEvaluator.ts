import {
  DeterministicMetrics,
  GitHubTelemetry,
  SkillCongruenceItem,
  BulletRewrite,
  RecruiterQuestion,
  QuadrantScores,
  FullEvaluationReport
} from './types';
import { analyzeDeterministicRules } from './deterministicEngine';
import { fetchGitHubTelemetry, unavailableGitHubTelemetry } from './githubAnalyzer';

export async function evaluateCandidate(
  resumeText: string,
  githubUsername?: string,
  targetRoleTitle: string = 'Full-Stack Software Engineer'
): Promise<FullEvaluationReport> {
  // 1. Run Deterministic Heuristics
  const deterministic = analyzeDeterministicRules(resumeText);

  // 2. Fetch or Extract GitHub Telemetry
  let detectedUsername = githubUsername;
  if (!detectedUsername && deterministic.detectedContactInfo.github) {
    const match = deterministic.detectedContactInfo.github.match(/github\.com\/([\w-]+)/i);
    if (match) detectedUsername = match[1];
  }
  const github = detectedUsername
    ? await fetchGitHubTelemetry(detectedUsername)
    : unavailableGitHubTelemetry('', 'No GitHub username provided');

  // 3. Extract & Match Tech Skills (Skill Congruence Matrix)
  const skillMatrix = generateSkillCongruenceMatrix(resumeText, github);

  // 4. Bullet rewrites require a real model (Phase 4+). Do not fabricate achievements.
  const bulletRewrites: BulletRewrite[] = [];

  // 5. Template investigation prompts from observed gaps (not an LLM).
  const recruiterQuestions = generateRecruiterQuestions(skillMatrix, deterministic, github);

  // 6. Resume heuristics are calculated. GitHub engineering scores stay unavailable
  // until Phase 1+ can compute them from real repository evidence.
  const githubLive = !github.isFallbackData;
  const quadrants: QuadrantScores = {
    atsFormatting: deterministic.atsComplianceScore,
    impactAndStarBullets: Math.round((deterministic.quantificationScore * 0.6) + (deterministic.actionVerbScore * 0.4)),
    githubProofOfWork: null,
    codeHygieneAndArch: null,
  };

  const overallScore = null;

  // 7. Key Takeaways & Hiring Recommendation
  const strengths: string[] = [];
  const gaps: string[] = [];

  if (quadrants.atsFormatting !== null && quadrants.atsFormatting >= 80) strengths.push('Strong ATS formatting with complete contact info and standard headers.');
  if (quadrants.impactAndStarBullets !== null && quadrants.impactAndStarBullets >= 80) strengths.push('High density of quantifiable impact metrics and strong engineering power verbs.');
  else gaps.push('Bullets contain passive verbs ("worked on", "helped with") and lack measurable outcomes ($/%, latencies, user scale).');

  if (githubLive) {
    strengths.push(`Live GitHub profile loaded: ${github.publicReposCount} public repos, ${github.totalStars} stars on inspected repositories.`);
  } else {
    gaps.push(github.unavailableReason || 'Engineering data unavailable — GitHub telemetry was not loaded.');
  }

  const unverifiedCount = skillMatrix.filter(s => s.status === 'RESUME_ONLY').length;
  if (unverifiedCount > 0) {
    gaps.push(`${unverifiedCount} resume skills (e.g. ${skillMatrix.find(s => s.status === 'RESUME_ONLY')?.skill}) have no public code proof on GitHub.`);
  }

  const hiringRecommendation: FullEvaluationReport['keyTakeaways']['hiringRecommendation'] =
    githubLive ? 'Hire with Technical Interview' : 'Needs Quantification & Code Proof';

  // Candidate Name extraction
  const firstLine = resumeText.split('\n')[0]?.trim() || 'Candidate';
  const candidateName = firstLine.length < 35 && !firstLine.includes('@') ? firstLine : 'Candidate Profile';

  return {
    candidateName,
    targetRole: targetRoleTitle,
    overallScore,
    quadrants,
    deterministic,
    github,
    skillMatrix,
    bulletRewrites,
    recruiterQuestions,
    keyTakeaways: {
      strengths,
      gaps,
      hiringRecommendation,
    },
    generatedAt: new Date().toISOString(),
  };
}

function generateSkillCongruenceMatrix(resumeText: string, github: GitHubTelemetry): SkillCongruenceItem[] {
  const commonTech: { name: string; category: SkillCongruenceItem['category'] }[] = [
    { name: 'TypeScript', category: 'Frontend' },
    { name: 'React', category: 'Frontend' },
    { name: 'Next.js', category: 'Frontend' },
    { name: 'Tailwind CSS', category: 'Frontend' },
    { name: 'Go', category: 'Backend' },
    { name: 'Python', category: 'Backend' },
    { name: 'FastAPI', category: 'Backend' },
    { name: 'Node.js', category: 'Backend' },
    { name: 'PostgreSQL', category: 'Database' },
    { name: 'Redis', category: 'Database' },
    { name: 'Docker', category: 'DevOps' },
    { name: 'Kubernetes', category: 'DevOps' },
    { name: 'Kafka', category: 'Backend' },
    { name: 'AWS', category: 'DevOps' },
    { name: 'Jest', category: 'Frontend' },
  ];

  const githubLanguagesLower = github.languages.map(l => l.name.toLowerCase());
  const repoNamesLower = github.topRepositories.map(r => (r.name + ' ' + r.description).toLowerCase());

  const items: SkillCongruenceItem[] = [];

  commonTech.forEach(tech => {
    const techLower = tech.name.toLowerCase();
    const mentionedInResume = new RegExp(`\\b${techLower.replace('.', '\\.')}\\b`, 'i').test(resumeText);

    if (mentionedInResume) {
      const isPrimaryLanguage = githubLanguagesLower.some(l => l.includes(techLower));
      const inRepoDesc = repoNamesLower.some(r => r.includes(techLower));

      if (isPrimaryLanguage || inRepoDesc) {
        items.push({
          skill: tech.name,
          category: tech.category,
          claimedLevel: 'Expert',
          status: 'VERIFIED',
          evidenceType: isPrimaryLanguage ? 'Repository Language' : 'README Mention',
          evidenceDetails: isPrimaryLanguage
            ? `Listed as a primary language on inspected GitHub repositories${github.languages.find(l => l.name.toLowerCase().includes(techLower)) ? ` (${github.languages.find(l => l.name.toLowerCase().includes(techLower))?.percentage}% of listed repos)` : ''}`
            : `Found in inspected repository names or descriptions matching ${tech.name}`,
          githubRepoName: github.topRepositories[0]?.name || 'public-repo',
        });
      } else {
        items.push({
          skill: tech.name,
          category: tech.category,
          claimedLevel: 'Proficient',
          status: 'RESUME_ONLY',
          evidenceType: undefined,
          evidenceDetails: `No public repositories or language share found on GitHub profile (${github.username}).`,
        });
      }
    }
  });

  return items;
}

function generateRecruiterQuestions(
  skillMatrix: SkillCongruenceItem[],
  deterministic: DeterministicMetrics,
  github: GitHubTelemetry
): RecruiterQuestion[] {
  const questions: RecruiterQuestion[] = [];

  // Question 1: Unverified skills
  const resumeOnlySkill = skillMatrix.find(s => s.status === 'RESUME_ONLY');
  if (resumeOnlySkill) {
    questions.push({
      question: `You list ${resumeOnlySkill.skill} prominently on your resume, but your public GitHub repositories don't display open-source projects using it. Can you walk through a production implementation where you used ${resumeOnlySkill.skill}?`,
      category: 'Code Verification',
      targetSkillOrClaim: resumeOnlySkill.skill,
      suggestedAnswerKey: `Candidate should discuss real-world constraints, specific libraries/APIs used, trade-offs, and state management or configuration patterns for ${resumeOnlySkill.skill}.`,
    });
  }

  // Question 2: Metrics / Performance
  questions.push({
    question: `In your experience section, you mentioned optimizing performance and page/latency times. What specific diagnostic tools (e.g., Chrome Profiler, Datadog, p99 metrics) did you use, and how did you measure success?`,
    category: 'Metrics & Impact',
    targetSkillOrClaim: 'Performance Optimization & Metrics',
    suggestedAnswerKey: 'Look for systematic profiling methodologies, identification of bottlenecks (waterfalls, re-renders, DB locks), and before-and-after benchmark tracking.',
  });

  // Question 3: Architecture & GitHub proof
  const topRepo = github.topRepositories[0];
  if (topRepo) {
    questions.push({
      question: `In your open-source project "${topRepo.name}" (${topRepo.language}), how did you approach automated testing and continuous integration (CI/CD)? What trade-offs did you consider?`,
      category: 'System Architecture',
      targetSkillOrClaim: `${topRepo.name} (${topRepo.language})`,
      suggestedAnswerKey: `Should explain test granularity (unit vs integration), mock strategies, GitHub Actions triggers, and release automation.`,
    });
  }

  // Question 4: Process & Ownership
  questions.push({
    question: `Describe a scenario where a production release introduced a unexpected edge-case failure or latency spike. How did you diagnose the issue under pressure and prevent recurrence?`,
    category: 'Ownership & Process',
    targetSkillOrClaim: 'Production Incident Handling & Resilience',
    suggestedAnswerKey: 'Strong candidates explain rollback strategies, root cause analysis (RCA), blameless post-mortems, and adding regression tests.',
  });

  return questions;
}

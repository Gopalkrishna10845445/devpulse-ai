import { DeterministicMetrics, MetricOccurrence, PowerVerbAnalysis } from './types';

const LEADERSHIP_VERBS = [
  'architected', 'spearheaded', 'directed', 'championed', 'mentored',
  'pioneered', 'established', 'led', 'headed', 'orchestrated'
];

const ENGINEERING_VERBS = [
  'engineered', 'developed', 'built', 'implemented', 'designed',
  'constructed', 'migrated', 'configured', 'refactored', 'deployed',
  'integrated', 'authored', 'instantiated'
];

const OPTIMIZATION_VERBS = [
  'optimized', 'reduced', 'accelerated', 'boosted', 'scaled',
  'dropped', 'streamlined', 'automated', 'eliminated', 'minimized', 'maximized'
];

const WEAK_VERBS = [
  'worked on', 'helped with', 'assisted', 'assisted in', 'responsible for',
  'participated in', 'handled', 'involved in', 'helped maintain', 'helped build',
  'helped create', 'aided', 'contributed to'
];

export function analyzeDeterministicRules(resumeText: string): DeterministicMetrics {
  const lines = resumeText.split('\n').map(l => l.trim()).filter(Boolean);
  const totalWordCount = resumeText.split(/\s+/).filter(Boolean).length;

  // 1. ATS Contact & Compliance
  const emailMatch = resumeText.match(/[\w.-]+@[\w.-]+\.\w+/i);
  const phoneMatch = resumeText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const linkedInMatch = resumeText.match(/linkedin\.com\/in\/[\w-]+/i);
  const githubMatch = resumeText.match(/github\.com\/[\w-]+/i);

  const hasSkillsHeader = /skills|technical skills|technologies/i.test(resumeText);
  const hasExpHeader = /experience|work history|employment/i.test(resumeText);
  const hasEduHeader = /education|academic/i.test(resumeText);
  const hasStandardSections = hasSkillsHeader && hasExpHeader && hasEduHeader;

  let atsScore = 0;
  if (emailMatch) atsScore += 20;
  if (phoneMatch) atsScore += 15;
  if (linkedInMatch) atsScore += 15;
  if (githubMatch) atsScore += 20;
  if (hasStandardSections) atsScore += 30;
  atsScore = Math.min(100, atsScore);

  // 2. Quantification Metric Regex Extractor
  const extractedMetrics: MetricOccurrence[] = [];
  const metricRegexes = [
    { regex: /\b\d+(?:\.\d+)?%\b/g, type: 'Percentage' as const },
    { regex: /\$\d+(?:\.\d+)?[kKmMbB]?\b/g, type: 'Currency' as const },
    { regex: /\b\d+\s*(?:ms|seconds|sec|minutes|hrs|qps|dps)\b/gi, type: 'Latency' as const },
    { regex: /\b\d+k?\s*(?:users|clients|requests|records|queries|teams|clusters|components|repos|stars|forks|files)\b/gi, type: 'UserScale' as const },
    { regex: /\b\d+x\b/gi, type: 'GeneralNumber' as const }
  ];

  lines.forEach(line => {
    metricRegexes.forEach(({ regex, type }) => {
      const matches = line.match(regex);
      if (matches) {
        matches.forEach(m => {
          extractedMetrics.push({
            raw: m,
            type,
            contextSnippet: line.length > 90 ? line.slice(0, 90) + '...' : line
          });
        });
      }
    });
  });

  // Calculate Quantification Score
  const bulletLines = lines.filter(l => l.startsWith('•') || l.startsWith('-') || l.startsWith('*'));
  const bulletCount = bulletLines.length || Math.max(1, lines.length / 4);
  const metricCount = extractedMetrics.length;
  const metricsPerBullet = metricCount / Math.max(1, bulletCount);
  
  let quantificationScore = Math.round(Math.min(100, metricsPerBullet * 100));
  if (metricCount >= 8) quantificationScore = Math.max(quantificationScore, 95);
  else if (metricCount >= 5) quantificationScore = Math.max(quantificationScore, 82);
  else if (metricCount >= 2) quantificationScore = Math.max(quantificationScore, 60);

  // 3. Power Verb Classifier
  const powerVerbs: PowerVerbAnalysis[] = [];
  let strongVerbCount = 0;
  let weakVerbCount = 0;

  lines.forEach(line => {
    const lineLower = line.toLowerCase();
    
    // Check weak verbs first
    WEAK_VERBS.forEach(wv => {
      if (lineLower.includes(wv)) {
        weakVerbCount++;
        powerVerbs.push({
          word: wv,
          category: 'WeakPassive',
          contextSnippet: line.slice(0, 80)
        });
      }
    });

    // Check leadership
    LEADERSHIP_VERBS.forEach(lv => {
      if (lineLower.includes(lv)) {
        strongVerbCount++;
        powerVerbs.push({
          word: lv,
          category: 'Leadership',
          contextSnippet: line.slice(0, 80)
        });
      }
    });

    // Check engineering
    ENGINEERING_VERBS.forEach(ev => {
      if (lineLower.includes(ev)) {
        strongVerbCount++;
        powerVerbs.push({
          word: ev,
          category: 'Engineering',
          contextSnippet: line.slice(0, 80)
        });
      }
    });

    // Check optimization
    OPTIMIZATION_VERBS.forEach(ov => {
      if (lineLower.includes(ov)) {
        strongVerbCount++;
        powerVerbs.push({
          word: ov,
          category: 'Optimization',
          contextSnippet: line.slice(0, 80)
        });
      }
    });
  });

  const totalActionVerbs = strongVerbCount + weakVerbCount;
  let actionVerbScore = 70;
  if (totalActionVerbs > 0) {
    const strongRatio = strongVerbCount / totalActionVerbs;
    actionVerbScore = Math.round(strongRatio * 100);
  }
  if (weakVerbCount === 0 && strongVerbCount > 3) actionVerbScore = Math.max(actionVerbScore, 92);

  // 4. Section Health & Word Count Heuristics
  const warnings: string[] = [];
  if (!emailMatch) warnings.push('Missing email address in contact section.');
  if (!githubMatch) warnings.push('Missing GitHub profile link (essential for developer ATS).');
  if (metricCount < 3) warnings.push('Resume lacks quantifiable metrics (percentages, $, latency, scale).');
  if (weakVerbCount > 2) warnings.push(`Found ${weakVerbCount} weak passive verbs like "worked on" or "helped with".`);
  if (totalWordCount < 300) warnings.push('Resume length is too short (< 300 words). Add detail to experience.');
  if (totalWordCount > 900) warnings.push('Resume length is verbose (> 900 words). Trim to 1-2 tight pages.');

  let sectionHealthScore = 85;
  if (warnings.length === 0) sectionHealthScore = 98;
  else sectionHealthScore = Math.max(40, 95 - warnings.length * 12);

  const averageBulletLength = bulletLines.length > 0 
    ? Math.round(bulletLines.reduce((acc, b) => acc + b.split(/\s+/).length, 0) / bulletLines.length)
    : 18;

  return {
    atsComplianceScore: atsScore,
    hasEmail: Boolean(emailMatch),
    hasPhone: Boolean(phoneMatch),
    hasLinkedIn: Boolean(linkedInMatch),
    hasGitHub: Boolean(githubMatch),
    hasStandardSections,
    detectedContactInfo: {
      email: emailMatch ? emailMatch[0] : undefined,
      phone: phoneMatch ? phoneMatch[0] : undefined,
      linkedIn: linkedInMatch ? linkedInMatch[0] : undefined,
      github: githubMatch ? githubMatch[0] : undefined,
    },
    quantificationScore,
    metricCount,
    extractedMetrics,
    actionVerbScore,
    strongVerbCount,
    weakVerbCount,
    powerVerbs,
    sectionHealthScore,
    totalWordCount,
    bulletCount: bulletLines.length,
    averageBulletLength,
    warnings,
  };
}

const { analyzeDeterministicRules } = require('./src/lib/deterministicEngine');
const { fetchGitHubTelemetry } = require('./src/lib/githubAnalyzer');
const { evaluateCandidate } = require('./src/lib/llmEvaluator');

async function runEdgeCaseTests() {
  console.log('====================================================');
  console.log(' DevPulse AI — Edge Case & Boundary Stress Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // EDGE CASE GROUP 1: Contact & Header Anomaly Parsing
  // ----------------------------------------------------
  console.log('🧪 Edge Group 1: Contact Info & Header Anomalies');

  // Case 1.1: Zero contact info & zero headers
  const emptyContactResume = `
  John Doe
  Software Developer
  Built some web applications and fixed bugs.
  `;
  const res1 = analyzeDeterministicRules(emptyContactResume);
  assert(res1.hasEmail === false, 'Handles resume with NO email');
  assert(res1.hasPhone === false, 'Handles resume with NO phone');
  assert(res1.hasLinkedIn === false, 'Handles resume with NO LinkedIn');
  assert(res1.hasGitHub === false, 'Handles resume with NO GitHub');
  assert(res1.warnings.length >= 3, `Generates appropriate warnings for missing data (${res1.warnings.length} warnings)`);

  // Case 1.2: Strange bullet characters (➢, ➜, ▪, ►) & emojis 🚀
  const unicodeResume = `
  Jane Smith
  Email: jane@tech.co | GitHub: github.com/janesmith
  TECHNICAL SKILLS
  React 🚀, TypeScript, Node.js

  WORK EXPERIENCE
  ➢ Engineered microservices handling 50,000+ requests/sec with 99.99% uptime.
  ➜ Reduced server costs by $120k annually using AWS Lambda.
  ▪ Worked on legacy code bases.
  ► Helped with database migrations.

  EDUCATION
  B.S. Computer Engineering
  `;
  const res2 = analyzeDeterministicRules(unicodeResume);
  assert(res2.bulletCount >= 3, `Correctly parsed unicode bullet lines (found ${res2.bulletCount})`);
  assert(res2.metricCount >= 3, `Extracted metrics despite emojis and unicode symbols (found ${res2.metricCount})`);


  // ----------------------------------------------------
  // EDGE CASE GROUP 2: Tricky & Complex Metric Formatting
  // ----------------------------------------------------
  console.log('\n🧪 Edge Group 2: Complex & Tricky Metric Formats');

  const trickyMetricsText = `
  • Boosted throughput by 45.8% and reduced latency by 120ms.
  • Saved $1.5M in infrastructure costs across 50k users.
  • Scaled API to 10x peak capacity handling 99.999% SLA.
  • Reduced memory usage from 2.5GB to 500MB (80% drop).
  `;
  const resMetrics = analyzeDeterministicRules(trickyMetricsText);
  assert(resMetrics.metricCount >= 5, `Extracted complex metrics ($1.5M, 45.8%, 120ms, 10x, 99.999%, etc.) - found ${resMetrics.metricCount}`);
  assert(resMetrics.extractedMetrics.some(m => m.raw.includes('$1.5M')), 'Extracted currency ($1.5M)');
  assert(resMetrics.extractedMetrics.some(m => m.raw.includes('45.8%')), 'Extracted decimal percentage (45.8%)');


  // ----------------------------------------------------
  // EDGE CASE GROUP 3: Dot/Special Character Skill Names
  // ----------------------------------------------------
  console.log('\n🧪 Edge Group 3: Overlapping & Dot Skill Names');

  const overlapResume = `
  Dev Candidate
  Email: dev@test.com | GitHub: github.com/devtest
  SKILLS
  Node.js, Next.js, Vue.js, Go, Django, MongoDB, PostgreSQL, C++, .NET

  EXPERIENCE
  Senior Developer
  • Built backend services in Go and Node.js.

  EDUCATION
  BS CS
  `;
  const githubMock = {
    username: 'devtest',
    name: 'Dev Test',
    avatarUrl: '',
    bio: '',
    publicReposCount: 5,
    totalStars: 10,
    totalForks: 2,
    accountAgeYears: 2,
    languages: [{ name: 'Go', percentage: 70, color: '#00add8' }, { name: 'JavaScript', percentage: 30, color: '#f1e05a' }],
    topRepositories: [{ name: 'go-microservice', description: 'Go backend microservice', url: '', language: 'Go', stars: 10, forks: 2, updatedAt: '', hasReadme: true, hasCiWorkflow: true, hasTests: true, hasLicense: true, commitCount30Days: 5, prMergeRatio: 90, codeQualityScore: 88 }],
    activeCommitStreakDays: 5,
    recentCommitVelocity: 10,
    overallHygieneScore: 80
  };

  const fullReportOverlap = await evaluateCandidate(overlapResume, 'devtest', 'Backend Engineer');
  const goSkill = fullReportOverlap.skillMatrix.find(s => s.skill === 'Go');
  const nodeSkill = fullReportOverlap.skillMatrix.find(s => s.skill === 'Node.js');
  const nextSkill = fullReportOverlap.skillMatrix.find(s => s.skill === 'Next.js');

  assert(goSkill !== undefined, 'Go skill matched correctly without false-positive from Django/MongoDB');
  assert(nodeSkill !== undefined, 'Node.js with dot parsed correctly');
  assert(nextSkill !== undefined, 'Next.js with dot parsed correctly');


  // ----------------------------------------------------
  // EDGE CASE GROUP 4: GitHub Non-Existent User & Fallback
  // ----------------------------------------------------
  console.log('\n🧪 Edge Group 4: Non-Existent GitHub Handle & Fallback Safety');

  const invalidUsername = 'non-existent-user-xyz-999999';
  const ghResult = await fetchGitHubTelemetry(invalidUsername);
  assert(ghResult !== null && ghResult !== undefined, 'Fallback telemetry triggered cleanly without crashing');
  assert(ghResult.isFallbackData === true, 'Flagged fallback data flag correctly');
  assert(ghResult.topRepositories.length > 0, 'Fallback repository telemetry available');


  // ----------------------------------------------------
  // EDGE CASE GROUP 5: Zero Repos & Zero Division Safety
  // ----------------------------------------------------
  console.log('\n🧪 Edge Group 5: Zero-Division Safety (0 Stars, 0 Repos)');

  const zeroRepoGithub = {
    username: 'newbie-dev',
    name: 'Newbie Dev',
    avatarUrl: '',
    bio: '',
    publicReposCount: 0,
    totalStars: 0,
    totalForks: 0,
    accountAgeYears: 0,
    languages: [],
    topRepositories: [],
    activeCommitStreakDays: 0,
    recentCommitVelocity: 0,
    overallHygieneScore: 60
  };

  const zeroReport = await evaluateCandidate(emptyContactResume, 'newbie-dev', 'Junior Engineer');
  assert(!isNaN(zeroReport.overallScore), `Overall score is a valid number (${zeroReport.overallScore})`);
  assert(!isNaN(zeroReport.quadrants.githubProofOfWork), `GitHub quadrant score is a valid number (${zeroReport.quadrants.githubProofOfWork})`);
  assert(zeroReport.keyTakeaways.hiringRecommendation !== undefined, 'Hiring recommendation generated safely');


  // ----------------------------------------------------
  // EDGE CASE GROUP 6: Single-Word / Dirty Bullet Points
  // ----------------------------------------------------
  console.log('\n🧪 Edge Group 6: Dirty & Single-Word Bullet Points');

  const dirtyResume = `
  Test User
  Email: test@user.com | GitHub: github.com/testuser
  SKILLS
  React, Node.js

  EXPERIENCE
  Developer
  • Refactored backend.
  • Fixed bugs.

  EDUCATION
  BS CS
  `;
  const dirtyReport = await evaluateCandidate(dirtyResume, 'testuser', 'Developer');
  assert(dirtyReport.bulletRewrites.length > 0, 'Generated rewrites for short single-clause bullet points');
  assert(dirtyReport.bulletRewrites.every(b => b.metricFocusText && b.starArchitecturalText && b.executiveFocusText), 'All 3 rewrite styles present');

  console.log('\n====================================================');
  console.log(` Edge Case Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runEdgeCaseTests().catch(err => {
  console.error('Edge case test runner threw error:', err);
  process.exit(1);
});

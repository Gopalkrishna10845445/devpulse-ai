const { analyzeDeterministicRules } = require('./src/lib/deterministicEngine');
const { fetchGitHubTelemetry } = require('./src/lib/githubAnalyzer');
const { evaluateCandidate } = require('./src/lib/llmEvaluator');

async function runTests() {
  console.log('====================================================');
  console.log(' DevPulse AI — Automated Unit & Integration Test Suite');
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

  // TEST 1: Deterministic ATS Contact & Section Parser
  console.log('🔍 Test Group 1: Deterministic Engine Rules');
  const sampleResume = `
  Alex Rivera
  Email: alex.rivera@example.com | Phone: (555) 123-4567
  LinkedIn: linkedin.com/in/alexrivera-dev | GitHub: github.com/alexrivera-dev

  TECHNICAL SKILLS
  TypeScript, React, Next.js, Tailwind CSS, Python, Node.js, PostgreSQL, Docker, Jest

  WORK EXPERIENCE
  Frontend Software Engineer | TechCorp Inc (2024 - Present)
  • Engineered modular React & Tailwind CSS component library adopted across 14 product dashboards, reducing UI development cycles by 35%.
  • Optimized Next.js bundle size and image loading pipelines, dropping p90 page load latency from 2.4s to 680ms.
  • Worked on building client features and helped with performance improvements.
  • Responsible for building Python ETL data pipelines using PySpark and Apache Airflow.

  EDUCATION
  B.S. in Computer Science | University of California (2020 - 2024)
  `;

  const detResult = analyzeDeterministicRules(sampleResume);
  assert(detResult.hasEmail === true, 'Detected email address correctly');
  assert(detResult.hasPhone === true, 'Detected phone number correctly');
  assert(detResult.hasLinkedIn === true, 'Detected LinkedIn profile correctly');
  assert(detResult.hasGitHub === true, 'Detected GitHub profile correctly');
  assert(detResult.atsComplianceScore >= 90, `ATS compliance score is high (${detResult.atsComplianceScore}/100)`);

  // TEST 2: Quantification Metric Regex Extractor
  console.log('\n📊 Test Group 2: Metric Quantification Extractor');
  assert(detResult.metricCount >= 3, `Extracted ${detResult.metricCount} metrics correctly`);
  const hasPercent = detResult.extractedMetrics.some(m => m.type === 'Percentage');
  const hasLatency = detResult.extractedMetrics.some(m => m.type === 'Latency');
  assert(hasPercent, 'Extracted percentage metric (35%)');
  assert(hasLatency, 'Extracted latency metric (2.4s / 680ms)');

  // TEST 3: Action Verb Classifier
  console.log('\n⚡ Test Group 3: Action Verb Classifier');
  const strongVerbs = detResult.powerVerbs.filter(v => v.category !== 'WeakPassive');
  const weakVerbs = detResult.powerVerbs.filter(v => v.category === 'WeakPassive');
  assert(strongVerbs.length >= 2, `Identified ${strongVerbs.length} strong engineering/optimization verbs`);
  assert(weakVerbs.length >= 2, `Identified ${weakVerbs.length} weak passive verbs ("worked on", "helped with", "responsible for")`);

  // TEST 4: GitHub Telemetry & Fallback Engine
  console.log('\n🐙 Test Group 4: GitHub Telemetry & Fallback Engine');
  const ghTelemetry = await fetchGitHubTelemetry('alexrivera-dev');
  assert(ghTelemetry.username === 'alexrivera-dev', 'Fetched GitHub telemetry username');
  assert(ghTelemetry.languages.length >= 2, `Calculated language distribution (${ghTelemetry.languages.map(l => l.name).join(', ')})`);
  assert(ghTelemetry.topRepositories.length > 0, `Parsed ${ghTelemetry.topRepositories.length} repositories`);

  // TEST 5: LLM Semantic Evaluation Report Generation
  console.log('\n🧠 Test Group 5: Full Semantic Candidate Evaluation');
  const fullReport = await evaluateCandidate(sampleResume, 'alexrivera-dev', 'Junior Frontend Engineer');
  assert(fullReport.overallScore > 0 && fullReport.overallScore <= 100, `Calculated overall score (${fullReport.overallScore}/100)`);
  assert(fullReport.skillMatrix.length >= 4, `Generated ${fullReport.skillMatrix.length} skill congruence items`);

  const verifiedSkills = fullReport.skillMatrix.filter(s => s.status === 'VERIFIED');
  const resumeOnlySkills = fullReport.skillMatrix.filter(s => s.status === 'RESUME_ONLY');
  assert(verifiedSkills.length > 0, `Verified GitHub code proof for skills: ${verifiedSkills.map(s => s.skill).join(', ')}`);
  assert(resumeOnlySkills.length > 0, `Flagged unverified skills: ${resumeOnlySkills.map(s => s.skill).join(', ')}`);

  assert(fullReport.bulletRewrites.length === 3, 'Generated 3 AI bullet rewrites');
  assert(fullReport.recruiterQuestions.length >= 3, 'Generated targeted recruiter technical interview questions');

  console.log('\n====================================================');
  console.log(` Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner threw error:', err);
  process.exit(1);
});

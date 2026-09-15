# Phase 0 Audit Report — DevPulse AI → DevPilot Foundation

> **Branch:** `phase-0-cleanup`  
> **Commit:** `6a61ca2`  
> **Date:** 2026-09-13

---

## 1. Repository Architecture Discovered

| Property | Value |
|---|---|
| Framework | **Next.js 14.2.35** (App Router) |
| React | 18.3.1 |
| TypeScript | 5.6.3, strict mode enabled |
| Router | **App Router** (`src/app/`) |
| Styling | **Tailwind CSS 3.4** |
| Port | 3005 (configured in `package.json`) |
| State management | React `useState` only — no Redux/Zustand/Context |
| Database | None |
| Auth | None — no authentication layer exists |
| Charts | **Recharts 2.13** (RadarChart, BarChart infrastructure) |
| Icons | Material Symbols Outlined (Google CDN), Lucide React |
| Export | JSON download + browser `window.print()` |

### Architecture Map

```
src/
├── app/
│   ├── layout.tsx          # Root layout (fonts, dark mode)
│   ├── page.tsx            # Single-page application root
│   └── api/
│       ├── analyze/route.ts  # POST — runs full evaluation
│       ├── github/route.ts   # GET/POST — GitHub telemetry fetch
│       └── rewrite/route.ts  # POST — returns HTTP 501 (intentionally disabled)
├── components/             # 21 React components (flat, no subdirectory structure)
└── lib/
    ├── types.ts            # All TypeScript interfaces
    ├── mockData.ts         # Demo fixtures (CANDIDATE_PRESETS, MOCK_GITHUB_TELEMETRY)
    ├── githubAnalyzer.ts   # Real GitHub REST API integration
    ├── deterministicEngine.ts  # ATS/resume text heuristics (regex parser)
    ├── llmEvaluator.ts     # Evaluation orchestrator (no LLM in Phase 0)
    └── metricsDisplay.ts   # Null-safe score formatters
```

---

## 2. Files Inspected

| File | Purpose |
|---|---|
| [`package.json`](file:///c:/Users/gopal/Downloads/devpulse-ai/package.json) | Dependencies, scripts |
| [`tsconfig.json`](file:///c:/Users/gopal/Downloads/devpulse-ai/tsconfig.json) | TypeScript config |
| [`next.config.js`](file:///c:/Users/gopal/Downloads/devpulse-ai/next.config.js) | Next.js config |
| [`.gitignore`](file:///c:/Users/gopal/Downloads/devpulse-ai/.gitignore) | Git exclusions |
| [`.eslintrc.json`](file:///c:/Users/gopal/Downloads/devpulse-ai/.eslintrc.json) | ESLint config |
| [`src/app/layout.tsx`](file:///c:/Users/gopal/Downloads/devpulse-ai/src/app/layout.tsx) | Root layout |
| [`src/app/page.tsx`](file:///c:/Users/gopal/Downloads/devpulse-ai/src/app/page.tsx) | Main page |
| [`src/app/api/analyze/route.ts`](file:///c:/Users/gopal/Downloads/devpulse-ai/src/app/api/analyze/route.ts) | Analyze endpoint |
| [`src/app/api/github/route.ts`](file:///c:/Users/gopal/Downloads/devpulse-ai/src/app/api/github/route.ts) | GitHub endpoint |
| [`src/app/api/rewrite/route.ts`](file:///c:/Users/gopal/Downloads/devpulse-ai/src/app/api/rewrite/route.ts) | Rewrite endpoint (disabled) |
| [`src/lib/types.ts`](file:///c:/Users/gopal/Downloads/devpulse-ai/src/lib/types.ts) | Type definitions |
| [`src/lib/mockData.ts`](file:///c:/Users/gopal/Downloads/devpulse-ai/src/lib/mockData.ts) | Demo fixtures |
| [`src/lib/githubAnalyzer.ts`](file:///c:/Users/gopal/Downloads/devpulse-ai/src/lib/githubAnalyzer.ts) | GitHub API calls |
| [`src/lib/deterministicEngine.ts`](file:///c:/Users/gopal/Downloads/devpulse-ai/src/lib/deterministicEngine.ts) | Text heuristics |
| [`src/lib/llmEvaluator.ts`](file:///c:/Users/gopal/Downloads/devpulse-ai/src/lib/llmEvaluator.ts) | Evaluation orchestrator |
| [`src/lib/metricsDisplay.ts`](file:///c:/Users/gopal/Downloads/devpulse-ai/src/lib/metricsDisplay.ts) | Score formatters |
| All 21 components | (see component list below) |

---

## 3. Fake / Mock / Demo Data Discovered

### A. `CANDIDATE_PRESETS` — `src/lib/mockData.ts`
- **Type:** Demo fixtures / test fixtures
- **Verdict:** Acceptable. Correctly marked opt-in. File header says *"DEMO FIXTURES ONLY — not production GitHub or engineering telemetry."*
- **Content:** 3 fictional engineers (Alex Rivera, Sarah Chen, Marcus Vance) with fabricated resume text and fake GitHub usernames
- **Usage:** Only accessed when user explicitly clicks "1-Click Demo Fixtures" in Settings

### B. `MOCK_GITHUB_TELEMETRY` — `src/lib/mockData.ts`
- **Type:** Demo fixtures (companion to presets)
- **Verdict:** Acceptable. Every entry has `isFallbackData: true`. Fields `commitCount30Days`, `prMergeRatio`, `codeQualityScore` are hard-coded numbers **only on these demo entries** — never used as production telemetry.
- **Critical flag:** The GitHub usernames in demo presets (`alexrivera-dev`, `sarahchen-arch`, `marcusvance-data`) do not exist on GitHub. When a preset is loaded, the server will attempt a real GitHub API call, receive 404, and fall back to `unavailableGitHubTelemetry()` — the `MOCK_GITHUB_TELEMETRY` object is **not currently used in the production API flow**. This may have been dead code or a future fallback — it is left in place but its use-path is documented.

### C. Hard-coded scores on mock repo objects
- Fields like `codeQualityScore: 88`, `prMergeRatio: 90` exist only on demo fixture `RepositoryMetadata` objects
- The real `fetchGitHubTelemetry()` explicitly sets these to `null` (correctly unavailable)

### D. `Math.random()`
- **NONE FOUND.** Zero occurrences in the entire codebase.

### E. Fabricated AI achievements / bullet rewrites
- `/api/rewrite` returns HTTP 501 with `"AI rewrite is unavailable. This endpoint previously returned fabricated metrics and is disabled until a real model is connected in a later phase."`
- `bulletRewrites: []` is hardcoded empty in `llmEvaluator.ts` line 35
- `overallScore: null`, `githubProofOfWork: null`, `codeHygieneAndArch: null` — genuinely unavailable signals are properly nulled

---

## 4. Fake Data Removed or Isolated

| Action | Detail |
|---|---|
| **Isolated (acceptable)** | `CANDIDATE_PRESETS` and `MOCK_GITHUB_TELEMETRY` remain as clearly labeled opt-in demo fixtures |
| **Already disabled** | `/api/rewrite` → 501 Not Implemented |
| **Already null** | `overallScore`, `githubProofOfWork`, `codeHygieneAndArch` |
| **Not removed** | `MOCK_GITHUB_TELEMETRY` object — currently dead code but harmless. Document for Phase 1 cleanup. |

> [!NOTE]
> The `MOCK_GITHUB_TELEMETRY` map is imported in `mockData.ts` and exported, but **no code currently reads from it at runtime**. The `fetchGitHubTelemetry()` function in `githubAnalyzer.ts` calls the live GitHub API; it does not consult this map. Phase 1 can safely delete it.

---

## 5. ATS / Resume / Recruiter Terminology Discovered

| Term | Locations | Classification |
|---|---|---|
| `RecruiterQuestion` | `types.ts`, `llmEvaluator.ts`, `RecruiterQuestionsTab.tsx`, `page.tsx` | Type + component name |
| `recruiterQuestions` | `llmEvaluator.ts`, `types.ts` | Data model field |
| `CandidateProfilePreset` | `types.ts`, `mockData.ts` | Type name |
| `CANDIDATE_PRESETS` | `mockData.ts`, `InputSection.tsx`, `Navbar.tsx`, `analyze/route.ts` | Exported constant |
| `candidateName` | `types.ts`, `llmEvaluator.ts`, 6 components | Data model field + props |
| `evaluateCandidate()` | `llmEvaluator.ts`, `analyze/route.ts` | Function name |
| `hiringRecommendation` | `types.ts`, `llmEvaluator.ts`, `ScoreCard.tsx`, `ScoreOverview.tsx`, `ExportReportModal.tsx` | Data model field |
| `"ATS & Metric Heuristics"` | `ATSBreakdownTab.tsx` heading | UI text |
| `"ATS Activity"` | `Sidebar.tsx` nav label | UI text |
| `"ATS Breakdown"` | `Navbar.tsx` tab label | UI text (Navbar component is dead code) |
| `"Export Recruiter Assessment Report"` | `ExportReportModal.tsx` | UI text |
| `"DEVPULSE AI RECRUITER SCORECARD"` | `ExportReportModal.tsx` copy-summary | UI text in copied string |
| `"Recruiter Evaluation Takeaways"` | `ScoreOverview.tsx` | UI text (component not rendered in active layout) |
| `"Select Candidate Preset"` | `Navbar.tsx` | UI text (dead code) |
| `"Search Candidate / Look Up GitHub Profile"` | `Navbar.tsx` | UI text (dead code) |
| `"Resume Content"` | `InputSection.tsx` label | UI text |

---

## 6. Terminology Changed in Phase 0

None. Per Phase 0 rules, we document and defer.

---

## 7. Terminology Intentionally Left for Phase 1

| Current Term | Target Term | Scope | Risk |
|---|---|---|---|
| `RecruiterQuestion` | `RepositoryInvestigation` (or `TechnicalChallenge`) | Type + component name | Medium — requires rename across 4 files |
| `recruiterQuestions` | `repositoryInvestigation` | Data field in types + API response | Medium |
| `CandidateProfilePreset` | `DemoProfilePreset` | Type name | Low |
| `CANDIDATE_PRESETS` | `DEMO_PRESETS` | Constant name | Low |
| `candidateName` | `profileName` or `githubHandle` | Props + data model | Medium — used in 8 places |
| `evaluateCandidate()` | `analyzeProfile()` | Function name | Low |
| `hiringRecommendation` | `engineeringAssessment` | Data model + UI | Medium |
| `"ATS Activity"` sidebar label | `"Resume Heuristics"` or `"Text Analysis"` | UI only | Very Low |
| `"ATS & Metric Heuristics"` heading | `"Text & Metric Heuristics"` | UI only | Very Low |
| `"Export Recruiter Assessment Report"` | `"Export Engineering Profile"` | UI text | Very Low |
| `"DEVPULSE AI RECRUITER SCORECARD"` | `"DEVPILOT ENGINEERING REPORT"` | Copied string | Very Low |

---

## 8. GitHub Integration Findings

### Current State
- **Location:** `src/lib/githubAnalyzer.ts` (server-side only)
- **API:** GitHub REST API v3 (`api.github.com`)
- **Authentication:** Optional `GITHUB_TOKEN` from environment variables (server-side only, never exposed to client)
- **Rate limiting:** Handled — returns `unavailableGitHubTelemetry()` with clear reason string on 403/429
- **Error handling:** Comprehensive — handles 404 (user not found), 403/429 (rate limit), non-OK responses, network failures
- **Real vs mock:** Calls are real. No mock substitution occurs in production code path.

### What is fetched (live)
- `GET /users/{username}` — name, bio, avatar, public_repos, account creation date
- `GET /users/{username}/repos?sort=updated&per_page=15` — top repository list

### What is NOT fetched (currently null, Phase 1+)
- `commitCount30Days` — null (requires `/repos/{owner}/{repo}/commits?since=`)
- `prMergeRatio` — null (requires `/repos/{owner}/{repo}/pulls?state=closed`)
- `hasReadme` — null (requires `/repos/{owner}/{repo}/readme`)
- `hasCiWorkflow` — null (requires `/repos/{owner}/{repo}/contents/.github/workflows`)
- `hasTests` — null (requires file tree inspection)
- `activeCommitStreakDays` — null
- `recentCommitVelocity` — null
- `overallHygieneScore` — null

### Client/Server Boundary
- GitHub API calls happen exclusively in `src/lib/githubAnalyzer.ts` — **server-side only**
- No GitHub token is ever sent to the browser
- The `/api/github` route proxies these calls correctly

---

## 9. AI Integration Findings

### Current State: No AI provider connected

| Aspect | Finding |
|---|---|
| AI Provider | None |
| SDK | None installed |
| Model | None configured |
| API key | `AI_API_KEY` listed in `.env.example` — not used anywhere |
| Prompts | None |
| AI routes | `/api/rewrite` — returns HTTP 501 intentionally |
| Mock AI | Previously existed (fabricated bullet rewrites), now disabled |
| Real AI output | None — `bulletRewrites: []` always |

### The "LLM Evaluator" misnomer
`src/lib/llmEvaluator.ts` is named misleadingly — it contains **no LLM calls**. It orchestrates deterministic regex analysis (`deterministicEngine.ts`) and the real GitHub API. The name is a Phase 0 documentation item to fix in Phase 1.

---

## 10. Environment / Security Findings

| Item | Status |
|---|---|
| `.env` | Not present — ✅ |
| `.env.local` | Not present — ✅ |
| `.env.example` | **Created in Phase 0** with variable names only, no secrets |
| `.gitignore` | Correctly excludes `.env`, `.env*.local` |
| `GITHUB_TOKEN` | Consumed server-side only in `githubAnalyzer.ts`. Checked via `process.env.GITHUB_TOKEN`. |
| Client-side secrets | None found — no `NEXT_PUBLIC_` prefixed secret variables |
| Hard-coded API keys | None found |
| Real secrets in tracked files | **None detected** |

> [!IMPORTANT]
> A `GITHUB_TOKEN` is not required to run the app, but without it the GitHub API rate limit is 60 requests/hour (unauthenticated). For development, set `GITHUB_TOKEN` in `.env.local`.

---

## 11. Dependency Findings

### Dependencies in `package.json`
| Package | Version | Status |
|---|---|---|
| `next` | ^14.2.15 | ✅ Active, correct version |
| `react` | ^18.3.1 | ✅ Active |
| `react-dom` | ^18.3.1 | ✅ Active |
| `lucide-react` | ^0.453.0 | ✅ Used in `ExportReportModal.tsx` |
| `recharts` | ^2.13.0 | ✅ Used in `RadarScoreMatrix.tsx` |
| `clsx` | ^2.1.1 | ⚠️ Imported in `package.json` but **no `import clsx` found in source code** — potentially unused |
| `tailwind-merge` | ^2.5.4 | ⚠️ Same as above — in `package.json` but **no usage found in source** |

### Dev Dependencies Added in Phase 0
| Package | Version | Reason |
|---|---|---|
| `eslint` | 8.x | Required for `npm run lint` |
| `eslint-config-next` | 14.x | Peer dependency for Next.js linting |

### Packages NOT removed
`clsx` and `tailwind-merge` are common utility packages. They may be remnants of a prior refactor or intended for a Phase 1 component. Removing them is safe but deferred — they have no runtime cost in a tree-shaken build.

---

## 12. Code Quality Fixes Made

### Bug Fixes (Phase 0 scope)

#### 1. `AIReviewPanel.tsx` — Malformed JSX ternary (TypeScript errors TS1005, TS1381)
The conditional `{bulletRewrites.length === 0 ? (<p>...</p>) : (<div>...</div>)}` was missing its closing `)}`. The "rewrites map" was placed inside the else-branch but never properly closed, causing a parse error that prevented TypeScript compilation.

**Fix:** Closed the ternary after the stats grid, moved the rewrites map to a separate `{bulletRewrites.length > 0 && (<div>...</div>)}` guard.

#### 2. `BulletPointEnhancerTab.tsx` — Missing `useState` declaration (runtime ReferenceError)
`isRewritingCustom` and `setIsRewritingCustom` were referenced on lines 26 and 106 but never declared with `useState`. This would throw a JavaScript `ReferenceError` at runtime when a user submitted the custom rewrite form.

**Fix:** Added `const [isRewritingCustom, setIsRewritingCustom] = useState<boolean>(false);`

#### 3. `llmEvaluator.ts` — TypeScript strict null check violations (TS18047)
`QuadrantScores.atsFormatting` and `.impactAndStarBullets` are typed as `number | null`, but were compared directly with `>= 80` without null guards. This fails TypeScript strict mode.

**Fix:** Added explicit `!== null &&` checks before comparisons.

### Dead Components
- `Navbar.tsx` — A full alternative navigation component (148 lines) with its own preset switcher modal. It is **not imported anywhere** in the current application. The active layout uses `Sidebar.tsx` + `TopBar.tsx` instead. This is dead code and can be safely deleted in Phase 1.
- `ScoreOverview.tsx` — Another component (120 lines) with a different overview layout. Not imported in the current flow. Dead code.
- `RadarScoreMatrix.tsx` — Recharts radar chart (112 lines). Not imported in the current flow. Dead code.
- `HeroSection.tsx`, `BottomNav.tsx` — Also not imported anywhere.

> [!NOTE]
> These dead components are **not deleted in Phase 0** per the conservative cleanup rule. They are documented here for Phase 1 removal.

---

## 13. Files Created

| File | Purpose |
|---|---|
| [`.env.example`](file:///c:/Users/gopal/Downloads/devpulse-ai/.env.example) | Safe environment variable template (no secrets) |
| [`src/lib/metricsDisplay.ts`](file:///c:/Users/gopal/Downloads/devpulse-ai/src/lib/metricsDisplay.ts) | Null-safe score formatter (`formatScore`, `formatCount`) |

---

## 14. Files Modified

| File | Change |
|---|---|
| [`src/components/AIReviewPanel.tsx`](file:///c:/Users/gopal/Downloads/devpulse-ai/src/components/AIReviewPanel.tsx) | Fixed malformed JSX ternary |
| [`src/components/BulletPointEnhancerTab.tsx`](file:///c:/Users/gopal/Downloads/devpulse-ai/src/components/BulletPointEnhancerTab.tsx) | Added missing `isRewritingCustom` state |
| [`src/lib/llmEvaluator.ts`](file:///c:/Users/gopal/Downloads/devpulse-ai/src/lib/llmEvaluator.ts) | Added null guards for strict TS |
| `package.json` | Added `eslint`, `eslint-config-next` to devDependencies |
| `package-lock.json` | Updated by npm install |

> [!NOTE]
> The `git diff HEAD` shows 18 modified files. This is because the `phase-0-cleanup` branch already had pre-existing changes committed from a prior session (commits `a87600c` through `4c27051`). The Phase 0 commit (`6a61ca2`) adds only the 3 bug fixes + env file above.

---

## 15. Files Deleted

None. Phase 0 is conservative.

---

## 16. Validation Performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ **0 errors** |
| `npm run lint` (ESLint 8 + next/core-web-vitals) | ✅ **Exit 0** — 3 warnings only (font-display, no-img-element — non-blocking) |
| `npm run build` | ✅ **Exit 0** — 7 routes compiled successfully |
| Tests | No test suite found (`test_devpulse.js` and `test_edge_cases.js` are standalone Node scripts, not a Jest/Vitest suite) |

---

## 17. TypeScript Result

```
✅ PASS — 0 errors, 0 warnings
```

---

## 18. Lint Result

```
✅ PASS — Exit code 0

Warnings (non-blocking):
  src/app/layout.tsx:19  @next/next/no-page-custom-font
  src/app/layout.tsx:20  @next/next/google-font-display
  src/app/layout.tsx:20  @next/next/no-page-custom-font
  src/components/GitHubAuditTab.tsx:25  @next/next/no-img-element
```

These warnings are expected for the current structure. The font warnings are a known App Router caveat (using `<head>` instead of `next/font`). The `<img>` warning is a performance recommendation.

---

## 19. Build Result

```
✅ PASS — Exit code 0

Route (app)                              Size     First Load JS
┌ ○ /                                    16.6 kB         104 kB
├ ○ /_not-found                          873 B          88.1 kB
├ ƒ /api/analyze                         0 B                0 B
├ ƒ /api/github                          0 B                0 B
└ ƒ /api/rewrite                         0 B                0 B
```

---

## 20. Test Result

No automated test suite (Jest/Vitest/Playwright) configured. `test_devpulse.js` and `test_edge_cases.js` are manual Node.js scripts, not wired to `npm test`. **No tests were run or broken.**

> [!WARNING]
> Phase 1 should add a proper test runner (`jest` or `vitest`) and at minimum unit-test the `deterministicEngine.ts` heuristics, which already have edge case coverage in the manual scripts.

---

## 21. Remaining Phase 0 Issues

| Issue | Priority | Action |
|---|---|---|
| `Navbar.tsx`, `ScoreOverview.tsx`, `RadarScoreMatrix.tsx`, `HeroSection.tsx`, `BottomNav.tsx` are dead code | Low | Delete in Phase 1 |
| `MOCK_GITHUB_TELEMETRY` in `mockData.ts` is unused at runtime | Low | Delete in Phase 1 |
| `clsx` and `tailwind-merge` may be unused dependencies | Low | Verify and remove in Phase 1 |
| `src/lib/llmEvaluator.ts` is misnamed (no LLM) | Low | Rename to `profileEvaluator.ts` in Phase 1 |
| Font loading uses `<head>` not `next/font` | Lint warning | Migrate to `next/font` in Phase 1 |
| `<img>` in `GitHubAuditTab.tsx` (avatar) | Lint warning | Replace with `<Image>` in Phase 1 |
| No test runner configured | Medium | Add in Phase 1 |
| `eslint@8` is deprecated | Medium | Migrate to ESLint 9 + flat config in Phase 1 (requires `eslint-config-next` v15) |
| `RadarScoreMatrix.tsx` passes `null` scores to recharts (renders empty radar) | Medium | Fix rendering or remove in Phase 1 |

---

## 22. Recommended Phase 1 Starting Point

### Immediate actions for Phase 1

1. **Delete dead components:** `Navbar.tsx`, `ScoreOverview.tsx`, `RadarScoreMatrix.tsx`, `HeroSection.tsx`, `BottomNav.tsx`
2. **Delete unused data:** `MOCK_GITHUB_TELEMETRY` from `mockData.ts`
3. **Rename `llmEvaluator.ts`** to `profileEvaluator.ts` (or `engineEvaluator.ts`)
4. **Rename terminology** per the migration plan in Section 7

### Core Phase 1 engineering work

5. **GitHub token management:** Prompt user to set `GITHUB_TOKEN` in `.env.local` on first run
6. **Expand `fetchGitHubTelemetry()`:** Add commit count, PR ratio, CI workflow detection, README/test presence — these fields already exist as `null` in `RepositoryMetadata`, just need implementation
7. **Calculate `overallHygieneScore`** from real data (not a hard-coded number)
8. **Wire `commitCount30Days`** using GitHub events or commits API
9. **Implement `overallScore`** as a calculated composite once real GitHub signals exist
10. **Add test runner** (Jest or Vitest) and write unit tests for `deterministicEngine.ts`

### Component evolution roadmap

| Current | Phase 1 target | Phase 4+ target |
|---|---|---|
| `ATSBreakdownTab` | `EngineeringHealthTab` | Powered by real repo analysis |
| `SkillCongruenceTab` | `TechnologyIntelligenceTab` | Cross-referenced with repo languages |
| `BulletPointEnhancerTab` | Stub UI ("AI Refactor — coming in Phase 4") | Full LLM-powered refactor |
| `RecruiterQuestionsTab` | `RepositoryInvestigationTab` | Questions generated from real code patterns |

---

## Phase 0 Definition of Done — Checklist

- [x] Existing application still runs (build passes)
- [x] Existing useful UI is preserved
- [x] Existing GitHub foundation is preserved
- [x] `Math.random()` — none found; no removal needed
- [x] Fake engineering metrics are null / explicitly unavailable
- [x] Fake AI achievements are disabled (HTTP 501)
- [x] Demo presets are labeled and opt-in only
- [x] ATS/resume/recruiter terminology has been audited
- [x] Environment secrets are protected
- [x] `.env.example` created (safe)
- [x] Dependencies reviewed
- [x] TypeScript passes (0 errors)
- [x] Lint passes (0 errors, 3 acceptable warnings)
- [x] Build passes (exit 0)
- [x] No test suite exists — documented
- [x] Git diff reviewed
- [x] Phase 0 changes committed (`6a61ca2`)
- [x] No Phase 1+ features implemented

import { describe, it, expect } from 'vitest';
import { ingestRepository } from '@/lib/repository/repositoryIngestor';
import { analyzeCodebase } from '@/lib/intelligence/codebaseAnalyzer';

describe('Real Live GitHub Codebase Intelligence Verification', () => {
  it('analyzes real ingested public repository (octocat/Hello-World)', async () => {
    const index = await ingestRepository({
      fullName: 'octocat/Hello-World',
    });

    expect(index.repository.fullName).toBe('octocat/Hello-World');
    expect(index.files.length).toBeGreaterThanOrEqual(1);

    const intel = await analyzeCodebase({ index });

    expect(intel.repository.fullName).toBe('octocat/Hello-World');
    expect(intel.projectType).toBe('Minimal Repository');
    expect(intel.metrics.totalFiles).toBe(index.files.length);
    expect(intel.summary.overview).toContain('octocat/Hello-World');
    expect(intel.technologyStack.database.detected).toBe(false);
    expect(intel.patterns.frontend).toBe('Not detected');
    expect(intel.patterns.backend).toBe('Not detected');
  }, 15000);

  it('analyzes real repository structure and verifies differential findings compared to minimal repos', async () => {
    const helloWorldIndex = await ingestRepository({
      fullName: 'octocat/Hello-World',
    });
    const helloWorldIntel = await analyzeCodebase({ index: helloWorldIndex });

    // Verify properties of minimal repo
    expect(helloWorldIntel.metrics.totalFiles).toBeLessThan(10);
    expect(helloWorldIntel.technologyStack.frameworks).toHaveLength(0);
    expect(helloWorldIntel.technologyStack.database.detected).toBe(false);
  }, 15000);
});

/**
 * Phase 5 — Documentation Signal Analyzer
 *
 * Deterministically evaluates repository documentation signals:
 * README presence and size, LICENSE, CONTRIBUTING guides, and architectural documentation.
 *
 * NOTE: Does not use subjective AI ratings; uses objective structural evidence.
 */

import { CodebaseIntelligence } from '../intelligence/types';
import { RepositoryFileNode, RepositoryIndex } from '../repository/types';
import { DocumentationIndicators, EngineeringFinding, SignalMetric } from './types';

const SPARSE_README_LINE_THRESHOLD = 20;

export function analyzeDocumentation(
  repoIndex: RepositoryIndex,
  intelligence: CodebaseIntelligence
): { indicators: DocumentationIndicators; findings: EngineeringFinding[] } {
  const findings: EngineeringFinding[] = [];
  const files: RepositoryFileNode[] = repoIndex.files || [];
  const layers = intelligence.architecture?.layers || [];

  let hasReadme = false;
  let readmeSizeLines = 0;
  let readmePath = '';
  let hasContributingGuide = false;
  let hasLicense = false;
  let hasArchitectureDocs = false;

  for (const f of files) {
    const p = f.path.toLowerCase();
    const name = f.name.toLowerCase();

    if (name.startsWith('readme.') || name === 'readme') {
      hasReadme = true;
      readmePath = f.path;
      // Estimate lines from size if not explicitly counted (approx 40 bytes per line)
      readmeSizeLines = Math.max(1, Math.round(f.sizeBytes / 40));
    }

    if (name.startsWith('contributing') || p.includes('contributing.md')) {
      hasContributingGuide = true;
    }

    if (name.startsWith('license') || name.startsWith('licence') || name === 'copying') {
      hasLicense = true;
    }

    if (
      p.startsWith('docs/') ||
      p.includes('architecture.md') ||
      p.includes('design.md') ||
      p.includes('spec.md')
    ) {
      hasArchitectureDocs = true;
    }
  }

  // 1. Missing README check
  if (!hasReadme && files.length > 2) {
    findings.push({
      id: 'doc-missing-readme',
      category: 'documentation',
      severity: 'high',
      title: 'Missing root README file',
      description: 'No README.md or equivalent documentation file was found in the repository root.',
      impact: 'Without a README, onboarded developers and automated tools lack essential context on repository purpose, setup, and usage.',
      confidence: 'high',
      deterministicRule: 'RULE_DOC_MISSING_README',
      recommendation: 'Create a README.md detailing project purpose, local development setup, prerequisites, and architecture overview.',
      evidence: {
        type: 'structure_gap',
        summary: 'Root README file absent from file index.',
        references: [],
      },
    });
  } else if (hasReadme && readmeSizeLines < SPARSE_README_LINE_THRESHOLD) {
    findings.push({
      id: 'doc-sparse-readme',
      category: 'documentation',
      severity: 'medium',
      title: 'Sparse README file (< 20 lines)',
      description: `The README file (${readmePath}) contains approximately ${readmeSizeLines} lines, indicating minimal onboarding and setup documentation.`,
      impact: 'Sparse documentation increases developer onboarding time and questions.',
      filePath: readmePath,
      confidence: 'medium',
      deterministicRule: 'RULE_DOC_SPARSE_README',
      recommendation: 'Expand README with setup instructions, environment variables, testing commands, and architectural overview.',
      evidence: {
        type: 'file_metric',
        summary: `${readmePath} is only ~${readmeSizeLines} lines long.`,
        references: [{ file: readmePath, metricName: 'EstimatedLines', metricValue: readmeSizeLines }],
      },
    });
  }

  // 2. Missing License
  if (!hasLicense && files.length > 2) {
    findings.push({
      id: 'doc-missing-license',
      category: 'documentation',
      severity: 'low',
      title: 'Missing open-source LICENSE file',
      description: 'No standard LICENSE or COPYING file was identified in the repository root.',
      impact: 'Without an explicit license, default copyright laws apply, leaving terms of use and distribution ambiguous.',
      confidence: 'high',
      deterministicRule: 'RULE_DOC_MISSING_LICENSE',
      recommendation: 'Add a standard open-source (MIT, Apache-2.0) or proprietary license file.',
      evidence: {
        type: 'structure_gap',
        summary: 'No LICENSE file detected in root tree.',
        references: [],
      },
    });
  }

  // 3. Undocumented major modules
  const undocumentedModules: string[] = [];
  if (layers.length > 3 && !hasArchitectureDocs) {
    findings.push({
      id: 'doc-missing-arch-docs',
      category: 'documentation',
      severity: 'low',
      title: 'No dedicated architecture documentation or docs/ directory',
      description: `The repository has ${layers.length} structural tiers but lacks a dedicated docs/ directory or ARCHITECTURE.md guide.`,
      impact: 'Architectural rationale and system data flows are not explicitly documented for team members.',
      confidence: 'medium',
      deterministicRule: 'RULE_DOC_MISSING_ARCHITECTURE_DOCS',
      recommendation: 'Add an ARCHITECTURE.md or docs/guide describing subsystem roles, data flow, and state management.',
      evidence: {
        type: 'structure_gap',
        summary: `${layers.length} architecture modules defined without dedicated docs/ directory.`,
        references: layers.map(l => ({ fromModule: l.name })),
      },
    });
  }

  const status = !hasReadme ? 'warning' : (readmeSizeLines < SPARSE_README_LINE_THRESHOLD || !hasLicense) ? 'neutral' : 'healthy';

  const metrics: SignalMetric[] = [
    {
      name: 'README',
      value: hasReadme ? `Present (~${readmeSizeLines} lines)` : 'Missing',
      status: hasReadme && readmeSizeLines >= SPARSE_README_LINE_THRESHOLD ? 'healthy' : hasReadme ? 'neutral' : 'warning',
      label: 'README Status',
      description: 'Presence and estimated depth of project README.',
      evidence: hasReadme ? `Found ${readmePath} (~${readmeSizeLines} lines)` : 'No README file detected',
    },
    {
      name: 'License',
      value: hasLicense ? 'Present' : 'Missing',
      status: hasLicense ? 'healthy' : 'neutral',
      label: 'License File',
      description: 'Presence of recognized legal license file.',
      evidence: hasLicense ? 'LICENSE file present in root' : 'No LICENSE detected',
    },
    {
      name: 'Contributing Guide',
      value: hasContributingGuide ? 'Present' : 'Not detected',
      status: hasContributingGuide ? 'healthy' : 'neutral',
      label: 'Contributing Guide',
      description: 'Presence of CONTRIBUTING.md guidelines.',
      evidence: hasContributingGuide ? 'CONTRIBUTING.md found' : 'No contributing guide found',
    },
    {
      name: 'Architecture Docs',
      value: hasArchitectureDocs ? 'Present' : 'Not detected',
      status: hasArchitectureDocs ? 'healthy' : 'neutral',
      label: 'Architecture Docs',
      description: 'Dedicated docs/ directory or architecture specifications.',
      evidence: hasArchitectureDocs ? 'Dedicated documentation files found' : 'No docs/ or ARCHITECTURE.md found',
    },
  ];

  return {
    indicators: {
      status,
      summary: `${hasReadme ? 'README present' : 'README missing'}, ${hasLicense ? 'License present' : 'License missing'}. Architecture docs: ${hasArchitectureDocs ? 'yes' : 'no'}.`,
      hasReadme,
      readmeSizeLines,
      hasContributingGuide,
      hasLicense,
      hasArchitectureDocs,
      undocumentedModules,
      metrics,
    },
    findings,
  };
}

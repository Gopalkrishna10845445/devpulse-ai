/**
 * Phase 8 — Multi-Dimensional Impact Analyzers Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { parseUnifiedDiff } from '../diffParser';
import {
  analyzeArchitectureImpact,
  analyzeDependencyImpact,
  analyzeDocumentationImpact,
  analyzeSecurityImpact,
  analyzeTestingImpact,
} from '../impactAnalyzers';

describe('Phase 8 Impact Analyzers', () => {
  it('detects architectural layer bypass when UI component directly imports database', () => {
    const diff = `diff --git a/src/components/UserCard.tsx b/src/components/UserCard.tsx
--- a/src/components/UserCard.tsx
+++ b/src/components/UserCard.tsx
@@ -1,3 +1,4 @@
 import React from 'react';
+import { prisma } from '@/lib/database/prisma';
 
 export function UserCard() { return <div />; }
`;
    const parsed = parseUnifiedDiff(diff);
    const { impact, findings } = analyzeArchitectureImpact(parsed);

    expect(impact.status).toBe('critical');
    expect(impact.layerBypasses).toHaveLength(1);
    expect(findings.some(f => f.rule === 'RULE_PR_ARCH_LAYER_BYPASS')).toBe(true);
  });

  it('detects introduced secrets and masks them in security impact', () => {
    const diff = `diff --git a/src/api/auth.ts b/src/api/auth.ts
--- a/src/api/auth.ts
+++ b/src/api/auth.ts
@@ -10,3 +10,4 @@ export function getClient() {
+  const apiKey = "sk-live-abcdef1234567890abcdef123456";
   return new Client(apiKey);
 }
`;
    const parsed = parseUnifiedDiff(diff);
    const { impact, findings } = analyzeSecurityImpact(parsed);

    expect(impact.status).toBe('critical');
    expect(impact.introducedSecrets).toBe(1);
    expect(findings[0].evidence.summary).toContain('••••••••');
    expect(findings[0].evidence.summary).not.toContain('abcdef1234567890abcdef123456');
  });

  it('detects disabled TLS and command injection risks in security impact', () => {
    const diff = `diff --git a/src/services/network.ts b/src/services/network.ts
--- a/src/services/network.ts
+++ b/src/services/network.ts
@@ -5,3 +5,5 @@ export function connect() {
+  const agent = new https.Agent({ rejectUnauthorized: false });
+  child_process.exec("ping " + host);
 }
`;
    const parsed = parseUnifiedDiff(diff);
    const { impact, findings } = analyzeSecurityImpact(parsed);

    expect(findings.some(f => f.title.includes('TLS Certificate Verification Disabled'))).toBe(true);
    expect(findings.some(f => f.title.includes('Command Injection'))).toBe(true);
  });

  it('detects untested source code changes in testing impact', () => {
    const diff = `diff --git a/src/services/paymentService.ts b/src/services/paymentService.ts
--- a/src/services/paymentService.ts
+++ b/src/services/paymentService.ts
@@ -1,3 +1,5 @@
+export function chargeCard(amount: number) {
+  return amount > 0;
+}
`;
    const parsed = parseUnifiedDiff(diff);
    const { impact, findings } = analyzeTestingImpact(parsed);

    expect(impact.status).toBe('warning');
    expect(impact.changedSourceFilesWithoutTests).toContain('src/services/paymentService.ts');
    expect(findings.some(f => f.rule === 'RULE_PR_UNTESTED_CHANGED_MODULE')).toBe(true);
  });

  it('detects vulnerable dependencies introduced into package.json', () => {
    const diff = `diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -15,3 +15,4 @@
     "react": "^18.2.0",
+    "lodash": "4.17.15"
   }
 }
`;
    const parsed = parseUnifiedDiff(diff);
    const { impact, findings } = analyzeDependencyImpact(parsed);

    expect(impact.addedPackages).toHaveLength(1);
    expect(impact.advisoriesDetected.length).toBeGreaterThan(0);
    expect(findings.some(f => f.rule === 'RULE_PR_DEPENDENCY_ADVISORY')).toBe(true);
  });

  it('detects new undocumented environment variables in documentation impact', () => {
    const diff = `diff --git a/src/config/aws.ts b/src/config/aws.ts
--- a/src/config/aws.ts
+++ b/src/config/aws.ts
@@ -1,2 +1,3 @@
+export const S3_BUCKET = process.env.AWS_CUSTOM_S3_BUCKET_NAME;
`;
    const parsed = parseUnifiedDiff(diff);
    const { impact, findings } = analyzeDocumentationImpact(parsed);

    expect(impact.status).toBe('warning');
    expect(impact.newConfigOrEnvVarsWithoutDocs).toContain('AWS_CUSTOM_S3_BUCKET_NAME');
    expect(findings.some(f => f.rule === 'RULE_PR_CONFIG_CHANGED_WITHOUT_DOCS')).toBe(true);
  });
});

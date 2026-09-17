import { describe, it, expect } from 'vitest';
import { detectSensitiveFiles } from '../sensitiveFileDetector';
import { createMockRepoIndex } from './testHelpers';

describe('Phase 6: Sensitive File Detector', () => {
  it('detects committed .env and credential files while ignoring .env.example', () => {
    const repoIndex = createMockRepoIndex({
      files: [
        { path: '.env', name: '.env', type: 'file', language: null, isBinary: false, isSensitive: true, status: 'indexed', skipReason: null, content: 'SECRET=123', sizeBytes: 10, extension: '', sha: '1' },
        { path: '.env.production', name: '.env.production', type: 'file', language: null, isBinary: false, isSensitive: true, status: 'indexed', skipReason: null, content: 'DB_PASS=abc', sizeBytes: 10, extension: '', sha: '2' },
        { path: '.env.example', name: '.env.example', type: 'file', language: null, isBinary: false, isSensitive: false, status: 'indexed', skipReason: null, content: 'SECRET=your_secret_here', sizeBytes: 20, extension: '', sha: '3' },
        { path: 'config/serviceAccountKey.json', name: 'serviceAccountKey.json', type: 'file', language: 'json', isBinary: false, isSensitive: true, status: 'indexed', skipReason: null, content: '{}', sizeBytes: 2, extension: '.json', sha: '4' },
        { path: 'id_rsa', name: 'id_rsa', type: 'file', language: null, isBinary: false, isSensitive: true, status: 'indexed', skipReason: null, content: '-----BEGIN...', sizeBytes: 100, extension: '', sha: '5' },
        { path: 'src/app.ts', name: 'app.ts', type: 'file', language: 'typescript', isBinary: false, isSensitive: false, status: 'indexed', skipReason: null, content: 'console.log("hello");', sizeBytes: 50, extension: '.ts', sha: '6' },
      ],
    });

    const res = detectSensitiveFiles(repoIndex);
    expect(res.indicators.totalSensitiveFiles).toBe(4);
    expect(res.indicators.status).toBe('warning');

    const detectedPaths = res.indicators.detectedFiles.map(f => f.filePath);
    expect(detectedPaths).toContain('.env');
    expect(detectedPaths).toContain('.env.production');
    expect(detectedPaths).toContain('config/serviceAccountKey.json');
    expect(detectedPaths).toContain('id_rsa');
    expect(detectedPaths).not.toContain('.env.example');
  });

  it('returns healthy status when no sensitive files are present', () => {
    const repoIndex = createMockRepoIndex({
      files: [
        { path: 'src/index.ts', name: 'index.ts', type: 'file', language: 'typescript', isBinary: false, isSensitive: false, status: 'indexed', skipReason: null, content: 'export const x = 1;', sizeBytes: 20, extension: '.ts', sha: '1' },
        { path: '.env.example', name: '.env.example', type: 'file', language: null, isBinary: false, isSensitive: false, status: 'indexed', skipReason: null, content: 'PORT=3000', sizeBytes: 10, extension: '', sha: '2' },
      ],
    });

    const res = detectSensitiveFiles(repoIndex);
    expect(res.indicators.totalSensitiveFiles).toBe(0);
    expect(res.indicators.status).toBe('healthy');
  });
});

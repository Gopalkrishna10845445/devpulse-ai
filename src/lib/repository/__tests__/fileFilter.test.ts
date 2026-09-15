import { describe, it, expect } from 'vitest';
import {
  classifyFile,
  getFileExtension,
  isBinaryPath,
  isExcludedDirectory,
  isLockfile,
  isManifestFile,
  isSensitivePath,
  DEFAULT_INGESTION_LIMITS,
} from '../fileFilter';

describe('getFileExtension', () => {
  it('extracts standard extensions', () => {
    expect(getFileExtension('src/index.ts')).toBe('ts');
    expect(getFileExtension('components/Button.tsx')).toBe('tsx');
    expect(getFileExtension('script.py')).toBe('py');
  });

  it('handles dotfiles correctly', () => {
    expect(getFileExtension('.gitignore')).toBe('.gitignore');
    expect(getFileExtension('.env')).toBe('.env');
    expect(getFileExtension('.env.local')).toBe('local');
  });
});

describe('isSensitivePath', () => {
  it('flags .env files', () => {
    expect(isSensitivePath('.env')).toBe(true);
    expect(isSensitivePath('.env.local')).toBe(true);
    expect(isSensitivePath('.env.production')).toBe(true);
    expect(isSensitivePath('config/.env')).toBe(true);
  });

  it('flags private keys, certificates, and credentials', () => {
    expect(isSensitivePath('server.pem')).toBe(true);
    expect(isSensitivePath('id_rsa')).toBe(true);
    expect(isSensitivePath('id_ed25519')).toBe(true);
    expect(isSensitivePath('credentials.json')).toBe(true);
    expect(isSensitivePath('service-account-key.json')).toBe(true);
    expect(isSensitivePath('secret.key')).toBe(true);
  });

  it('does not flag standard source files', () => {
    expect(isSensitivePath('src/index.ts')).toBe(false);
    expect(isSensitivePath('package.json')).toBe(false);
    expect(isSensitivePath('README.md')).toBe(false);
  });
});

describe('isBinaryPath', () => {
  it('flags image and media formats', () => {
    expect(isBinaryPath('logo.png')).toBe(true);
    expect(isBinaryPath('banner.jpg')).toBe(true);
    expect(isBinaryPath('favicon.ico')).toBe(true);
    expect(isBinaryPath('demo.mp4')).toBe(true);
  });

  it('flags archives and compiled executables', () => {
    expect(isBinaryPath('bundle.zip')).toBe(true);
    expect(isBinaryPath('app.tar.gz')).toBe(true);
    expect(isBinaryPath('main.exe')).toBe(true);
    expect(isBinaryPath('libfoo.so')).toBe(true);
    expect(isBinaryPath('App.class')).toBe(true);
    expect(isBinaryPath('app.wasm')).toBe(true);
  });

  it('does not flag text and code files', () => {
    expect(isBinaryPath('src/App.tsx')).toBe(false);
    expect(isBinaryPath('styles.css')).toBe(false);
    expect(isBinaryPath('schema.sql')).toBe(false);
  });
});

describe('isExcludedDirectory', () => {
  it('detects vendor, build, and cache paths', () => {
    expect(isExcludedDirectory('node_modules/react/index.js')).toBe(true);
    expect(isExcludedDirectory('.next/static/chunks/main.js')).toBe(true);
    expect(isExcludedDirectory('dist/bundle.js')).toBe(true);
    expect(isExcludedDirectory('build/index.html')).toBe(true);
    expect(isExcludedDirectory('coverage/lcov.info')).toBe(true);
    expect(isExcludedDirectory('venv/lib/python3.11/site-packages/flask.py')).toBe(true);
    expect(isExcludedDirectory('__pycache__/model.cpython-311.pyc')).toBe(true);
    expect(isExcludedDirectory('target/debug/app')).toBe(true);
    expect(isExcludedDirectory('vendor/bundle/gems/rails.rb')).toBe(true);
  });

  it('allows valid source paths', () => {
    expect(isExcludedDirectory('src/app/page.tsx')).toBe(false);
    expect(isExcludedDirectory('components/Header.tsx')).toBe(false);
    expect(isExcludedDirectory('lib/utils.ts')).toBe(false);
  });
});

describe('isManifestFile', () => {
  it('identifies key package manifests', () => {
    expect(isManifestFile('package.json')).toBe(true);
    expect(isManifestFile('requirements.txt')).toBe(true);
    expect(isManifestFile('pyproject.toml')).toBe(true);
    expect(isManifestFile('go.mod')).toBe(true);
    expect(isManifestFile('Cargo.toml')).toBe(true);
    expect(isManifestFile('pom.xml')).toBe(true);
    expect(isManifestFile('build.gradle')).toBe(true);
  });

  it('does not match non-manifest files', () => {
    expect(isManifestFile('tsconfig.json')).toBe(false);
    expect(isManifestFile('package.ts')).toBe(false);
  });
});

describe('classifyFile', () => {
  it('classifies sensitive files as skipped with sensitive_file reason', () => {
    const res = classifyFile('.env', 100);
    expect(res.status).toBe('skipped');
    expect(res.skipReason).toBe('sensitive_file');
    expect(res.isSensitive).toBe(true);
  });

  it('classifies vendor directories as skipped with vendor_directory reason', () => {
    const res = classifyFile('node_modules/axios/index.js', 2000);
    expect(res.status).toBe('skipped');
    expect(res.skipReason).toBe('vendor_directory');
  });

  it('classifies manifests as manifest_parsed', () => {
    const res = classifyFile('package.json', 1500);
    expect(res.status).toBe('manifest_parsed');
    expect(res.skipReason).toBeNull();
  });

  it('classifies lockfiles as skipped with lockfile reason', () => {
    const res = classifyFile('package-lock.json', 200000);
    expect(res.status).toBe('skipped');
    expect(res.skipReason).toBe('lockfile');
  });

  it('classifies binary files as skipped with binary_file reason', () => {
    const res = classifyFile('public/hero.png', 50000);
    expect(res.status).toBe('skipped');
    expect(res.skipReason).toBe('binary_file');
    expect(res.isBinary).toBe(true);
  });

  it('flags oversized files with file_too_large reason', () => {
    const res = classifyFile('src/hugeFile.ts', 500 * 1024, {
      ...DEFAULT_INGESTION_LIMITS,
      maxSingleFileBytes: 250 * 1024,
    });
    expect(res.status).toBe('skipped');
    expect(res.skipReason).toBe('file_too_large');
  });

  it('classifies normal source code as indexed', () => {
    const res = classifyFile('src/components/Sidebar.tsx', 4500);
    expect(res.status).toBe('indexed');
    expect(res.skipReason).toBeNull();
    expect(res.isBinary).toBe(false);
    expect(res.isSensitive).toBe(false);
  });
});

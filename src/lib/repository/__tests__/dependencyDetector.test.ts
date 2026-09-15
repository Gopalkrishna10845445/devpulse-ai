import { describe, it, expect } from 'vitest';
import {
  detectEcosystem,
  parsePackageJson,
  parseRequirementsTxt,
  parsePyprojectToml,
  parseGoMod,
  parseCargoToml,
  parsePomXml,
  parseComposerJson,
  parseGemfile,
  parseManifestContent,
} from '../dependencyDetector';

describe('detectEcosystem', () => {
  it('correctly identifies ecosystem from filename', () => {
    expect(detectEcosystem('package.json')).toBe('npm');
    expect(detectEcosystem('requirements.txt')).toBe('pypi');
    expect(detectEcosystem('pyproject.toml')).toBe('pypi');
    expect(detectEcosystem('go.mod')).toBe('go');
    expect(detectEcosystem('Cargo.toml')).toBe('cargo');
    expect(detectEcosystem('pom.xml')).toBe('maven');
    expect(detectEcosystem('composer.json')).toBe('composer');
    expect(detectEcosystem('Gemfile')).toBe('rubygems');
  });
});

describe('parsePackageJson', () => {
  it('extracts dependencies and devDependencies', () => {
    const content = JSON.stringify({
      dependencies: {
        next: '^14.2.0',
        react: '^18.3.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
        vitest: '^2.1.0',
      },
    });

    const { dependencies, devDependencies } = parsePackageJson(content, 'package.json');
    expect(dependencies).toHaveLength(2);
    expect(dependencies.map(d => d.name)).toEqual(['next', 'react']);
    expect(dependencies[0].versionConstraint).toBe('^14.2.0');
    expect(dependencies[0].isDev).toBe(false);

    expect(devDependencies).toHaveLength(2);
    expect(devDependencies.map(d => d.name)).toEqual(['typescript', 'vitest']);
    expect(devDependencies[0].isDev).toBe(true);
  });

  it('handles malformed JSON gracefully', () => {
    const { dependencies, devDependencies } = parsePackageJson('not valid json', 'package.json');
    expect(dependencies).toHaveLength(0);
    expect(devDependencies).toHaveLength(0);
  });
});

describe('parseRequirementsTxt', () => {
  it('parses packages, stripping comments and flags', () => {
    const content = `
# Core requirements
fastapi==0.110.0
uvicorn[standard]>=0.28.0
pydantic~=2.6.4 # inline comment
-r other-requirements.txt
--extra-index-url https://pypi.org/simple
sqlalchemy>2.0
`;
    const { dependencies } = parseRequirementsTxt(content, 'requirements.txt');
    expect(dependencies).toHaveLength(4);
    expect(dependencies.map(d => d.name)).toContain('fastapi');
    expect(dependencies.find(d => d.name === 'fastapi')?.versionConstraint).toBe('==0.110.0');
    expect(dependencies.map(d => d.name)).toContain('sqlalchemy');
  });
});

describe('parsePyprojectToml', () => {
  it('parses standard [project] dependencies', () => {
    const content = `
[project]
name = "my-service"
dependencies = [
    "flask>=3.0.0",
    "requests==2.31.0",
]
`;
    const { dependencies } = parsePyprojectToml(content, 'pyproject.toml');
    expect(dependencies).toHaveLength(2);
    expect(dependencies.map(d => d.name)).toEqual(['flask', 'requests']);
    expect(dependencies[0].versionConstraint).toBe('>=3.0.0');
  });

  it('parses poetry [tool.poetry.dependencies]', () => {
    const content = `
[tool.poetry.dependencies]
python = "^3.11"
django = "^4.2.0"
psycopg2-binary = "2.9.9"
`;
    const { dependencies } = parsePyprojectToml(content, 'pyproject.toml');
    expect(dependencies).toHaveLength(2);
    expect(dependencies.map(d => d.name)).toEqual(['django', 'psycopg2-binary']);
  });
});

describe('parseGoMod', () => {
  it('parses block and single requires', () => {
    const content = `
module github.com/example/api

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/stretchr/testify v1.8.4 // indirect
)

require go.uber.org/zap v1.26.0
`;
    const { dependencies } = parseGoMod(content, 'go.mod');
    expect(dependencies.length).toBeGreaterThanOrEqual(2);
    expect(dependencies.map(d => d.name)).toContain('github.com/gin-gonic/gin');
    expect(dependencies.map(d => d.name)).toContain('go.uber.org/zap');
  });
});

describe('parseCargoToml', () => {
  it('parses [dependencies] and [dev-dependencies]', () => {
    const content = `
[package]
name = "rust-service"
version = "0.1.0"

[dependencies]
tokio = { version = "1.36", features = ["full"] }
serde = "1.0"

[dev-dependencies]
criterion = "0.5"
`;
    const { dependencies, devDependencies } = parseCargoToml(content, 'Cargo.toml');
    expect(dependencies).toHaveLength(2);
    expect(dependencies.map(d => d.name)).toEqual(['tokio', 'serde']);
    expect(devDependencies).toHaveLength(1);
    expect(devDependencies[0].name).toBe('criterion');
  });
});

describe('parsePomXml', () => {
  it('parses Maven dependencies with scope', () => {
    const content = `
<project>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
      <version>3.2.0</version>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.10.0</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>
`;
    const { dependencies, devDependencies } = parsePomXml(content, 'pom.xml');
    expect(dependencies).toHaveLength(1);
    expect(dependencies[0].name).toBe('org.springframework.boot:spring-boot-starter-web');
    expect(devDependencies).toHaveLength(1);
    expect(devDependencies[0].name).toBe('org.junit.jupiter:junit-jupiter');
    expect(devDependencies[0].isDev).toBe(true);
  });
});

describe('parseManifestContent dispatcher', () => {
  it('returns full RepositoryManifest object', () => {
    const manifest = parseManifestContent(
      'package.json',
      JSON.stringify({ dependencies: { express: '^4.19.0' } })
    );
    expect(manifest.path).toBe('package.json');
    expect(manifest.ecosystem).toBe('npm');
    expect(manifest.dependencyCount).toBe(1);
    expect(manifest.dependencies[0].name).toBe('express');
  });
});

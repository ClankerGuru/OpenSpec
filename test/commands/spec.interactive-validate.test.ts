import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';
import { randomUUID } from 'crypto';

describe('spec validate (interactive behavior)', () => {
  const projectRoot = process.cwd();
  let testDir: string;
  let specsDir: string;
  const bin = path.join(projectRoot, 'bin', 'openspec.ts');


  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-test-${randomUUID()}`);
    specsDir = path.join(testDir, 'openspec', 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    const content = `## Purpose\nValid spec for interactive test.\n\n## Requirements\n\n### Requirement: X\nText`;
    await fs.mkdir(path.join(specsDir, 's1'), { recursive: true });
    await fs.writeFile(path.join(specsDir, 's1', 'spec.md'), content, 'utf-8');
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('errors when no arg and non-interactive', () => {
    const originalCwd = process.cwd();
    const originalEnv = { ...process.env };
    try {
      process.chdir(testDir);
      process.env.OPEN_SPEC_INTERACTIVE = '0';
      let err: any;
      try {
        execSync(`bun ${bin} spec validate`, { encoding: 'utf-8' });
      } catch (e) { err = e; }
      expect(err).toBeDefined();
      expect(err.status).not.toBe(0);
      expect(err.stderr.toString()).toContain('Missing required argument <spec-id>');
    } finally {
      process.chdir(originalCwd);
      process.env = originalEnv;
    }
  });
});



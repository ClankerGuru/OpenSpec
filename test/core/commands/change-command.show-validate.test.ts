import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { ChangeCommand } from '../../../src/commands/change.js';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';
import { randomUUID } from 'crypto';

describe('ChangeCommand.show/validate', () => {
  let cmd: ChangeCommand;
  let changeName: string;
  let tempRoot: string;
  let originalCwd: string;
  let consoleSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;

  beforeEach(async () => {
    cmd = new ChangeCommand();
    originalCwd = process.cwd();
    tempRoot = path.join(os.tmpdir(), `openspec-change-command-${randomUUID()}`);
    const changesDir = path.join(tempRoot, 'openspec', 'changes', 'sample-change');
    await fs.mkdir(changesDir, { recursive: true });
    const proposal = `# Change: Sample Change\n\n## Why\nConsistency in tests.\n\n## What Changes\n- **auth:** Add requirement`;
    await fs.writeFile(path.join(changesDir, 'proposal.md'), proposal, 'utf-8');
    process.chdir(tempRoot);
    changeName = 'sample-change';
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.chdir(originalCwd);
    process.exitCode = 0;
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('show --json prints JSON including deltas', async () => {
    consoleSpy.mockClear();

    await cmd.show(changeName, { json: true });

    const output = consoleSpy.mock.calls.flat().join('\n');
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('deltas');
    expect(Array.isArray(parsed.deltas)).toBe(true);
  });

  it('error when no change specified: prints available IDs', async () => {
    consoleErrorSpy.mockClear();

    await cmd.show(undefined as unknown as string, { json: false, noInteractive: true });

    expect(process.exitCode).toBe(1);
    const errOut = consoleErrorSpy.mock.calls.flat().join('\n');
    expect(errOut).toMatch(/No change specified/);
    expect(errOut).toMatch(/Available IDs/);
  });

  it('show --json --requirements-only returns minimal object with deltas (deprecated alias)', async () => {
    consoleSpy.mockClear();

    await cmd.show(changeName, { json: true, requirementsOnly: true });

    const output = consoleSpy.mock.calls.flat().join('\n');
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('deltas');
    expect(Array.isArray(parsed.deltas)).toBe(true);
    if (parsed.deltas.length > 0) {
      expect(parsed.deltas[0]).toHaveProperty('spec');
      expect(parsed.deltas[0]).toHaveProperty('operation');
      expect(parsed.deltas[0]).toHaveProperty('description');
    }
  });

  it('validate --strict --json returns a report with valid boolean', async () => {
    consoleSpy.mockClear();

    await cmd.validate(changeName, { strict: true, json: true });

    const output = consoleSpy.mock.calls.flat().join('\n');
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('valid');
    expect(parsed).toHaveProperty('issues');
    expect(Array.isArray(parsed.issues)).toBe(true);
  });
});

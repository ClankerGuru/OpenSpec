#!/usr/bin/env bun

import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

function log(msg: string): void {
  if (process.env.CI) return;
  console.log(msg);
}

function run(cmd: string, args: string[], opts: Record<string, unknown> = {}): string {
  return execFileSync(cmd, args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

function bunPack(): string {
  const out = run('bun', ['pm', 'pack']).trim();
  const lines = out.split(/\r?\n/);
  return lines[lines.length - 1].trim();
}

function main(): void {
  const pkg = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
  const expected = pkg.version;

  let work: string | undefined;
  let tgzPath: string | undefined;

  try {
    log(`Packing @clanker-guru/openspec@${expected}...`);
    const filename = bunPack();
    tgzPath = path.resolve(filename);
    log(`Created: ${tgzPath}`);

    work = mkdtempSync(path.join(tmpdir(), 'openspec-pack-check-'));
    log(`Temp dir: ${work}`);

    writeFileSync(
      path.join(work, 'package.json'),
      JSON.stringify({ name: 'pack-check', private: true }, null, 2)
    );

    run('bun', ['add', tgzPath], { cwd: work });

    const binRel = path.join('node_modules', '@clanker-guru', 'openspec', 'bin', 'openspec.ts');
    const actual = run('bun', [binRel, '--version'], { cwd: work }).trim();

    if (actual !== expected) {
      throw new Error(
        `Packed CLI version mismatch: expected ${expected}, got ${actual}. ` +
          'Ensure the dist is built and the CLI reads version from package.json.'
      );
    }

    log('Version check passed.');
  } finally {
    if (work) {
      try { rmSync(work, { recursive: true, force: true }); } catch {}
    }
    if (tgzPath) {
      try { rmSync(tgzPath, { force: true }); } catch {}
    }
  }
}

try {
  main();
  console.log('✅ pack-version-check: OK');
} catch (err) {
  console.error(`❌ pack-version-check: ${(err as Error).message}`);
  process.exit(1);
}

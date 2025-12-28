#!/usr/bin/env bun

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function shouldSkipInstallation(): { skip: boolean; reason?: string } {
  if (process.env.CI === 'true' || process.env.CI === '1') {
    return { skip: true, reason: 'CI environment detected' };
  }

  if (process.env.OPENSPEC_NO_COMPLETIONS === '1') {
    return { skip: true, reason: 'OPENSPEC_NO_COMPLETIONS=1 set' };
  }

  return { skip: false };
}

async function distExists(): Promise<boolean> {
  const distPath = path.join(__dirname, '..', 'dist');
  try {
    const stat = await fs.stat(distPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function detectShell(): Promise<string | undefined> {
  try {
    const { detectShell } = await import('../dist/utils/shell-detection.js');
    const result = detectShell();
    return result.shell;
  } catch {
    return undefined;
  }
}

async function installCompletions(shell: string): Promise<void> {
  try {
    const { CompletionFactory } = await import('../dist/core/completions/factory.js');
    const { COMMAND_REGISTRY } = await import('../dist/core/completions/command-registry.js');

    if (!CompletionFactory.isSupported(shell)) {
      console.log(`\nTip: Run 'openspec completion install' for shell completions`);
      return;
    }

    const generator = CompletionFactory.createGenerator(shell);
    const script = generator.generate(COMMAND_REGISTRY);

    const installer = CompletionFactory.createInstaller(shell);
    const result = await installer.install(script);

    if (result.success) {
      if (result.isOhMyZsh) {
        console.log(`✓ Shell completions installed`);
        console.log(`  Restart shell: exec zsh`);
      } else if (result.zshrcConfigured) {
        console.log(`✓ Shell completions installed and configured`);
        console.log(`  Restart shell: exec zsh`);
      } else {
        console.log(`✓ Shell completions installed to ~/.zsh/completions/`);
        console.log(`  Add to ~/.zshrc: fpath=(~/.zsh/completions $fpath)`);
        console.log(`  Then: exec zsh`);
      }
    } else {
      console.log(`\nTip: Run 'openspec completion install' for shell completions`);
    }
  } catch {
    console.log(`\nTip: Run 'openspec completion install' for shell completions`);
  }
}

async function main(): Promise<void> {
  try {
    const skipCheck = shouldSkipInstallation();
    if (skipCheck.skip) {
      return;
    }

    if (!(await distExists())) {
      return;
    }

    const shell = await detectShell();
    if (!shell) {
      console.log(`\nTip: Run 'openspec completion install' for shell completions`);
      return;
    }

    await installCompletions(shell);
  } catch {
    console.log(`\nTip: Run 'openspec completion install' for shell completions`);
  }
}

main().catch(() => {
  process.exit(0);
});

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..', '..');
const cliEntry = path.join(projectRoot, 'dist', 'cli', 'index.js');

let buildPromise: Promise<void> | undefined;

interface RunCommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

interface RunCLIOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  timeoutMs?: number;
}

export interface RunCLIResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  command: string;
}

function runCommand(command: string, args: string[], options: RunCommandOptions = {}) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? projectRoot,
      env: { ...process.env, ...options.env },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', (error) => reject(error));
    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        const reason = signal ? `signal ${signal}` : `exit code ${code}`;
        reject(new Error(`Command failed (${reason}): ${command} ${args.join(' ')}`));
      }
    });
  });
}

export async function ensureCliBuilt() {
  if (existsSync(cliEntry)) {
    return;
  }

  if (!buildPromise) {
    buildPromise = runCommand('bun', ['run', 'build']).catch((error) => {
      buildPromise = undefined;
      throw error;
    });
  }

  await buildPromise;

  if (!existsSync(cliEntry)) {
    throw new Error('CLI entry point missing after build. Expected dist/cli/index.js');
  }
}

const DEFAULT_TIMEOUT_MS = 30000;

export async function runCLI(args: string[] = [], options: RunCLIOptions = {}): Promise<RunCLIResult> {
  await ensureCliBuilt();

  const finalArgs = Array.isArray(args) ? args : [args];
  const invocation = [cliEntry, ...finalArgs].join(' ');

  return new Promise<RunCLIResult>((resolve, reject) => {
    const child = spawn('bun', [cliEntry, ...finalArgs], {
      cwd: options.cwd ?? projectRoot,
      env: {
        ...process.env,
        OPEN_SPEC_INTERACTIVE: '0',
        ...options.env,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      shell: process.platform === 'win32',
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout?.setEncoding('utf-8');
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });

    child.stderr?.setEncoding('utf-8');
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      if (timeout) clearTimeout(timeout);
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.stdin?.destroy();
      reject(error);
    });

    child.on('close', (code, signal) => {
      if (timeout) clearTimeout(timeout);
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.stdin?.destroy();
      resolve({
        exitCode: code,
        signal,
        stdout,
        stderr,
        timedOut,
        command: `bun ${invocation}`,
      });
    });

    if (options.input && child.stdin) {
      child.stdin.end(options.input);
    } else if (child.stdin) {
      child.stdin.end();
    }
  });
}

export const cliProjectRoot = projectRoot;

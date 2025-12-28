#!/usr/bin/env bun

import { existsSync, rmSync } from 'fs';
import { $ } from 'bun';

console.log('🔨 Building OpenSpec...\n');

if (existsSync('dist')) {
  console.log('Cleaning dist directory...');
  rmSync('dist', { recursive: true, force: true });
}

console.log('Compiling TypeScript...');
try {
  await $`bun x tsc --version`;
  await $`bun x tsc`;
  console.log('\n✅ Build completed successfully!');
} catch {
  console.error('\n❌ Build failed!');
  process.exit(1);
}

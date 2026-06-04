#!/usr/bin/env node
/**
 * NetVault — bench-index.mjs
 * Benchmarks the main-process file indexer performance.
 *
 * Usage:
 *   node scripts/bench-index.mjs [path] [maxDepth]
 *
 * Example:
 *   node scripts/bench-index.mjs C:\Users\User\Documents 5
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rootPath = process.argv[2] || process.env.USERPROFILE || process.env.HOME || 'C:\\';
const maxDepth = parseInt(process.argv[3] ?? '5', 10);

let fileCount = 0;
let dirCount = 0;

async function scan(dirPath, depth) {
  if (depth <= 0) return;
  let entries;
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }
  await Promise.all(entries.map(async entry => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      dirCount++;
      await scan(fullPath, depth - 1);
    } else {
      fileCount++;
      try { await fs.promises.stat(fullPath); } catch { /* skip */ }
    }
  }));
}

console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║     NetVault — Index Benchmark (Node)        ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');
console.log(`  Root path : ${rootPath}`);
console.log(`  Max depth : ${maxDepth}`);
console.log('');
console.log('  Scanning…');

const t0 = performance.now();
await scan(rootPath, maxDepth);
const elapsed = performance.now() - t0;

const total = fileCount + dirCount;
const fps = Math.round(total / (elapsed / 1000));

console.log('');
console.log(`  Files     : ${fileCount.toLocaleString()}`);
console.log(`  Dirs      : ${dirCount.toLocaleString()}`);
console.log(`  Total     : ${total.toLocaleString()} entries`);
console.log(`  Elapsed   : ${elapsed.toFixed(0)} ms`);
console.log(`  Speed     : ${fps.toLocaleString()} entries/s`);
console.log('');
console.log('  Tip: Run again on a Rust binary for comparison (Ola 6).');
console.log('');

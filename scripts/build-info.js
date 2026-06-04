#!/usr/bin/env node
/**
 * NetVault Build Script
 * Shows build information and version
 */

const path = require('path');
const fs = require('fs');

const packageJson = require('../package.json');

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                    NetVault Build Script                      ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`  📦 Name:    ${packageJson.name}`);
console.log(`  📇 Version: ${packageJson.version}`);
console.log(`  📝 Desc:    ${packageJson.description}`);
console.log(`  👤 Author:  ${packageJson.author}`);
console.log('');
console.log('  Building for: Windows x64');
console.log('');

// Ensure output directories exist
const dirs = ['dist', 'dist-electron', 'release', 'build', 'assets'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`  ✓ Created: ${dir}/`);
  }
});

console.log('');
console.log('  Ready to build!');
console.log('');
console.log('  Commands:');
console.log('    npm run build        - Build frontend + electron');
console.log('    npm run electron:dev - Development mode');
console.log('    npm run dist         - Create distributable (.exe)');
console.log('    npm run dist:dir     - Build without packaging (faster)');
console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
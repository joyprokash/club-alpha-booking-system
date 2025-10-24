#!/usr/bin/env node

import { build as viteBuild } from 'vite';
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🏗️  Building Club Alpha for Production...\n');

try {
  // Step 1: Build frontend with Vite
  console.log('📦 Step 1/2: Building frontend with Vite...');
  await viteBuild({
    build: {
      outDir: '../dist/public',
      emptyOutDir: true,
    },
  });
  console.log('✅ Frontend build complete\n');

  // Step 2: Build backend with esbuild (production entry point - NO VITE)
  console.log('⚙️  Step 2/2: Building backend with esbuild...');
  await esbuild.build({
    entryPoints: ['server/index.production.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: 'dist/index.js',
    packages: 'external',
    banner: {
      js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`,
    },
  });
  console.log('✅ Backend build complete\n');

  console.log('🎉 Production build complete!\n');
  console.log('📂 Output:');
  console.log('   - Frontend: dist/public/');
  console.log('   - Backend:  dist/index.js\n');
  console.log('🚀 Ready to deploy!\n');

} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
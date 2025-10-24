#!/bin/bash

echo "🏗️  Building Club Alpha for Production..."
echo ""

# Step 1: Build frontend with Vite
echo "📦 Building frontend..."
npx vite build --outDir dist/public --emptyOutDir
echo "✅ Frontend build complete"
echo ""

# Step 2: Build backend using production entry point (no Vite dependency)
echo "⚙️  Building backend..."
npx esbuild server/index.production.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist \
  --banner:js="import { createRequire } from 'module'; import { fileURLToPath } from 'url'; import { dirname } from 'path'; const require = createRequire(import.meta.url); const __filename = fileURLToPath(import.meta.url); const __dirname = dirname(__filename);"

# Rename the output file
mv dist/index.production.js dist/index.js

echo "✅ Backend build complete"
echo ""
echo "🎉 Production build complete!"
echo ""
echo "📂 Output:"
echo "   - Frontend: dist/public/"
echo "   - Backend:  dist/index.js"
echo ""
echo "🚀 Ready to deploy to Digital Ocean!"

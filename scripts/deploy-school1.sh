#!/bin/bash

# Deploy script for Waldorf Beispielstadt (school1)
set -e

echo "🚀 Deploying Waldorf Beispielstadt (school1)..."

# Set environment variable for school
export VITE_SCHOOL_ID="school1"

# Build the application
echo "📦 Building application..."
pnpm run build

# Deploy to Firebase
echo "🔥 Deploying to Firebase..."
firebase use "school1"
firebase deploy --only hosting,firestore

echo "✅ Deployment complete!"
echo "🌐 Your site should be available at: https://school1.web.app"
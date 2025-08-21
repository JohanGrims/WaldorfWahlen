#!/bin/bash

# Deploy script for Freie Waldorfschule Musterort (school2)
set -e

echo "🚀 Deploying Freie Waldorfschule Musterort (school2)..."

# Set environment variable for school
export VITE_SCHOOL_ID="school2"

# Build the application
echo "📦 Building application..."
pnpm run build

# Deploy to Firebase
echo "🔥 Deploying to Firebase..."
firebase use "school2"
firebase deploy --only hosting,firestore

echo "✅ Deployment complete!"
echo "🌐 Your site should be available at: https://school2.web.app"
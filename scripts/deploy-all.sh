#!/bin/bash

# Deploy all schools to their respective Firebase projects
# Usage: ./deploy-all.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_ROOT/school-configs.json"

echo "🚀 Multi-school deployment starting..."

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is required but not installed."
    exit 1
fi

# Check if Firebase CLI is available
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: Firebase CLI is required but not installed."
    echo "   Install with: npm install -g firebase-tools"
    exit 1
fi

# Get list of schools
SCHOOLS=$(jq -r '.schools | keys[]' "$CONFIG_FILE")

echo "🏫 Found schools: $(echo $SCHOOLS | tr '\n' ' ')"

# Deploy each school
for SCHOOL_ID in $SCHOOLS; do
    echo ""
    echo "🏫 Deploying $SCHOOL_ID..."
    
    # Get Firebase project ID for this school
    PROJECT_ID=$(jq -r ".schools.\"$SCHOOL_ID\".firebase.projectId" "$CONFIG_FILE")
    SCHOOL_NAME=$(jq -r ".schools.\"$SCHOOL_ID\".name" "$CONFIG_FILE")
    
    echo "   📋 School: $SCHOOL_NAME"
    echo "   🔥 Project: $PROJECT_ID"
    
    # Configure files for this school
    echo "   🔧 Configuring files..."
    "$SCRIPT_DIR/build-school.sh" "$SCHOOL_ID"
    
    # Build the project
    echo "   🔨 Building..."
    cd "$PROJECT_ROOT"
    pnpm run build
    
    # Deploy to Firebase
    echo "   🚀 Deploying to Firebase..."
    firebase deploy --project "$PROJECT_ID" --only hosting
    
    # Restore original files
    echo "   🔄 Restoring original files..."
    "$SCRIPT_DIR/restore-original.sh"
    
    echo "   ✅ $SCHOOL_NAME deployed successfully!"
done

echo ""
echo "🎉 All schools deployed successfully!"
echo ""
echo "🌐 Deployed sites:"
for SCHOOL_ID in $SCHOOLS; do
    PROJECT_ID=$(jq -r ".schools.\"$SCHOOL_ID\".firebase.projectId" "$CONFIG_FILE")
    SCHOOL_NAME=$(jq -r ".schools.\"$SCHOOL_ID\".name" "$CONFIG_FILE")
    echo "   • $SCHOOL_NAME: https://$PROJECT_ID.web.app"
done
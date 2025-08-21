#!/bin/bash

# Create a new Firebase project for a school
# Usage: ./create-firebase-project.sh [school_id]

set -e

SCHOOL_ID=${1}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_ROOT/school-configs.json"

if [ -z "$SCHOOL_ID" ]; then
    echo "❌ Error: School ID is required"
    echo "Usage: $0 [school_id]"
    echo ""
    echo "Available schools:"
    jq -r '.schools | keys[]' "$CONFIG_FILE" 2>/dev/null || echo "   No configuration found"
    exit 1
fi

# Check if Firebase CLI is available
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: Firebase CLI is required but not installed."
    echo "   Install with: npm install -g firebase-tools"
    exit 1
fi

# Get school configuration
SCHOOL_CONFIG=$(jq ".schools.\"$SCHOOL_ID\"" "$CONFIG_FILE")
if [ "$SCHOOL_CONFIG" == "null" ]; then
    echo "❌ Error: School '$SCHOOL_ID' not found in configuration"
    exit 1
fi

SCHOOL_NAME=$(echo "$SCHOOL_CONFIG" | jq -r '.name')
PROJECT_ID=$(echo "$SCHOOL_CONFIG" | jq -r '.firebase.projectId')

echo "🏫 Creating Firebase project for: $SCHOOL_NAME"
echo "📋 Project ID: $PROJECT_ID"

# Login to Firebase (if not already logged in)
echo "🔐 Checking Firebase authentication..."
if ! firebase projects:list &>/dev/null; then
    echo "   Please log in to Firebase CLI:"
    firebase login
fi

# Create the Firebase project
echo "🔥 Creating Firebase project..."
firebase projects:create "$PROJECT_ID" --display-name "$SCHOOL_NAME"

# Initialize Firebase in the project
echo "⚙️  Initializing Firebase services..."
cd "$PROJECT_ROOT"

# Create temporary firebase init config
cat > "/tmp/firebase-init-answers.txt" << EOF
? Please select an option: Use an existing project
? Select a default Firebase project for this directory: $PROJECT_ID
? What do you want to use as your public directory? dist
? Configure as a single-page app (rewrite all urls to /index.html)? Yes
? Set up automatic builds and deploys with GitHub? No
? File dist/index.html already exists. Overwrite? No
? What file should be used for Firestore Rules? firestore.rules
? File firestore.rules already exists. Overwrite? No
? What file should be used for Firestore indexes? firestore.indexes.json
EOF

# Initialize hosting and firestore
firebase init hosting firestore --project "$PROJECT_ID"

echo "🔐 Setting up App Check..."
echo "   Please manually set up App Check in the Firebase Console:"
echo "   1. Go to https://console.firebase.google.com/project/$PROJECT_ID/appcheck"
echo "   2. Register your app for App Check"
echo "   3. Set up reCAPTCHA Enterprise"
echo "   4. Update the App Check site key in school-configs.json"

echo "🔑 Setting up Authentication..."
echo "   Please manually set up Authentication in the Firebase Console:"
echo "   1. Go to https://console.firebase.google.com/project/$PROJECT_ID/authentication"
echo "   2. Enable Email/Password authentication"
echo "   3. Add authorized users as needed"

echo "🗄️  Setting up Firestore..."
echo "   Deploying Firestore rules..."
firebase deploy --project "$PROJECT_ID" --only firestore:rules

echo "🐍 Setting up Python service account..."
echo "   Please manually create a service account:"
echo "   1. Go to https://console.firebase.google.com/project/$PROJECT_ID/settings/serviceaccounts/adminsdk"
echo "   2. Click 'Generate new private key'"
echo "   3. Save the JSON file as 'python/$(echo "$SCHOOL_CONFIG" | jq -r '.python.serviceAccount')'"

echo ""
echo "✅ Firebase project created successfully!"
echo "🌐 Project URL: https://console.firebase.google.com/project/$PROJECT_ID"
echo "📝 Next steps:"
echo "   1. Complete App Check setup (get site key)"
echo "   2. Update school-configs.json with real Firebase config values"
echo "   3. Set up authentication users"
echo "   4. Download and save service account JSON"
echo "   5. Test deployment with: ./scripts/deploy-all.sh"
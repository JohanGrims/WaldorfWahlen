#!/bin/bash

# Multi-school build script
# Usage: ./build-school.sh [school_id]
# If no school_id provided, builds for 'waldorfwahlen' (default)

set -e

SCHOOL_ID=${1:-waldorfwahlen}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_ROOT/school-configs.json"

echo "🏫 Building for school: $SCHOOL_ID"

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is required but not installed. Please install jq."
    echo "   Ubuntu/Debian: sudo apt-get install jq"
    echo "   macOS: brew install jq"
    exit 1
fi

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Error: Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Extract school configuration
SCHOOL_CONFIG=$(jq ".schools.\"$SCHOOL_ID\"" "$CONFIG_FILE")
if [ "$SCHOOL_CONFIG" == "null" ]; then
    echo "❌ Error: School '$SCHOOL_ID' not found in configuration"
    echo "Available schools:"
    jq -r '.schools | keys[]' "$CONFIG_FILE"
    exit 1
fi

echo "📋 Configuration loaded for: $(echo "$SCHOOL_CONFIG" | jq -r '.name')"

# Create backup of original files if they don't exist
BACKUP_DIR="$PROJECT_ROOT/.backups"
mkdir -p "$BACKUP_DIR"

if [ ! -f "$BACKUP_DIR/firebase.ts.orig" ]; then
    cp "$PROJECT_ROOT/src/firebase.ts" "$BACKUP_DIR/firebase.ts.orig"
fi
if [ ! -f "$BACKUP_DIR/index.html.orig" ]; then
    cp "$PROJECT_ROOT/index.html" "$BACKUP_DIR/index.html.orig"
fi
if [ ! -f "$BACKUP_DIR/python-assign.py.orig" ] && [ -f "$PROJECT_ROOT/python/assign.py" ]; then
    cp "$PROJECT_ROOT/python/assign.py" "$BACKUP_DIR/python-assign.py.orig"
fi

# Extract configuration values
SCHOOL_NAME=$(echo "$SCHOOL_CONFIG" | jq -r '.name')
SCHOOL_SHORT_NAME=$(echo "$SCHOOL_CONFIG" | jq -r '.shortName')
LOGO_FILE=$(echo "$SCHOOL_CONFIG" | jq -r '.logo')
FAVICON_FILE=$(echo "$SCHOOL_CONFIG" | jq -r '.favicon')
PRIMARY_COLOR=$(echo "$SCHOOL_CONFIG" | jq -r '.primaryColor')
CONTACT_EMAIL=$(echo "$SCHOOL_CONFIG" | jq -r '.contactEmail')

# Firebase config
FB_API_KEY=$(echo "$SCHOOL_CONFIG" | jq -r '.firebase.apiKey')
FB_AUTH_DOMAIN=$(echo "$SCHOOL_CONFIG" | jq -r '.firebase.authDomain')
FB_PROJECT_ID=$(echo "$SCHOOL_CONFIG" | jq -r '.firebase.projectId')
FB_STORAGE_BUCKET=$(echo "$SCHOOL_CONFIG" | jq -r '.firebase.storageBucket')
FB_MESSAGING_SENDER_ID=$(echo "$SCHOOL_CONFIG" | jq -r '.firebase.messagingSenderId')
FB_APP_ID=$(echo "$SCHOOL_CONFIG" | jq -r '.firebase.appId')
FB_MEASUREMENT_ID=$(echo "$SCHOOL_CONFIG" | jq -r '.firebase.measurementId')

# App Check config
APPCHECK_SITE_KEY=$(echo "$SCHOOL_CONFIG" | jq -r '.appCheck.siteKey')

# Python config
PYTHON_SERVICE_ACCOUNT=$(echo "$SCHOOL_CONFIG" | jq -r '.python.serviceAccount')

echo "🔧 Updating Firebase configuration..."

# Update firebase.ts with school-specific configuration
cat > "$PROJECT_ROOT/src/firebase.ts" << EOF
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean;
  }

  interface ImportMeta {
    env: {
      [key: string]: string | boolean | undefined;
      VITE_APP_CHECK_DEBUG_TOKEN_FROM_CI?: string;
    };
  }
}

const firebaseConfig = {
  apiKey: "$FB_API_KEY",
  authDomain: "$FB_AUTH_DOMAIN",
  projectId: "$FB_PROJECT_ID",
  storageBucket: "$FB_STORAGE_BUCKET",
  messagingSenderId: "$FB_MESSAGING_SENDER_ID",
  appId: "$FB_APP_ID",
  measurementId: "$FB_MEASUREMENT_ID",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Create a ReCaptchaEnterpriseProvider instance using your reCAPTCHA Enterprise
// site key and pass it to initializeAppCheck().

if (window.location.hostname === "localhost") {
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

if (import.meta.env.VITE_APP_CHECK_DEBUG_TOKEN_FROM_CI) {
  window.FIREBASE_APPCHECK_DEBUG_TOKEN =
    import.meta.env.VITE_APP_CHECK_DEBUG_TOKEN_FROM_CI;
}
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(
    "$APPCHECK_SITE_KEY"
  ),
  isTokenAutoRefreshEnabled: true, // Set to true to allow auto-refresh.
});

const db = getFirestore(app);
const auth = getAuth(app);

export { auth, db, appCheck };
EOF

echo "🌐 Updating HTML title and favicon..."

# Update index.html with school-specific title and favicon
sed -i.bak \
    -e "s|<title>.*</title>|<title>$SCHOOL_NAME - WaldorfWahlen</title>|" \
    -e "s|href=\"/favicon.ico\"|href=\"/$FAVICON_FILE\"|" \
    "$PROJECT_ROOT/index.html"

echo "🎨 Updating CSS variables..."

# Update CSS primary color if there's a custom color
if [ -f "$PROJECT_ROOT/src/styles.css" ]; then
    sed -i.bak "s|#f89e24|$PRIMARY_COLOR|g" "$PROJECT_ROOT/src/styles.css"
fi

echo "🐍 Updating Python configuration..."

# Update Python assign.py with school-specific service account
if [ -f "$PROJECT_ROOT/python/assign.py" ]; then
    sed -i.bak \
        -e "s|waldorfwahlen-service-account.json|$PYTHON_SERVICE_ACCOUNT|g" \
        "$PROJECT_ROOT/python/assign.py"
fi

echo "📁 Copying school-specific assets..."

# Copy school-specific logo and favicon if they exist
ASSETS_DIR="$PROJECT_ROOT/assets/$SCHOOL_ID"
if [ -d "$ASSETS_DIR" ]; then
    if [ -f "$ASSETS_DIR/$LOGO_FILE" ]; then
        cp "$ASSETS_DIR/$LOGO_FILE" "$PROJECT_ROOT/public/"
        echo "   ✓ Copied logo: $LOGO_FILE"
    fi
    if [ -f "$ASSETS_DIR/$FAVICON_FILE" ]; then
        cp "$ASSETS_DIR/$FAVICON_FILE" "$PROJECT_ROOT/public/"
        echo "   ✓ Copied favicon: $FAVICON_FILE"
    fi
else
    echo "   ⚠️  Assets directory not found: $ASSETS_DIR"
    echo "   Create assets/$SCHOOL_ID/ and add $LOGO_FILE and $FAVICON_FILE"
fi

echo "✅ Configuration complete for $SCHOOL_NAME"
echo "🔨 Ready to build with: pnpm run build"
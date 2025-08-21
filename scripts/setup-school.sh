#!/bin/bash

# WaldorfWahlen Multi-School Setup Script
# This script helps set up a new school configuration and Firebase project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏫 WaldorfWahlen Multi-School Setup${NC}"
echo "========================================"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI is not installed.${NC}"
    echo "Please install it first: npm install -g firebase-tools"
    exit 1
fi

# Get school information
echo -e "\n${YELLOW}📝 School Information${NC}"
read -p "School ID (lowercase, no spaces, e.g., 'school1'): " SCHOOL_ID
read -p "School Name (e.g., 'Waldorfschule Beispielstadt'): " SCHOOL_NAME
read -p "School Short Name (e.g., 'WS Beispielstadt'): " SCHOOL_SHORT_NAME
read -p "Contact Email: " CONTACT_EMAIL
read -p "Website URL (optional): " WEBSITE
read -p "Primary Color (hex, e.g., '#f89e24'): " PRIMARY_COLOR
read -p "Firebase Project ID (e.g., '${SCHOOL_ID}'): " PROJECT_ID

# Validate inputs
if [[ -z "$SCHOOL_ID" || -z "$SCHOOL_NAME" || -z "$SCHOOL_SHORT_NAME" || -z "$CONTACT_EMAIL" || -z "$PROJECT_ID" ]]; then
    echo -e "${RED}❌ All required fields must be filled.${NC}"
    exit 1
fi

# Check if config already exists
CONFIG_FILE="configs/${SCHOOL_ID}.json"
if [[ -f "$CONFIG_FILE" ]]; then
    echo -e "${YELLOW}⚠️  Configuration file $CONFIG_FILE already exists.${NC}"
    read -p "Do you want to overwrite it? (y/N): " OVERWRITE
    if [[ "$OVERWRITE" != "y" && "$OVERWRITE" != "Y" ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

echo -e "\n${YELLOW}🔧 Creating configuration file...${NC}"

# Create config file
cat > "$CONFIG_FILE" << EOF
{
  "school": {
    "id": "$SCHOOL_ID",
    "name": "$SCHOOL_NAME",
    "shortName": "$SCHOOL_SHORT_NAME",
    "logo": "/logos/${SCHOOL_ID}-logo.png",
    "favicon": "/favicons/${SCHOOL_ID}-favicon.ico",
    "primaryColor": "${PRIMARY_COLOR:-#f89e24}",
    "secondaryColor": "#2196F3",
    "contactEmail": "$CONTACT_EMAIL",
    "website": "${WEBSITE:-https://${SCHOOL_ID}.example.com}",
    "address": {
      "street": "Musterstraße 123",
      "city": "12345 Musterstadt",
      "country": "Deutschland"
    }
  },
  "firebase": {
    "apiKey": "your-api-key-here",
    "authDomain": "${PROJECT_ID}.firebaseapp.com",
    "projectId": "$PROJECT_ID",
    "storageBucket": "${PROJECT_ID}.appspot.com",
    "messagingSenderId": "123456789012",
    "appId": "1:123456789012:web:abcdef123456789",
    "measurementId": "G-XXXXXXXXXX"
  },
  "appCheck": {
    "siteKey": "your-recaptcha-site-key-here"
  },
  "features": {
    "proposals": true,
    "feedback": true,
    "analytics": true,
    "email": true
  },
  "ui": {
    "theme": "dark",
    "language": "de",
    "title": "Projektwahlen {{schoolName}}",
    "welcomeMessage": "Willkommen zu den Projektwahlen der {{schoolName}}",
    "footerText": "© 2024 {{schoolName}} - Powered by WaldorfWahlen"
  }
}
EOF

echo -e "${GREEN}✅ Configuration file created: $CONFIG_FILE${NC}"

# Firebase project setup
echo -e "\n${YELLOW}🔥 Firebase Project Setup${NC}"
echo "Please follow these steps to set up your Firebase project:"
echo ""
echo "1. Go to https://console.firebase.google.com"
echo "2. Create a new project with ID: $PROJECT_ID"
echo "3. Enable the following services:"
echo "   - Authentication (Email/Password)"
echo "   - Firestore Database"
echo "   - Hosting"
echo "   - App Check (with reCAPTCHA Enterprise)"
echo ""
echo "4. Get your Firebase configuration from Project Settings > General > Your apps"
echo "5. Update the firebase section in $CONFIG_FILE with your actual values"
echo ""
echo "6. Set up App Check:"
echo "   - Go to Project Settings > App Check"
echo "   - Register your app for reCAPTCHA Enterprise"
echo "   - Update the appCheck.siteKey in $CONFIG_FILE"

# Create Firebase project alias
read -p "Do you want to add this project as a Firebase alias? (y/N): " ADD_ALIAS
if [[ "$ADD_ALIAS" == "y" || "$ADD_ALIAS" == "Y" ]]; then
    echo -e "\n${YELLOW}🔗 Adding Firebase project alias...${NC}"
    firebase use --add "$PROJECT_ID" --alias "$SCHOOL_ID" || echo -e "${YELLOW}⚠️  You can add the alias manually later with: firebase use --add $PROJECT_ID --alias $SCHOOL_ID${NC}"
fi

# Create deployment script
echo -e "\n${YELLOW}📦 Creating deployment script...${NC}"
DEPLOY_SCRIPT="scripts/deploy-${SCHOOL_ID}.sh"
cat > "$DEPLOY_SCRIPT" << EOF
#!/bin/bash

# Deploy script for $SCHOOL_NAME
set -e

echo "🚀 Deploying $SCHOOL_NAME ($SCHOOL_ID)..."

# Set environment variable for school
export VITE_SCHOOL_ID="$SCHOOL_ID"

# Build the application
echo "📦 Building application..."
pnpm run build

# Deploy to Firebase
echo "🔥 Deploying to Firebase..."
firebase use "$SCHOOL_ID"
firebase deploy --only hosting,firestore

echo "✅ Deployment complete!"
echo "🌐 Your site should be available at: https://$PROJECT_ID.web.app"
EOF

chmod +x "$DEPLOY_SCRIPT"
echo -e "${GREEN}✅ Deployment script created: $DEPLOY_SCRIPT${NC}"

# Create environment file
ENV_FILE=".env.${SCHOOL_ID}"
cat > "$ENV_FILE" << EOF
# Environment configuration for $SCHOOL_NAME
VITE_SCHOOL_ID=$SCHOOL_ID
EOF

echo -e "${GREEN}✅ Environment file created: $ENV_FILE${NC}"

# Summary
echo -e "\n${GREEN}🎉 Setup Complete!${NC}"
echo "========================================"
echo -e "📁 Configuration file: ${BLUE}$CONFIG_FILE${NC}"
echo -e "🚀 Deployment script: ${BLUE}$DEPLOY_SCRIPT${NC}"
echo -e "🌍 Environment file: ${BLUE}$ENV_FILE${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update the Firebase configuration in $CONFIG_FILE"
echo "2. Add your school's logo to public/logos/${SCHOOL_ID}-logo.png"
echo "3. Add your school's favicon to public/favicons/${SCHOOL_ID}-favicon.ico"
echo "4. Deploy Firestore rules: firebase deploy --only firestore --project $PROJECT_ID"
echo "5. Deploy the application: ./scripts/deploy-${SCHOOL_ID}.sh"
echo ""
echo -e "${BLUE}Happy voting! 🗳️${NC}"
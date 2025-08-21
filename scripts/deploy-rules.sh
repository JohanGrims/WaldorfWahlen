#!/bin/bash

# Deploy Firestore rules to multiple projects
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔥 WaldorfWahlen Firestore Rules Deployment${NC}"
echo "============================================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI is not installed.${NC}"
    echo "Please install it first: npm install -g firebase-tools"
    exit 1
fi

# Check if firestore.rules exists
if [[ ! -f "firestore.rules" ]]; then
    echo -e "${RED}❌ firestore.rules file not found.${NC}"
    exit 1
fi

# Get list of available projects from configs
echo -e "\n${YELLOW}📋 Available school configurations:${NC}"
CONFIGS=(configs/*.json)
SCHOOLS=()

for config in "${CONFIGS[@]}"; do
    if [[ -f "$config" ]]; then
        school_id=$(basename "$config" .json)
        SCHOOLS+=("$school_id")
        echo "  - $school_id"
    fi
done

if [[ ${#SCHOOLS[@]} -eq 0 ]]; then
    echo -e "${RED}❌ No school configurations found in configs/ directory.${NC}"
    exit 1
fi

# Allow user to select schools or deploy to all
echo -e "\n${YELLOW}🎯 Deployment Options:${NC}"
echo "1. Deploy to all schools"
echo "2. Deploy to specific school(s)"
echo "3. Cancel"

read -p "Choose an option (1-3): " CHOICE

case $CHOICE in
    1)
        SELECTED_SCHOOLS=("${SCHOOLS[@]}")
        echo -e "${BLUE}📤 Deploying to all schools...${NC}"
        ;;
    2)
        echo -e "\n${YELLOW}Select schools (space-separated, e.g., 'school1 school2'):${NC}"
        read -p "Schools: " SCHOOL_INPUT
        IFS=' ' read -ra SELECTED_SCHOOLS <<< "$SCHOOL_INPUT"
        
        # Validate selected schools
        for school in "${SELECTED_SCHOOLS[@]}"; do
            if [[ ! " ${SCHOOLS[@]} " =~ " ${school} " ]]; then
                echo -e "${RED}❌ School '$school' not found in configurations.${NC}"
                exit 1
            fi
        done
        ;;
    3)
        echo "Deployment cancelled."
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Invalid option.${NC}"
        exit 1
        ;;
esac

# Deploy to selected schools
SUCCESSFUL_DEPLOYMENTS=()
FAILED_DEPLOYMENTS=()

for school in "${SELECTED_SCHOOLS[@]}"; do
    echo -e "\n${BLUE}🏫 Deploying to $school...${NC}"
    
    # Get project ID from config
    PROJECT_ID=$(node -e "
        const config = require('./configs/$school.json');
        console.log(config.firebase.projectId);
    " 2>/dev/null)
    
    if [[ -z "$PROJECT_ID" ]]; then
        echo -e "${RED}❌ Could not read project ID from configs/$school.json${NC}"
        FAILED_DEPLOYMENTS+=("$school")
        continue
    fi
    
    echo "   Project ID: $PROJECT_ID"
    
    # Deploy firestore rules
    if firebase deploy --only firestore --project "$PROJECT_ID"; then
        echo -e "${GREEN}✅ Successfully deployed rules to $school ($PROJECT_ID)${NC}"
        SUCCESSFUL_DEPLOYMENTS+=("$school")
    else
        echo -e "${RED}❌ Failed to deploy rules to $school ($PROJECT_ID)${NC}"
        FAILED_DEPLOYMENTS+=("$school")
    fi
done

# Summary
echo -e "\n${BLUE}📊 Deployment Summary${NC}"
echo "======================"

if [[ ${#SUCCESSFUL_DEPLOYMENTS[@]} -gt 0 ]]; then
    echo -e "${GREEN}✅ Successful deployments:${NC}"
    for school in "${SUCCESSFUL_DEPLOYMENTS[@]}"; do
        echo "  - $school"
    done
fi

if [[ ${#FAILED_DEPLOYMENTS[@]} -gt 0 ]]; then
    echo -e "${RED}❌ Failed deployments:${NC}"
    for school in "${FAILED_DEPLOYMENTS[@]}"; do
        echo "  - $school"
    done
    exit 1
fi

echo -e "\n${GREEN}🎉 All deployments completed successfully!${NC}"
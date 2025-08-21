#!/bin/bash

# Multi-school deployment script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 WaldorfWahlen Multi-School Deployment${NC}"
echo "========================================"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI is not installed.${NC}"
    echo "Please install it first: npm install -g firebase-tools"
    exit 1
fi

# Function to deploy a specific school
deploy_school() {
    local school_id=$1
    local config_file="configs/${school_id}.json"
    
    if [[ ! -f "$config_file" ]]; then
        echo -e "${RED}❌ Configuration file not found: $config_file${NC}"
        return 1
    fi
    
    echo -e "\n${BLUE}🏫 Deploying $school_id...${NC}"
    
    # Get project ID from config
    local project_id=$(node -e "
        const config = require('./$config_file');
        console.log(config.firebase.projectId);
    " 2>/dev/null)
    
    if [[ -z "$project_id" ]]; then
        echo -e "${RED}❌ Could not read project ID from $config_file${NC}"
        return 1
    fi
    
    echo "   Project ID: $project_id"
    
    # Set environment variable
    export VITE_SCHOOL_ID="$school_id"
    
    # Build the application
    echo "   📦 Building application..."
    if ! pnpm run build; then
        echo -e "${RED}❌ Build failed for $school_id${NC}"
        return 1
    fi
    
    # Deploy to Firebase
    echo "   🔥 Deploying to Firebase..."
    if firebase deploy --only hosting --project "$project_id"; then
        echo -e "${GREEN}✅ Successfully deployed $school_id to https://$project_id.web.app${NC}"
        return 0
    else
        echo -e "${RED}❌ Deployment failed for $school_id${NC}"
        return 1
    fi
}

# Get available schools
SCHOOLS=()
for config in configs/*.json; do
    if [[ -f "$config" ]]; then
        school_id=$(basename "$config" .json)
        SCHOOLS+=("$school_id")
    fi
done

if [[ ${#SCHOOLS[@]} -eq 0 ]]; then
    echo -e "${RED}❌ No school configurations found.${NC}"
    exit 1
fi

echo -e "\n${YELLOW}📋 Available schools:${NC}"
for school in "${SCHOOLS[@]}"; do
    echo "  - $school"
done

# Check command line arguments
if [[ $# -eq 0 ]]; then
    echo -e "\n${YELLOW}🎯 Deployment Options:${NC}"
    echo "1. Deploy all schools"
    echo "2. Deploy specific school(s)"
    echo "3. Cancel"
    
    read -p "Choose an option (1-3): " CHOICE
    
    case $CHOICE in
        1)
            SELECTED_SCHOOLS=("${SCHOOLS[@]}")
            ;;
        2)
            echo -e "\n${YELLOW}Select schools (space-separated):${NC}"
            read -p "Schools: " SCHOOL_INPUT
            IFS=' ' read -ra SELECTED_SCHOOLS <<< "$SCHOOL_INPUT"
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
else
    # Use command line arguments
    SELECTED_SCHOOLS=("$@")
fi

# Validate selected schools
for school in "${SELECTED_SCHOOLS[@]}"; do
    if [[ ! " ${SCHOOLS[@]} " =~ " ${school} " ]]; then
        echo -e "${RED}❌ School '$school' not found.${NC}"
        echo "Available schools: ${SCHOOLS[*]}"
        exit 1
    fi
done

# Deploy selected schools
SUCCESSFUL_DEPLOYMENTS=()
FAILED_DEPLOYMENTS=()

for school in "${SELECTED_SCHOOLS[@]}"; do
    if deploy_school "$school"; then
        SUCCESSFUL_DEPLOYMENTS+=("$school")
    else
        FAILED_DEPLOYMENTS+=("$school")
    fi
done

# Summary
echo -e "\n${BLUE}📊 Deployment Summary${NC}"
echo "======================"

if [[ ${#SUCCESSFUL_DEPLOYMENTS[@]} -gt 0 ]]; then
    echo -e "${GREEN}✅ Successful deployments:${NC}"
    for school in "${SUCCESSFUL_DEPLOYMENTS[@]}"; do
        project_id=$(node -e "const config = require('./configs/$school.json'); console.log(config.firebase.projectId);" 2>/dev/null)
        echo "  - $school (https://$project_id.web.app)"
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
# Multi-School Setup Guide

This document describes the new build-time multi-school configuration system for WaldorfWahlen.

## Overview

Instead of loading configurations at runtime, this system uses **build-time file overwriting** to create school-specific builds. Each school gets:

- ✅ Only their specific assets (logos, favicons)
- ✅ Firebase configuration directly in code
- ✅ School-specific branding and colors
- ✅ Python backend automatically configured
- ✅ Automated deployment to all schools

## Quick Start

### 1. Configure a School

Edit `school-configs.json` to add or modify school configurations:

```json
{
  "schools": {
    "your-school": {
      "name": "Your School Name",
      "logo": "your-school-logo.png",
      "firebase": {
        "projectId": "your-firebase-project"
      }
    }
  }
}
```

### 2. Add Assets

Create assets directory and add files:
```bash
mkdir -p assets/your-school
# Add your-school-logo.png and your-school-favicon.ico
```

### 3. Build for a School

```bash
# Configure and build for a specific school
pnpm run build:your-school

# Or manually:
./scripts/build-school.sh your-school
pnpm run build
```

### 4. Deploy All Schools

```bash
pnpm run deploy:all
```

## How It Works

### Build-Time File Overwriting

The build script (`scripts/build-school.sh`) overwrites source files before building:

1. **Backs up** original files to `.backups/`
2. **Overwrites** `src/firebase.ts` with school-specific Firebase config
3. **Updates** `index.html` with school name and favicon
4. **Copies** school-specific assets to `public/`
5. **Modifies** CSS with school colors
6. **Updates** Python files with service account paths

### Asset Management

Each school's assets are stored separately:
```
assets/
├── waldorfwahlen/
│   ├── waldorfwahlen-logo.png
│   └── favicon.ico
├── school1/
│   ├── school1-logo.png
│   └── school1-favicon.ico
└── your-school/
    ├── your-school-logo.png
    └── your-school-favicon.ico
```

During build, only the target school's assets are copied to `public/`.

## Configuration File

The `school-configs.json` file contains all school configurations:

```json
{
  "schools": {
    "school-id": {
      "name": "Full School Name",
      "shortName": "Short Name",
      "logo": "logo-filename.png",
      "favicon": "favicon-filename.ico", 
      "primaryColor": "#hex-color",
      "contactEmail": "admin@school.com",
      "firebase": {
        "apiKey": "firebase-api-key",
        "authDomain": "project.firebaseapp.com",
        "projectId": "firebase-project-id",
        "storageBucket": "project.appspot.com",
        "messagingSenderId": "123456789",
        "appId": "app-id",
        "measurementId": "measurement-id"
      },
      "appCheck": {
        "siteKey": "recaptcha-site-key"
      },
      "python": {
        "serviceAccount": "service-account-filename.json"
      }
    }
  }
}
```

## Scripts

### `./scripts/build-school.sh [school-id]`
Configures files for a specific school:
- Overwrites Firebase configuration
- Updates HTML title and favicon
- Copies school assets
- Updates Python service account path
- Changes CSS colors

### `./scripts/restore-original.sh`
Restores original files from backups.

### `./scripts/deploy-all.sh`
Builds and deploys all configured schools:
- Loops through each school
- Configures files for each school
- Builds the project
- Deploys to Firebase
- Restores original files

### `./scripts/create-firebase-project.sh [school-id]`
Creates a new Firebase project for a school:
- Creates Firebase project via CLI
- Initializes hosting and Firestore
- Provides setup instructions

## GitHub Actions

The updated GitHub Actions workflow (`.github/workflows/firebase-hosting-commit.yml`) automatically deploys all schools when code is pushed to master:

1. Builds and deploys Waldorfschule Potsdam (main)
2. Builds and deploys School 1 (if configured) 
3. Builds and deploys School 2 (if configured)
4. Builds and deploys any additional schools

## Setting Up a New School

### 1. Create Firebase Project
```bash
pnpm run create:firebase your-school-id
```

### 2. Add Configuration
Edit `school-configs.json` and add your school with real Firebase values.

### 3. Add Assets
```bash
mkdir -p assets/your-school-id
# Add logo and favicon files
```

### 4. Test Build
```bash
pnpm run build:your-school-id
```

### 5. Deploy
```bash
pnpm run deploy:all
```

## Python Backend

The Python backend in `python/assign.py` is automatically configured with the correct service account file for each school during the build process.

Service account files should be placed in the `python/` directory with names matching the configuration:
- `python/waldorfwahlen-service-account.json`
- `python/school1-service-account.json`
- `python/school2-service-account.json`

## Advantages

✅ **Build-time configuration**: No runtime overhead  
✅ **School-specific assets**: Each build only contains relevant files  
✅ **Automated deployment**: Deploy all schools with one command  
✅ **Minimal configuration**: Single JSON file for all schools  
✅ **Python automation**: Backend automatically configured  
✅ **Firebase project creation**: CLI tools for project setup  
✅ **Backward compatibility**: Original Waldorfschule Potsdam setup unchanged  

## Troubleshooting

### Restore Original Files
If something goes wrong during configuration:
```bash
pnpm run restore
```

### Check Configuration
Validate your configuration:
```bash
jq '.schools.your-school' school-configs.json
```

### Manual Steps
You can also run the build process manually:
```bash
./scripts/build-school.sh your-school
pnpm run build
firebase deploy --project your-firebase-project
./scripts/restore-original.sh
```
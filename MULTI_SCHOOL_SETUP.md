# Multi-School Setup Guide

This guide explains how to set up WaldorfWahlen for multiple schools with separate Firebase projects.

## Overview

The multi-school system allows you to:
- Deploy the same application to multiple schools with different branding
- Use separate Firebase projects for each school
- Customize names, colors, logos, and features per school
- Manage deployments centrally

## Quick Start

### 1. Set up a new school

```bash
# Run the interactive setup script
pnpm run setup-school

# Or use the script directly
./scripts/setup-school.sh
```

### 2. Configure Firebase

1. Create a Firebase project for your school
2. Enable Authentication, Firestore, and Hosting
3. Update the configuration file with your Firebase credentials
4. Set up App Check with reCAPTCHA Enterprise

### 3. Deploy

```bash
# Deploy a specific school
./scripts/deploy.sh school1

# Deploy all schools
./scripts/deploy.sh

# Deploy Firestore rules to all projects
./scripts/deploy-rules.sh
```

## Configuration Structure

### School Configuration Files

Each school has its own configuration file in `configs/{school-id}.json`:

```json
{
  "school": {
    "id": "school1",
    "name": "Waldorfschule Beispielstadt",
    "shortName": "WS Beispielstadt",
    "logo": "/logos/school1-logo.png",
    "favicon": "/favicons/school1-favicon.ico",
    "primaryColor": "#f89e24",
    "secondaryColor": "#2196F3",
    "contactEmail": "admin@school1.example.com",
    "website": "https://school1.example.com",
    "address": {
      "street": "Musterstraße 123",
      "city": "12345 Beispielstadt",
      "country": "Deutschland"
    }
  },
  "firebase": {
    "apiKey": "your-api-key",
    "authDomain": "school1.firebaseapp.com",
    "projectId": "school1",
    "storageBucket": "school1.appspot.com",
    "messagingSenderId": "123456789012",
    "appId": "1:123456789012:web:abcdef123456789",
    "measurementId": "G-XXXXXXXXXX"
  },
  "appCheck": {
    "siteKey": "your-recaptcha-site-key"
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
```

### Environment Variables

Use environment variables to specify which school configuration to use:

```bash
# Build for a specific school
VITE_SCHOOL_ID=school1 pnpm run build

# Run development server for a specific school
VITE_SCHOOL_ID=school1 pnpm run dev
```

## Available Scripts

### Setup Scripts

- `pnpm run setup-school` - Interactive school setup
- `./scripts/setup-school.sh` - Direct script execution

### Build Scripts

- `pnpm run build:school1` - Build for school1
- `pnpm run build:school2` - Build for school2
- `pnpm run build:waldorfwahlen` - Build for original school

### Development Scripts

- `pnpm run dev:school1` - Dev server for school1
- `pnpm run dev:school2` - Dev server for school2
- `pnpm run dev:waldorfwahlen` - Dev server for original school

### Deployment Scripts

- `./scripts/deploy.sh` - Deploy to all or specific schools
- `./scripts/deploy-rules.sh` - Deploy Firestore rules
- `./scripts/deploy-{school-id}.sh` - Deploy specific school (created by setup)

## Customization

### Branding

1. Add your school's logo to `public/logos/{school-id}-logo.png`
2. Add your school's favicon to `public/favicons/{school-id}-favicon.ico`
3. Update colors in the configuration file
4. Customize UI text and messages

### Features

Enable or disable features in the configuration:

```json
{
  "features": {
    "proposals": true,    // Student project proposals
    "feedback": false,    // Feedback collection
    "analytics": true,    // Usage analytics
    "email": false        // Email functionality
  }
}
```

### Template Variables

Use template variables in your configuration:

- `{{schoolName}}` - Replaced with school.name
- `{{schoolShortName}}` - Replaced with school.shortName
- `{{schoolId}}` - Replaced with school.id

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Choose a project ID (e.g., `school1`)

### 2. Enable Services

- **Authentication**: Enable Email/Password provider
- **Firestore**: Create database in production mode
- **Hosting**: Set up hosting
- **App Check**: Enable with reCAPTCHA Enterprise

### 3. Get Configuration

1. Go to Project Settings > General
2. Scroll to "Your apps" section
3. Add a web app
4. Copy the configuration object
5. Update your school's configuration file

### 4. Deploy Firestore Rules

```bash
# Deploy rules to specific project
firebase deploy --only firestore --project school1

# Deploy rules to all schools
./scripts/deploy-rules.sh
```

## CI/CD Integration

### GitHub Actions

Create separate workflows for each school:

```yaml
name: Deploy School1
on:
  push:
    branches: [main]
    paths: ['configs/school1.json', 'src/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: VITE_SCHOOL_ID=school1 pnpm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_SCHOOL1 }}
          projectId: school1
```

## Best Practices

### Security

- Use separate Firebase projects for each school
- Set up proper Firestore security rules
- Use App Check to prevent abuse
- Store sensitive configuration in Firebase config or environment variables

### Organization

- Use descriptive school IDs (e.g., `waldorf-berlin`, `montessori-munich`)
- Keep configuration files in version control
- Document any school-specific customizations
- Use consistent naming conventions

### Maintenance

- Test configurations in development before deployment
- Keep Firebase SDKs and dependencies updated
- Monitor Firebase usage and costs per project
- Backup important data regularly

## Troubleshooting

### Common Issues

**Configuration not loading**
- Check that `VITE_SCHOOL_ID` is set correctly
- Verify the configuration file exists
- Check browser console for errors

**Firebase connection issues**
- Verify Firebase configuration is correct
- Check App Check setup
- Ensure project permissions are configured

**Build failures**
- Check environment variables
- Verify all dependencies are installed
- Look for TypeScript errors

### Debug Mode

Set debug environment variables for troubleshooting:

```bash
VITE_DEBUG=true VITE_SCHOOL_ID=school1 pnpm run dev
```

## Support

For questions or issues:
1. Check this documentation
2. Review configuration files
3. Check Firebase console logs
4. Create an issue in the repository

## Migration from Single School

To migrate from the original single-school setup:

1. Run `./scripts/setup-school.sh` to create a configuration for your existing school
2. Update your deployment scripts to use the new system
3. Test thoroughly in development
4. Deploy using the new scripts

The system is backward compatible and will fall back to the original configuration if no school ID is specified.
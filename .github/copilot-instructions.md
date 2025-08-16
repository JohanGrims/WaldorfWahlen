# WaldorfWahlen - GitHub Copilot Instructions

WaldorfWahlen is a React-based web application for the Waldorf School Potsdam to manage project elections for students. The application uses React + TypeScript frontend with Vite build system, Firebase backend, and a Python Flask backend for optimization algorithms.

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Initial Setup and Dependencies
Bootstrap the repository with these commands:

```bash
# Install pnpm globally if not available
npm install -g pnpm

# Install frontend dependencies (PREFERRED METHOD)
pnpm install --frozen-lockfile
```

**CRITICAL NETWORK ISSUE**: The xlsx dependency uses `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` which frequently fails in restricted network environments.

**WORKAROUND for xlsx network failures**:
1. If pnpm/npm fails with ENOTFOUND for cdn.sheetjs.com, temporarily modify package.json:
   ```bash
   # Change xlsx dependency to use npm registry version
   sed -i 's|"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"|"xlsx": "^0.18.5"|' package.json
   npm install
   # Revert the change after installation
   git checkout package.json
   ```

**FALLBACK for other network issues**: If pnpm fails, use npm:
```bash
npm install
```
- Frontend dependency install takes **1-2 minutes**. NEVER CANCEL.
- Set timeout to **5+ minutes** for dependency installation.
- **Known failure**: Excel/XLSX functionality may be limited if CDN is inaccessible

### Python Backend Setup
```bash
# Install Python backend dependencies
pip3 install flask flask-cors firebase-admin pulp
```
- Python dependency install takes **30-45 seconds**. NEVER CANCEL.

### Build and Development Commands

#### Frontend Development
```bash
# Start development server
npm run dev
# Starts in ~226ms, runs on http://localhost:5173/
# NEVER CANCEL - this runs continuously

# Build for production
npm run build
# Takes **8-10 seconds**. NEVER CANCEL. Set timeout to **2+ minutes**.

# Preview built application
npm run preview
# Runs on http://localhost:4173/

# Lint code
npm run lint
# Takes **<1 second**. Set timeout to **30 seconds**.
```

## Critical Timing Information

| Command | Expected Time | Timeout Setting |
|---------|---------------|-----------------|
| `pnpm install --frozen-lockfile` | 1-2 minutes | 5+ minutes |
| `npm install` (fallback) | 1-2 minutes | 5+ minutes |
| `npm run build` | 8-10 seconds | 2+ minutes |
| `npm run lint` | <1 second | 30 seconds |
| `pip3 install [python-deps]` | 30-45 seconds | 2+ minutes |

**NEVER CANCEL ANY BUILD OR LONG-RUNNING COMMAND**

## Validation Scenarios

After making changes, ALWAYS perform these validation steps:

### Basic Validation
1. **Build validation**: `npm run build` - must succeed without errors
2. **Lint validation**: `npm run lint` - must pass with 0 warnings/errors
3. **Development server**: `npm run dev` - should start and serve on localhost:5173

### Manual Testing Scenarios
**CRITICAL**: Always test actual functionality after code changes:

1. **Basic Application Loading**:
   ```bash
   npm run dev
   # Open http://localhost:5173/ in browser
   # Verify: Loading screen appears then application loads
   # Verify: No console errors in browser developer tools
   ```

2. **Admin Login Flow**:
   - Navigate to `/admin` route (or click admin link)
   - Verify Firebase authentication interface appears
   - Test with valid Firebase credentials if available
   - Verify admin dashboard loads without errors

3. **Build Validation End-to-End**:
   ```bash
   npm run build
   npm run preview
   # Open http://localhost:4173/ in browser
   # Verify: Application loads identically to dev server
   # Test: Navigate to different routes (admin, vote pages)
   ```

4. **Vote Management Flow** (if credentials available):
   - Create a new vote
   - Configure vote settings (dates, options, fields)
   - Test proposal submission interface
   - Verify data persistence

5. **Student Interface Testing**:
   - Access voting interface without admin credentials
   - Test vote submission flow
   - Verify proper error handling for invalid states

6. **Excel/XLSX Functionality Testing**:
   - Test any export functionality in admin interface
   - Verify Excel file generation works (may be limited with fallback version)
   - Check console for any xlsx-related errors

## Known Issues and Workarounds

### Critical Network Dependencies
- **xlsx package**: Uses CDN URL `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` which **FREQUENTLY FAILS** in restricted networks
- **Symptoms**: `ENOTFOUND cdn.sheetjs.com` error during `npm install` or `pnpm install`
- **Immediate Workaround**: 
  ```bash
  # Temporarily use npm registry version
  sed -i 's|"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"|"xlsx": "^0.18.5"|' package.json
  npm install
  git checkout package.json  # Revert change
  ```
- **Impact**: Excel export functionality may have reduced features with fallback version

### Build Configuration
- **ESLint**: Configuration may require `node:process` import in vite.config.js
- **Fix applied**: Import process module to avoid `no-undef` errors

## Project Structure

### Frontend (`/src/`)
```
src/
├── admin/          # Admin dashboard components
├── firebase.ts     # Firebase configuration
├── main.jsx        # Application entry point
├── types.ts        # TypeScript type definitions
└── *.tsx          # React components
```

### Backend (`/python/`)
```
python/
└── assign.py       # Flask API for student assignments and email
```

### Configuration Files
- `package.json` - Node.js dependencies and scripts
- `vite.config.js` - Build configuration
- `eslint.config.mjs` - Linting rules
- `firebase.json` - Firebase hosting configuration
- `tsconfig.json` - TypeScript configuration

## CI/CD and Deployment

### GitHub Actions Workflows
- **Commit Deploy**: `.github/workflows/firebase-hosting-commit.yml`
- **PR Preview**: `.github/workflows/firebase-hosting-pull-request.yml`

Both workflows:
1. Use Node.js 20
2. Install pnpm and dependencies with `pnpm install --frozen-lockfile`
3. Build with `npm run build`
4. Deploy to Firebase Hosting

### Pre-commit Validation
Always run before committing:
```bash
npm run lint && npm run build
```

## Common Development Tasks

### Adding New Components
1. Create component in appropriate `/src/` subdirectory
2. Follow existing TypeScript patterns
3. Import and use MDUI components consistently
4. Test with `npm run dev`

### Modifying Firebase Configuration
- Main config in `/src/firebase.ts`
- Test changes with development server
- Verify Firebase App Check configuration

### Python Backend Changes
- Main file: `/python/assign.py`
- Handles student assignment optimization using PuLP
- Email functionality via SMTP
- Requires Firebase service account configuration

### Working with Dependencies
- **Frontend**: Add to `package.json`, reinstall with `pnpm install`
- **Backend**: Install with `pip3 install <package>`
- Always test builds after dependency changes

## Troubleshooting

### Build Failures
1. Check for TypeScript errors: `npm run build`
2. Verify linting: `npm run lint`
3. Clear node_modules and reinstall if needed: `rm -rf node_modules package-lock.json && npm install`

### Development Server Issues
1. Verify port 5173 is available
2. Check for TypeScript compilation errors in terminal output
3. Restart with `npm run dev`
4. Check browser developer console for runtime errors

### Network Issues
1. **xlsx dependency failures**: Use the documented workaround above
2. Try npm instead of pnpm for installations
3. Check proxy/firewall settings
4. Use `--no-optional` flag if needed: `npm install --no-optional`

### Dependency Version Conflicts
1. **High severity vulnerabilities**: Often related to development dependencies, usually safe to ignore for development
2. **ERESOLVE warnings**: Common with React ecosystem, can usually be ignored
3. **Peer dependency warnings**: Normal with this project's configuration

### Firebase Configuration Issues
1. Check `/src/firebase.ts` for configuration errors
2. Verify environment variables for App Check are set correctly
3. Test without Firebase App Check in development (check localhost bypass)

### Python Backend Issues (if applicable)
1. Verify Python dependencies: `python3 -c "import flask, flask_cors, firebase_admin, pulp"`
2. Check for Firebase service account file: `waldorfwahlen-service-account.json`
3. Verify Flask server can start: `python3 python/assign.py`

## File Locations Reference

### Frequently Modified Files
- `/src/admin/` - Admin interface components
- `/src/firebase.ts` - Firebase configuration
- `/src/types.ts` - Type definitions
- `/python/assign.py` - Backend optimization logic

### Configuration Files
- `package.json` - Dependencies and scripts
- `vite.config.js` - Build configuration
- `eslint.config.mjs` - Linting rules
- `firebase.json` - Hosting configuration

### Build Outputs
- `/dist/` - Production build output
- Build artifacts are automatically cleaned on each build

## Validated Command Sequences

### Fresh Setup (Tested)
```bash
# Initial setup - if xlsx fails, use workaround below
npm install -g pnpm
pnpm install --frozen-lockfile

# OR with xlsx workaround for network issues
sed -i 's|"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"|"xlsx": "^0.18.5"|' package.json
npm install
git checkout package.json

# Verify setup
npm run lint && npm run build
```

### Development Workflow (Tested)
```bash
# Start development
npm run dev  # Ready in ~234ms on http://localhost:5173/

# In another terminal - continuous validation
npm run lint  # <1 second
npm run build  # ~9 seconds

# Deploy preview
npm run build && npm run preview  # http://localhost:4173/
```

### Python Backend Setup (Tested)
```bash
pip3 install flask flask-cors firebase-admin pulp  # ~30 seconds
python3 -c "import flask, flask_cors, firebase_admin, pulp; print('All dependencies available')"
```

### CI/CD Validation Commands
```bash
# Commands used in GitHub Actions workflows
pnpm install --frozen-lockfile  # May fail due to xlsx
npm run build  # Must succeed
```

Always ensure changes are tested through complete user workflows before considering them complete.
# WaldorfWahlen Development Instructions

WaldorfWahlen is a React/TypeScript web application for managing project voting/elections at Waldorf School Potsdam. The application uses Vite as the build tool, Firebase for backend services (authentication, Firestore database, hosting), and includes a Python Flask component for assignment optimization algorithms.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap, Build, and Test the Repository

**CRITICAL**: Use pnpm (NOT npm) as the package manager for this project.

1. **Install pnpm globally** (if not available):
   ```bash
   npm install -g pnpm
   ```

2. **Install dependencies** - takes ~75 seconds. NEVER CANCEL:
   ```bash
   pnpm install --frozen-lockfile
   ```

3. **Build the application** - takes ~10 seconds. NEVER CANCEL. Set timeout to 60+ seconds:
   ```bash
   pnpm run build
   ```

4. **Run linting** - takes ~2 seconds. NOTE: Has 2 pre-existing errors in vite.config.js but build still works:
   ```bash
   pnpm run lint
   ```

5. **Start development server** - ready in ~250ms:
   ```bash
   pnpm run dev
   ```
   - Runs on http://localhost:5173/
   - Uses Vite hot module replacement

### Python Backend Component Setup

The Python component (python/assign.py) provides assignment optimization algorithms using linear programming.

1. **Install Python dependencies** - takes ~35 seconds. NEVER CANCEL. Set timeout to 120+ seconds:
   ```bash
   cd python
   pip3 install -r requirements.txt
   ```

2. **Verify Python dependencies**:
   ```bash
   python3 -c "import firebase_admin, pulp, flask; print('Dependencies OK')"
   ```

**NOTE**: The Python Flask app requires a Firebase service account JSON file (`waldorfwahlen-service-account.json`) which is not included in the repository for security reasons. The Python component cannot be fully tested without proper Firebase credentials.

## Validation

### Manual Testing Scenarios

Always run through these validation scenarios after making changes:

1. **Basic Application Load**:
   - Start dev server: `pnpm run dev`
   - Navigate to http://localhost:5173/
   - Verify homepage loads with "WaldorfWahlen" title and voting sections
   - Check for "Keine Wahlen" (No Elections) status

2. **Admin Interface Access**:
   - Click admin panel icon or navigate to http://localhost:5173/admin
   - Verify admin login form appears with email/password fields
   - Check "Administratoren-Bereich" (Administrator Area) header is visible

3. **Build Verification**:
   - Run `pnpm run build`
   - Verify build succeeds and creates dist/ directory
   - Check build output shows bundled assets with proper chunking

### Pre-commit Requirements

Always run these commands before committing changes or the CI (.github/workflows/firebase-hosting-commit.yml) will fail:

```bash
pnpm run lint  # NOTE: Will show 2 pre-existing errors - this is expected
pnpm run build
```

## Common Tasks

### Development Workflow

- **Start development**: `pnpm run dev`
- **Build for production**: `pnpm run build`
- **Preview production build**: `pnpm run preview`
- **Run linting**: `pnpm run lint`

### Project Structure

Key directories and files:
- `src/`: React/TypeScript source code
- `src/admin/`: Admin interface components
- `src/firebase.ts`: Firebase configuration and initialization
- `python/`: Flask backend for assignment algorithms
- `public/`: Static assets
- `dist/`: Build output (created by `pnpm run build`)
- `vite.config.js`: Vite configuration with custom chunking
- `.github/workflows/`: CI/CD pipeline for Firebase hosting

### Firebase Configuration

The application uses Firebase for:
- Authentication (Firebase Auth)
- Database (Firestore)
- Hosting (Firebase Hosting)
- App Check for security

Firebase configuration is in `src/firebase.ts`. The app uses debug mode locally with App Check debug tokens.

### Important Development Notes

- **Package Manager**: Always use pnpm, never npm
- **Node Version**: Requires Node 20+ (as specified in CI workflow)
- **Build Time**: Build typically takes ~10 seconds, don't cancel prematurely
- **Linting**: 2 pre-existing errors in vite.config.js are expected and don't break the build
- **Python Component**: Requires Firebase service account credentials to function fully
- **Hot Reload**: Vite provides fast hot module replacement during development

### CI/CD Pipeline

The project uses GitHub Actions for automatic deployment:
- Triggers on pushes to master branch
- Uses pnpm for dependency management
- Builds with `pnpm run build`
- Deploys to Firebase Hosting
- Requires FIREBASE_SERVICE_ACCOUNT_WALDORFWAHLEN secret

### Timeout Recommendations

Set these timeout values for commands:
- `pnpm install`: 120+ seconds (actual: ~75s)
- `pnpm run build`: 60+ seconds (actual: ~10s)
- `pip3 install -r requirements.txt`: 120+ seconds (actual: ~35s)
- Development server startup: 30+ seconds (actual: ~250ms)

**NEVER CANCEL** any build or install commands. Always wait for completion.

## Frequent Command Outputs

### Repository Root Structure
```
.github/          # CI/CD workflows
dist/            # Build output (after running build)
node_modules/    # pnpm dependencies
public/          # Static assets
python/          # Flask backend component
src/             # React/TypeScript source
package.json     # Project configuration
pnpm-lock.yaml   # Dependency lock file
vite.config.js   # Build configuration
```

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build", 
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  }
}
```

### Python Dependencies (python/requirements.txt)
```
firebase-admin>=6.0.0
Flask>=2.0.0
Flask-CORS>=4.0.0
PuLP>=2.0.0
```
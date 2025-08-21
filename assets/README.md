# School-specific assets

This directory contains logos, favicons, and other assets specific to each school.

## Directory Structure

```
assets/
├── waldorfwahlen/          # Waldorfschule Potsdam assets
│   ├── waldorfwahlen-logo.png
│   └── favicon.ico
├── school1/                # School 1 assets
│   ├── school1-logo.png
│   └── school1-favicon.ico
└── school2/                # School 2 assets
    ├── school2-logo.png
    └── school2-favicon.ico
```

## Usage

During the build process, the build script will copy the appropriate assets from the school's directory to the `public/` folder. This ensures that each school's build only contains their specific assets.

## Adding a New School

1. Create a new directory: `assets/[school-id]/`
2. Add the school's logo and favicon files
3. Update `school-configs.json` with the correct filenames
4. The build script will automatically copy the assets during build
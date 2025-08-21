# Logo and Favicon Directory

This directory contains school-specific logos and favicons for the multi-school setup.

## Structure

```
public/
├── logos/
│   ├── waldorfwahlen-logo.png    # Original school logo
│   ├── school1-logo.png          # School 1 logo
│   ├── school2-logo.png          # School 2 logo
│   └── ...
└── favicons/
    ├── waldorfwahlen-favicon.ico  # Original school favicon
    ├── school1-favicon.ico        # School 1 favicon
    ├── school2-favicon.ico        # School 2 favicon
    └── ...
```

## Guidelines

### Logos
- Format: PNG (recommended) or SVG
- Size: 200x200px minimum, preferably square
- Background: Transparent
- Use: Displayed in navigation header and admin interface

### Favicons
- Format: ICO (recommended) or PNG
- Size: 32x32px (standard favicon size)
- Background: Solid color or transparent
- Use: Browser tab icon

## Adding New Schools

When setting up a new school:

1. Add the school's logo as `{school-id}-logo.png`
2. Add the school's favicon as `{school-id}-favicon.ico`
3. Update the configuration file to reference these files
4. Test the branding in development mode

## Fallback

If a school-specific logo or favicon is not found, the application will fall back to the default assets.
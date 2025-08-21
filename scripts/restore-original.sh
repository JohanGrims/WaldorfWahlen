#!/bin/bash

# Restore original files from backups
# Usage: ./restore-original.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/.backups"

echo "🔄 Restoring original files..."

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ No backup directory found. Nothing to restore."
    exit 1
fi

# Restore original files
if [ -f "$BACKUP_DIR/firebase.ts.orig" ]; then
    cp "$BACKUP_DIR/firebase.ts.orig" "$PROJECT_ROOT/src/firebase.ts"
    echo "   ✓ Restored src/firebase.ts"
fi

if [ -f "$BACKUP_DIR/index.html.orig" ]; then
    cp "$BACKUP_DIR/index.html.orig" "$PROJECT_ROOT/index.html"
    echo "   ✓ Restored index.html"
fi

if [ -f "$BACKUP_DIR/python-assign.py.orig" ]; then
    cp "$BACKUP_DIR/python-assign.py.orig" "$PROJECT_ROOT/python/assign.py"
    echo "   ✓ Restored python/assign.py"
fi

# Remove any backup files created by sed
find "$PROJECT_ROOT" -name "*.bak" -delete 2>/dev/null || true

echo "✅ Original files restored"
#!/bin/bash

echo "Passing arguments: $*"

# Base packages directory
PACKAGES_DIR="./packages"

# Check if the packages directory exists
if [ ! -d "$PACKAGES_DIR" ]; then
  echo "Error: Directory $PACKAGES_DIR does not exist."
  exit 1
fi

# Initialize an array to hold package-specific commands
COMMANDS=()

# Ensure "core" package runs first
if [ -d "$PACKAGES_DIR/core" ]; then
  COMMANDS+=("pnpm --dir $PACKAGES_DIR/core dev -- $*")
else
  echo "Warning: 'core' package not found in $PACKAGES_DIR."
fi

# List of folders to exclude
EXCLUDED_FOLDERS=("create-eliza-app" "debug_audio" "content_cache")

# Iterate over all other subdirectories in the packages folder
for PACKAGE in "$PACKAGES_DIR"/*; do
  PACKAGE_NAME=$(basename "$PACKAGE")

  # Skip excluded folders
  if [ -d "$PACKAGE" ] && [[ ! " ${EXCLUDED_FOLDERS[@]} " =~ " ${PACKAGE_NAME} " ]] && [ "$PACKAGE_NAME" != "core" ]; then
    COMMANDS+=("pnpm --dir $PACKAGE dev -- $*")
  fi
done

# Add specific commands for other directories or cases
COMMANDS+=("pnpm --dir client dev -- $*")
COMMANDS+=("node -e \"setTimeout(() => process.exit(0), 5000)\" && pnpm --dir agent dev -- $*")

# Run build command first
pnpm dev:build

# Run all commands concurrently
npx concurrently --raw "${COMMANDS[@]}"

#!/bin/bash

echo "Passing arguments: $*"

# Base packages directory
PACKAGES_DIR="./packages"

# Check if the packages directory exists
if [ ! -d "$PACKAGES_DIR" ]; then
  echo "Error: Directory $PACKAGES_DIR does not exist."
  exit 1
fi

# Function to check if an item is in an array
is_in_array() {
  local item="$1"
  shift
  for element; do
    if [[ "$element" == "$item" ]]; then
      return 0
    fi
  done
  return 1
}

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

  # Skip excluded folders and "core"
  if [ -d "$PACKAGE" ] && ! is_in_array "$PACKAGE_NAME" "${EXCLUDED_FOLDERS[@]}" && [ "$PACKAGE_NAME" != "core" ]; then
    COMMANDS+=("pnpm --dir $PACKAGE dev -- $*")
  fi
done

# Add specific commands for other directories or cases
if [ -d "./client" ]; then
  COMMANDS+=("pnpm --dir client dev -- $*")
else
  echo "Warning: 'client' directory not found."
fi

if [ -d "./agent" ]; then
  COMMANDS+=("node -e \"setTimeout(() => process.exit(0), 5000)\" && pnpm --dir agent dev -- $*")
else
  echo "Warning: 'agent' directory not found."
fi

# Run build command first
if ! pnpm dev:build; then
  echo "Build failed. Exiting."
  exit 1
fi

# Run all commands concurrently
if [ ${#COMMANDS[@]} -gt 0 ]; then
  npx concurrently --raw "${COMMANDS[@]}"
else
  echo "No valid packages to run."
fi

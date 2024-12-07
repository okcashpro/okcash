#!/bin/bash

echo "Passing arguments: $*"

# Base packages directory
PACKAGES_DIR="./packages"

# Display help message to users
cat << "EOF"

***********************************************************************
*                                                                     *
* IMPORTANT NOTICE:                                                  *
*                                                                     *
* To add your plugin to the development workflow:                    *
*  1. Navigate to the 'scripts' directory in your project.           *
*                                                                     *
*        cd scripts                                                  *
*                                                                     *
*  2. Edit the 'dev.sh' script file.                                 *
*                                                                     *
*        nano dev.sh                                                 *
*                                                                     *
*  3. Add the following changes:                                     *
*                                                                     *
*     a. Ensure your plugin's package.json contains a 'dev' command  *
*        under the "scripts" section. Example:                       *
*                                                                     *
*        "scripts": {                                                *
*            "dev": "your-dev-command-here"                          *
*        }                                                           *
*                                                                     *
*     b. Add your plugin's folder name to the WORKING_FOLDERS list   *
*        (relative to ./packages).                                   *
*                                                                     *
*        Example: WORKING_FOLDERS=("client-direct" "your-plugin-folder") *
*                                                                     *
* This will ensure that your plugin's development server runs        *
* alongside others when you execute this script.                     *
***********************************************************************

EOF

# Check if the packages directory exists
if [ ! -d "$PACKAGES_DIR" ]; then
  echo "Error: Directory $PACKAGES_DIR does not exist."
  exit 1
fi

# List of working folders to watch (relative to $PACKAGES_DIR)
WORKING_FOLDERS=("client-direct") # Core is handled separately

# Initialize an array to hold package-specific commands
COMMANDS=()

# Ensure "core" package runs first
CORE_PACKAGE="$PACKAGES_DIR/core"
if [ -d "$CORE_PACKAGE" ]; then
  COMMANDS+=("pnpm --dir $CORE_PACKAGE dev -- $*")
else
  echo "Warning: 'core' package not found in $PACKAGES_DIR."
fi

# Process remaining working folders
for FOLDER in "${WORKING_FOLDERS[@]}"; do
  PACKAGE="$PACKAGES_DIR/$FOLDER"

  # Check if the folder exists and add the command
  if [ -d "$PACKAGE" ]; then
    COMMANDS+=("pnpm --dir $PACKAGE dev -- $*")
  else
    echo "Warning: '$FOLDER' folder not found in $PACKAGES_DIR."
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

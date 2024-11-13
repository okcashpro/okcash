#!/bin/bash

# Check Node.js version
REQUIRED_NODE_VERSION=23
CURRENT_NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')

if (( CURRENT_NODE_VERSION < REQUIRED_NODE_VERSION )); then
    echo "Error: Node.js version must be $REQUIRED_NODE_VERSION or higher. Current version is $CURRENT_NODE_VERSION."
    exit 1
fi

# Navigate to the script's directory
cd "$(dirname "$0")"/..

# Check if the packages directory exists
if [ ! -d "packages" ]; then
    echo "Error: 'packages' directory not found."
    exit 1
fi

# Iterate over each directory in the packages directory
for package in packages/*; do
    if [ -d "$package" ]; then
        echo "Building package: $(basename "$package")"
        cd "$package" || continue

        # Check if a package.json file exists
        if [ -f "package.json" ]; then
            # Run the build script defined in package.json
            if npm run build; then
                echo "Successfully built $(basename "$package")"
            else
                echo "Failed to build $(basename "$package")"
            fi
        else
            echo "No package.json found in $(basename "$package"), skipping..."
        fi

        # Return to the root directory
        cd - > /dev/null || exit
    fi
done

echo "Build process completed."

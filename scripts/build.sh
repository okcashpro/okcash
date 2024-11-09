#!/bin/bash

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

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

# Define the core package path
CORE_PACKAGE="packages/core"
EXCLUDED_PACKAGE="packages/agent"

# Build the core package first
if [ -d "$CORE_PACKAGE" ]; then
    echo -e "\033[1mBuilding core package: core\033[0m"
    cd "$CORE_PACKAGE" || exit

    # Check if a package.json file exists
    if [ -f "package.json" ]; then
        if npm run build; then
            echo -e "\033[1;32mSuccessfully built core package\033[0m\n"
        else
            echo -e "\033[1mFailed to build core package\033[0m"
            exit 1
        fi
    else
        echo "No package.json found in core package, skipping..."
    fi

    # Return to the root directory
    cd - > /dev/null || exit
else
    echo "Core package directory 'core' not found, skipping core build..."
fi

# Build other packages, excluding the "agent" package
for package in packages/*; do
    if [ "$package" != "$CORE_PACKAGE" ] && [ "$package" != "$EXCLUDED_PACKAGE" ] && [ -d "$package" ]; then
        echo -e "\033[1mBuilding package: $(basename "$package")\033[0m"
        cd "$package" || continue

        # Check if a package.json file exists
        if [ -f "package.json" ]; then
            if npm run build; then
                echo -e "\033[1;32mSuccessfully built $(basename "$package")\033[0m\n"
            else
                echo "Failed to build $(basename "$package")"
            fi
        else
            echo "No package.json found in $(basename "$package"), skipping..."
        fi

        # Return to the root directory
        cd - > /dev/null || exit
    elif [ "$package" == "$EXCLUDED_PACKAGE" ]; then
        echo -e "\033[1mSkipping package: agent\033[0m\n"
    fi
done

echo -e "\033[1mBuild process completed.😎\033[0m"

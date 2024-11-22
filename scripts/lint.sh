#!/bin/bash

# Check Node.js version
REQUIRED_NODE_VERSION=22
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

# Find all packages under the packages directory
PACKAGES=( $(find packages -mindepth 1 -maxdepth 1 -type d -exec basename {} \;) )

# lint packages in specified order
for package in "${PACKAGES[@]}"; do
    package_path="packages/$package"
    
    if [ ! -d "$package_path" ]; then
        echo -e "\033[1mPackage directory '$package' not found, skipping...\033[0m"
        continue
    fi

    echo -e "\033[1mLinting package: $package\033[0m"
    cd "$package_path" || continue

    if [ -f "package.json" ]; then
        # Run lint if available
        if npm run | grep -q " lint"; then
            echo -e "\033[1mRunning lint for package: $package\033[0m"
            if npm run lint; then
                echo -e "\033[1;32mSuccessfully linted $package\033[0m\n"
            else
                echo -e "\033[1;31mLint failed for $package\033[0m"
                exit 1 # Exit immediately if lint fails
            fi
        else
            echo "No lint script found in $package, skipping lint..."
        fi
    else
        echo "No package.json found in $package, skipping..."
    fi

    cd - > /dev/null || exit
done

echo -e "\033[1mLint process completed.😎\033[0m"

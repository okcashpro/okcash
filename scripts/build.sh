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

# Define packages to build in order
PACKAGES=(
    "core"
    "plugin-trustdb"
    "plugin-solana"
    "plugin-starknet"
    "adapter-postgres"
    "adapter-sqlite"
    "adapter-sqljs"
    "adapter-supabase"
    "client-auto"
    "client-direct"
    "client-discord"
    "client-telegram"
    "client-twitter"
    "plugin-node"
    "plugin-bootstrap"
    "plugin-image-generation"
)

# Build packages in specified order
for package in "${PACKAGES[@]}"; do
    package_path="packages/$package"
    
    if [ ! -d "$package_path" ]; then
        echo -e "\033[1mPackage directory '$package' not found, skipping...\033[0m"
        continue
    fi

    echo -e "\033[1mBuilding package: $package\033[0m"
    cd "$package_path" || continue

    if [ -f "package.json" ]; then
        if npm run build; then
            echo -e "\033[1;32mSuccessfully built $package\033[0m\n"
        else
            echo -e "\033[1;31mFailed to build $package\033[0m"
            exit 1
        fi
    else
        echo "No package.json found in $package, skipping..."
    fi

    cd - > /dev/null || exit
done

echo -e "\033[1mBuild process completed.😎\033[0m"

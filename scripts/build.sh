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
    "adapter-postgres"
    "adapter-sqlite"
    "adapter-sqljs"
    "adapter-supabase"
    "plugin-buttplug"
    "plugin-node"
    "plugin-trustdb"
    "plugin-solana"
    "plugin-starknet"
    "plugin-conflux"
    "plugin-0g"
    "plugin-bootstrap"
    "plugin-image-generation"
    "plugin-coinbase"
    "plugin-node"
    "plugin-bootstrap"
    "plugin-evm"
    "plugin-image-generation"
    "plugin-tee"
    "client-auto"
    "client-direct"
    "client-discord"
    "client-telegram"
    "client-twitter"
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


# Download the latest intiface-engine release from GitHub based on OS (linux/macos/win)
# Determine OS type
OS=""
case "$(uname -s)" in
    Linux*)     OS="linux";;
    Darwin*)    OS="macos";;
    MINGW*|MSYS*|CYGWIN*) OS="win";;
    *)          echo "Unsupported OS"; exit 1;;
esac

echo -e "\033[1mDownloading intiface-engine for $OS...\033[0m"

# Get latest release info from GitHub API
LATEST_RELEASE=$(curl -s https://api.github.com/repos/intiface/intiface-engine/releases/latest)
DOWNLOAD_URL=$(echo "$LATEST_RELEASE" | grep -o "https://.*intiface-engine-$OS-x64-Release\.zip" | head -n 1)

if [ -z "$DOWNLOAD_URL" ]; then
    echo -e "\033[1;31mCould not find download URL for $OS\033[0m"
    exit 1
fi

# Download and extract into packages/plugin-buttplug/intiface-engine
if curl -L "$DOWNLOAD_URL" -o "packages/plugin-buttplug/intiface-engine.zip"; then
    echo -e "\033[1;32mSuccessfully downloaded intiface-engine\033[0m"
    
    # Clean previous installation if exists
    rm -rf packages/plugin-buttplug/intiface-engine
    
    # Extract
    unzip -q packages/plugin-buttplug/intiface-engine.zip -d packages/plugin-buttplug/intiface-engine
    rm packages/plugin-buttplug/intiface-engine.zip
    
    # Make binary executable on Unix-like systems
    if [ "$OS" != "win" ]; then
        chmod +x packages/plugin-buttplug/intiface-engine/intiface-engine
    fi
    
    echo -e "\033[1;32mSuccessfully set up intiface-engine\033[0m"
else
    echo -e "\033[1;31mFailed to download intiface-engine\033[0m"
    exit 1
fi


echo -e "\033[1mBuild process completed.😎\033[0m"

#!/bin/bash
# Check Node.js version
REQUIRED_NODE_VERSION=22
CURRENT_NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')

if (( CURRENT_NODE_VERSION < REQUIRED_NODE_VERSION && CURRENT_NODE_VERSION < 23 )); then
    echo "Error: Node.js version must be $REQUIRED_NODE_VERSION or 23 or higher. Current version is $CURRENT_NODE_VERSION."
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")"/..

# clean cache
echo -e "\033[1mCleaning cache...\033[0m"
if ! pnpm clean; then
    echo -e "\033[1;31mFailed to clean cache\033[0m"
    exit 1
fi


# Install dependencies
echo -e "\033[1mInstalling dependencies...\033[0m"
if ! pnpm i; then
    echo -e "\033[1;31mFailed to install dependencies\033[0m"
    exit 1
fi

# Build project
echo -e "\033[1mBuilding project...\033[0m"
if ! pnpm build; then
    echo -e "\033[1;31mFailed to build project\033[0m"
    exit 1
fi

# Start project
echo -e "\033[1mStarting project...\033[0m"
if ! pnpm start; then
    echo -e "\033[1;31mFailed to start project\033[0m"
    exit 1
fi

# Start client
echo -e "\033[1mStarting client...\033[0m"
pnpm start:client

# Open webpage
echo -e "\033[1mOpening webpage...\033[0m"
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173
elif command -v open &> /dev/null; then
    open http://localhost:5173
else
    echo -e "\033[1;33mPlease open http://localhost:5173 in your browser\033[0m"
fi

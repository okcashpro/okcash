#!/bin/bash

# Check if an argument is provided
if [ -z "$1" ]; then
    echo "Usage: $0 {build|run|start|bash}"
    exit 1
fi

# Execute the corresponding command based on the argument
case "$1" in
    build)
        docker build --platform linux/amd64 -t okai .
        ;;
    run)
        # Ensure the container is not already running
        if [ "$(docker ps -q -f name=okai)" ]; then
            echo "Container 'okai' is already running. Stopping it first."
            docker stop okai
            docker rm okai
        fi

        # Define base directories to mount
        BASE_MOUNTS=(
            "characters:/app/characters"
            ".env:/app/.env"
            "agent:/app/agent"
            "docs:/app/docs"
            "scripts:/app/scripts"
        )

        # Define package directories to mount
        PACKAGES=(
            "adapter-postgres"
            "adapter-sqlite"
            "adapter-sqljs"
            "adapter-supabase"
            "client-auto"
            "client-direct"
            "client-discord"
            "client-farcaster"
            "client-telegram"
            "client-twitter"
            "core"
            "plugin-bootstrap"
            "plugin-image-generation"
            "plugin-node"
            "plugin-solana"
            "plugin-evm"
            "plugin-tee"
        )

        # Start building the docker run command
        CMD="docker run --platform linux/amd64 -p 3000:3000 -d"

        # Add base mounts
        for mount in "${BASE_MOUNTS[@]}"; do
            CMD="$CMD -v \"$(pwd)/$mount\""
        done

        # Add package mounts
        for package in "${PACKAGES[@]}"; do
            CMD="$CMD -v \"$(pwd)/packages/$package/src:/app/packages/$package/src\""
        done

        # Add core types mount separately (special case)
        CMD="$CMD -v \"$(pwd)/packages/core/types:/app/packages/core/types\""

        # Add container name and image
        CMD="$CMD --name okai okai"

        # Execute the command
        eval $CMD
        ;;
    start)
        docker start okai
        ;;
    bash)
        # Check if the container is running before executing bash
        if [ "$(docker ps -q -f name=okai)" ]; then
            docker exec -it okai bash
        else
            echo "Container 'okai' is not running. Please start it first."
            exit 1
        fi
        ;;
    *)
        echo "Invalid option: $1"
        echo "Usage: $0 {build|run|start|bash}"
        exit 1
        ;;
esac
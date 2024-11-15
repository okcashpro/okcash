#!/bin/bash

# Check if an argument is provided
if [ -z "$1" ]; then
    echo "Usage: $0 {build|run|start|bash}"
    exit 1
fi

# Execute the corresponding command based on the argument
case "$1" in
    build)
        docker build --platform linux/amd64 -t eliza .
        ;;
    run)
        # Ensure the container is not already running
        if [ "$(docker ps -q -f name=eliza)" ]; then
            echo "Container 'eliza' is already running. Stopping it first."
            docker stop eliza
            docker rm eliza
        fi

        docker run \
            --platform linux/amd64 \
            -p 3000:3000 \
            -d \
            -v "$(pwd)/characters:/app/characters" \
            -v "$(pwd)/.env:/app/.env" \
            -v "$(pwd)/docs:/app/docs" \
            -v "$(pwd)/scripts:/app/scripts" \
            -v "$(pwd)/packages/adapter-postgres/src:/app/packages/adapter-postgres/src" \
            -v "$(pwd)/packages/adapter-sqlite/src:/app/packages/adapter-sqlite/src" \
            -v "$(pwd)/packages/adapter-sqljs/src:/app/packages/adapter-sqljs/src" \
            -v "$(pwd)/packages/adapter-supabase/src:/app/packages/adapter-supabase/src" \
            -v "$(pwd)/packages/agent/src:/app/packages/agent/src" \
            -v "$(pwd)/packages/client-auto/src:/app/packages/client-auto/src" \
            -v "$(pwd)/packages/client-direct/src:/app/packages/client-direct/src" \
            -v "$(pwd)/packages/client-discord/src:/app/packages/client-discord/src" \
            -v "$(pwd)/packages/client-telegram/src:/app/packages/client-telegram/src" \
            -v "$(pwd)/packages/client-twitter/src:/app/packages/client-twitter/src" \
            -v "$(pwd)/packages/core/src:/app/packages/core/src" \
            -v "$(pwd)/packages/core/types:/app/packages/core/types" \
            -v "$(pwd)/packages/plugin-bootstrap/src:/app/packages/plugin-bootstrap/src" \
            -v "$(pwd)/packages/plugin-image-generation/src:/app/packages/plugin-image-generation/src" \
            -v "$(pwd)/packages/plugin-node/src:/app/packages/plugin-node/src" \
            -v "$(pwd)/packages/plugin-solana/src:/app/packages/plugin-solana/src" \
            --name eliza \
            eliza
        ;;
    start)
        docker start eliza
        ;;
    bash)
        # Check if the container is running before executing bash
        if [ "$(docker ps -q -f name=eliza)" ]; then
            docker exec -it eliza bash
        else
            echo "Container 'eliza' is not running. Please start it first."
            exit 1
        fi
        ;;
    *)
        echo "Invalid option: $1"
        echo "Usage: $0 {build|run|start|bash}"
        exit 1
        ;;
esac

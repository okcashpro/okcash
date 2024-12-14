#!/bin/bash

# Strict mode, exit on error, undefined variables, and pipe failures
set -euo pipefail

# Print some information about the environment to aid in case of troubleshooting

echo "node version:"
node --version

echo "python version:"
python3 --version

echo "make version:"
make --version

echo "gcc version:"
gcc --version

echo "g++ version:"
g++ --version

# Check Node.js version
REQUIRED_NODE_VERSION=23
CURRENT_NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')

if (( CURRENT_NODE_VERSION < REQUIRED_NODE_VERSION )); then
    echo "Error: Node.js version must be $REQUIRED_NODE_VERSION or higher. Current version is $CURRENT_NODE_VERSION."
    exit 1
fi

# Autodetect project directory relative to this script's path
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_DIR"

cp .env.example .env

pnpm install -r --frozen-lockfile

pnpm build

# Create temp file and ensure cleanup
OUTFILE="$(mktemp)"
trap 'rm -f "$OUTFILE"' EXIT
echo "Using temporary output file: $OUTFILE"

# Add timeout configuration
TIMEOUT=300  # Represent 30 seconds as 300 tenths of a second
INTERVAL=5   # Represent 0.5 seconds as 5 tenths of a second
TIMER=0

(
  # Wait for the ready message with timeout
  while true; do
    if (( TIMER >= TIMEOUT )); then
      echo "Error: Timeout waiting for application to start after $((TIMEOUT / 10)) seconds"
      kill $$
      exit 1
    fi

    if grep -q "Chat started" "$OUTFILE"; then
      echo "exit"; sleep 2
      break
    fi

    sleep 0.5
    TIMER=$((TIMER + INTERVAL))
  done
) | pnpm start --character=characters/trump.character.json > "$OUTFILE" &

# Wait for process to finish
wait $!
RESULT=$?

echo "----- OUTPUT START -----"
cat "$OUTFILE"
echo "----- OUTPUT END -----"

# Check the exit code of the last command
if [[ $RESULT -ne 0 ]]; then
    echo "Error: 'start' command exited with an error (code: $RESULT)"
    exit 1
fi

# Check if output contains expected termination message
if grep -q "Terminating and cleaning up resources..." "$OUTFILE"; then
    echo "Script completed successfully."
else
    echo "Error: The output does not contain the expected termination message."
    exit 1
fi

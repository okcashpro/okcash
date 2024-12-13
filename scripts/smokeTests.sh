#!/bin/bash

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
PROJECT_DIR="$0"
while [ -h "$PROJECT_DIR" ]; do
    ls=$(ls -ld "$PROJECT_DIR")
    link=$(expr "$ls" : '.*-> \(.*\)$')
    if expr "$link" : '/.*' > /dev/null; then
        PROJECT_DIR="$link"
    else
        PROJECT_DIR="$(dirname "$PROJECT_DIR")/$link"
    fi
done
PROJECT_DIR="$(dirname "$PROJECT_DIR")/.."
PROJECT_DIR="$(cd "$PROJECT_DIR"; pwd)"

cd $PROJECT_DIR

cp .env.example .env

pnpm install -r

pnpm build

OUTFILE="$(mktemp)"
echo $OUTFILE
(
  # Wait for the ready message
  while true; do
    if grep -q "Chat started" "$OUTFILE"; then
      echo "exit"; sleep 2
      break
    fi
    sleep 0.5
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
    echo "Error: 'start' command exited with an error."
    exit 1
fi

# Check if output.txt contains "Terminating and cleaning up resources..."
if grep -q "Terminating and cleaning up resources..." "$OUTFILE"; then
    echo "Script completed successfully."
else
    echo "Error: The output does not contain the expected string."
    exit 1
fi

# Clean up
rm "$OUTFILE"

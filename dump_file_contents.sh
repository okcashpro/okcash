#!/bin/zsh
# Define the output file
OUTPUT_FILE="all_files_content.txt"
# Remove the output file if it already exists to start fresh
if [[ -f "$OUTPUT_FILE" ]]; then
    rm "$OUTPUT_FILE"
fi
# Start the find command, excluding the output file and hidden files
FIND_CMD="find . -type f ! -name \"$OUTPUT_FILE\" ! -path '*/\.*'"
# Loop through command-line arguments to add exclusions for file extensions, specific files, or directories
for arg in "$@"; do
    if [[ "$arg" == \.* ]]; then
        # If the argument is a file extension, exclude files with that extension
        FIND_CMD+=" ! -iname '*$arg'"
    elif [[ -d "$arg" ]]; then
        # If the argument is a directory, exclude it and its contents
        FIND_CMD+=" ! -path './$arg/*'"
    elif [[ -f "$arg" ]]; then
        # If the argument is a file, exclude it
        FIND_CMD+=" ! -name '$arg'"
    else
        # If the argument is a wildcard pattern, exclude matching files
        FIND_CMD+=" ! -name '$arg'"
    fi
done
# Execute the constructed find command and process files
eval $FIND_CMD | while IFS= read -r file; do
    # Append the file name and its content to the output file with separators
    echo "---" >> "$OUTPUT_FILE"
    echo "$file" >> "$OUTPUT_FILE"
    echo "---" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "\n\n" >> "$OUTPUT_FILE"
done
echo "All contents have been written to $OUTPUT_FILE"

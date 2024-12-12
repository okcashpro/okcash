#!/bin/bash

set -e

cd ..
git remote add okai https://github.com/okcashpro/okai.git 2>/dev/null || echo "Remote 'okai' already exists."

git fetch okai main

git subtree pull --prefix=okai okai main --no-edit

git push origin master

echo "Sync from okai to ok completed successfully."

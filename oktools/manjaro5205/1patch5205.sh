#!/bin/bash
echo "Patch for Okcash for Manjaro Linux 5205"

date

# Patch Okcash for Manjaro + boost 1.75 + qt 5.15.2
cp -r patch5205/* ../..

echo "PATCH APPLIED"

# end Client
echo "Done with the Okcash Manjaro patch 5205 on its latest version for:"
uname -a
echo "Get  empowered with Okcash!"
exit 0

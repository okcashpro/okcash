#!/bin/bash
echo "**********************************************"
echo ""
echo "Removing and Re-compiling okcash"
echo ""
echo "**********************************************"
echo ""

# Compile okcash
/bin/bash ./windb.sh
cd ../..
rm release/okcash.exe
qmake
make -j12
cp release/okcash.exe oktools/win
echo ""
echo "okcash.exe is compiled for the system"
echo ""
echo "**********************************************"
echo ""
echo "**********************************************"
echo ""
echo "Done! Good Luck!"
exit 0

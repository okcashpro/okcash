#!/bin/bash
echo "**********************************************"
echo ""
echo "Removing and Re-compiling okcashd"
echo ""
echo "**********************************************"
echo ""

# Compile okcashd
/bin/bash ./windb.sh
cd ../..
cd src
rm okcashd.exe
make -j12 -f makefile.mingw USE_UPNP=-
cp okcashd.exe ../oktools/win
echo ""
echo "okcashd.exe is compiled for the system"
echo ""
echo "**********************************************"
echo ""
echo "**********************************************"
echo ""
echo "Done! Good Luck!"
exit 0

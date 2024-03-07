#!/bin/bash
echo "**********************************************"
echo ""
echo "Removing and Re-compiling leveldb"
echo ""
echo "**********************************************"
echo ""

# Function to ask yes/no question
cd ..
cd src/leveldb
rm libleveldb.a
rm libmemenv.a
echo "libleveldb.a and libmemenv.a got removed, compiling..."
echo ""
echo "**********************************************"
echo ""

TARGET_OS=NATIVE_WINDOWS make libleveldb.a libmemenv.a

echo "**********************************************"
echo ""
echo "Done! Good Luck!"
exit 0

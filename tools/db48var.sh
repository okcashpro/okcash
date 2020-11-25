#!/bin/bash
echo "Export DB48 variables."
echo "This could take a minute, enjoy some coffee or water and come back soon..."

date

cd

export CPATH="/usr/local/BerkeleyDB.4.8/include"

export LIBRARY_PATH="/usr/local/BerkeleyDB.4.8/lib"

/usr/share/misc/config.guess

# end Client

echo "Variables locally added for:"
uname -o
echo "enjoy your OK experience"
exit 0

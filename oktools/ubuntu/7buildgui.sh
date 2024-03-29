#!/bin/bash
echo "Compiling Okcash GUI: Okcash - from source on its latest version"
echo "This could take a minute, enjoy some coffee or water and come back soon..."
date

# Build okcash graphical client

cd ../..

#Setup db-4.8.30 variables

export BDB_PREFIX="/usr/local/BerkeleyDB.4.8"
export BDB_INCLUDE_PATH="/usr/local/BerkeleyDB.4.8/include"
export BDB_LIB_PATH="/usr/local/BerkeleyDB.4.8/lib"
export CPATH="/usr/local/BerkeleyDB.4.8/include"
export LIBRARY_PATH="/usr/local/BerkeleyDB.4.8/lib"

# /usr/share/misc/config.guess

qmake

make -j4

strip okcash

# Install okcash graphical client in the system
sudo cp okcash /usr/local/bin

# Install okcash.desktop
cd oktools/ubuntu
/bin/bash ./desktop.sh

# end Client
echo "Done compiling + installing: Okcash GUI > on its latest version for:"
uname -a
echo "Okcash is now installed in your /usr/local/bin directory"

echo "  "

exit 0

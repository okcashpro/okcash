#!/bin/bash
echo "Compiling Okcash node: okcashd - from source on its latest version"
echo "This could take a minute, enjoy some coffee or water and come back soon..."
date

cd  ../..

cd src

#Setup db-4.8.30 variables

export BDB_PREFIX="/usr/local/BerkeleyDB.4.8"

export BDB_INCLUDE_PATH="/usr/local/BerkeleyDB.4.8/include"

export BDB_LIB_PATH="/usr/local/BerkeleyDB.4.8/lib"

export CPATH="/usr/local/BerkeleyDB.4.8/include"

export LIBRARY_PATH="/usr/local/BerkeleyDB.4.8/lib"

# /usr/share/misc/config.guess

# Build okcashd node

make -f makefile.unix USE_UPNP=-

strip okcashd

# Install okcashd in the system
sudo cp okcashd /usr/local/bin

# end Client
echo "Done compiling + installing: okcashd > on its latest version for:"

uname -a

echo "okcashd node is now installed in your /usr/local/bin directory"

echo "remember to create your okcash.conf file before running okcashd"

echo "enjoy your OK experience"

exit 0

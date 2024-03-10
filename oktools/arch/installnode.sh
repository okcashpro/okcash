#!/bin/bash
echo "Compiling Okcash node: okcashd - from source on its latest version"
echo "This could take a minute, enjoy some coffee or water and come back soon..."
date

# Build okcashd 

/bin/bash ./1patch.sh

cd  ../..

cd src

export BDB_PREFIX="/usr/local/BerkeleyDB.4.8"

export BDB_INCLUDE_PATH="/usr/local/BerkeleyDB.4.8/include"

export BDB_LIB_PATH="/usr/local/BerkeleyDB.4.8/lib"

export CPATH="/usr/local/BerkeleyDB.4.8/include"

export LIBRARY_PATH="/usr/local/BerkeleyDB.4.8/lib"

# Build okcashd node

make -j4 -f makefile.unix USE_UPNP=-

strip okcashd

# Install okcashd in the system
sudo cp okcashd /usr/local/bin

# end Client
echo "Done compiling + installing: okcashd > on its latest version for:"
uname -a
echo "okcashd node is now installed in your /usr/local/bin directory"
echo "remember to create your okcash.conf file before running okcashd"
echo "You are now empowered with Okcash!"
echo "enjoy your OK experience"
exit 0

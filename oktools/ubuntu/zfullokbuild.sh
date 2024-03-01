#!/bin/bash
echo "Compiling Full okcashd + okcash GUI (Qt) for the system"

# Deps Okcash for Ubuntu 22
/bin/bash ./zfulldepsonly.sh

#Setup db-4.8.30 variables
export BDB_PREFIX="/usr/local/BerkeleyDB.4.8"
export BDB_INCLUDE_PATH="/usr/local/BerkeleyDB.4.8/include"
export BDB_LIB_PATH="/usr/local/BerkeleyDB.4.8/lib"
export CPATH="/usr/local/BerkeleyDB.4.8/include"
export LIBRARY_PATH="/usr/local/BerkeleyDB.4.8/lib"

# Build okcashd node
cd
cd okcash
cd src
make -j4 -f makefile.unix USE_UPNP=-
strip okcashd

# Install okcashd in the system
sudo cp okcashd /usr/local/bin

# Build okcash
cd
cd okcash
qmake
make -j4
strip okcash

# Install Okcash in the system
sudo cp okcash /usr/local/bin
echo "= okcash Node and GUI (Qt) are now build and installed for ="
uname -a

#exit
exit 0
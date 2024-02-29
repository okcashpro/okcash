#!/bin/bash
echo "Compiling okcashd for the system"

# Patch Okcash for Ubuntu 20
/bin/bash ./1patchu20.sh

#Install libssl1.0-dev
/bin/bash ./2libssl.sh

#Install deps for okcashd node
/bin/bash ./3depsnode.sh

#Compile and Install db-4.8.30
/bin/bash ./4db4830.sh 

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
make -f makefile.unix USE_UPNP=-
strip okcashd

# Install okcashd in the system
sudo cp okcashd /usr/local/bin
echo "= okcashd is now build and installed for ="
uname -a

#exit
exit 0
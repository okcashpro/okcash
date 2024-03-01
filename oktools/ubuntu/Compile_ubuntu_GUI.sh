#!/bin/bash
echo "Compiling okcash GUI (Qt) for the system"

# Patch Okcash for Ubuntu 22
/bin/bash ./1patch.sh

#Install libssl1.0-dev
/bin/bash ./2libssl.sh

#Install deps for okcash
/bin/bash ./3depsnode.sh
/bin/bash ./6depsgui.sh

#Compile and Install db-4.8.30
/bin/bash ./4db4830.sh

#Setup db-4.8.30 variables
export BDB_PREFIX="/usr/local/BerkeleyDB.4.8"
export BDB_INCLUDE_PATH="/usr/local/BerkeleyDB.4.8/include"
export BDB_LIB_PATH="/usr/local/BerkeleyDB.4.8/lib"
export CPATH="/usr/local/BerkeleyDB.4.8/include"
export LIBRARY_PATH="/usr/local/BerkeleyDB.4.8/lib"

# Build okcash
cd
cd okcash
qmake -j4
make 
strip okcash

# Install okcash GUI in the system
sudo cp okcash /usr/local/bin
echo "= okcash GUI (Qt) is now build and installed for ="
uname -a

#exit
exit 0
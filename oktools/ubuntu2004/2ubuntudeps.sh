#!/bin/bash
echo "installing the required dependencies for Okcash Graphical User Interface and node."

date

cd

sudo apt-get install unzip pwgen git -y

sudo apt-get install build-essential libssl-dev libboost-all-dev libqrencode-dev libminiupnpc-dev -y

wget http://download.oracle.com/berkeley-db/db-4.8.30.NC.tar.gz

tar -xzvf db-4.8.30.NC.tar.gz

sed -i 's/__atomic_compare_exchange/__atomic_compare_exchange_db/g' db-4.8.30.NC/dbinc/atomic.h

cd db-4.8.30.NC/build_unix

../dist/configure --enable-cxx --disable-shared --with-pic 

make

sudo make install

export BDB_PREFIX="/usr/local/BerkeleyDB.4.8"

export BDB_INCLUDE_PATH="/usr/local/BerkeleyDB.4.8/include"

export BDB_LIB_PATH="/usr/local/BerkeleyDB.4.8/lib"

export CPATH="/usr/local/BerkeleyDB.4.8/include"

export LIBRARY_PATH="/usr/local/BerkeleyDB.4.8/lib"

# /usr/share/misc/config.guess

echo "= BerkeleyDB 4.8 is now installed ="

cd

sudo apt-get install qtcreator qttools5-dev-tools  libqt5webkit5-dev -y

echo "All the required dependencies for Okcash node and Graphical client are now installed for:"
uname -a
exit 0

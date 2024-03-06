#!/bin/bash
echo "installing the required dependencies for Okcash Graphical User Interface and node."

date

echo "Just click Enter each time asked to install all dependencies (default)"

cd

sudo pacman -S git miniupnpc openssl

sudo pacman -S base-devel

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

sudo pacman -S qt5 -y

echo "All the required dependencies for Okcash node and Graphical client are now installed for:"
uname -a
exit 0

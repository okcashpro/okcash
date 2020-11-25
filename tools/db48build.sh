#!/bin/bash
echo "installing the required dependency BerkeleyDB 4.8"
echo "This could take a minute, enjoy some coffee or water and come back soon..."

date

cd

wget http://download.oracle.com/berkeley-db/db-4.8.30.NC.tar.gz

sudo tar -xzvf db-4.8.30.NC.tar.gz

cd db-4.8.30.NC/build_unix

sudo ../dist/configure --enable-cxx 

# --disable-shared --with-pic

# /usr/share/misc/config.guess
# --build=buildtype

sudo make

sudo make install

export CPATH="/usr/local/BerkeleyDB.4.8/include"

export LIBRARY_PATH="/usr/local/BerkeleyDB.4.8/lib"

# end Client

echo "BerkeleyDB 4.8 is now installed for:"
uname -a
echo "enjoy your OK experience"
exit 0

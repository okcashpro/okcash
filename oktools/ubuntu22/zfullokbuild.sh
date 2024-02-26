#!/bin/bash
echo "Apply Ubuntu 20 patch + the required dependencies for Okcash node and GUI + build okcashd and okcash gui + Install to the system."

date

# Patch Okcash for Ubuntu 20
cp -r patch20/* ../..

echo "PATCH APPLIED"

#Install libssl1.0-dev

sudo sh -c 'echo "deb http://security.ubuntu.com/ubuntu bionic-security main" >> /etc/apt/sources.list'

sudo apt update && apt-cache policy libssl1.0-dev

sudo apt-get install libssl1.0-dev -y

#Install deps for okcashd node

sudo apt-get install unzip pwgen git -y

sudo apt-get install build-essential libboost-all-dev libqrencode-dev libminiupnpc-dev -y

#Install deps for graphical ui

sudo apt-get install qtcreator qttools5-dev-tools  libqt5webkit5-dev qt5-default -y

echo "All the required dependencies for Okcash node and Graphical client are now installed"

#Compile and Install db-4.8.30

cd

wget http://download.oracle.com/berkeley-db/db-4.8.30.NC.tar.gz

tar -xzvf db-4.8.30.NC.tar.gz

sed -i 's/__atomic_compare_exchange/__atomic_compare_exchange_db/g' db-4.8.30.NC/dbinc/atomic.h

cd db-4.8.30.NC/build_unix

../dist/configure --enable-cxx --disable-shared --with-pic 

make

sudo make install

echo "= BerkeleyDB 4.8 is now installed ="

#Setup db-4.8.30 variables

export BDB_PREFIX="/usr/local/BerkeleyDB.4.8"

export BDB_INCLUDE_PATH="/usr/local/BerkeleyDB.4.8/include"

export BDB_LIB_PATH="/usr/local/BerkeleyDB.4.8/lib"

export CPATH="/usr/local/BerkeleyDB.4.8/include"

export LIBRARY_PATH="/usr/local/BerkeleyDB.4.8/lib"

# /usr/share/misc/config.guess

# Build okcashd node

cd

cd okcash

cd src

make -j4 -f makefile.unix USE_UPNP=-

strip okcashd

# Install okcashd in the system
sudo cp okcashd /usr/local/bin

# Build okcash gui

cd

cd okcash

qmake

make -j4

strip okcash

# Install okcash graphical client in the system
sudo cp okcash /usr/local/bin

echo "= okcashd and Okcash GUI are now build and installed for ="

uname -a

exit 0

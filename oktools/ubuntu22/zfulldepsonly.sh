#!/bin/bash
echo "installing the required dependencies for Okcash node."

date

cd

#Install libssl1.0-dev

sudo sh -c 'echo "deb http://security.ubuntu.com/ubuntu bionic-security main" >> /etc/apt/sources.list'

sudo apt update && apt-cache policy libssl1.0-dev

sudo apt-get install libssl1.0-dev -y

#Install deps for okcashd node

sudo apt-get install unzip pwgen git -y

sudo apt-get install build-essential libboost-all-dev libqrencode-dev libminiupnpc-dev -y

#Install deps for graphical ui

sudo apt-get install qtcreator qttools5-dev-tools  libqt5webkit5-dev qt5-default -y

#Compile and Install db-4.8.30

wget http://download.oracle.com/berkeley-db/db-4.8.30.NC.tar.gz

tar -xzvf db-4.8.30.NC.tar.gz

sed -i 's/__atomic_compare_exchange/__atomic_compare_exchange_db/g' db-4.8.30.NC/dbinc/atomic.h

cd db-4.8.30.NC/build_unix

../dist/configure --enable-cxx --disable-shared --with-pic 

make

sudo make install

echo "= BerkeleyDB 4.8 is now installed ="

echo "All the required dependencies for Okcash node and Graphical client are now installed for:"

uname -a

exit 0

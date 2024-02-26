#!/bin/bash
echo "installing the required dependencies for Okcash node."

date

cd

#Compile and Install db-4.8.30

wget http://download.oracle.com/berkeley-db/db-4.8.30.NC.tar.gz

tar -xzvf db-4.8.30.NC.tar.gz

sed -i 's/__atomic_compare_exchange/__atomic_compare_exchange_db/g' db-4.8.30.NC/dbinc/atomic.h

cd db-4.8.30.NC/build_unix

../dist/configure --enable-cxx --disable-shared --with-pic 

make

sudo make install

echo "= BerkeleyDB 4.8.30 is now installed and variables set ="

exit 0
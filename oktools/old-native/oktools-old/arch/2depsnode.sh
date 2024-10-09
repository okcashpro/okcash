#!/bin/bash
echo "installing the required dependencies for Okcash Graphical User Interface and node."

date

echo "Just click Enter each time asked to install all dependencies (default)"

cd

sudo pacman -S git miniupnpc openssl -y

sudo pacman -S base-devel boost -y

# Checking if Berkeley DB 4.8.30 is installed
if [ -f /usr/local/BerkeleyDB.4.8/lib/libdb_cxx-4.8.a ]; then
    echo "Berkeley DB 4.8.30 already installed. Skipping this step."
else
    echo "Installing Berkeley DB 4.8.30."
    wget http://download.oracle.com/berkeley-db/db-4.8.30.NC.tar.gz
    tar -xzvf db-4.8.30.NC.tar.gz
    sed -i 's/__atomic_compare_exchange/__atomic_compare_exchange_db/g' db-4.8.30.NC/dbinc/atomic.h
    cd db-4.8.30.NC/build_unix/
    ../dist/configure --enable-cxx --disable-shared --with-pic
    make
    sudo make install
    echo "Berkeley DB 4.8.30 installation completed."
fi

echo "= BerkeleyDB 4.8 is now installed ="

echo "All the required dependencies for Okcash node are now installed for:"
uname -a
exit 0

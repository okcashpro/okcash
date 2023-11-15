#!/bin/bash
echo "Setup db4.8.30 variables"

date

cd

#Setup db-4.8.30 variables

export BDB_PREFIX="/usr/local/BerkeleyDB.4.8"

export BDB_INCLUDE_PATH="/usr/local/BerkeleyDB.4.8/include"

export BDB_LIB_PATH="/usr/local/BerkeleyDB.4.8/lib"

export CPATH="/usr/local/BerkeleyDB.4.8/include"

export LIBRARY_PATH="/usr/local/BerkeleyDB.4.8/lib"

# /usr/share/misc/config.guess

echo "= BerkeleyDB 4.8.30 variables are now set ="

exit 0
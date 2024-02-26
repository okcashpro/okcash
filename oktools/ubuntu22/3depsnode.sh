#!/bin/bash
echo "installing the required dependencies for Okcashd node."

date

cd

#Install deps for okcashd node

sudo apt-get install unzip pwgen git -y

sudo apt-get install build-essential libboost-all-dev libqrencode-dev libminiupnpc-dev -y

echo "All the required dependencies for Okcash node are now installed for:"
uname -a
exit 0
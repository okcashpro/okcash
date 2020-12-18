#!/bin/bash
echo "installing the required dependencies for Okcash node."

date

sudo apt-get install unzip pwgen git -y

sudo apt-get install build-essential libssl-dev libboost-all-dev libqrencode-dev libminiupnpc-dev -y

echo "All the required dependencies for Okcash node are now installed for:"
uname -a
echo "enjoy your OK experience"
exit 0

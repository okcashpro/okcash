#!/bin/bash
echo "installing the required dependencies for Okcash Graphical User Interface and node."

date

sudo apt-get install unzip pwgen git -y

sudo apt-get install build-essential libssl-dev libboost-all-dev libqrencode-dev libminiupnpc-dev -y

sudo apt-get install qtcreator qttools5-dev-tools  libqt5webkit5-dev -y

echo "All the required dependencies for Okcash node and Graphical client are now installed for:"
uname -a
exit 0

#!/bin/bash
echo "installing the required dependencies for Okcash node."

date

#Install deps for graphical ui

cd

sudo apt-get install qtcreator qttools5-dev-tools  libqt5webkit5-dev qt5-default -y

echo "All the required dependencies for Okcash node and Graphical client are now installed for:"
uname -a
exit 0
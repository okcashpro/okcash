#!/bin/bash
echo "installing the required dependencies for Okcash graphical ui."

#Install the 3depsnode.sh file first.
#Install deps for graphical ui

cd

# Get the Ubuntu version number
UBUNTU_VERSION=$(lsb_release -sr)

# Convert Ubuntu version to an integer for easier comparison (e.g., 18.04 becomes 1804)
UBUNTU_VERSION_INT=$(echo $UBUNTU_VERSION | awk -F. '{print $1$2}')

if [[ $UBUNTU_VERSION_INT -le 1804 ]]; then
    echo "Using Ubuntu 18.04 or older"
    # Deps for Ubuntu 18.04 or older
    sudo apt-get install qtcreator qttools5-dev-tools libqt5webkit5-dev qt5-default -y
elif [[ $UBUNTU_VERSION_INT -eq 2004 ]] || [[ $UBUNTU_VERSION_INT -eq 2204 ]]; then
    echo "Using Ubuntu 20.04 or 22.04"
    # Deps for Ubuntu 20.04 or 22.04
    sudo apt-get install qtcreator qttools5-dev-tools libqt5webkit5-dev qtbase5-dev qtchooser qt5-qmake qtbase5-dev-tools -y
else
    echo "System is using a higher version than ubuntu 22.04, please use the docs for proper install."
fi

echo "All the required dependencies for Okcash Graphical client are now installed for:"
uname -a
exit 0
#!/bin/bash
echo "Compiling Okcash GUI + node okcashd from source on its latest version"
echo "This could take a minute, enjoy some coffee or water and come back soon..."
date

# Build okcashd dependencies
/bin/bash ./2depsnode.sh
/bin/bash ./3depsgui.sh

# Build + install node - okcashd
/bin/bash ./installnode.sh

# Build + install Okcash GUI
/bin/bash ./installgui.sh

# end Client
echo "Done compiling + installing: okcashd + Okcash GUI > on its latest version for:"
uname -a
echo "okcashd node + GUI is now installed in your /usr/local/bin directory"
echo "remember to create your okcash.conf file before running okcashd"
echo "You are now empowered with Okcash!"
echo "enjoy your OK experience"
exit 0

#!/bin/bash
echo "Compiling Okcash GUI + node okcashd from source on its latest version"
echo "This could take a minute, enjoy some coffee or water and come back soon..."
date

# Build okcashd node

# Build + install node - okcashd
sh ./installnodedb5.sh

# Build + install Okcash GUI
sh ./installguidb5.sh

# end Client
echo "Done compiling + installing: okcashd + Okcash GUI > on its latest version for:"
uname -a
echo "okcashd node + GUI is now installed in your /usr/local/bin directory"
echo "remember to create your okcash.conf file before running okcashd"
echo "You are now empowered with Okcash!"
echo "enjoy your OK experience"
exit 0

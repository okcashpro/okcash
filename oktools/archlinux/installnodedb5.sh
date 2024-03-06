#!/bin/bash
echo "Compiling Okcash node: okcashd - from source on its latest version"
echo "This could take a minute, enjoy some coffee or water and come back soon..."
date

cd  ../..

cd src

# Build okcashd node

make -j4 -f makefile.unix USE_UPNP=-

strip okcashd

# Install okcashd in the system
sudo cp okcashd /usr/local/bin

# end Client
echo "Done compiling + installing: okcashd > on its latest version for:"
uname -a
echo "okcashd node is now installed in your /usr/local/bin directory"
echo "remember to create your okcash.conf file before running okcashd"
echo "You are now empowered with Okcash!"
echo "enjoy your OK experience"
exit 0

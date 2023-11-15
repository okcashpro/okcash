#!/bin/bash
echo "Compiling Okcash GUI: Okcash - from source on its latest version"
echo "This could take a minute, enjoy some coffee or water and come back soon..."
date

# Build okcash graphical client

cd ../..

qmake

make 

strip okcash

# Install okcash graphical client in the system
sudo cp okcash /usr/local/bin

# end Client
echo "Done compiling + installing: Okcash GUI > on its latest version for:"
uname -a
echo "Okcash is now installed in your /usr/local/bin directory"

echo "enjoy your OK experience"

exit 0

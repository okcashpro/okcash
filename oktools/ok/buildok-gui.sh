#!/bin/bash
echo "Compiling Okcash Graphical User Interface - okcash - from source on its latest version"
echo "This could take a minute, enjoy some coffee or water and come back soon..."

date

# Install dependencies for Okcash
./depsok-full.sh

# Install Berkeley DB 4.8 with apt-get
cd ..

chmod +x *

./db48apt.sh

# Clone Okcash repository
cd

git clone https://github.com/okcashpro/okcash

# Build okcash graphical client
cd okcash

qmake

make

strip okcash

# Install okcash graphical client in the system
sudo cp okcash /usr/local/bin

mkdir ~/okapps

cp okcash ~/okapps

# Remove okcash source folder
cd

sudo rm -r okcash

# end Client
echo "Done compiling and installing OK from source: okcash GUI < okcash > on its latest version for:"
uname -a
echo "A copy of the binary was saved on <okapps> folder in your home directory"
echo "You are now empowered with Okcash!"
echo "enjoy your OK experience"
exit 0

#!/bin/bash
echo "Installing the Okcash node on its latest version"
echo "This could take a minute, enjoy some coffee or water and come back soon..."

date

sudo apt-get install curl unzip -y

# Install dependencies for Okcash
./depsok-node.sh

# Install Berkeley DB 4.8 with apt-get
cd ..

chmod +x *

./db48apt.sh

# Download Okcash for Ubuntu 16
cd
DOWNLOADFILE=$(curl -s https://api.github.com/repos/okcashpro/okcash/releases | grep browser_download_url | grep buntu16 | head -n 1 | cut -d '"' -f 4)
DOWNLOADNAME=$(curl -s https://api.github.com/repos/okcashpro/okcash/releases | grep name | grep buntu16 | head -n 1 | cut -d '"' -f 4)
wget "$DOWNLOADFILE"
unzip "$DOWNLOADNAME"
chmod 755 okcashd
sudo cp okcashd /usr/local/bin
mkdir ~/okapps
mv okcashd ~/okapps
rm okcash
rm $DOWNLOADNAME
cd ~/oktools/coins/ok

# end Client
echo "Installed latest Okcash node for:"
uname -a
echo "A copy of the binary was saved on <okapps> folder in your home directory"
echo "You are now empowered with Okcash!"
echo "enjoy your OK experience"
exit 0

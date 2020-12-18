#!/bin/bash
echo "Updating the Okcash binaries on its latest version"
echo "This could take a minute, enjoy some coffee or water and come back soon..."

date

sudo apt-get install git curl unzip -y

# Download Okcash for Ubuntu 18
cd
DOWNLOADFILE=$(curl -s https://api.github.com/repos/okcashpro/okcash/releases | grep browser_download_url | grep linux64 | head -n 1 | cut -d '"' -f 4)
DOWNLOADNAME=$(curl -s https://api.github.com/repos/okcashpro/okcash/releases | grep name | grep linux64 | head -n 1 | cut -d '"' -f 4)
wget "$DOWNLOADFILE"
unzip "$DOWNLOADNAME"
chmod 755 okcashd
sudo cp okcashd /usr/local/bin
mkdir ~/okapps
mv okcashd ~/okapps
chmod 755 okcash
sudo cp okcash /usr/local/bin
mv okcash ~/okapps
sudo rm $DOWNLOADNAME
cd ~/oktools/coins/ok

# end Client
echo "Upgraded latest Okcash binaries for:"
uname -a
echo "Okcash GUI + node are now Updated on the system."
echo "A copy of the binaries was saved on <okapps> folder in your home directory"
echo "enjoy your OK experience"
exit 0
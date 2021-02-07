#!/bin/bash
echo "Initializing Okcash First time instant Sync"
echo "This could take a minute, enjoy some coffee or water and come back soon..."

date

# Create .okcash config folder

mkdir ~/.okcash

sudo apt-get install unzip pwgen -y

#make sure old blockchain zip or not fully downloaded data gets erased to prevent errors
rm ~/.okcash/ok-blockchain.zip

# Download and unzip the OK Blockchain
cd ~/.okcash
wget https://github.com/okcashpro/ok-blockchain/releases/download/latest/ok-blockchain.zip
unzip ok-blockchain.zip
cd

# Delete the downloaded blockchain zip file // free space from device
#rm ~/.okcash/ok-blockchain.zip

# end Client
echo "Completed Okcash first time instant sync, make sure you have an okcash.conf file if you are goin to use okcashd daemon."
echo "enjoy your OK experience"
exit 0
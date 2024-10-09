#!/bin/bash
echo "Initializing the 1 Click Instant Sync for the OK Blockchain"
echo "This could take a minute, enjoy some coffee and come back soon..."

# Create .okcash config folder

mkdir ~/.okcash

sudo pacman -S unzip -y

#make sure old ok-blockchain.zip, or not fully downloaded data gets erased to prevent errors
rm ~/.okcash/ok-blockchain.zip

# Download and unzip the OK Blockchain
cd ~/.okcash
wget https://okcash.co/ok-blockchain.zip
unzip ok-blockchain.zip
cd

# Delete the downloaded ok-blockchain.zip file // free space from device
#rm ~/.okcash/ok-blockchain.zip

# end Client
echo "Completed the OK Blockchain 1 Click Instant sync, make sure you have an okcash.conf file if you are goin to use okcashd daemon."
echo "  "
exit 0

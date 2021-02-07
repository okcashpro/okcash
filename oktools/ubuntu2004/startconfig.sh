#!/bin/bash
echo "Creating okcash.conf file over the user home folder .okcash"

date

sudo apt-get install unzip pwgen -y

# Create .okcash config folder
mkdir ~/.okcash

# Create configuration File
touch ~/.okcash/okcash.conf
rpcu=$(pwgen -ncsB 20 1)
rpcp=$(pwgen -ncsB 20 1)
echo "rpcuser=$rpcu
rpcpassword=$rpcp
#rpcport=6969
#port=6970
daemon=1
#staking=0
#server=1
#listen=1
#txindex=1
#maxconnections=1024
#timeout=15000" > ~/.okcash/okcash.conf

# end Client
echo "okcash.conf file created with random rpcuser and rpcpassword."
echo "enjoy your OK experience"
exit 0
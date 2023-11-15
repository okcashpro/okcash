#!/bin/bash
echo "installing libssl1.0-dev to build Okcash node and graphical client."

date

cd

#Install libssl1.0-dev

sudo sh -c 'echo "deb http://security.ubuntu.com/ubuntu bionic-security main" >> /etc/apt/sources.list'

sudo apt update && apt-cache policy libssl1.0-dev

sudo apt-get install libssl1.0-dev -y

echo "libssl1.0-dev is now installed for:"
uname -a
exit 0
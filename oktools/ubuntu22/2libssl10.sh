#!/bin/bash
echo "installing libssl1.0-dev to build Okcash node and graphical client."

date

cd

#Install libssl1.0-dev
#If installing for i386, change _amd64 for _i386

wget "http://security.ubuntu.com/ubuntu/pool/main/o/openssl1.0/libssl1.0.0_1.0.2n-1ubuntu5.13_amd64.deb"

wget "http://security.ubuntu.com/ubuntu/pool/main/o/openssl1.0/libssl1.0-dev_1.0.2n-1ubuntu5.13_amd64.deb"

sudo dpkg -i libssl1.0.0_1.0.2n-1ubuntu5.13_amd64.deb

sudo dpkg -i libssl1.0-dev_1.0.2n-1ubuntu5.13_amd64.deb

echo "libssl1.0-dev is now installed for:"
uname -a
exit 0
#!/bin/bash
echo "Installing okcash dependencies for the system"

# Patch Okcash for Ubuntu 22
/bin/bash ./1patch.sh

#Install libssl1.0-dev
/bin/bash ./2libssl.sh

#Install deps for okcash
/bin/bash ./3depsnode.sh
/bin/bash ./6depsgui.sh

#Compile and Install db-4.8.30
/bin/bash ./4db4830.sh

# OK Full deps in the system
echo "= Okcash dependencies installed for ="
uname -a

#exit
exit 0
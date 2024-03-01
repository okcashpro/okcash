#!/bin/bash
# Do "chmod +x INSTALL_ubuntu.sh" if you can't run this file"
echo "**********************************************"
echo "  "
echo "Compiling|Installing - "okcashd" node for"
uname -a
echo "  "

# Call INSTALL_ubuntu22_node compilation
cd oktools/ubuntu22
chmod +x *
/bin/bash ./Compile_ubuntu22_node.sh
echo "**********************************************"
echo "  "
echo "okcashd node is now installed in your system."

# Ask the user if they want to install the GUI
echo "  "
echo "  "
echo "Do you want to also install the GUI (Qt Graphical User Interface) for Okcash? (yes/no)"
read answer

# Convert the answer to lowercase (to make the script more robust)
answer=$(echo "$answer" | tr '[:upper:]' '[:lower:]')

# Check the user's answer
if [ "$answer" == "yes" ]; then
    # If the user answers "yes", install Okcash GUI
    echo "Installing the Okcash GUI..."
    cd oktools/ubuntu22
    /bin/bash ./6depsgui.sh
    /bin/bash ./7buildgui.sh
    echo "**********************************************"
    echo "  "
    echo "okcash node and GUI (Qt) are now installed in your system."
elif [ "$answer" == "no" ]; then
    # user answers "no" GUI
    echo "  "
    echo "OK, Enjoy!."
else
    # If the user enters anything other than yes/no
    echo "  "
    echo "OK, Enjoy!."
fi

# Ask the user if they want to install the First time sync file / ok-blockchain
echo "**********************************************"
echo "  "
echo "First Time Use?"
echo "Do you want to Instant Sync [Download and instant sync the latest ok-blockchain? (yes/no)"
read answer

# Convert the answer to lowercase (to make the script more robust)
answer=$(echo "$answer" | tr '[:upper:]' '[:lower:]')

# Check the user's answer
if [ "$answer" == "yes" ]; then
    # If the user answers "yes", download and sync ok-blockchain for first time
    echo "Syncing Okcash for the first time..."
    cd 
    cd okcash/oktools/ubuntu22
    /bin/bash ./9syncok.sh
    echo "**********************************************"
    echo "  "
    echo "okcash First time Sync is installed in your system."
elif [ "$answer" == "no" ]; then
    # If the user answers "no", do not first time sync
    echo "  "
    echo "OK, Enjoy!."
else
    # If the user enters anything other than yes/no
    echo "  "
    echo "OK, Enjoy!."
fi

# Ask the user if they want to install sample okcash.conf file
echo "**********************************************"
echo "  "
echo "Need an okcash.conf file?"
echo "Do you want to install the sample okcash.conf file in your system (okcashd node requirement) (yes/no)"
read answer

# Convert the answer to lowercase (to make the script more robust)
answer=$(echo "$answer" | tr '[:upper:]' '[:lower:]')

# Check the user's answer
if [ "$answer" == "yes" ]; then
    # If the user answers "yes", install okcash.conf
    echo "Adding okcash.conf file to the system..."
    cd 
    cd okcash/oktools/ubuntu22
    /bin/bash ./8startconfig.sh
    echo "**********************************************"
    echo "  "
    echo "okcash.conf is installed in your system."
elif [ "$answer" == "no" ]; then
    # If the user answers "no", do not install okcash.conf
    echo "  "
    echo "OK, Enjoy!."
else
    # If the user enters anything other than yes/no
    echo "  "
    echo "OK, Enjoy!."
fi

# end Client
echo "**********************************************"
echo "  "
echo "Done installing Okcash on its latest version for:"
uname -a
echo "  "
echo "Get empowered with Okcash!"
exit 0
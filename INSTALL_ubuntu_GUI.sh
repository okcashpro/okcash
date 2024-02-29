#!/bin/bash
# Do "chmod +x INSTALL_ubuntu22_GUI.sh" if you can't run this file"
echo "Compiling|Installing - "okcash GUI" to Ubuntu 22.04"
date

# Call INSTALL_ubuntu22_node compilation
cd oktools/ubuntu22
chmod +x *
/bin/bash ./Compile_ubuntu22_GUI.sh
echo "okcash GUI is now installed in your system."

# Ask the user if they want to perform an action
echo "First Time Use?"
echo "Do you want to Instant Sync [Download and instant sync the latest ok-blockchain? (yes/no)"
read answer

# Convert the answer to lowercase (to make the script more robust)
answer=$(echo "$answer" | tr '[:upper:]' '[:lower:]')

# Check the user's answer
if [ "$answer" == "yes" ]; then
    # If the user answers "yes", perform the action
    echo "Performing the action..."
    cd 
    cd okcash/oktools/ubuntu22
    /bin/bash ./9syncok.sh
    # Place the command for the action you want to perform below
    # For example: ls -l
elif [ "$answer" == "no" ]; then
    # If the user answers "no", do not perform the action
    echo "OK, Enjoy!."
else
    # If the user enters anything other than yes/no
    echo "Please answer yes or no."
fi
# end Client
echo "Done with the Okcash GUI for Ubuntu 22 install on its latest version for:"
uname -a
echo "  "
echo "Get empowered with Okcash!"
exit 0
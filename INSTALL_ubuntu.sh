#!/bin/bash
echo "**********************************************"
echo ""
echo "Compiling|Installing - 'okcashd' node for"
uname -a
echo ""

# Navigate to the appropriate directory and compile/install the node
cd oktools/ubuntu22
chmod +x *
/bin/bash ./Compile_ubuntu22_node.sh
echo "**********************************************"
echo ""
echo "okcashd node is now installed in your system."
echo ""
echo ""

# Function to ask yes/no question
ask_question() {
    while true; do
        echo "$1 (yes/no)"
        read answer
        answer=$(echo "$answer" | tr '[:upper:]' '[:lower:]')
        
        case "$answer" in
            yes)
                return 0
                ;;
            no)
                return 1
                ;;
            *)
                echo "Please answer yes or no."
                ;;
        esac
    done
}

# Ask if the user wants to install the GUI
if ask_question "Do you want to also install the GUI (Qt Graphical User Interface) for Okcash?"; then
    echo "Installing the Okcash GUI..."
    cd oktools/ubuntu22
    /bin/bash ./6depsgui.sh
    /bin/bash ./7buildgui.sh
    echo "**********************************************"
    echo ""
    echo "okcash node and GUI (Qt) are now installed in your system."
else
    echo ""
    echo "OK, Enjoy!."
fi

# Ask if the user wants to install the First time sync file / ok-blockchain
echo "**********************************************"
echo ""
if ask_question "First Time Use? Do you want to Instant Sync [Download and instant sync the latest ok-blockchain?"; then
    echo "Syncing Okcash for the first time..."
    cd
    cd okcash/oktools/ubuntu22
    /bin/bash ./9syncok.sh
    echo "**********************************************"
    echo ""
    echo "okcash First time Sync is installed in your system."
else
    echo ""
    echo "OK, Enjoy!."
fi

# Ask if the user wants to install sample okcash.conf file
echo "**********************************************"
echo ""
if ask_question "Need an okcash.conf file? Do you want to install the sample okcash.conf file in your system (okcashd node requirement)"; then
    echo "Adding okcash.conf file to the system..."
    cd
    cd okcash/oktools/ubuntu22
    /bin/bash ./8startconfig.sh
    echo "**********************************************"
    echo ""
    echo "okcash.conf is installed in your system."
else
    echo ""
    echo "OK, Enjoy!."
fi

echo "**********************************************"
echo ""
echo "Done installing Okcash on its latest version for:"
uname -a
echo ""
echo "Get empowered with Okcash!"
exit 0
#!/bin/bash
echo "installing Okcash GUI desktop app."
cd 
cd okcash/oktools/ubuntu
#Install okcash.desktop
sudo cp okcash-icon.png /usr/share/icons/hicolor/256x256/apps/okcash-icon.png
#sudo cp okcash.desktop ~/.local/share/applications/okcash.desktop
sudo cp okcash.desktop /usr/share/applications/okcash.desktop
sudo chmod +x /usr/share/applications/okcash.desktop

echo "  "
echo "Installed!"
echo "Now you can restart your system and start using Okcash [GUI (Qt)] from your applications menu."
echo "  "

exit 0
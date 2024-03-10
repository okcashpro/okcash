#!/bin/bash
echo "installing the required dependencies for Okcash Graphical User Interface and node."

date

echo "Just click Enter each time asked to install all dependencies (default)"

cd

sudo pacman -S qt5 -y

sudo pacman -S yay -y

yay -Syu

sudo yay -S qt5-webkit

echo "= QT5 Webkit is now installed ="

echo "All the required dependencies for Okcash node and Graphical client are now installed for:"
uname -a
exit 0

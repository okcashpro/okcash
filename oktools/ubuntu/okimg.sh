#!/bin/bash
cd ../..
mkdir -p appdir/usr/bin ; strip okcash ; cp okcash ./appdir/usr/bin/
mkdir -p appdir/usr/share/applications ; cp oktools/ubuntu/snap/okcash.desktop ./appdir/usr/share/applications/
mkdir -p appdir/usr/share/icons/hicolor/256x256/apps ; cp oktools/ubuntu/okcash-icon.png ./appdir/usr/share/icons/hicolor/256x256/apps/
wget -c -nv "https://github.com/probonopd/linuxdeployqt/releases/download/continuous/linuxdeployqt-continuous-x86_64.AppImage"
chmod a+x linuxdeployqt-continuous-x86_64.AppImage
unset QTDIR; unset QT_PLUGIN_PATH ; unset LD_LIBRARY_PATH
export VERSION=$(git rev-parse --short=4 HEAD) # linuxdeployqt uses this for naming the file
./linuxdeployqt-continuous-x86_64.AppImage appdir/usr/share/applications/*.desktop -bundle-non-qt-libs
./linuxdeployqt-continuous-x86_64.AppImage appdir/usr/share/applications/*.desktop -appimage
exit 0

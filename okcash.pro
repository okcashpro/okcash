TEMPLATE = app
TARGET = okcash
VERSION = 8.0.1.0
INCLUDEPATH += src src/json src/qt
DEFINES += BOOST_THREAD_USE_LIB BOOST_SPIRIT_THREADSAFE
CONFIG += no_include_pwd

!win32:CONFIG += thread
win32:CONFIG += thread static
win32:CONFIG += static
win32:CONFIG -= qtquickcompiler
#win32:LIBS += -L"c:/deps/openssl-1.0.2u" -llibcrypto
#win32:LIBS += -L"c:/deps/openssl-1.1.1u" -llibcrypto -lcrypt32
win32:LIBS += -L"c:/deps/openssl-3.0.13" -llibcrypto -lcrypt32
!android|!ios:QT += widgets webkitwidgets

# Mobile devices
android|ios {
    CONFIG += mobility
    MOBILITY =
}

greaterThan(QT_MAJOR_VERSION, 4) {
    DEFINES += QT_DISABLE_DEPRECATED_BEFORE=0
}

# for boost 1.37, add -mt to the boost libraries
# use: qmake BOOST_LIB_SUFFIX=-mt
# for boost thread win32 with _win32 sufix
# use: BOOST_THREAD_LIB_SUFFIX=_win32-...
# or when linking against a specific BerkelyDB version: BDB_LIB_SUFFIX=-4.8

# Dependency library locations can be customized with:
#    BOOST_INCLUDE_PATH, BOOST_LIB_PATH, BDB_INCLUDE_PATH,
#    BDB_LIB_PATH, OPENSSL_INCLUDE_PATH and OPENSSL_LIB_PATH respectively

OBJECTS_DIR = build
MOC_DIR = build
UI_DIR = build

android {
    INCLUDEPATH += src/qt/android

    QT += androidextras

    ANDROID_PACKAGE_SOURCE_DIR = $$PWD/android

    OTHER_FILES +=

    HEADERS +=
    SOURCES +=

    OBJECTS_DIR = build-android
    MOC_DIR = build-android
    UI_DIR = build-android
}

    RESOURCES = okcash.qrc

macx {
    QMAKE_TARGET_BUNDLE_PREFIX = co.okcash

    BOOST_LIB_SUFFIX=-mt

    BOOST_INCLUDE_PATH=/opt/local/include
    BOOST_LIB_PATH=/opt/local/lib

    BDB_INCLUDE_PATH=/opt/local/include/db48
    BDB_LIB_PATH=/opt/local/lib/db48

    OPENSSL_INCLUDE_PATH=/opt/local/include/openssl-3
    OPENSSL_LIB_PATH=/opt/local/lib/openssl-3

    MINIUPNPC_INCLUDE_PATH=/opt/local/include/miniupnpc
    MINIUPNPC_LIB_PATH=/opt/local/lib/

    QMAKE_CXXFLAGS += -arch x86_64 -stdlib=libc++
    QMAKE_CFLAGS += -arch x86_64
    QMAKE_LFLAGS += -arch x86_64 -stdlib=libc++

    #USE_UPNP=-
}

win32 {
    BOOST_LIB_SUFFIX=-mgw11-mt-s-x64-1_74
    BOOST_INCLUDE_PATH=c:/deps/boost_1_74_0/
    BOOST_LIB_PATH=c:/deps/boost_1_74_0/stage/lib

    BDB_INCLUDE_PATH=c:/deps/db-4.8.30.NC/build_unix
    BDB_LIB_PATH=c:/deps/db-4.8.30.NC/build_unix

    #OPENSSL_INCLUDE_PATH=c:/deps/openssl-1.1.1u/include/
    #OPENSSL_LIB_PATH=c:/deps/openssl-1.1.1u
    #OPENSSL_INCLUDE_PATH=c:/deps/openssl-1.0.2u/include/
    #OPENSSL_LIB_PATH=c:/deps/openssl-1.0.2u
    OPENSSL_INCLUDE_PATH=c:/deps/openssl-3.0.13/include/
    OPENSSL_LIB_PATH=c:/deps/openssl-3.0.13

    MINIUPNPC_INCLUDE_PATH=c:/deps
    MINIUPNPC_LIB_PATH=c:/deps/miniupnpc

        #USE_BUILD_INFO = 1
        #DEFINES += HAVE_BUILD_INFO

    #USE_UPNP=-
}


# use: qmake "RELEASE=1"
contains(RELEASE, 1) {
    CONFIG += static
    # Mac: compile for maximum compatibility (14.0)
    macx:QMAKE_CXXFLAGS += -mmacosx-version-min=14.0 -arch x86_64 -isysroot /Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk

    !windows:!macx {
        # Linux: static link
        LIBS += -Wl,-Bstatic
    }
}

!win32 {
# for extra security against potential buffer overflows: enable GCCs Stack Smashing Protection
QMAKE_CXXFLAGS *= -fstack-protector-all --param ssp-buffer-size=1
QMAKE_LFLAGS *= -fstack-protector-all --param ssp-buffer-size=1
# We need to exclude this for Windows cross compile with MinGW 4.2.x, as it will result in a non-working executable!
# This can be enabled for Windows, when we switch to MinGW >= 4.4.x.
}
# for extra security on Windows: enable ASLR and DEP via GCC linker flags
win32:QMAKE_LFLAGS *= -Wl,--dynamicbase -Wl,--nxcompat
#win32:QMAKE_LFLAGS += -static-libgcc -static-libstdc++

# use: qmake "USE_UPNP=1" ( enabled by default; default)
#  or: qmake "USE_UPNP=0" (disabled by default)
#  or: qmake "USE_UPNP=-" (not supported)
# miniupnpc (http://miniupnp.free.fr/files/) must be installed for support
contains(USE_UPNP, -) {
    message(Building without UPNP support)
} else {
    message(Building with UPNP support)
    count(USE_UPNP, 0) {
        USE_UPNP=1
    }
    DEFINES += USE_UPNP=$$USE_UPNP MINIUPNP_STATICLIB STATICLIB
    INCLUDEPATH += $$MINIUPNPC_INCLUDE_PATH
    LIBS += $$join(MINIUPNPC_LIB_PATH,,-L,) -lminiupnpc
    win32:LIBS += -liphlpapi
}

# use: qmake "USE_DBUS=1" or qmake "USE_DBUS=0"
linux:count(USE_DBUS, 0) {
    USE_DBUS=1
}
contains(USE_DBUS, 1) {
    message(Building with DBUS (Freedesktop notifications) support)
    DEFINES += USE_DBUS
    QT += dbus
}

contains(OKCASH_NEED_QT_PLUGINS, 1) {
    DEFINES += OKCASH_NEED_QT_PLUGINS
    QTPLUGIN += qcncodecs qjpcodecs qtwcodecs qkrcodecs qtaccessiblewidgets
}

INCLUDEPATH += src/leveldb/include src/leveldb/helpers
LIBS += $$PWD/src/leveldb/libleveldb.a $$PWD/src/leveldb/libmemenv.a
SOURCES += src/txdb-leveldb.cpp src/qt/addresstablemodel.cpp

!win32 {
    # we use QMAKE_CXXFLAGS_RELEASE even without RELEASE=1 because we use RELEASE to indicate linking preferences not -O preferences
     genleveldb.commands = cd $$PWD/src/leveldb && GCC=$$QMAKE_CC CXX=$$QMAKE_CXX $(MAKE) OPT=\"$$QMAKE_CXXFLAGS $$QMAKE_CXXFLAGS_RELEASE\" libleveldb.a libmemenv.a
}

win32 {
    # make an educated guess about what the ranlib command is called
    #isEmpty(QMAKE_RANLIB) {
    #    QMAKE_RANLIB = $$replace(QMAKE_STRIP, strip, ranlib)
    #}
    LIBS += -lshlwapi
    # genleveldb.commands = cd $$PWD/src/leveldb && GCC=$$QMAKE_CC CXX=$$QMAKE_CXX TARGET_OS=OS_NATIVE_WINDOWS $(MAKE) OPT=\"$$QMAKE_CXXFLAGS $$QMAKE_CXXFLAGS_RELEASE\" libleveldb.a libmemenv.a && $$QMAKE_RANLIB $$PWD/src/leveldb/libleveldb.a && $$QMAKE_RANLIB $$PWD/src/leveldb/libmemenv.a
}
genleveldb.target = $$PWD/src/leveldb/libleveldb.a
genleveldb.depends = FORCE
PRE_TARGETDEPS += $$PWD/src/leveldb/libleveldb.a
QMAKE_EXTRA_TARGETS += genleveldb
# Gross ugly hack that depends on qmake internals, unfortunately there is no other way to do it.
QMAKE_CLEAN += $$PWD/src/leveldb/libleveldb.a; cd $$PWD/src/leveldb ; $(MAKE) clean

# regenerate src/build.h
!windows|contains(USE_BUILD_INFO, 1) {
    genbuild.depends = FORCE
    genbuild.commands = cd $$PWD; /bin/sh src/genbuild.sh $$OUT_PWD/build/build.h
    genbuild.target = $$OUT_PWD/build/build.h
    PRE_TARGETDEPS += $$OUT_PWD/build/build.h
    QMAKE_EXTRA_TARGETS += genbuild
    DEFINES += HAVE_BUILD_INFO
}

contains(USE_O3, 1) {
    message(Building O3 optimization flag)
    QMAKE_CXXFLAGS_RELEASE -= -O2
    QMAKE_CFLAGS_RELEASE -= -O2
    QMAKE_CXXFLAGS += -O3
    QMAKE_CFLAGS += -O3
}

*-g++-32 {
    message("32 platform, adding -msse2 flag")

    QMAKE_CXXFLAGS += -msse2
    QMAKE_CFLAGS += -msse2
}

QMAKE_CXXFLAGS_WARN_ON = -fdiagnostics-show-option -Wall -Wextra -Wno-ignored-qualifiers -Wformat -Wformat-security -Wno-unused-parameter -Wstack-protector

# Input
DEPENDPATH += src src/json src/qt
HEADERS += \
    src/alert.h \
    src/allocators.h \
    src/wallet.h \
    src/keystore.h \
    src/version.h \
    src/netbase.h \
    src/clientversion.h \
    src/threadsafety.h \
    src/protocol.h \
    src/ui_interface.h \
    src/crypter.h \
    src/addrman.h \
    src/base58.h \
    src/bignum.h \
    src/chainparams.h \
    src/checkpoints.h \
    src/compat.h \
    src/coincontrol.h \
    src/sync.h \
    src/util.h \
    src/hash.h \
    src/uint256.h \
    src/kernel.h \
    src/scrypt.h \
    src/pbkdf2.h \
    src/serialize.h \
    src/strlcpy.h \
    src/smessage.h \
    src/main.h \
    src/miner.h \
    src/net.h \
    src/key.h \
    src/extkey.h \
    src/eckey.h \
    src/db.h \
    src/txdb.h \
    src/walletdb.h \
    src/script.h \
    src/stealth.h \
    src/ringsig.h  \
    src/core.h  \
    src/txmempool.h  \
    src/state.h \
    src/bloom.h \
    src/init.h \
    src/mruset.h \
    src/rpcprotocol.h \
    src/rpcserver.h \
    src/rpcclient.h \
    src/json/json_spirit_writer_template.h \
    src/json/json_spirit_writer.h \
    src/json/json_spirit_value.h \
    src/json/json_spirit_utils.h \
    src/json/json_spirit_stream_reader.h \
    src/json/json_spirit_reader_template.h \
    src/json/json_spirit_reader.h \
    src/json/json_spirit_error_position.h \
    src/json/json_spirit.h \
    src/qt/transactiontablemodel.h \
    src/qt/addresstablemodel.h \
    src/qt/coincontroldialog.h \
    src/qt/coincontroltreewidget.h \
    src/qt/aboutdialog.h \
    src/qt/editaddressdialog.h \
    src/qt/bitcoinaddressvalidator.h \
    src/qt/clientmodel.h \
    src/qt/guiutil.h \
    src/qt/transactionrecord.h \
    src/qt/guiconstants.h \
    src/qt/optionsmodel.h \
    src/qt/monitoreddatamapper.h \
    src/qt/transactiondesc.h \
    src/qt/bitcoinamountfield.h \
    src/qt/walletmodel.h \
    src/qt/csvmodelwriter.h \
    src/qt/qvalidatedlineedit.h \
    src/qt/bitcoinunits.h \
    src/qt/qvaluecombobox.h \
    src/qt/askpassphrasedialog.h \
    src/qt/notificator.h \
    src/qt/rpcconsole.h \
    src/qt/paymentserver.h \
    src/qt/peertablemodel.h \
    src/qt/scicon.h \
    src/qt/trafficgraphwidget.h \
    src/qt/messagemodel.h \
    src/qt/okcashgui.h \
    src/qt/okcashbridge.h \
    src/qt/bridgetranslations.h \

SOURCES += \
    src/alert.cpp \
    src/version.cpp \
    src/chainparams.cpp \
    src/sync.cpp \
    src/smessage.cpp \
    src/util.cpp \
    src/hash.cpp \
    src/netbase.cpp \
    src/key.cpp \
    src/extkey.cpp \
    src/eckey.cpp \
    src/script.cpp \
    src/main.cpp \
    src/miner.cpp \
    src/init.cpp \
    src/net.cpp \
    src/checkpoints.cpp \
    src/addrman.cpp \
    src/db.cpp \
    src/walletdb.cpp \
    src/noui.cpp \
    src/kernel.cpp \
    src/scrypt-arm.S \
    src/scrypt-x86.S \
    src/scrypt-x86_64.S \
    src/scrypt.cpp \
    src/pbkdf2.cpp \
    src/stealth.cpp  \
    src/ringsig.cpp  \
    src/core.cpp  \
    src/txmempool.cpp  \
    src/wallet.cpp \
    src/keystore.cpp \
    src/state.cpp \
    src/bloom.cpp \
    src/crypter.cpp \
    src/protocol.cpp \
    src/rpcprotocol.cpp \
    src/rpcserver.cpp \
    src/rpcclient.cpp \
    src/rpcdump.cpp \
    src/rpcnet.cpp \
    src/rpcmining.cpp \
    src/rpcwallet.cpp \
    src/rpcblockchain.cpp \
    src/rpcrawtransaction.cpp \
    src/rpcsmessage.cpp \
    src/rpcextkey.cpp \
    src/rpcmnemonic.cpp \
    src/qt/transactiontablemodel.cpp \
    src/qt/coincontroldialog.cpp \
    src/qt/coincontroltreewidget.cpp \
    src/qt/aboutdialog.cpp \
    src/qt/editaddressdialog.cpp \
    src/qt/bitcoinaddressvalidator.cpp \
    src/qt/clientmodel.cpp \
    src/qt/guiutil.cpp \
    src/qt/transactionrecord.cpp \
    src/qt/optionsmodel.cpp \
    src/qt/monitoreddatamapper.cpp \
    src/qt/transactiondesc.cpp \
    src/qt/bitcoinstrings.cpp \
    src/qt/bitcoinamountfield.cpp \
    src/qt/walletmodel.cpp \
    src/qt/csvmodelwriter.cpp \
    src/qt/qvalidatedlineedit.cpp \
    src/qt/bitcoinunits.cpp \
    src/qt/qvaluecombobox.cpp \
    src/qt/askpassphrasedialog.cpp \
    src/qt/notificator.cpp \
    src/qt/rpcconsole.cpp \
    src/qt/paymentserver.cpp \
    src/qt/peertablemodel.cpp \
    src/qt/scicon.cpp \
    src/qt/trafficgraphwidget.cpp \
    src/qt/messagemodel.cpp \
    src/qt/okcashgui.cpp \
    src/qt/okcash.cpp \
    src/qt/okcashbridge.cpp


FORMS += \
    src/qt/forms/coincontroldialog.ui \
    src/qt/forms/aboutdialog.ui \
    src/qt/forms/editaddressdialog.ui \
    src/qt/forms/transactiondescdialog.ui \
    src/qt/forms/askpassphrasedialog.ui \
    src/qt/forms/rpcconsole.ui


CODECFORTR = UTF-8

# for lrelease/lupdate
# also add new translations to src/qt/okcash.qrc under translations/
TRANSLATIONS = $$files(src/qt/locale/okcash_*.ts)

isEmpty(QMAKE_LRELEASE) {
    win32:QMAKE_LRELEASE = $$[QT_INSTALL_BINS]\\lrelease.exe
    else:QMAKE_LRELEASE = $$[QT_INSTALL_BINS]/lrelease
}
isEmpty(QM_DIR):QM_DIR = $$PWD/src/qt/locale
# automatically build translations, so they can be included in resource file
TSQM.name = lrelease ${QMAKE_FILE_IN}
TSQM.input = TRANSLATIONS
TSQM.output = $$QM_DIR/${QMAKE_FILE_BASE}.qm
TSQM.commands = $$QMAKE_LRELEASE ${QMAKE_FILE_IN} -qm ${QMAKE_FILE_OUT}
TSQM.CONFIG = no_link
QMAKE_EXTRA_COMPILERS += TSQM

windows:DEFINES += WIN32
windows:RC_FILE = src/qt/res/okcash.rc

windows:!contains(MINGW_THREAD_BUGFIX, 0) {
    # At least qmake's win32-g++-cross profile is missing the -lmingwthrd
    # thread-safety flag. GCC has -mthreads to enable this, but it doesn't
    # work with static linking. -lmingwthrd must come BEFORE -lmingw, so
    # it is prepended to QMAKE_LIBS_QT_ENTRY.
    # It can be turned off with MINGW_THREAD_BUGFIX=0, just in case it causes
    # any problems on some untested qmake profile now or in the future.
    DEFINES += _MT BOOST_THREAD_PROVIDES_GENERIC_SHARED_MUTEX_ON_WIN
    QMAKE_LIBS_QT_ENTRY = -lmingwthrd $$QMAKE_LIBS_QT_ENTRY
}

macx:HEADERS += src/qt/macdockiconhandler.h \
                src/qt/macnotificationhandler.h
macx:OBJECTIVE_SOURCES += src/qt/macdockiconhandler.mm \
                          src/qt/macnotificationhandler.mm
macx:LIBS += -framework Foundation -framework ApplicationServices -framework AppKit
macx:DEFINES += MAC_OSX MSG_NOSIGNAL=0
macx:ICON = src/qt/res/icons/okcash.icns
macx:TARGET = "Okcash"
macx:QMAKE_CFLAGS_THREAD += -pthread
macx:QMAKE_LFLAGS_THREAD += -pthread
macx:QMAKE_CXXFLAGS_THREAD += -pthread

# Set libraries and includes at end, to use platform-defined defaults if not overridden
INCLUDEPATH += $$BOOST_INCLUDE_PATH $$BDB_INCLUDE_PATH $$OPENSSL_INCLUDE_PATH
LIBS += $$join(BOOST_LIB_PATH,,-L,) $$join(BDB_LIB_PATH,,-L,) $$join(OPENSSL_LIB_PATH,,-L,)
LIBS += -lssl -lcrypto -ldb_cxx$$BDB_LIB_SUFFIX
# -lgdi32 has to happen after -lcrypto (see  #681)
windows:LIBS += -lws2_32 -lshlwapi -lmswsock -lole32 -loleaut32 -luuid -lgdi32
LIBS += -lboost_system$$BOOST_LIB_SUFFIX -lboost_filesystem$$BOOST_LIB_SUFFIX -lboost_program_options$$BOOST_LIB_SUFFIX -lboost_chrono$$BOOST_LIB_SUFFIX -lboost_thread$$BOOST_LIB_SUFFIX
windows:LIBS += -lboost_chrono$$BOOST_LIB_SUFFIX

contains(RELEASE, 1) {
    !windows:!macx {
        # Linux: turn dynamic linking back on for c/c++ runtime libraries
        LIBS += -Wl,-Bdynamic
    }
}

!windows:!macx:!android:!ios {
    DEFINES += LINUX
    LIBS += -lrt -ldl
}

# "Other files" to show in Qt Creator
OTHER_FILES += \
    "doc/*.rst" "doc/*.txt" "doc/README" "README.md" "res/okcash.rc"

system($$QMAKE_LRELEASE -silent $$_PRO_FILE_)

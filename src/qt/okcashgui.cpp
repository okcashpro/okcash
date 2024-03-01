// Copyright (c) 2014 The Okcash developers
// Distributed under the MIT/X11 software license, see the accompanying
// file license.txt or http://www.opensource.org/licenses/mit-license.php.

#include "okcashgui.h"
#include "transactiontablemodel.h"
#include "transactionrecord.h"

#include "aboutdialog.h"
#include "clientmodel.h"
#include "walletmodel.h"
#include "messagemodel.h"
#include "optionsmodel.h"
#include "addresstablemodel.h"
#include "bitcoinunits.h"
#include "guiconstants.h"
#include "askpassphrasedialog.h"
#include "notificator.h"
#include "guiutil.h"
#include "wallet.h"
#include "util.h"
#include "init.h"

#ifdef Q_OS_MAC
#include "macdockiconhandler.h"
#endif

#include <QApplication>
#include <QMainWindow>
#include <QWebElementCollection>
#include <QWebFrame>
#include <QWebInspector>
#include <QMenuBar>
#include <QMenu>
#include <QVBoxLayout>
#include <QIcon>
#include <QTimer>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QLocale>
#include <QMessageBox>
#include <QMimeData>
#include <QDateTime>
#include <QFile>
#include <QFileDialog>
#include <QDesktopServices>
#include <QTimer>
#include <QDragEnterEvent>
#include <QUrl>
#include <QTextStream>
#include <QTextDocument>


#include <iostream>

extern CWallet* pwalletMain;
double GetPoSKernelPS();

OkcashGUI::OkcashGUI(QWidget *parent):
    QMainWindow(parent),
    bridge(new OkcashBridge(this)),
    clientModel(0),
    walletModel(0),
    messageModel(0),
    encryptWalletAction(0),
    changePassphraseAction(0),
    unlockWalletAction(0),
    lockWalletAction(0),
    aboutQtAction(0),
    trayIcon(0),
    notificator(0),
    rpcConsole(0),
    nWeight(0)
{
    webView = new QWebView();

    webView->page()->setLinkDelegationPolicy(QWebPage::DelegateAllLinks);

    webView->page()->action(QWebPage::Reload )->setVisible(false);
    webView->page()->action(QWebPage::Back   )->setVisible(false);
    webView->page()->action(QWebPage::Forward)->setVisible(false);

    connect(webView, SIGNAL(linkClicked(const QUrl&)), this, SLOT(urlClicked(const QUrl&)));

    setCentralWidget(webView);

    resize(1280, 720);
    setWindowTitle(tr("OK Wallet") + " - " + tr("v8"));
#ifndef Q_OS_MAC
    qApp->setWindowIcon(QIcon(":icons/okcash"));
    setWindowIcon(QIcon(":icons/okcash"));
#else
    setUnifiedTitleAndToolBarOnMac(true);
    QApplication::setAttribute(Qt::AA_DontShowIconsInMenus);
#endif

    // Accept D&D of URIs
    setAcceptDrops(true);

    // Create actions for the toolbar, menu bar and tray/dock icon
    createActions();

    // Create application menu bar
    createMenuBar();

    // Create the tray icon (or setup the dock icon)
    createTrayIcon();

    rpcConsole = new RPCConsole(this);

    connect(openRPCConsoleAction, SIGNAL(triggered()), rpcConsole, SLOT(show()));

    // prevents an oben debug window from becoming stuck/unusable on client shutdown
    connect(quitAction, SIGNAL(triggered()), rpcConsole, SLOT(hide()));

    documentFrame = webView->page()->mainFrame();

    QWebSettings::globalSettings()->setAttribute(QWebSettings::DeveloperExtrasEnabled, true);

    //connect(webView->page()->action(QWebPage::Reload), SIGNAL(triggered()), SLOT(pageLoaded(bool)));

    connect(webView, SIGNAL(loadFinished(bool)),                    SLOT(pageLoaded(bool)));
    connect(documentFrame, SIGNAL(javaScriptWindowObjectCleared()), SLOT(addJavascriptObjects()));
    connect(documentFrame, SIGNAL(urlChanged(QUrl)),                SLOT(urlClicked(const QUrl&)));

#ifdef Q_OS_WIN
    QFile html("C:/okcash/index.html");
#else
    QFile html("/opt/okcash/index.html");
#endif

    if(html.exists())
        webView->setUrl(QUrl("file:///" + html.fileName()));
    else
        webView->setUrl(QUrl("qrc:///src/qt/res/index.html"));
}

OkcashGUI::~OkcashGUI()
{
    if(trayIcon) // Hide tray icon, as deleting will let it linger until quit (on Ubuntu)
        trayIcon->hide();

    delete webView;
#ifdef Q_OS_MAC
    delete appMenuBar;
#endif
}

void OkcashGUI::pageLoaded(bool ok)
{
    if (GetBoolArg("-staking", true))
    {
        QTimer *timerStakingIcon = new QTimer(this);
        connect(timerStakingIcon, SIGNAL(timeout()), this, SLOT(updateStakingIcon()));
        timerStakingIcon->start(15 * 1000);
        updateStakingIcon();
    }

}

void OkcashGUI::addJavascriptObjects()
{
    documentFrame->addToJavaScriptWindowObject("bridge", bridge);

}

void OkcashGUI::urlClicked(const QUrl & link)
{
    if(link.scheme() == "qrc" || link.scheme() == "file")
        return;

    QDesktopServices::openUrl(link);
}

void OkcashGUI::createActions()
{

    quitAction = new QAction(QIcon(":/icons/quit"), tr("E&xit"), this);
    quitAction->setToolTip(tr("Quit application"));
    quitAction->setShortcut(QKeySequence(Qt::CTRL + Qt::Key_Q));
    quitAction->setMenuRole(QAction::QuitRole);
    aboutAction = new QAction(QIcon(":/icons/okcash"), tr("&About Okcash"), this);
    aboutAction->setToolTip(tr("Show information about Okcash"));
    aboutAction->setMenuRole(QAction::AboutRole);
    aboutQtAction = new QAction(QIcon(":/trolltech/qmessagebox/images/qtlogo-64.png"), tr("About &Qt"), this);
    aboutQtAction->setToolTip(tr("Show information about Qt"));
    aboutQtAction->setMenuRole(QAction::AboutQtRole);
    optionsAction = new QAction(QIcon(":/icons/options"), tr("&Options..."), this);
    optionsAction->setToolTip(tr("Modify configuration options for Okcash"));
    optionsAction->setMenuRole(QAction::PreferencesRole);
    toggleHideAction = new QAction(QIcon(":/icons/okcash"), tr("&Show / Hide"), this);
    encryptWalletAction = new QAction(QIcon(":/icons/lock_closed"), tr("&Encrypt Wallet..."), this);
    encryptWalletAction->setToolTip(tr("Encrypt or decrypt wallet"));
    encryptWalletAction->setCheckable(true);
    backupWalletAction = new QAction(QIcon(":/icons/filesave"), tr("&Backup Wallet..."), this);
    backupWalletAction->setToolTip(tr("Backup wallet to another location"));
    changePassphraseAction = new QAction(QIcon(":/icons/key"), tr("&Change Passphrase..."), this);
    changePassphraseAction->setToolTip(tr("Change the passphrase used for wallet encryption"));
    unlockWalletAction = new QAction(QIcon(":/icons/lock_open"), tr("&Unlock Wallet..."), this);
    unlockWalletAction->setToolTip(tr("Unlock wallet"));
    lockWalletAction = new QAction(QIcon(":/icons/lock_closed"), tr("&Lock Wallet"), this);
    lockWalletAction->setToolTip(tr("Lock wallet"));

    //exportAction = new QAction(QIcon(":/icons/export"), tr("&Export..."), this);
    //exportAction->setToolTip(tr("Export the data in the current tab to a file"));
    openRPCConsoleAction = new QAction(QIcon(":/icons/debugwindow"), tr("&OK Console / Debug"), this);
    openRPCConsoleAction->setToolTip(tr("Open debugging and diagnostic console"));

    connect(quitAction, SIGNAL(triggered()), qApp, SLOT(quit()));
    connect(aboutAction, SIGNAL(triggered()), SLOT(aboutClicked()));
    connect(aboutQtAction, SIGNAL(triggered()), qApp, SLOT(aboutQt()));
    connect(optionsAction, SIGNAL(triggered()), SLOT(optionsClicked()));
    connect(toggleHideAction, SIGNAL(triggered()), SLOT(toggleHidden()));
    connect(encryptWalletAction, SIGNAL(triggered(bool)), SLOT(encryptWallet(bool)));
    connect(backupWalletAction, SIGNAL(triggered()), SLOT(backupWallet()));
    connect(changePassphraseAction, SIGNAL(triggered()), SLOT(changePassphrase()));
    connect(unlockWalletAction, SIGNAL(triggered()), SLOT(unlockWallet()));
    connect(lockWalletAction, SIGNAL(triggered()), SLOT(lockWallet()));
}

void OkcashGUI::createMenuBar()
{
#ifdef Q_OS_MAC
    // Create a decoupled menu bar on Mac which stays even if the window is closed
    appMenuBar = new QMenuBar();
#else
    // Get the main window's menu bar on other platforms
    appMenuBar = menuBar();
    appMenuBar->hide();
#endif

    // Configure the menus
    QMenu *file = appMenuBar->addMenu(tr("&File"));
    file->addAction(backupWalletAction);
    //file->addAction(exportAction);
    file->addSeparator();
    file->addAction(quitAction);

    QMenu *settings = appMenuBar->addMenu(tr("&Settings"));
    settings->addAction(encryptWalletAction);
    settings->addAction(changePassphraseAction);
    settings->addAction(unlockWalletAction);
    settings->addAction(lockWalletAction);
    settings->addSeparator();
    settings->addAction(optionsAction);

    QMenu *help = appMenuBar->addMenu(tr("&Help"));
    help->addAction(openRPCConsoleAction);
    help->addSeparator();
    help->addAction(aboutAction);
    help->addAction(aboutQtAction);
}

void OkcashGUI::setClientModel(ClientModel *clientModel)
{
    this->clientModel = clientModel;
    if (clientModel)
    {
        int mode = clientModel->getClientMode();
        if (mode != NT_FULL)
        {
            QString sMode = QString::fromLocal8Bit(GetNodeModeName(mode));
            if (sMode.length() > 0)
                sMode[0] = sMode[0].toUpper();

            setWindowTitle(tr("Okcash") + " - " + tr("Wallet") + ", " + sMode);
        };

        // Replace some strings and icons, when using the testnet
        if (clientModel->isTestNet())
        {
            setWindowTitle(windowTitle() + QString(" ") + tr("[testnet]"));
#ifndef Q_OS_MAC
            qApp->setWindowIcon(QIcon(":icons/okcash_testnet"));
            setWindowIcon(QIcon(":icons/okcash_testnet"));
#else
            MacDockIconHandler::instance()->setIcon(QIcon(":icons/okcash_testnet"));
#endif
            if(trayIcon)
            {
                trayIcon->setToolTip(tr("Okcash client") + QString(" ") + tr("[testnet]"));
                trayIcon->setIcon(QIcon(":/icons/okcash_testnet"));
                toggleHideAction->setIcon(QIcon(":/icons/toolbar_testnet"));
            }

            aboutAction->setIcon(QIcon(":/icons/toolbar_testnet"));
        }

        connect(clientModel, SIGNAL(numConnectionsChanged(int)), this, SLOT(setNumConnections(int)));
        connect(clientModel, SIGNAL(numBlocksChanged(int,int)), this, SLOT(setNumBlocks(int,int)));

        // Report errors from network/worker thread
        connect(clientModel, SIGNAL(error(QString,QString,bool)), this, SLOT(error(QString,QString,bool)));

        rpcConsole->setClientModel(clientModel);

        bridge->setClientModel();
    }
}

void OkcashGUI::setWalletModel(WalletModel *walletModel)
{
    this->walletModel = walletModel;
    if(walletModel)
    {
        // Report errors from wallet thread
        connect(walletModel, SIGNAL(error(QString,QString,bool)), this, SLOT(error(QString,QString,bool)));

        documentFrame->addToJavaScriptWindowObject("walletModel",  walletModel);
        documentFrame->addToJavaScriptWindowObject("optionsModel", walletModel->getOptionsModel());

        documentFrame->evaluateJavaScript("connectSignals();");

        walletModel->getOptionsModel()->displayUnitChanged   (walletModel->getOptionsModel()->getDisplayUnit());
        walletModel->getOptionsModel()->reserveBalanceChanged(walletModel->getOptionsModel()->getReserveBalance());
        walletModel->getOptionsModel()->rowsPerPageChanged   (walletModel->getOptionsModel()->getRowsPerPage());

        // Keep up to date with client
        setNumConnections(clientModel->getNumConnections());
        setNumBlocks     (clientModel->getNumBlocks(),
                          clientModel->getNumBlocksOfPeers());
        setEncryptionStatus(walletModel->getEncryptionStatus());
        walletModel->encryptionStatusChanged(walletModel->getEncryptionStatus());

        connect(walletModel, SIGNAL(encryptionStatusChanged(int)), SLOT(setEncryptionStatus(int)));

        // Balloon pop-up for new transaction
        connect(walletModel->getTransactionTableModel(), SIGNAL(rowsInserted(QModelIndex,int,int)),    SLOT(incomingTransaction(QModelIndex,int,int)));

        // Ask for passphrase if needed
        connect(walletModel, SIGNAL(requireUnlock()), this, SLOT(unlockWallet()));

        bridge->setWalletModel();
    }
}

void OkcashGUI::setMessageModel(MessageModel *messageModel)
{
    this->messageModel = messageModel;
    if(messageModel)
    {
        // Balloon pop-up for new message
        connect(messageModel, SIGNAL(rowsInserted(QModelIndex,int,int)), SLOT(incomingMessage(QModelIndex,int,int)));
        bridge->setMessageModel();
    }
}

void OkcashGUI::createTrayIcon()
{
    QMenu *trayIconMenu;
#ifndef Q_OS_MAC
    trayIcon = new QSystemTrayIcon(this);
    trayIconMenu = new QMenu(this);
    trayIcon->setContextMenu(trayIconMenu);
    trayIcon->setToolTip(tr("Okcash client"));
    trayIcon->setIcon(QIcon(":/icons/okcash"));
    connect(trayIcon, SIGNAL(activated(QSystemTrayIcon::ActivationReason)),
          this, SLOT(trayIconActivated(QSystemTrayIcon::ActivationReason)));
    trayIcon->show();
#else
    // Note: On Mac, the dock icon is used to provide the tray's functionality.
    MacDockIconHandler *dockIconHandler = MacDockIconHandler::instance();
    dockIconHandler->setMainWindow((QMainWindow *)this);
    trayIconMenu = dockIconHandler->dockMenu();
#endif

    // Configuration of the tray icon (or dock icon) icon menu
    trayIconMenu->addAction(toggleHideAction);
    trayIconMenu->addSeparator();
    trayIconMenu->addSeparator();
    trayIconMenu->addAction(optionsAction);
    trayIconMenu->addAction(openRPCConsoleAction);
#ifndef Q_OS_MAC // This is built-in on Mac
    trayIconMenu->addSeparator();
    trayIconMenu->addAction(quitAction);
#endif

    notificator = new Notificator(qApp->applicationName(), trayIcon, this);
}

#ifndef Q_OS_MAC
void OkcashGUI::trayIconActivated(QSystemTrayIcon::ActivationReason reason)
{
    if(reason == QSystemTrayIcon::Trigger)
    {
        // Click on system tray icon triggers show/hide of the main window
        toggleHideAction->trigger();
    }
}
#endif

void OkcashGUI::aboutClicked()
{
    AboutDialog dlg;
    dlg.setModel(clientModel);
    dlg.exec();
}

void OkcashGUI::setNumConnections(int count)
{
    QWebElement connectionsIcon = documentFrame->findFirstElement("#connectionsIcon");

    QString className;

    switch(count)
    {
    case 0:          className = "connect-0"; break;
    case 1: case 2:  className = "connect-1"; break;
    case 3: case 4:  className = "connect-2"; break;
    case 5: case 6:  className = "connect-3"; break;
    case 7: case 8:  className = "connect-4"; break;
    case 9: case 10: className = "connect-5"; break;
    default:         className = "connect-6"; break;
    }

    connectionsIcon.setAttribute("class", className);
    connectionsIcon.setAttribute("src", "qrc:///icons/" + className.replace("-", "_"));
    connectionsIcon.setAttribute("data-title", tr("<b>%n active connection(s)</b> to the OK network", "", count));
}

void OkcashGUI::setNumBlocks(int count, int nTotalBlocks)
{
    QWebElement blocksIcon  = documentFrame->findFirstElement("#blocksIcon");
    QWebElement syncingIcon = documentFrame->findFirstElement("#syncingIcon");
    QWebElement syncProgressBar = documentFrame->findFirstElement("#syncProgressBar");

    // don't show / hide progress bar and its label if we have no connection to the network
    if (!clientModel || (clientModel->getNumConnections() == 0 && !clientModel->isImporting()))
    {
        syncProgressBar.setAttribute("style", "display:none;");

        return;
    }

    // -- translation (tr()) makes it difficult to neatly pick block/header
    static QString sBlockType = nNodeMode == NT_FULL ? tr("block") : tr("header");
    static QString sBlockTypeMulti = nNodeMode == NT_FULL ? tr("blocks") : tr("headers");

    QString strStatusBarWarnings = clientModel->getStatusBarWarnings();
    QString tooltip;

    if (nNodeMode != NT_FULL
        && nNodeState == NS_GET_FILTERED_BLOCKS)
    {
        tooltip = tr("Synchronizing with network...");
                + "\n"
                + tr("Downloading filtered blocks...");

        int nRemainingBlocks = nTotalBlocks - pwalletMain->nLastFilteredHeight;
        float nPercentageDone = pwalletMain->nLastFilteredHeight / (nTotalBlocks * 0.01f);

        tooltip += "\n"
                 + tr("~%1 filtered block(s) remaining (%2% done).").arg(nRemainingBlocks).arg(nPercentageDone);

        count = pwalletMain->nLastFilteredHeight;
        syncProgressBar.removeAttribute("style");
    } else
    if (count < nTotalBlocks)
    {
        int nRemainingBlocks = nTotalBlocks - count;
        float nPercentageDone = count / (nTotalBlocks * 0.01f);
        syncProgressBar.removeAttribute("style");

        if (strStatusBarWarnings.isEmpty())
        {
            bridge->networkAlert("");
            tooltip = clientModel->isImporting() ? tr("Importing blocks...") : tr("Synchronizing with network...");

            if (nNodeMode == NT_FULL)
            {
                tooltip += "\n"
                         + tr("~%n block(s) remaining", "", nRemainingBlocks);
            } else
            {
                char temp[128];
                snprintf(temp, sizeof(temp), "~%%n %s remaining", nRemainingBlocks == 1 ? qPrintable(sBlockType) : qPrintable(sBlockTypeMulti));

                tooltip += "\n"
                         + tr(temp, "", nRemainingBlocks);

            };
        }

        tooltip += (tooltip.isEmpty()? "" : "\n")
		 + (clientModel->isImporting() ? tr("Imported") : tr("Downloaded")) + " "
                 + tr("%1 of %2 %3 of transaction history (%4% done).").arg(count).arg(nTotalBlocks).arg(sBlockTypeMulti).arg(nPercentageDone, 0, 'f', 2);
    } else
    {
        tooltip = (clientModel->isImporting() ? tr("Imported") : tr("Downloaded")) + " " + tr("%1 blocks of transaction history.").arg(count);
    }

    // Override progressBarLabel text when we have warnings to display
    if (!strStatusBarWarnings.isEmpty())
        bridge->networkAlert(strStatusBarWarnings);

    QDateTime lastBlockDate;
    if (nNodeMode == NT_FULL)
        lastBlockDate = clientModel->getLastBlockDate();
    else
        lastBlockDate = clientModel->getLastBlockThinDate();

    int secs = lastBlockDate.secsTo(QDateTime::currentDateTime());
    QString text;

    // Represent time from last generated block in human readable text
    if (secs <= 0)
    {
        // Fully up to date. Leave text empty.
    } else
    if (secs < 60)
    {
        text = tr("%n second(s) ago","",secs);
    } else
    if (secs < 60*60)
    {
        text = tr("%n minute(s) ago","",secs/60);
    } else
    if (secs < 24*60*60)
    {
        text = tr("%n hour(s) ago","",secs/(60*60));
    } else
    {
        text = tr("%n day(s) ago","",secs/(60*60*24));
    }

    // Set icon state: spinning if catching up, tick otherwise
    if (secs < 90*60 && count >= nTotalBlocks
        && nNodeState != NS_GET_FILTERED_BLOCKS)
    {
        tooltip = tr("<b>Up to date</b> with the OK Blockchain.") + "\n" + tooltip;
        blocksIcon.removeClass("none");
        syncingIcon.addClass("none");

        QWebElementCollection outOfSyncElements = documentFrame->findAllElements(".outofsync");

        foreach(QWebElement outOfSync, outOfSyncElements)
            outOfSync.setStyleProperty("display", "none");

        syncProgressBar.setAttribute("style", "display:none;");
    } else
    {
        tooltip = tr("<b>Catching up</b> with the OK Blockchain...") + "\n" + tooltip;

        blocksIcon.addClass("none");
        syncingIcon.removeClass("none");

        QWebElementCollection outOfSyncElements = documentFrame->findAllElements(".outofsync");

        foreach(QWebElement outOfSync, outOfSyncElements)
            outOfSync.setStyleProperty("display", "inline");

        syncProgressBar.removeAttribute("style");
    }

    if (!text.isEmpty())
    {
        tooltip += "\n";
        tooltip += tr("The last received %1 was generated %2").arg(sBlockType).arg(text);
    };

    blocksIcon     .setAttribute("data-title", tooltip);
    syncingIcon    .setAttribute("data-title", tooltip);
    syncProgressBar.setAttribute("data-title", tooltip);
    syncProgressBar.setAttribute("value", QString::number(count));
    syncProgressBar.setAttribute("max",   QString::number(nTotalBlocks));
}

void OkcashGUI::error(const QString &title, const QString &message, bool modal)
{
    // Report errors from network/worker thread
    if(modal)
    {
        QMessageBox::critical(this, title, message, QMessageBox::Ok, QMessageBox::Ok);
    } else
    {
        notificator->notify(Notificator::Critical, title, message);
    }
}

void OkcashGUI::changeEvent(QEvent *e)
{
    QMainWindow::changeEvent(e);
#ifndef Q_OS_MAC // Ignored on Mac
    if(e->type() == QEvent::WindowStateChange)
    {
        if(clientModel && clientModel->getOptionsModel()->getMinimizeToTray())
        {
            QWindowStateChangeEvent *wsevt = static_cast<QWindowStateChangeEvent*>(e);
            if(!(wsevt->oldState() & Qt::WindowMinimized) && isMinimized())
            {
                QTimer::singleShot(0, this, SLOT(hide()));
                e->ignore();
            }
        }
    }
#endif
}

void OkcashGUI::closeEvent(QCloseEvent *event)
{
    if(clientModel)
    {
#ifndef Q_OS_MAC // Ignored on Mac
        if(!clientModel->getOptionsModel()->getMinimizeToTray() &&
           !clientModel->getOptionsModel()->getMinimizeOnClose())
        {
            qApp->quit();
        }
#endif
    }
    QMainWindow::closeEvent(event);
}

void OkcashGUI::askFee(qint64 nFeeRequired, bool *payFee)
{
    QString strMessage =
        tr("This transaction is over the size limit.  You can still send it for a fee of %1, "
          "which goes to the nodes that process your transaction and helps to support the OK network.  "
          "Do you want to pay the fee?").arg(
                BitcoinUnits::formatWithUnit(BitcoinUnits::OK, nFeeRequired));
    QMessageBox::StandardButton retval = QMessageBox::question(
          this, tr("Confirm transaction fee"), strMessage,
          QMessageBox::Yes|QMessageBox::Cancel, QMessageBox::Yes);
    *payFee = (retval == QMessageBox::Yes);
}

void OkcashGUI::incomingTransaction(const QModelIndex & parent, int start, int end)
{
    if(!walletModel || !clientModel || clientModel->inInitialBlockDownload() || nNodeState != NS_READY)
        return;

    TransactionTableModel *ttm = walletModel->getTransactionTableModel();

    QString type = ttm->index(start, TransactionTableModel::Type, parent).data().toString();

    // Ignore staking transactions... We should create an Option, and allow people to select/deselect what
    // type of transactions they want to see
    if(!(clientModel->getOptionsModel()->getNotifications().first() == "*")
    && ! clientModel->getOptionsModel()->getNotifications().contains(type))
        return;

    // On new transaction, make an info balloon
    // Unless the initial block download is in progress, to prevent balloon-spam
    QString date    = ttm->index(start, TransactionTableModel::Date, parent).data().toString();
    QString address = ttm->index(start, TransactionTableModel::ToAddress, parent).data().toString();
    qint64 amount   = ttm->index(start, TransactionTableModel::Amount, parent).data(Qt::EditRole).toULongLong();
    QIcon   icon    = qvariant_cast<QIcon>(ttm->index(start, TransactionTableModel::ToAddress, parent).data(Qt::DecorationRole));

    notificator->notify(Notificator::Information,
                        (amount)<0 ? tr("Sent transaction") :
                                     tr("Incoming transaction"),
                          tr("Date: %1\n"
                             "Amount: %2\n"
                             "Type: %3\n"
                             "Address: %4\n")
                          .arg(date)
                          .arg(BitcoinUnits::formatWithUnit(walletModel->getOptionsModel()->getDisplayUnit(), amount, true))
                          .arg(type)
                          .arg(address), icon);
}

void OkcashGUI::incomingMessage(const QModelIndex & parent, int start, int end)
{
    if(!messageModel)
        return;

    if(!(clientModel->getOptionsModel()->getNotifications().first() == "*")
    && ! clientModel->getOptionsModel()->getNotifications().contains(tr("Incoming Message")))
        return;

    MessageModel *mm = messageModel;

    if (mm->index(start, MessageModel::TypeInt, parent).data().toInt() == MessageTableEntry::Received)
    {
        QString sent_datetime = mm->index(start, MessageModel::ReceivedDateTime, parent).data().toString();
        QString from_address  = mm->index(start, MessageModel::FromAddress,      parent).data().toString();
        QString to_address    = mm->index(start, MessageModel::ToAddress,        parent).data().toString();
        QString message       = mm->index(start, MessageModel::Message,          parent).data().toString();
        QTextDocument html;
        html.setHtml(message);
        QString messageText(html.toPlainText());
        notificator->notify(Notificator::Information,
                            tr("Incoming Message"),
                            tr("Date: %1\n"
                               "From Address: %2\n"
                               "To Address: %3\n"
                               "Message: %4\n")
                              .arg(sent_datetime)
                              .arg(from_address)
                              .arg(to_address)
                              .arg(messageText));
    };
}

void OkcashGUI::optionsClicked()
{
    bridge->triggerElement("#navitems a[href=#options]", "click");
    showNormalIfMinimized();
}

void OkcashGUI::dragEnterEvent(QDragEnterEvent *event)
{
    // Accept only URIs
    if(event->mimeData()->hasUrls())
        event->acceptProposedAction();
}

void OkcashGUI::dragMoveEvent(QDragMoveEvent *event)
{
    event->accept();
}

void OkcashGUI::dropEvent(QDropEvent *event)
{
    if(event->mimeData()->hasUrls())
    {
        int nValidUrisFound = 0;
        QList<QUrl> uris = event->mimeData()->urls();
        foreach(const QUrl &uri, uris)
        {
            handleURI(uri.toString());
            nValidUrisFound++;
        }

        // if valid URIs were found
        if (nValidUrisFound)
            bridge->triggerElement("#navitems a[href=#send]", "click");
        else
            notificator->notify(Notificator::Warning, tr("URI handling"), tr("URI can not be parsed! This can be caused by an invalid Okcash address or malformed URI parameters."));
    }

    event->acceptProposedAction();
}

void OkcashGUI::handleURI(QString strURI)
{

    SendCoinsRecipient rv;

    // URI has to be valid
    if(GUIUtil::parseBitcoinURI(strURI, &rv))
    {
        CBitcoinAddress address(rv.address.toStdString());
        if (!address.IsValid())
            return;

        bridge->emitReceipient(rv.address, rv.label, rv.narration, rv.amount);

        showNormalIfMinimized();
    }
    else
        notificator->notify(Notificator::Warning, tr("URI handling"), tr("URI can not be parsed! This can be caused by an invalid Okcash address or malformed URI parameters."));
}

void OkcashGUI::setEncryptionStatus(int status)
{
    QWebElement encryptionIcon    = documentFrame->findFirstElement("#encryptionIcon");
    QWebElement encryptButton     = documentFrame->findFirstElement("#encryptWallet");
    QWebElement encryptMenuItem   = documentFrame->findFirstElement(".encryptWallet");
    QWebElement changePassphrase  = documentFrame->findFirstElement("#changePassphrase");
    QWebElement toggleLock        = documentFrame->findFirstElement("#toggleLock");
    QWebElement toggleLockIcon    = documentFrame->findFirstElement("#toggleLock i");
    switch(status)
    {
    case WalletModel::Unencrypted:
        encryptionIcon.setAttribute("style", "display:none;");
        changePassphrase.addClass("none");
        toggleLock.addClass("none");
        encryptMenuItem.removeClass("none");
        encryptWalletAction->setChecked(false);
        changePassphraseAction->setEnabled(false);
        unlockWalletAction->setVisible(false);
        lockWalletAction->setVisible(false);
        encryptWalletAction->setEnabled(true);
        break;
    case WalletModel::Unlocked:
        encryptMenuItem  .addClass("none");
        encryptionIcon.removeAttribute("style");
        encryptionIcon.removeClass("fa-toggle-off");
        encryptionIcon.removeClass("encryption");
        encryptionIcon.   addClass("fa-toggle-on");
        encryptionIcon.   addClass("no-encryption");
        encryptMenuItem  .addClass("none");
        toggleLockIcon.removeClass("fa-toggle-on");
        toggleLockIcon.removeClass("fa-toggle-on");
        toggleLockIcon.   addClass("fa-toggle-off");
        encryptionIcon   .setAttribute("src", "qrc:///icons/lock_open");

        if (fWalletUnlockStakingOnly || fWalletUnlockMessagingEnabled)
        {
            QString datatitle = "";

            if(fWalletUnlockStakingOnly && fWalletUnlockMessagingEnabled)
                datatitle.append(tr("Your OK Wallet is <b>encrypted</b> and currently <b>unlocked</b>\n for <b>Staking</b> and the <b>OK Chat only</b>"));

            else if(fWalletUnlockMessagingEnabled)
                datatitle.append(tr("Your OK Wallet is <b>encrypted</b> and currently <b>unlocked</b>\n for the <b>OK Chat only</b>"));

            else if(fWalletUnlockStakingOnly)
                datatitle.append(tr("Your OK Wallet is <b>encrypted</b> and currently <b>unlocked</b>\n for <b>Staking only</b>"));


            encryptionIcon   .setAttribute("data-title", datatitle);
            encryptionIcon.removeClass("orange");
            encryptionIcon.addClass("green");
            encryptionIcon.addClass("encryption-stake");

            toggleLockIcon  .removeClass("orange");
            toggleLockIcon     .addClass("green");
        } else
        {
            encryptionIcon   .setAttribute("data-title", tr("Your OK Wallet is <b>encrypted</b> and currently fully <b>unlocked</b>"));
            encryptionIcon.addClass("orange");
            encryptionIcon.removeClass("green");
            encryptionIcon.removeClass("encryption-stake");

            toggleLockIcon  .removeClass("green");
            toggleLockIcon     .addClass("orange");
        };

        encryptButton.addClass("none");
        changePassphrase.removeClass("none");
        toggleLock.removeClass("none");
        encryptWalletAction->setChecked(true);
        changePassphraseAction->setEnabled(true);
        unlockWalletAction->setVisible(false);
        lockWalletAction->setVisible(true);
        encryptWalletAction->setEnabled(false); // TODO: decrypt currently not supported
        break;
    case WalletModel::Locked:
        encryptionIcon.removeAttribute("style");
        encryptionIcon.removeClass("fa-toggle-on");
        encryptionIcon.removeClass("no-encryption");
        encryptionIcon.removeClass("encryption-stake");
        encryptionIcon.   addClass("fa-toggle-off");
        encryptionIcon.   addClass("encryption");
        toggleLockIcon.removeClass("fa-toggle-off");
        toggleLockIcon.   addClass("fa-toggle-on");
        encryptionIcon   .setAttribute("data-title", tr("Your OK Wallet is <b>encrypted</b> and currently <b>locked</b>"));

        encryptionIcon     .addClass("green");
        encryptionIcon  .removeClass("orange");
        encryptButton      .addClass("none");
        encryptMenuItem    .addClass("none");
        changePassphrase.removeClass("none");
        toggleLockIcon  .removeClass("orange");
        toggleLockIcon     .addClass("green");
        encryptWalletAction->setChecked(true);
        changePassphraseAction->setEnabled(true);
        unlockWalletAction->setVisible(true);
        lockWalletAction->setVisible(false);
        encryptWalletAction->setEnabled(false); // TODO: decrypt currently not supported
        break;
    }
}

void OkcashGUI::encryptWallet(bool status)
{
    if(!walletModel)
        return;
    AskPassphraseDialog dlg(status ? AskPassphraseDialog::Encrypt:
                                     AskPassphraseDialog::Decrypt, this);
    dlg.setModel(walletModel);
    dlg.exec();

    setEncryptionStatus(walletModel->getEncryptionStatus());
}

void OkcashGUI::backupWallet()
{
    QString saveDir = QDesktopServices::storageLocation(QDesktopServices::DocumentsLocation);
    QString filename = QFileDialog::getSaveFileName(this, tr("Backup Wallet"), saveDir, tr("Wallet Data (*.dat)"));
    if(!filename.isEmpty())
    {
        if(!walletModel->backupWallet(filename))
        {
            QMessageBox::warning(this, tr("Backup Failed"), tr("There was an error trying to save the wallet data to the new location."));
        }
    }
}

void OkcashGUI::changePassphrase()
{
    AskPassphraseDialog dlg(AskPassphraseDialog::ChangePass, this);
    dlg.setModel(walletModel);
    dlg.exec();
}

void OkcashGUI::unlockWallet()
{
    if(!walletModel)
        return;

    // Unlock wallet when requested by wallet model
    if(walletModel->getEncryptionStatus() == WalletModel::Locked)
    {

        AskPassphraseDialog::Mode mode = sender() == unlockWalletAction ?
              AskPassphraseDialog::UnlockStaking : AskPassphraseDialog::Unlock;
        AskPassphraseDialog dlg(mode, this);
        dlg.setModel(walletModel);
        dlg.exec();
    }
}

void OkcashGUI::lockWallet()
{
    if(!walletModel)
        return;

    walletModel->setWalletLocked(true);
}

void OkcashGUI::toggleLock()
{
    if(!walletModel)
        return;
    WalletModel::EncryptionStatus status = walletModel->getEncryptionStatus();

    switch(status)
    {
        case WalletModel::Locked:       unlockWalletAction->trigger(); break;
        case WalletModel::Unlocked:     lockWalletAction->trigger();   break;
        default: // unencrypted wallet
            QMessageBox::warning(this, tr("Lock Wallet"),
                tr("Error: The OK Wallet must first be encrypted to be locked."),
                QMessageBox::Ok, QMessageBox::Ok);
            break;
    };

}

void OkcashGUI::showNormalIfMinimized(bool fToggleHidden)
{
    // activateWindow() (sometimes) helps with keyboard focus on Windows
    if (isHidden())
    {
        show();
        activateWindow();
    }
    else if (isMinimized())
    {
        showNormal();
        activateWindow();
    }
    else if (GUIUtil::isObscured(this))
    {
        raise();
        activateWindow();
    }
    else if(fToggleHidden)
        hide();
}

void OkcashGUI::toggleHidden()
{
    showNormalIfMinimized(true);
}

void OkcashGUI::updateWeight()
{
    if (!pwalletMain)
        return;

    TRY_LOCK(cs_main, lockMain);
    if (!lockMain)
        return;

    TRY_LOCK(pwalletMain->cs_wallet, lockWallet);
    if (!lockWallet)
        return;

    nWeight = pwalletMain->GetStakeWeight();
}

void OkcashGUI::updateStakingIcon()
{
    QWebElement stakingIcon = documentFrame->findFirstElement("#stakingIcon");
    uint64_t nNetworkWeight = 0;

    if(fIsStaking)
    {
        updateWeight();
        nNetworkWeight = GetPoSKernelPS();
    } else
        nWeight = 0;

    if (fIsStaking && nWeight)
    {
        uint64_t nWeight = this->nWeight;

        unsigned nEstimateTime = GetTargetSpacing(nBestHeight) * nNetworkWeight / nWeight;
        QString text;

        text = (nEstimateTime < 60)           ? tr("%n second(s)", "", nEstimateTime) : \
               (nEstimateTime < 60 * 60)      ? tr("%n minute(s)", "", nEstimateTime / 60) : \
               (nEstimateTime < 24 * 60 * 60) ? tr("%n hour(s)",   "", nEstimateTime / (60 * 60)) : \
                                                tr("%n day(s)",    "", nEstimateTime / (60 * 60 * 24));

        stakingIcon.removeClass("not-staking");
        stakingIcon.   addClass("staking");
        //stakingIcon.   addClass("fa-spin"); // TODO: Replace with gif... too much cpu usage

        nWeight        /= COIN,
        nNetworkWeight /= COIN;

        stakingIcon.setAttribute("data-title", tr("<b>OK LTSS Staking.</b>\nYour weight (Staking Power) is %1.\nNetwork weight is %2.\nExpected average time to earn reward is %3").arg(nWeight).arg(nNetworkWeight).arg(text));
    } else
    {
        stakingIcon.   addClass("not-staking");
        stakingIcon.removeClass("staking");
        //stakingIcon.removeClass("fa-spin"); // TODO: See above TODO...

        stakingIcon.setAttribute("data-title", (nNodeMode == NT_THIN)                   ? tr("<b>Not Staking.</b>\n Because the <b>OK client is in thin mode</b>") : \
                                               (!GetBoolArg("-staking", true))          ? tr("<b>Not Staking.</b>\n Because <b>Staking is disabled in the settings</b>")  : \
                                               (pwalletMain && pwalletMain->IsLocked()) ? tr("<b>Not Staking.</b>\n Because the <b>OK wallet is locked</b>")  : \
                                               (vNodes.empty())                         ? tr("<b>Not Staking.</b>\n Because the <b>OK client is offline</b>") : \
                                               (IsInitialBlockDownload())               ? tr("<b>Not Staking.</b>\n Because the <b>OK client is syncing with the OK Blockchain</b>") : \
                                               (!nWeight)                               ? tr("<b>Not Staking.</b>\n Because <b>you don't have mature OK coins</b>\n You need to wait 8hrs after receiving the OK coins") : \
                                                                                          tr("Not Staking"));
    }
}

void OkcashGUI::detectShutdown()
{
    if (ShutdownRequested())
        QMetaObject::invokeMethod(QCoreApplication::instance(), "quit", Qt::QueuedConnection);
}

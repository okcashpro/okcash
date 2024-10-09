#include "addresstablemodel.h"
#include "guiutil.h"
#include "walletmodel.h"

#include "wallet.h"
#include "base58.h"
#include "stealth.h"
#include "extkey.h"

#include <QFont>
#include <QColor>

const QString AddressTableModel::Send = "S";
const QString AddressTableModel::Receive = "R";

struct AddressTableEntry
{
    enum Type {
        Sending,
        Receiving
    };

    Type type;
    QString label;
    QString address;
    QString pubkey;
    int8_t addressType; // AddressType

    AddressTableEntry() {}
    AddressTableEntry(Type type, const QString &label, const QString &address, const QString &pubkey, const int8_t &addressType = 1):
        type(type), label(label), address(address), pubkey(pubkey), addressType(addressType) {}
};

struct AddressTableEntryLessThan
{
    bool operator()(const AddressTableEntry &a, const AddressTableEntry &b) const { return a.address < b.address; }
    bool operator()(const AddressTableEntry &a, const QString &b)           const { return a.address < b;}
    bool operator()(const QString &a, const AddressTableEntry &b)           const { return a < b.address;}
};

// Private implementation
class AddressTablePriv
{
public:
    CWallet *wallet;
    QList<AddressTableEntry> cachedAddressTable;
    AddressTableModel *parent;

    AddressTablePriv(CWallet *wallet, AddressTableModel *parent):
        wallet(wallet), parent(parent) {}

    void refreshAddressTable()
    {
        cachedAddressTable.clear();
        {
            LOCK(wallet->cs_wallet);
            BOOST_FOREACH(const PAIRTYPE(CTxDestination, std::string)& item, wallet->mapAddressBook)
            {
                const CBitcoinAddress& address = item.first;
                const QString & strName(QString::fromStdString(item.second));
                bool fMine = IsDestMine(*wallet, address.Get());

                if (strName.startsWith("ao "))
                    continue;

                QString strAddress(QString::fromStdString(address.ToString()));

                int8_t addrType;
                QString strPubkey;
                if (address.IsBIP32())
                {
                    addrType = AT_BIP32;
                } else if (strName.startsWith("group_"))
                {
                     //find way to detect group address here, probably need to add extra parameter to address log
                    addrType = AT_Group;
                    strPubkey = parent->pubkeyForAddress(strAddress, false);
                } else  {
                    addrType = AT_Normal;
                    strPubkey = parent->pubkeyForAddress(strAddress, false);
                };

                cachedAddressTable.append(
                    AddressTableEntry(fMine ? AddressTableEntry::Receiving : AddressTableEntry::Sending,
                    strName,
                    strAddress,
                    strPubkey,
                    addrType));
            };

            std::set<CStealthAddress>::iterator it;
            for (it = wallet->stealthAddresses.begin(); it != wallet->stealthAddresses.end(); ++it)
            {
                bool fMine = !(it->scan_secret.size() < 1);
                cachedAddressTable.append(
                    AddressTableEntry(fMine ? AddressTableEntry::Receiving : AddressTableEntry::Sending,
                    QString::fromStdString(it->label),
                    QString::fromStdString(it->Encoded()),
                    "",
                    AT_Stealth));
            };

            ExtKeyAccountMap::const_iterator mi;
            for (mi = wallet->mapExtAccounts.begin(); mi != wallet->mapExtAccounts.end(); ++mi)
            {
                CExtKeyAccount *ea = mi->second;
                if (ea->mapStealthKeys.size() < 1)
                    continue;
                AccStealthKeyMap::iterator its;
                for (its = ea->mapStealthKeys.begin(); its != ea->mapStealthKeys.end(); ++its)
                {
                    const CEKAStealthKey &aks = its->second;
                    bool fMine = true;
                    cachedAddressTable.append(
                        AddressTableEntry(fMine ? AddressTableEntry::Receiving : AddressTableEntry::Sending,
                        QString::fromStdString(aks.sLabel),
                        QString::fromStdString(aks.ToStealthAddress()),
                        "",
                        AT_Stealth));
                };
            };


        } // cs_wallet
        // qLowerBound() and qUpperBound() require our cachedAddressTable list to be sorted in asc order
        qSort(cachedAddressTable.begin(), cachedAddressTable.end(), AddressTableEntryLessThan());
    }

    void updateEntry(const QString &address, const QString &label, bool isMine, int status)
    {
        if (label.startsWith("ao "))
            return;

        // Find address / label in model
        QList<AddressTableEntry>::iterator lower = qLowerBound(
            cachedAddressTable.begin(), cachedAddressTable.end(), address, AddressTableEntryLessThan());
        QList<AddressTableEntry>::iterator upper = qUpperBound(
            cachedAddressTable.begin(), cachedAddressTable.end(), address, AddressTableEntryLessThan());
        int lowerIndex = (lower - cachedAddressTable.begin());
        int upperIndex = (upper - cachedAddressTable.begin());
        bool inModel = (lower != upper);
        AddressTableEntry::Type newEntryType = isMine ? AddressTableEntry::Receiving : AddressTableEntry::Sending;


        switch(status)
        {
        case CT_NEW:
            {
            if (inModel)
            {
                LogPrintf("Warning: AddressTablePriv::updateEntry: Got CT_NEW, but entry is already in model\n");
                break;
            };

            parent->beginInsertRows(QModelIndex(), lowerIndex, lowerIndex);

            int8_t addrType;
            QString strPubkey;
            if (IsBIP32(address.toStdString().c_str()))
                addrType = AT_BIP32;
            else
            if (IsStealthAddress(address.toStdString()))
                addrType = AT_Stealth;
            else
            {
                addrType = AT_Normal;
                strPubkey = parent->pubkeyForAddress(address, false);
            };

            cachedAddressTable.insert(lowerIndex, AddressTableEntry(newEntryType, label, address, strPubkey, addrType));

            parent->endInsertRows();
            }
            break;
        case CT_UPDATED:
            if(!inModel)
            {
                LogPrintf("Warning: AddressTablePriv::updateEntry: Got CT_UPDATED, but entry is not in model\n");
                break;
            }
            lower->type = newEntryType;
            lower->label = label;
            parent->emitDataChanged(lowerIndex);
            break;
        case CT_DELETED:
            if(!inModel)
            {
                LogPrintf("Warning: AddressTablePriv::updateEntry: Got CT_DELETED, but entry is not in model\n");
                break;
            }
            parent->beginRemoveRows(QModelIndex(), lowerIndex, upperIndex-1);
            cachedAddressTable.erase(lower, upper);
            parent->endRemoveRows();
            break;
        }
    }

    int size()
    {
        return cachedAddressTable.size();
    }

    AddressTableEntry *index(int idx)
    {
        if(idx >= 0 && idx < cachedAddressTable.size())
        {
            return &cachedAddressTable[idx];
        } else
        {
            return 0;
        }
    }
};

AddressTableModel::AddressTableModel(CWallet *wallet, WalletModel *parent) :
    QAbstractTableModel(parent),walletModel(parent),wallet(wallet),priv(0)
{
    columns << tr("Label") << tr("Address") << tr("pubkey") << tr("stealth");
    priv = new AddressTablePriv(wallet, this);
    priv->refreshAddressTable();
}

AddressTableModel::~AddressTableModel()
{
    delete priv;
}

int AddressTableModel::rowCount(const QModelIndex &parent) const
{
    Q_UNUSED(parent);
    return priv->size();
}

int AddressTableModel::columnCount(const QModelIndex &parent) const
{
    Q_UNUSED(parent);
    return columns.length();
}

QVariant AddressTableModel::data(const QModelIndex &index, int role) const
{
    if(!index.isValid())
        return QVariant();

    AddressTableEntry *rec = static_cast<AddressTableEntry*>(index.internalPointer());

    if(role == Qt::DisplayRole || role == Qt::EditRole)
    {
        switch(index.column())
        {
        case Label:
            return role == Qt::DisplayRole && rec->label.isEmpty() ? tr("(no label)") : rec->label;
        case Address:
            return rec->address;
        case Pubkey:
            return rec->addressType == AT_Stealth ? tr("Stealth Address") : role == Qt::DisplayRole && rec->pubkey.isEmpty() ? tr("n/a") : rec->pubkey;
        case AddressType:
            return rec->addressType;
        }
    } else
    if (role == Qt::FontRole)
    {
        QFont font;
        if(index.column() == Address)
            font = GUIUtil::bitcoinAddressFont();

        return font;
    } else
    if (role == TypeRole)
    {
        switch(rec->type)
        {
        case AddressTableEntry::Sending:
            return Send;
        case AddressTableEntry::Receiving:
            return Receive;
        default: break;
        }
    } else
    if (role == AddressTypeRole)
        return rec->addressType;

    return QVariant();
}

bool AddressTableModel::setData(const QModelIndex &index, const QVariant &value, int role)
{
    if(!index.isValid())
        return false;
    AddressTableEntry *rec = static_cast<AddressTableEntry*>(index.internalPointer());

    editStatus = OK;

    std::string strTemp, strValue;
    if(role == Qt::EditRole)
    {
        switch(index.column())
        {
        case Label:
            // Do nothing, if old label == new label
            if(rec->label == value.toString())
            {
                editStatus = NO_CHANGES;
                return false;
            }

            strTemp = rec->address.toStdString();
            if (IsStealthAddress(strTemp))
            {
                strValue = value.toString().toStdString();
                wallet->UpdateStealthAddress(strTemp, strValue, false);
            } else
            {
                wallet->SetAddressBookName(CBitcoinAddress(strTemp).Get(), value.toString().toStdString());
            }

            break;
        case Address:

            std::string sTemp = value.toString().toStdString();
            if (IsStealthAddress(sTemp))
            {
                LogPrintf("TODO\n");
                editStatus = INVALID_ADDRESS;
                return false;
            }
            // Do nothing, if old address == new address
            if(CBitcoinAddress(rec->address.toStdString()) == CBitcoinAddress(value.toString().toStdString()))
            {
                editStatus = NO_CHANGES;
                return false;
            }
            // Refuse to set invalid address, set error status and return false
            else if(!walletModel->validateAddress(value.toString()))
            {
                editStatus = INVALID_ADDRESS;
                return false;
            }
            // Check for duplicate addresses to prevent accidental deletion of addresses, if you try
            // to paste an existing address over another address (with a different label)
            else if(wallet->mapAddressBook.count(CBitcoinAddress(value.toString().toStdString()).Get()))
            {
                editStatus = DUPLICATE_ADDRESS;
                return false;
            }
            // Double-check that we're not overwriting a receiving address
            else if(rec->type == AddressTableEntry::Sending)
            {
                {
                    LOCK(wallet->cs_wallet);
                    // Remove old entry
                    wallet->DelAddressBookName(CBitcoinAddress(rec->address.toStdString()).Get());
                    // Add new entry with new address
                    wallet->SetAddressBookName(CBitcoinAddress(value.toString().toStdString()).Get(), rec->label.toStdString());
                }
            }
            break;
        }
        return true;
    }
    return false;
}

QVariant AddressTableModel::headerData(int section, Qt::Orientation orientation, int role) const
{
    if(orientation == Qt::Horizontal)
    {
        if(role == Qt::DisplayRole)
        {
            return columns[section];
        }
    }
    return QVariant();
}

Qt::ItemFlags AddressTableModel::flags(const QModelIndex &index) const
{
    if(!index.isValid())
        return 0;
    AddressTableEntry *rec = static_cast<AddressTableEntry*>(index.internalPointer());

    Qt::ItemFlags retval = Qt::ItemIsSelectable | Qt::ItemIsEnabled;
    // Can edit address and label for sending addresses,
    // and only label for receiving addresses.
    if(rec->type == AddressTableEntry::Sending ||
      (rec->type == AddressTableEntry::Receiving && index.column()==Label))
    {
        retval |= Qt::ItemIsEditable;
    }
    return retval;
}

QModelIndex AddressTableModel::index(int row, int column, const QModelIndex &parent) const
{
    Q_UNUSED(parent);
    AddressTableEntry *data = priv->index(row);
    if(data)
    {
        return createIndex(row, column, priv->index(row));
    }
    else
    {
        return QModelIndex();
    }
}

void AddressTableModel::updateEntry(const QString &address, const QString &label, bool isMine, int status)
{
    // Update address book model from Bitcoin core
    priv->updateEntry(address, label, isMine, status);
}

/*
TODO:
(+) Handle groupchat more properly, maybe based on &type? instead of addressType?
*/
QString AddressTableModel::addRow(const QString &type, const QString &label, const QString &address, int addressType)
{
    std::string strLabel = label.toStdString();
    std::string strAddress = address.toStdString();

    editStatus = OK;

    if (type == Send)
    {
        // - addressType isn't used here
        if (strAddress.length() > 75
            && IsStealthAddress(strAddress))
        {
            CStealthAddress sxAddr;
            if (!sxAddr.SetEncoded(strAddress))
            {
                editStatus = INVALID_ADDRESS;
                return QString();
            };

            // -- Check for duplicate addresses
            {
                LOCK(wallet->cs_wallet);

                if (wallet->HaveStealthAddress(sxAddr))
                {
                    editStatus = DUPLICATE_ADDRESS;
                    return QString();
                };

                sxAddr.label = strLabel;
                wallet->AddStealthAddress(sxAddr);
            } // cs_wallet
        } else
        {
            // - NOTE: adding a bip32 address here only puts it in mapAddressBook
            //   it will be added to the db as needed (when funds are sent)

            if (!walletModel->validateAddress(address))
            {
                editStatus = INVALID_ADDRESS;
                return QString();
            };
            // Check for duplicate addresses
            {
                LOCK(wallet->cs_wallet);
                if (wallet->mapAddressBook.count(CBitcoinAddress(strAddress).Get()))
                {
                    editStatus = DUPLICATE_ADDRESS;
                    return QString();
                };

                wallet->SetAddressBookName(CBitcoinAddress(strAddress).Get(), strLabel, NULL, true, true);
            } // cs_wallet
        };
    } else
    if (type == Receive)
    {
        // Generate a new address to associate with given label
        WalletModel::UnlockContext ctx(walletModel->requestUnlock());

        if (!ctx.isValid())
        {
            // Unlock wallet failed or was cancelled
            editStatus = WALLET_UNLOCK_FAILURE;
            return QString();
        };

        if (addressType == AT_Stealth)
        {
            CEKAStealthKey aks;
            if (0 != wallet->NewStealthKeyFromAccount(strLabel, aks))
            {
                editStatus = KEY_GENERATION_FAILURE;
                return QString();
            };
            strAddress = aks.ToStealthAddress();
        } else
        if (addressType == AT_BIP32)
        {
            // Generate a new key that is added to wallet
            CStoredExtKey *sek = new CStoredExtKey();
            if (0 != wallet->NewExtKeyFromAccount(strLabel, sek))
            {
                delete sek;
                editStatus = KEY_GENERATION_FAILURE;
                return QString();
            };
            wallet->SetAddressBookName(sek->kp, strLabel, NULL, true, true);
            // - CBitcoinAddress displays public key only
            strAddress = CBitcoinAddress(sek->kp).ToString();
        } else
        { //NORMAL OR GROUP
            //TODO: decouple keygeneration from HD wallet
            CPubKey newKey;
            if (0 != wallet->NewKeyFromAccount(newKey))
            {
                editStatus = KEY_GENERATION_FAILURE;
                return QString();
            };

            strAddress = CBitcoinAddress(newKey.GetID()).ToString();

            {
                LOCK(wallet->cs_wallet);

                wallet->SetAddressBookName(CBitcoinAddress(strAddress).Get(), strLabel, NULL, true, true);
            } // cs_wallet
        };
    } else
    {
        return QString();
    };

    return QString::fromStdString(strAddress);
}

bool AddressTableModel::removeRows(int row, int count, const QModelIndex &parent)
{
    Q_UNUSED(parent);
    AddressTableEntry *rec = priv->index(row);
    if(count != 1 || !rec || rec->type == AddressTableEntry::Receiving)
    {
        // Can only remove one row at a time, and cannot remove rows not in model.
        // Also refuse to remove receiving addresses.
        return false;
    }
    {
        LOCK(wallet->cs_wallet);

        CTxDestination destDelete;
        std::string strDelete = rec->address.toStdString();

        if (IsStealthAddress(strDelete))
        {
            CStealthAddress sxAddr;
            if (sxAddr.SetEncoded(strDelete))
                destDelete = sxAddr;
            else
                destDelete = CNoDestination();
        } else
        {
            destDelete = CBitcoinAddress(strDelete).Get();
        };
        wallet->DelAddressBookName(destDelete);
    }
    return true;
}

/* Look up label for address in address book, if not found return empty string.
 */
QString AddressTableModel::labelForAddress(const QString &address) const
{
    int row(lookupAddress(address));

    if(row == -1)
    {
        LOCK(wallet->cs_wallet);

        std::string sAddr = address.toStdString();

        if (IsStealthAddress(sAddr))
        {
            CStealthAddress sxAddr;
            if (!sxAddr.SetEncoded(sAddr))
                return "";

            std::set<CStealthAddress>::iterator it(wallet->stealthAddresses.find(sxAddr));
            if (it != wallet->stealthAddresses.end())
                return QString::fromStdString(it->label);

        } else
        {
            CBitcoinAddress address_parsed(sAddr);
            std::map<CTxDestination, std::string>::iterator mi(wallet->mapAddressBook.find(address_parsed.Get()));
            if (mi != wallet->mapAddressBook.end())
                return QString::fromStdString(mi->second);
        }
    } else
        return index(row, Label).data().toString();

    return "";
}

QString AddressTableModel::pubkeyForAddress(const QString &address, const bool lookup) const
{
    if(address.isEmpty()||address.length() > 75)
        return "";

    int row(lookup ? lookupAddress(address) : -1);

    if (row == -1 || index(row, Pubkey).data(Qt::EditRole).toString().isEmpty())
    {
        CBitcoinAddress addressParsed(address.toStdString());

        if (addressParsed.IsValid())
        {
            CKeyID  destinationAddress;
            CPubKey destinationKey;

            addressParsed.GetKeyID(destinationAddress);

            if (SecureMsgGetLocalKey (destinationAddress, destinationKey) == 0 // test if it's a local key
             || SecureMsgGetStoredKey(destinationAddress, destinationKey) == 0)
                return QString::fromStdString(EncodeBase58(destinationKey.begin(), destinationKey.end()).c_str());
        }

        return "";
    }

    return index(row, Pubkey).data(Qt::EditRole).toString();
}

QString AddressTableModel::addressForPubkey(const QString &pubkey) const
{
    if (pubkey.isEmpty())
        return "";

    std::vector<uint8_t> vchTest;
    
    
    DecodeBase58(pubkey.toStdString().c_str(), vchTest);
    CPubKey cpk(vchTest);

    if (!cpk.IsValid())
        return "";

    CBitcoinAddress address(cpk.GetID());

    return QString::fromStdString(address.ToString());
}

int AddressTableModel::lookupAddress(const QString &address) const
{
    QModelIndexList lst = match(index(0, Address, QModelIndex()),
                                Qt::EditRole, address, 1, Qt::MatchExactly);

    return (lst.isEmpty() ? -1 : lst.at(0).row());
}

void AddressTableModel::setEncryptionStatus(int status)
{
    for(QList<AddressTableEntry>::iterator it(priv->cachedAddressTable.begin()); it != priv->cachedAddressTable.end(); ++it)
    {
        if (it->addressType == AT_Normal && it->pubkey.isEmpty())
        {
            it->pubkey = pubkeyForAddress(it->address, true);
            emitDataChanged(lookupAddress(it->address));
        };
    };
}

void AddressTableModel::emitDataChanged(int row)
{
    emit dataChanged(index(row, 0, QModelIndex()), index(row, columns.length()-1, QModelIndex()));
}

// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2012 The Bitcoin developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#ifndef BITCOIN_WALLET_H
#define BITCOIN_WALLET_H

#include <stdlib.h>
#include <string>
#include <vector>


#include "main.h"
#include "key.h"
#include "extkey.h"
#include "keystore.h"
#include "crypter.h"
#include "script.h"
#include "ui_interface.h"
#include "util.h"
#include "walletdb.h"
#include "stealth.h"
#include "smessage.h"


extern bool fWalletUnlockStakingOnly;
extern bool fWalletUnlockMessagingEnabled;
extern bool fConfChange;
class CAccountingEntry;
class CWalletTx;
class CReserveKey;
class COutput;
class CCoinControl;

typedef std::map<CKeyID, CStealthKeyMetadata> StealthKeyMetaMap;
typedef std::map<std::string, std::string> mapValue_t;
typedef std::map<unsigned int, CMasterKey> MasterKeyMap;
typedef std::map<uint256, CWalletTx> WalletTxMap;
typedef std::map<CKeyID, CExtKeyAccount*>  ExtKeyAccountMap;
typedef std::map<CKeyID, CStoredExtKey*>  ExtKeyMap;

/** (client) version numbers for particular wallet features */
enum WalletFeature
{
    FEATURE_BASE = 10500, // the earliest version new wallets supports (only useful for getinfo's clientversion output)

    FEATURE_WALLETCRYPT = 40000, // wallet encryption
    FEATURE_COMPRPUBKEY = 60000, // compressed public keys

    FEATURE_LATEST = 60000
};

/** A key pool entry */
class CKeyPool
{
public:
    int64_t nTime;
    CPubKey vchPubKey;

    CKeyPool()
    {
        nTime = GetTime();
    }

    CKeyPool(const CPubKey& vchPubKeyIn)
    {
        nTime = GetTime();
        vchPubKey = vchPubKeyIn;
    }

    IMPLEMENT_SERIALIZE
    (
        if (!(nType & SER_GETHASH))
            READWRITE(nVersion);
        READWRITE(nTime);
        READWRITE(vchPubKey);
    )
};

bool IsDestMine(const CWallet &wallet, const CTxDestination &dest);
bool IsMine(const CWallet& wallet, const CScript& scriptPubKey);

/** A CWallet is an extension of a keystore, which also maintains a set of transactions and balances,
 * and provides the ability to create new transactions.
 */
class CWallet : public CCryptoKeyStore
{
public:
    bool SelectCoinsForStaking(int64_t nTargetValue, unsigned int nSpendTime, std::set<std::pair<const CWalletTx*,unsigned int> >& setCoinsRet, int64_t& nValueRet) const;
    bool SelectCoins(int64_t nTargetValue, unsigned int nSpendTime, std::set<std::pair<const CWalletTx*,unsigned int> >& setCoinsRet, int64_t& nValueRet, const CCoinControl *coinControl=NULL) const;

    CWalletDB *pwalletdbEncryption;

    // the current wallet version: clients below this version are not able to load the wallet
    int nWalletVersion;

    // the maximum wallet format version: memory-only variable that specifies to what version this wallet may be upgraded
    int nWalletMaxVersion;

    /// Main wallet lock.
    /// This lock protects all the fields added by CWallet
    ///   except for:
    ///      fFileBacked (immutable after instantiation)
    ///      strWalletFile (immutable after instantiation)
    mutable CCriticalSection cs_wallet;

    bool fFileBacked;
    std::string strWalletFile;

    std::set<int64_t> setKeyPool;
    std::map<CKeyID, CKeyMetadata> mapKeyMetadata;
    
    std::set<CStealthAddress> stealthAddresses;
    StealthKeyMetaMap mapStealthKeyMeta;
    
    CStoredExtKey *pEkMaster;
    CKeyID idDefaultAccount;
    ExtKeyAccountMap mapExtAccounts;
    ExtKeyMap mapExtKeys;
    
    CBloomFilter* pBloomFilter;
    
    int nLastFilteredHeight;
    
    uint32_t nStealth, nFoundStealth; // for reporting, zero before use

    MasterKeyMap mapMasterKeys;
    unsigned int nMasterKeyMaxID;
    
    WalletTxMap mapWallet;
    int64_t nOrderPosNext;
    std::map<uint256, int> mapRequestCount;

    std::map<CTxDestination, std::string> mapAddressBook;

    CPubKey vchDefaultKey;
    int64_t nTimeFirstKey;

    CWallet()
    {
        SetNull();
    }
    
    CWallet(std::string strWalletFileIn)
    {
        SetNull();

        strWalletFile = strWalletFileIn;
        fFileBacked = true;
    }
    
    void SetNull()
    {
        nWalletVersion = FEATURE_BASE;
        nWalletMaxVersion = FEATURE_BASE;
        fFileBacked = false;
        nMasterKeyMaxID = 0;
        pwalletdbEncryption = NULL;
        pBloomFilter = NULL;
        pEkMaster = NULL;
        nOrderPosNext = 0;
        nTimeFirstKey = 0;
        nLastFilteredHeight = 0;
        
    }
    
    int Finalise();
    
    // check whether we are allowed to upgrade (or already support) to the named feature
    bool CanSupportFeature(enum WalletFeature wf) { AssertLockHeld(cs_wallet); return nWalletMaxVersion >= wf; }

    void AvailableCoinsForStaking(std::vector<COutput>& vCoins, unsigned int nSpendTime) const;
    void AvailableCoins(std::vector<COutput>& vCoins, bool fOnlyConfirmed=true, const CCoinControl *coinControl=NULL) const;
    bool SelectCoinsMinConf(int64_t nTargetValue, unsigned int nSpendTime, int nConfMine, int nConfTheirs, std::vector<COutput> vCoins, std::set<std::pair<const CWalletTx*,unsigned int> >& setCoinsRet, int64_t& nValueRet) const;

    // keystore implementation
    // Generate a new key
    CPubKey GenerateNewKey();
    
    // Adds a key to the store, and saves it to disk.
    bool AddKey(const CKey &key);
    bool AddKeyPubKey(const CKey &key, const CPubKey &pubkey);
    
    bool AddKeyInDBTxn(CWalletDB *pdb, const CKey &key);
    
    
    // Adds a key to the store, without saving it to disk (used by LoadWallet)
    bool LoadKey(const CKey& key, const CPubKey &pubkey) { return CCryptoKeyStore::AddKeyPubKey(key, pubkey); }
    // Load metadata (used by LoadWallet)
    bool LoadKeyMetadata(const CPubKey &pubkey, const CKeyMetadata &metadata);

    bool LoadMinVersion(int nVersion) { AssertLockHeld(cs_wallet); nWalletVersion = nVersion; nWalletMaxVersion = std::max(nWalletMaxVersion, nVersion); return true; }

    // Adds an encrypted key to the store, and saves it to disk.
    bool AddCryptedKey(const CPubKey &vchPubKey, const std::vector<unsigned char> &vchCryptedSecret);
    // Adds an encrypted key to the store, without saving it to disk (used by LoadWallet)
    bool LoadCryptedKey(const CPubKey &vchPubKey, const std::vector<unsigned char> &vchCryptedSecret);
    bool AddCScript(const CScript& redeemScript);
    bool LoadCScript(const CScript& redeemScript);
    
    bool Lock();
    bool Unlock(const SecureString& strWalletPassphrase);
    bool ChangeWalletPassphrase(const SecureString& strOldWalletPassphrase, const SecureString& strNewWalletPassphrase);
    bool EncryptWallet(const SecureString& strWalletPassphrase);

    void GetKeyBirthTimes(std::map<CKeyID, int64_t> &mapKeyBirth) const;


    /** Increment the next transaction order id
        @return next transaction order id
     */
    int64_t IncOrderPosNext(CWalletDB *pwalletdb = NULL);

    typedef std::pair<CWalletTx*, CAccountingEntry*> TxPair;
    typedef std::multimap<int64_t, TxPair > TxItems;

    /** Get the wallet's activity log
        @return multimap of ordered transactions and accounting entries
        @warning Returned pointers are *only* valid within the scope of passed acentries
     */
    TxItems OrderedTxItems(std::list<CAccountingEntry>& acentries, std::string strAccount = "", bool fShowCoinstake = true);

    void MarkDirty();
    bool AddToWallet(const CWalletTx& wtxIn, const uint256& hashIn);
    bool AddToWalletIfInvolvingMe(const CTransaction& tx, const uint256& hash, const void* pblock, bool fUpdate = false, bool fFindBlock = false);
    
    bool EraseFromWallet(uint256 hash);
    void WalletUpdateSpent(const CTransaction& prevout, bool fBlock = false);
    int ScanForWalletTransactions(CBlockIndex* pindexStart, bool fUpdate = false);
    void ReacceptWalletTransactions();
    void ResendWalletTransactions(bool fForce = false);
    int64_t GetBalance() const;
    int64_t GetOKprivateBalance() const;
    
    int64_t GetUnconfirmedBalance() const;
    int64_t GetImmatureBalance() const;
    int64_t GetStake() const;
    int64_t GetNewMint() const;
    
    bool CreateTransaction(const std::vector<std::pair<CScript, int64_t> >& vecSend, CWalletTx& wtxNew, int64_t& nFeeRet, int32_t& nChangePos, const CCoinControl *coinControl=NULL);
    bool CreateTransaction(CScript scriptPubKey, int64_t nValue, std::string& sNarr, CWalletTx& wtxNew, int64_t& nFeeRet, const CCoinControl *coinControl=NULL);
    
    bool CommitTransaction(CWalletTx& wtxNew);
    

    uint64_t GetStakeWeight() const;
    bool CreateCoinStake(unsigned int nBits, int64_t nSearchInterval, int64_t nFees, CTransaction& txNew, CKey& key);

    std::string SendMoney(CScript scriptPubKey, int64_t nValue, std::string& sNarr, CWalletTx& wtxNew, bool fAskFee=false);
    std::string SendMoneyToDestination(const CTxDestination& address, int64_t nValue, std::string& sNarr, CWalletTx& wtxNew, bool fAskFee=false);

    
    bool NewStealthAddress(std::string& sError, std::string& sLabel, CStealthAddress& sxAddr);
    bool AddStealthAddress(CStealthAddress& sxAddr);
    bool UnlockStealthAddresses(const CKeyingMaterial& vMasterKeyIn);
    bool UpdateStealthAddress(std::string &addr, std::string &label, bool addIfNotExist);
    
    bool CreateStealthTransaction(CScript scriptPubKey, int64_t nValue, std::vector<uint8_t>& P, std::vector<uint8_t>& narr, std::string& sNarr, CWalletTx& wtxNew, int64_t& nFeeRet, const CCoinControl* coinControl=NULL);
    std::string SendStealthMoney(CScript scriptPubKey, int64_t nValue, std::vector<uint8_t>& P, std::vector<uint8_t>& narr, std::string& sNarr, CWalletTx& wtxNew, bool fAskFee=false);
    bool SendStealthMoneyToDestination(CStealthAddress& sxAddress, int64_t nValue, std::string& sNarr, CWalletTx& wtxNew, std::string& sError, bool fAskFee=false);
    bool FindStealthTransactions(const CTransaction& tx, mapValue_t& mapNarr);
    
    bool UpdateAnonTransaction(CTxDB *ptxdb, const CTransaction& tx, const uint256& blockHash);
    bool UndoAnonTransaction(const CTransaction& tx);
    bool ProcessAnonTransaction(CWalletDB *pwdb, CTxDB *ptxdb, const CTransaction& tx, const uint256& blockHash, bool& fIsMine, mapValue_t& mapNarr, std::vector<WalletTxMap::iterator>& vUpdatedTxns);
    
    bool GetAnonChangeAddress(CStealthAddress& sxAddress);
    bool CreateStealthOutput(CStealthAddress* sxAddress, int64_t nValue, std::string& sNarr, std::vector<std::pair<CScript, int64_t> >& vecSend, std::map<int, std::string>& mapNarr, std::string& sError);
    bool CreateOkxOutputs(CStealthAddress* sxAddress, int64_t nValue, std::string& sNarr, std::vector<std::pair<CScript, int64_t> >& vecSend, CScript& scriptNarration);
    int PickAnonInputs(int rsType, int64_t nValue, int64_t& nFee, int nRingSize, CWalletTx& wtxNew, int nOutputs, int nSizeOutputs, int& nExpectChangeOuts, std::list<COwnedOkxOutput>& lAvailableCoins, std::vector<COwnedOkxOutput*>& vPickedCoins, std::vector<std::pair<CScript, int64_t> >& vecChange, bool fTest, std::string& sError);
    int GetTxnPreImage(CTransaction& txn, uint256& hash);
    int PickHidingOutputs(int64_t nValue, int nRingSize, CPubKey& pkCoin, int skip, uint8_t* p);
    bool AreOutputsUnique(CWalletTx& wtxNew);
    bool AddAnonInputs(int rsType, int64_t nTotalOut, int nRingSize, std::vector<std::pair<CScript, int64_t> >&vecSend, std::vector<std::pair<CScript, int64_t> >&vecChange, CWalletTx& wtxNew, int64_t& nFeeRequired, bool fTestOnly, std::string& sError);
    bool SendOkToOkx(CStealthAddress& sxAddress, int64_t nValue, std::string& sNarr, CWalletTx& wtxNew, std::string& sError, bool fAskFee=false);
    bool SendOkxToOkx(CStealthAddress& sxAddress, int64_t nValue, int nRingSize, std::string& sNarr, CWalletTx& wtxNew, std::string& sError, bool fAskFee=false);
    bool SendOkxToOk(CStealthAddress& sxAddress, int64_t nValue, int nRingSize, std::string& sNarr, CWalletTx& wtxNew, std::string& sError, bool fAskFee=false);
    
    bool ExpandLockedOkxOutput(CWalletDB *pdb, CKeyID &ckeyId, CLockedOkxOutput &lao, std::set<uint256> &setUpdated);
    bool ProcessLockedOkxOutputs();
    
    bool EstimateOkxFee(int64_t nValue, int nRingSize, std::string& sNarr, CWalletTx& wtxNew, int64_t& nFeeRet, std::string& sError);
    
    int ListUnspentOkxOutputs(std::list<COwnedOkxOutput>& lUOkxOutputs, bool fMatureOnly);
    int CountOkxOutputs(std::map<int64_t, int>& mOutputCounts, bool fMatureOnly);
    int CountAllOkxOutputs(std::list<COkxOutputCount>& lOutputCounts, bool fMatureOnly);
    int CountOwnedOkxOutputs(std::map<int64_t, int>& mOwnedOutputCounts, bool fMatureOnly);
    
    bool EraseAllAnonData();
    
    bool CacheAnonStats();
    
    
    bool InitBloomFilter();
    
    bool NewKeyPool();
    bool TopUpKeyPool(unsigned int nSize = 0);
    int64_t AddReserveKey(const CKeyPool& keypool);
    void ReserveKeyFromKeyPool(int64_t& nIndex, CKeyPool& keypool);
    void KeepKey(int64_t nIndex);
    void ReturnKey(int64_t nIndex);
    bool GetKeyFromPool(CPubKey &key, bool fAllowReuse=true);
    int64_t GetOldestKeyPoolTime();
    void GetAllReserveKeys(std::set<CKeyID>& setAddress) const;

    std::set<std::set<CTxDestination> > GetAddressGroupings();
    std::map<CTxDestination, int64_t> GetAddressBalances();

    bool IsMine(const CTxIn& txin) const;
    int64_t GetDebit(const CTxIn& txin) const;
    int64_t GetOKprivateDebit(const CTxIn& txin) const;
    int64_t GetOKprivateCredit(const CTxOut& txout) const;
    
    bool IsMine(const CTxOut& txout) const
    {
        return ::IsMine(*this, txout.scriptPubKey);
    }
    int64_t GetCredit(const CTxOut& txout) const
    {
        if (!MoneyRange(txout.nValue))
            throw std::runtime_error("CWallet::GetCredit() : value out of range");
        return (IsMine(txout) ? txout.nValue : 0);
    }
    bool IsChange(const CTxOut& txout) const;
    int64_t GetChange(const CTxOut& txout) const
    {
        if (!MoneyRange(txout.nValue))
            throw std::runtime_error("CWallet::GetChange() : value out of range");
        return (IsChange(txout) ? txout.nValue : 0);
    }
    bool IsMine(const CTransaction& tx) const
    {
        BOOST_FOREACH(const CTxOut& txout, tx.vout)
            if (IsMine(txout) && txout.nValue >= nMinimumInputValue)
                return true;
        return false;
    }
    bool IsFromMe(const CTransaction& tx) const
    {
        return (GetDebit(tx) > 0);
    }
    
    int64_t GetDebit(const CTransaction& tx) const
    {
        int64_t nDebit = 0;
        BOOST_FOREACH(const CTxIn& txin, tx.vin)
        {
            if (tx.nVersion == ANON_TXN_VERSION
                && txin.IsAnonInput())
            {
                nDebit += GetOKprivateDebit(txin);
            } else
            {
                nDebit += GetDebit(txin);
            };
            
            if (!MoneyRange(nDebit))
                throw std::runtime_error("CWallet::GetDebit() : value out of range");
        }
        return nDebit;
    }
    
    int64_t GetCredit(const CTransaction& tx) const
    {
        int64_t nCredit = 0;
        BOOST_FOREACH(const CTxOut& txout, tx.vout)
        {
            if (tx.nVersion == ANON_TXN_VERSION
                && txout.IsOkxOutput())
            {
                nCredit += GetOKprivateCredit(txout);
            } else
                nCredit += GetCredit(txout);
            if (!MoneyRange(nCredit))
                throw std::runtime_error("CWallet::GetCredit() : value out of range");
        }
        return nCredit;
    }
    
    bool GetCredit(const CTransaction& tx, int64_t& nOK, int64_t& nOKprivate) const
    {
        nOK = 0;
        nOKprivate = 0;
        BOOST_FOREACH(const CTxOut& txout, tx.vout)
        {
            if (tx.nVersion == ANON_TXN_VERSION
                && txout.IsOkxOutput())
            {
                nOKprivate += GetOKprivateCredit(txout);
            } else
                nOK += GetCredit(txout);
            if (!MoneyRange(nOK)
                || !MoneyRange(nOKprivate))
                throw std::runtime_error("CWallet::GetCredit() : value out of range");
        }
        return true;
    };
    
    int64_t GetChange(const CTransaction& tx) const
    {
        int64_t nChange = 0;
        BOOST_FOREACH(const CTxOut& txout, tx.vout)
        {
            nChange += GetChange(txout);
            if (!MoneyRange(nChange))
                throw std::runtime_error("CWallet::GetChange() : value out of range");
        }
        return nChange;
    }
    void SetBestChain(const CBlockLocator& loc);
    
    void SetBestThinChain(const CBlockThinLocator& loc);

    DBErrors LoadWallet();

    bool SetAddressBookName(const CTxDestination& address, const std::string& strName, CWalletDB *pwdb = NULL, bool fAddKeyToMerkleFilters = true, bool fManual = false);

    bool DelAddressBookName(const CTxDestination& address);

    void UpdatedTransaction(const uint256 &hashTx);

    void PrintWallet(const CBlock& block);

    void Inventory(const uint256 &hash)
    {
        {
            LOCK(cs_wallet);
            std::map<uint256, int>::iterator mi = mapRequestCount.find(hash);
            if (mi != mapRequestCount.end())
                (*mi).second++;
        }
    }

    unsigned int GetKeyPoolSize()
    {
        AssertLockHeld(cs_wallet); // setKeyPool
        return setKeyPool.size();
    }

    bool GetTransaction(const uint256 &hashTx, CWalletTx& wtx);

    bool SetDefaultKey(const CPubKey &vchPubKey);

    // signify that a particular wallet feature is now used. this may change nWalletVersion and nWalletMaxVersion if those are lower
    bool SetMinVersion(enum WalletFeature, CWalletDB* pwalletdbIn = NULL, bool fExplicit = false);

    // change which version we're allowed to upgrade to (note that this does not immediately imply upgrading to that format)
    bool SetMaxVersion(int nVersion);

    // get the current wallet format (the oldest client version guaranteed to understand this wallet)
    int GetVersion() { LOCK(cs_wallet); return nWalletVersion; }

    void FixSpentCoins(int& nMismatchSpent, int64_t& nBalanceInQuestion, bool fCheckOnly = false);
    void DisableTransaction(const CTransaction &tx);
    
    
    int GetChangeAddress(CPubKey &pk);
    
    int ExtKeyNew32(CExtKey &out);
    int ExtKeyNew32(CExtKey &out, const char *sPassPhrase, int32_t nHash, const char *sSeed);
    int ExtKeyNew32(CExtKey &out, uint8_t *data, uint32_t lenData);
    
    int ExtKeyImportLoose(CWalletDB *pwdb, CStoredExtKey &sekIn, bool fBip44, bool fSaveBip44);
    int ExtKeyImportAccount(CWalletDB *pwdb, CStoredExtKey &sekIn, int64_t nTimeStartScan, const std::string &sLabel);
    
    int ExtKeySetMaster(CWalletDB *pwdb, CKeyID &idMaster); // set master to existing key, remove master key tag from old key if exists
    int ExtKeyNewMaster(CWalletDB *pwdb, CKeyID &idMaster, bool fAutoGenerated = false); // make and save new root key to wallet
    
    int ExtKeyCreateAccount(CStoredExtKey *ekAccount, CKeyID &idMaster, CExtKeyAccount &ekaOut, const std::string &sLabel);
    int ExtKeyDeriveNewAccount(CWalletDB *pwdb, CExtKeyAccount *sea, const std::string &sLabel, const std::string &sPath=""); // derive a new account from the master key and save to wallet
    
    
    int ExtKeyEncrypt(CStoredExtKey *sek, const CKeyingMaterial &vMKey, bool fLockKey);
    int ExtKeyEncrypt(CExtKeyAccount *sea, const CKeyingMaterial &vMKey, bool fLockKey);
    int ExtKeyEncryptAll(CWalletDB *pwdb, const CKeyingMaterial &vMKey);
    int ExtKeyLock();
    
    int ExtKeyUnlock(CExtKeyAccount *sea);
    int ExtKeyUnlock(CExtKeyAccount *sea, const CKeyingMaterial &vMKey);
    int ExtKeyUnlock(CStoredExtKey *sek);
    int ExtKeyUnlock(CStoredExtKey *sek, const CKeyingMaterial &vMKey);
    int ExtKeyUnlock(const CKeyingMaterial &vMKey);
    
    int ExtKeyCreateInitial(CWalletDB *pwdb);
    int ExtKeyLoadMaster();
    int ExtKeyLoadAccounts();
    
    int ExtKeySaveAccountToDB(CWalletDB *pwdb, CKeyID &idAccount, CExtKeyAccount *sea);
    int ExtKeyAddAccountToMaps(CKeyID &idAccount, CExtKeyAccount *sea);
    int ExtKeyLoadAccountPacks();
    
    
    int ExtKeyAppendToPack(CWalletDB *pwdb, CExtKeyAccount *sea, const CKeyID &idKey, CEKAKey &ak, bool &fUpdateAcc) const;
    int ExtKeyAppendToPack(CWalletDB *pwdb, CExtKeyAccount *sea, const CKeyID &idKey, CEKASCKey &asck, bool &fUpdateAcc) const;
    
    
    
    int ExtKeySaveKey(CWalletDB *pwdb, CExtKeyAccount *sea, const CKeyID &keyId, CEKAKey &ak) const;
    int ExtKeySaveKey(CExtKeyAccount *sea, const CKeyID &keyId, CEKAKey &ak) const;
    
    int ExtKeySaveKey(CWalletDB *pwdb, CExtKeyAccount *sea, const CKeyID &keyId, CEKASCKey &asck) const;
    int ExtKeySaveKey(CExtKeyAccount *sea, const CKeyID &keyId, CEKASCKey &asck) const;
    
    int ExtKeyUpdateStealthAddress(CWalletDB *pwdb, CExtKeyAccount *sea, CKeyID &sxId, std::string &sLabel);
    
    int NewKeyFromAccount(CWalletDB *pwdb, const CKeyID &idAccount, CPubKey &pkOut, bool fInternal, bool fHardened);
    int NewKeyFromAccount(CPubKey &pkOut, bool fInternal=false, bool fHardened=false); // wrapper - use default account
    
    int NewStealthKeyFromAccount(CWalletDB *pwdb, const CKeyID &idAccount, std::string &sLabel, CEKAStealthKey &akStealthOut);
    int NewStealthKeyFromAccount(std::string &sLabel, CEKAStealthKey &akStealthOut); // wrapper - use default account
    
    int NewExtKeyFromAccount(CWalletDB *pwdb, const CKeyID &idAccount, std::string &sLabel, CStoredExtKey *sekOut);
    int NewExtKeyFromAccount(std::string &sLabel, CStoredExtKey *sekOut); // wrapper - use default account
    
    
    int ExtKeyGetDestination(const CExtKeyPair &ek, CScript &scriptPubKeyOut, uint32_t &nKey);
    int ExtKeyUpdateLooseKey(const CExtKeyPair &ek, uint32_t nKey, bool fAddToAddressBook);
    
    
    bool HaveKey(const CKeyID &address) const;
    
    bool HaveExtKey(const CKeyID &address) const;
    
    bool GetKey(const CKeyID &address, CKey &keyOut) const;
    
    bool GetPubKey(const CKeyID &address, CPubKey &pkOut) const;
    
    bool HaveStealthAddress(const CStealthAddress &sxAddr) const;
    
    int ScanChainFromTime(int64_t nTimeStartScan);
    
    /** Address book entry changed.
     * @note called with lock cs_wallet held.
     */
    boost::signals2::signal<void (CWallet *wallet, const CTxDestination &address, const std::string &label, bool isMine, ChangeType status, bool fManual)> NotifyAddressBookChanged;
    

    /** Wallet transaction added, removed or updated.
     * @note called with lock cs_wallet held.
     */
    boost::signals2::signal<void (CWallet *wallet, const uint256 &hashTx, ChangeType status)> NotifyTransactionChanged;
};

/** A key allocated from the key pool. */
class CReserveKey
{
protected:
    CWallet* pwallet;
    int64_t nIndex;
    CPubKey vchPubKey;
public:
    CReserveKey(CWallet* pwalletIn)
    {
        nIndex = -1;
        pwallet = pwalletIn;
    }

    ~CReserveKey()
    {
        ReturnKey();
    }

    void ReturnKey();
    bool GetReservedKey(CPubKey &pubkey);
    void KeepKey();
};


static void ReadOrderPos(int64_t& nOrderPos, mapValue_t& mapValue)
{
    if (!mapValue.count("n"))
    {
        nOrderPos = -1; // TODO: calculate elsewhere
        return;
    }
    nOrderPos = atoi64(mapValue["n"].c_str());
}


static void WriteOrderPos(const int64_t& nOrderPos, mapValue_t& mapValue)
{
    if (nOrderPos == -1)
        return;
    mapValue["n"] = i64tostr(nOrderPos);
}


/** A transaction with a bunch of additional info that only the owner cares about.
 * It includes any unrecorded transactions needed to link it back to the block chain.
 */
class CWalletTx : public CMerkleTx
{
private:
    const CWallet* pwallet;

public:
    std::vector<CMerkleTx> vtxPrev;
    mapValue_t mapValue;
    std::vector<std::pair<std::string, std::string> > vOrderForm;
    unsigned int fTimeReceivedIsTxTime;
    unsigned int nTimeReceived;  // time received by this node
    unsigned int nTimeSmart;
    char fFromMe;
    std::string strFromAccount;
    std::vector<char> vfSpent; // which outputs are already spent
    int64_t nOrderPos;  // position in ordered transaction list
    
    // memory only
    mutable int8_t fDebitCached; // overload for force update message
    mutable bool fCreditCached;
    mutable bool fAvailableCreditCached;
    mutable bool fChangeCached;
    mutable bool fAvailableOKprivateCreditCached;
    mutable bool fCreditSplitCached;
    mutable int64_t nDebitCached;
    mutable int64_t nCreditCached;
    mutable int64_t nAvailableCreditCached;
    mutable int64_t nChangeCached;
    mutable int64_t nAvailableOKprivateCreditCached;
    
    mutable int64_t nCredOKCached;
    mutable int64_t nCredOKprivateCached;
    
    CWalletTx()
    {
        Init(NULL);
    }
    
    CWalletTx(const CWallet* pwalletIn)
    {
        Init(pwalletIn);
    }
    
    CWalletTx(const CWallet* pwalletIn, const CMerkleTx& txIn) : CMerkleTx(txIn)
    {
        Init(pwalletIn);
    }
    
    CWalletTx(const CWallet* pwalletIn, const CTransaction& txIn) : CMerkleTx(txIn)
    {
        Init(pwalletIn);
    }
    
    void Init(const CWallet* pwalletIn)
    {
        pwallet = pwalletIn;
        vtxPrev.clear();
        mapValue.clear();
        vOrderForm.clear();
        fTimeReceivedIsTxTime = false;
        nTimeReceived = 0;
        nTimeSmart = 0;
        fFromMe = false;
        strFromAccount.clear();
        vfSpent.clear();
        fDebitCached = false;
        fCreditCached = false;
        fAvailableCreditCached = false;
        fAvailableOKprivateCreditCached = false;
        
        nCredOKCached = 0;
        nCredOKprivateCached = 0;
        fCreditSplitCached = false;
        
        fChangeCached = false;
        nDebitCached = 0;
        nCreditCached = 0;
        nAvailableCreditCached = 0;
        nAvailableOKprivateCreditCached = 0;
        nChangeCached = 0;
        nOrderPos = -1;
    }

    IMPLEMENT_SERIALIZE
    (
        CWalletTx* pthis = const_cast<CWalletTx*>(this);
        if (fRead)
            pthis->Init(NULL);
        char fSpent = false;

        if (!fRead)
        {
            pthis->mapValue["fromaccount"] = pthis->strFromAccount;

            std::string str;
            BOOST_FOREACH(char f, vfSpent)
            {
                str += (f ? '1' : '0');
                if (f)
                    fSpent = true;
            }
            pthis->mapValue["spent"] = str;

            WriteOrderPos(pthis->nOrderPos, pthis->mapValue);

            if (nTimeSmart)
                pthis->mapValue["timesmart"] = strprintf("%u", nTimeSmart);
        }

        nSerSize += SerReadWrite(s, *(CMerkleTx*)this, nType, nVersion,ser_action);
        READWRITE(vtxPrev);
        READWRITE(mapValue);
        READWRITE(vOrderForm);
        READWRITE(fTimeReceivedIsTxTime);
        READWRITE(nTimeReceived);
        READWRITE(fFromMe);
        READWRITE(fSpent);

        if (fRead)
        {
            pthis->strFromAccount = pthis->mapValue["fromaccount"];

            if (mapValue.count("spent"))
            {
                BOOST_FOREACH(char c, pthis->mapValue["spent"])
                    pthis->vfSpent.push_back(c != '0');
            } else
            {
                pthis->vfSpent.assign(vout.size(), fSpent);
            };
            
            ReadOrderPos(pthis->nOrderPos, pthis->mapValue);

            pthis->nTimeSmart = mapValue.count("timesmart") ? (unsigned int)atoi64(pthis->mapValue["timesmart"]) : 0;
        };

        pthis->mapValue.erase("fromaccount");
        pthis->mapValue.erase("version");
        pthis->mapValue.erase("spent");
        pthis->mapValue.erase("n");
        pthis->mapValue.erase("timesmart");
    )

    // marks certain txout's as spent
    // returns true if any update took place
    bool UpdateSpent(const std::vector<char>& vfNewSpent)
    {
        bool fReturn = false;
        for (unsigned int i = 0; i < vfNewSpent.size(); i++)
        {
            if (i == vfSpent.size())
                break;

            if (vfNewSpent[i] && !vfSpent[i])
            {
                vfSpent[i] = true;
                fReturn = true;
                fAvailableCreditCached = false;
            };
        };
        return fReturn;
    }

    // make sure balances are recalculated
    void MarkDirty()
    {
        fCreditCached = false;
        fAvailableCreditCached = false;
        fAvailableOKprivateCreditCached = false;
        fDebitCached = false;
        fChangeCached = false;
        fCreditSplitCached = false;
    }
    
    bool ForceUpdate()
    {
        return fDebitCached == 2;
    }

    void BindWallet(CWallet *pwalletIn)
    {
        pwallet = pwalletIn;
        MarkDirty();
    }

    void MarkSpent(unsigned int nOut)
    {
        if (nOut >= vout.size())
            throw std::runtime_error("CWalletTx::MarkSpent() : nOut out of range");
        
        vfSpent.resize(vout.size());
        if (!vfSpent[nOut])
        {
            vfSpent[nOut] = true;
            fAvailableCreditCached = false;
        };
    }

    void MarkUnspent(unsigned int nOut)
    {
        if (nOut >= vout.size())
            throw std::runtime_error("CWalletTx::MarkUnspent() : nOut out of range");
        
        vfSpent.resize(vout.size());
        if (vfSpent[nOut])
        {
            vfSpent[nOut] = false;
            fAvailableCreditCached = false;
        };
    }

    bool IsSpent(unsigned int nOut) const
    {
        if (nOut >= vout.size())
            throw std::runtime_error("CWalletTx::IsSpent() : nOut out of range");
        if (nOut >= vfSpent.size())
            return false;
        return (!!vfSpent[nOut]);
    }

    int64_t GetDebit() const
    {
        if (vin.empty())
            return 0;
        if (fDebitCached)
            return nDebitCached;
        nDebitCached = pwallet->GetDebit(*this);
        fDebitCached = true;
        return nDebitCached;
    }

    int64_t GetCredit(bool fUseCache=true) const
    {
        // Must wait until coinbase is safely deep enough in the chain before valuing it
        if ((IsCoinBase() || IsCoinStake()) && GetBlocksToMaturity() > 0)
            return 0;

        // GetBalance can assume transactions in mapWallet won't change
        if (fUseCache && fCreditCached)
            return nCreditCached;
        nCreditCached = pwallet->GetCredit(*this);
        fCreditCached = true;
        return nCreditCached;
    }
    
    bool GetCredit(int64_t& nCredOK, int64_t& nCredOKprivate, bool fUseCache=true) const
    {
        // Must wait until coinbase is safely deep enough in the chain before valuing it
        if ((IsCoinBase() || IsCoinStake()) && GetBlocksToMaturity() > 0)
        {
            nCredOK = nCredOKprivate = 0;
            return true;
        }
        
        // GetBalance can assume transactions in mapWallet won't change
        if (!fUseCache || !fCreditSplitCached)
        {
            nCredOKCached = 0;
            nCredOKprivateCached = 0;
            pwallet->GetCredit(*this, nCredOKCached, nCredOKprivateCached);
            fCreditSplitCached = true;
        };
        
        nCredOK = nCredOKCached;
        nCredOKprivate = nCredOKprivateCached;
        return true;
    }

    int64_t GetAvailableCredit(bool fUseCache=true) const
    {
        // Must wait until coinbase is safely deep enough in the chain before valuing it
        if ((IsCoinBase() || IsCoinStake()) && GetBlocksToMaturity() > 0)
            return 0;

        if (fUseCache && fAvailableCreditCached)
            return nAvailableCreditCached;

        int64_t nCredit = 0;
        for (unsigned int i = 0; i < vout.size(); i++)
        {
            if (!IsSpent(i))
            {
                const CTxOut &txout = vout[i];
                nCredit += pwallet->GetCredit(txout);
                if (!MoneyRange(nCredit))
                    throw std::runtime_error("CWalletTx::GetAvailableCredit() : value out of range");
            };
        };

        nAvailableCreditCached = nCredit;
        fAvailableCreditCached = true;
        return nCredit;
    };
    
    int64_t GetAvailableOKprivateCredit(bool fUseCache=true) const
    {
        // Must wait until coinbase is safely deep enough in the chain before valuing it
        if ((IsCoinBase() || IsCoinStake()) && GetBlocksToMaturity() > 0)
            return 0;
        
        if (fUseCache && fAvailableOKprivateCreditCached)
            return nAvailableOKprivateCreditCached;
        
        int64_t nCredit = 0;
        
        for (unsigned int i = 0; i < vout.size(); i++)
        {
            if (!IsSpent(i))
            {
                const CTxOut &txout = vout[i];
                
                if (!txout.IsOkxOutput())
                    continue;
                const CScript &s = txout.scriptPubKey;
                
                CKeyID ckidD = CPubKey(&s[2+1], 33).GetID();
                
                if (pwallet->HaveKey(ckidD))
                {
                    nCredit += txout.nValue;
                };
                
                if (!MoneyRange(nCredit))
                    throw std::runtime_error("CWalletTx::GetAvailableOKprivateCredit() : value out of range");
            };
        };
        
        nAvailableOKprivateCreditCached = nCredit;
        fAvailableOKprivateCreditCached = true;
        return nCredit;
    };


    int64_t GetChange() const
    {
        if (fChangeCached)
            return nChangeCached;
        nChangeCached = pwallet->GetChange(*this);
        fChangeCached = true;
        return nChangeCached;
    }

    void GetAmounts(std::list<std::pair<CTxDestination, int64_t> >& listReceived,
                    std::list<std::pair<CTxDestination, int64_t> >& listSent, int64_t& nFee, std::string& strSentAccount) const;

    void GetAccountAmounts(const std::string& strAccount, int64_t& nReceived,
                           int64_t& nSent, int64_t& nFee) const;

    bool IsFromMe() const
    {
        return (GetDebit() > 0);
    }

    bool IsTrusted() const
    {
        // Quick answer in most cases
        if (!IsFinal())
            return false;
        int nDepth = GetDepthInMainChain();
        if (nDepth >= 1)
            return true;
        if (nDepth < 0)
            return false;
        if (fConfChange || !IsFromMe()) // using wtx's cached debit
            return false;

        // If no confirmations but it's from us, we can still
        // consider it confirmed if all dependencies are confirmed
        std::map<uint256, const CMerkleTx*> mapPrev;
        std::vector<const CMerkleTx*> vWorkQueue;
        vWorkQueue.reserve(vtxPrev.size()+1);
        vWorkQueue.push_back(this);
        for (unsigned int i = 0; i < vWorkQueue.size(); i++)
        {
            const CMerkleTx* ptx = vWorkQueue[i];

            if (!ptx->IsFinal())
                return false;
            int nPDepth = ptx->GetDepthInMainChain();
            if (nPDepth >= 1)
                continue;
            if (nPDepth < 0)
                return false;
            if (!pwallet->IsFromMe(*ptx))
                return false;

            if (mapPrev.empty())
            {
                BOOST_FOREACH(const CMerkleTx& tx, vtxPrev)
                    mapPrev[tx.GetHash()] = &tx;
            }

            BOOST_FOREACH(const CTxIn& txin, ptx->vin)
            {
                if (!mapPrev.count(txin.prevout.hash))
                    return false;
                vWorkQueue.push_back(mapPrev[txin.prevout.hash]);
            }
        }

        return true;
    }

    bool WriteToDisk();

    int64_t GetTxTime() const;
    int GetRequestCount() const;

    void AddSupportingTransactions(CTxDB& txdb);

    bool AcceptWalletTransaction(CTxDB& txdb);
    bool AcceptWalletTransaction();

    void RelayWalletTransaction(CTxDB& txdb);
    void RelayWalletTransaction();
};




class COutput
{
public:
    const CWalletTx *tx;
    int i;
    int nDepth;

    COutput(const CWalletTx *txIn, int iIn, int nDepthIn)
    {
        tx = txIn; i = iIn; nDepth = nDepthIn;
    }

    std::string ToString() const
    {
        return strprintf("COutput(%s, %d, %d) [%s]", tx->GetHash().ToString().substr(0,10).c_str(), i, nDepth, FormatMoney(tx->vout[i].nValue).c_str());
    }

    void print() const
    {
        LogPrintf("%s\n", ToString().c_str());
    }
};




/** Private key that includes an expiration date in case it never gets used. */
class CWalletKey
{
public:
    CPrivKey vchPrivKey;
    int64_t nTimeCreated;
    int64_t nTimeExpires;
    std::string strComment;
    //// todo: add something to note what created it (user, getnewaddress, change)
    ////   maybe should have a map<string, string> property map

    CWalletKey(int64_t nExpires=0)
    {
        nTimeCreated = (nExpires ? GetTime() : 0);
        nTimeExpires = nExpires;
    }

    IMPLEMENT_SERIALIZE
    (
        if (!(nType & SER_GETHASH))
            READWRITE(nVersion);
        READWRITE(vchPrivKey);
        READWRITE(nTimeCreated);
        READWRITE(nTimeExpires);
        READWRITE(strComment);
    )
};






/** Account information.
 * Stored in wallet with key "acc"+string account name.
 */
class CAccount
{
public:
    CPubKey vchPubKey;

    CAccount()
    {
        SetNull();
    }

    void SetNull()
    {
        vchPubKey = CPubKey();
    }

    IMPLEMENT_SERIALIZE
    (
        if (!(nType & SER_GETHASH))
            READWRITE(nVersion);
        READWRITE(vchPubKey);
    )
};



/** Internal transfers.
 * Database key is acentry<account><counter>.
 */
class CAccountingEntry
{
public:
    std::string strAccount;
    int64_t nCreditDebit;
    int64_t nTime;
    std::string strOtherAccount;
    std::string strComment;
    mapValue_t mapValue;
    int64_t nOrderPos;  // position in ordered transaction list
    uint64_t nEntryNo;

    CAccountingEntry()
    {
        SetNull();
    }

    void SetNull()
    {
        nCreditDebit = 0;
        nTime = 0;
        strAccount.clear();
        strOtherAccount.clear();
        strComment.clear();
        nOrderPos = -1;
    }

    IMPLEMENT_SERIALIZE
    (
        CAccountingEntry& me = *const_cast<CAccountingEntry*>(this);
        if (!(nType & SER_GETHASH))
            READWRITE(nVersion);
        // Note: strAccount is serialized as part of the key, not here.
        READWRITE(nCreditDebit);
        READWRITE(nTime);
        READWRITE(strOtherAccount);

        if (!fRead)
        {
            WriteOrderPos(nOrderPos, me.mapValue);

            if (!(mapValue.empty() && _ssExtra.empty()))
            {
                CDataStream ss(nType, nVersion);
                ss.insert(ss.begin(), '\0');
                ss << mapValue;
                ss.insert(ss.end(), _ssExtra.begin(), _ssExtra.end());
                me.strComment.append(ss.str());
            }
        }

        READWRITE(strComment);

        size_t nSepPos = strComment.find("\0", 0, 1);
        if (fRead)
        {
            me.mapValue.clear();
            if (std::string::npos != nSepPos)
            {
                CDataStream ss(std::vector<char>(strComment.begin() + nSepPos + 1, strComment.end()), nType, nVersion);
                ss >> me.mapValue;
                me._ssExtra = std::vector<char>(ss.begin(), ss.end());
            }
            ReadOrderPos(me.nOrderPos, me.mapValue);
        }
        if (std::string::npos != nSepPos)
            me.strComment.erase(nSepPos);

        me.mapValue.erase("n");
    )

private:
    std::vector<char> _ssExtra;
};

bool GetWalletFile(CWallet* pwallet, std::string &strWalletFileOut);

class CWalletIsMineVisitor : public boost::static_visitor<bool>
{
private:
    const CWallet *wallet;
public:
    CWalletIsMineVisitor(const CWallet *walletIn) : wallet(walletIn) { }
    bool operator()(const CNoDestination &dest) const { return false; }
    bool operator()(const CKeyID &keyID) const { return wallet->HaveKey(keyID); }
    bool operator()(const CScriptID &scriptID) const { return wallet->HaveCScript(scriptID); }
    bool operator()(const CStealthAddress &sxAddr) const
    {
        return sxAddr.scan_secret.size() == EC_SECRET_SIZE;
    }
    bool operator()(const CExtKeyPair &ek) const
    {
        return wallet->HaveExtKey(ek.GetID());
        //return ek.IsValidV();
    }
};

#endif

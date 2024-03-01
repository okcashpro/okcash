// Copyright (c) 2014-2024 The Okcash developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef EXT_KEY_H
#define EXT_KEY_H

#include "key.h"
#include "hash.h"
#include "crypter.h"
#include "stealth.h"

#include "state.h"

static const uint32_t MAX_DERIVE_TRIES = 16;
static const uint32_t BIP32_KEY_LEN = 82; // raw, 74 + 4 bytes id + 4 checksum
static const uint32_t BIP32_KEY_N_BYTES = 74; // raw without id and checksum

static const uint32_t MAX_KEY_PACK_SIZE = 100;
static const uint32_t N_DEFAULT_LOOKAHEAD = 10;
static const uint32_t N_DEFAULT_EKVT_LOOKAHEAD = 20;

static const uint32_t BIP44_PURPOSE = (((uint32_t)44) | (1 << 31));

typedef std::map<uint8_t, std::vector<uint8_t> > mapEKValue_t;

enum EKAddonValueTypes
{
    EKVT_CREATED_AT         = 1, // up to 8 bytes of int64_t
    EKVT_KEY_TYPE           = 2, // 1 uint8 of MainExtKeyTypes
    EKVT_STRING_PAIR        = 3, // str1 null str2 null
    EKVT_ROOT_ID            = 4, // packed keyid of the root key in the path eg: for key of path m/44'/22'/0, EKVT_ROOT_ID is the id of m
    EKVT_PATH               = 5, // pack 4bytes no separators
    EKVT_ADDED_SECRET_AT    = 6,
    EKVT_N_LOOKAHEAD        = 7,
};

extern CCriticalSection cs_extKey;

enum MainExtKeyTypes
{
    EKT_MASTER,
    EKT_BIP44_MASTER, // display with btc prefix (xprv)
    EKT_MAX_TYPES,
};

enum AccountFlagTypes
{
    EAF_ACTIVE           = (1 << 0),
    EAF_HAVE_SECRET      = (1 << 1),
    EAF_IS_CRYPTED       = (1 << 2),
    EAF_RECEIVE_ON       = (1 << 3), // CStoredExtKey with this flag set generate look ahead keys
    EAF_IN_ACCOUNT       = (1 << 4), // CStoredExtKey is part of an account
};

enum WordListLanguages
{
    WLL_ENGLISH         = 1,
    WLL_FRENCH          = 2,
    WLL_JAPANESE        = 3,
    WLL_SPANISH         = 4,
    WLL_CHINESE_S       = 5,
    WLL_CHINESE_T       = 6,
    
    WLL_MAX
};




class CStoredExtKey
{
public:
    CStoredExtKey()
    {
        fLocked = 0;
        nFlags = 0;
        nGenerated = 0;
        nHGenerated = 0;
    }
    
    std::string GetIDString58() const;
    
    CKeyID GetID() const
    {
        return kp.GetID();
    };
    
    bool operator <(const CStoredExtKey& y) const
    {
        return kp < y.kp;
    };
    
    bool operator ==(const CStoredExtKey& y) const
    {
        // - Compare pubkeys instead of CExtKeyPair for speed
        return kp.pubkey == y.kp.pubkey;
    };
    
    
    template<typename T>
    int DeriveKey(T &keyOut, uint32_t nChildIn, uint32_t &nChildOut, bool fHardened = false)
    {
        if (fHardened && !kp.IsValidV())
            return errorN(1, "Ext key does not contain a secret.");
        
        for (uint32_t i = 0; i < MAX_DERIVE_TRIES; ++i)
        {
            if ((nChildIn >> 31) == 1)
            {
                // TODO: auto spawn new master key
                if (fHardened)
                    return errorN(1, "No more hardened keys can be derived from master.");
                return errorN(1, "No more keys can be derived from master.");
            };
            
            uint32_t nNum = fHardened ? nChildIn | 1 << 31 : nChildIn;
            
            if (kp.Derive(keyOut, nNum))
            {
                nChildOut = nNum; // nChildOut has bit 31 set for harnened keys
                return 0;
            };
            
            nChildIn++;
        };
        return 1;
    };
    
    template<typename T>
    int DeriveNextKey(T &keyOut, uint32_t &nChildOut, bool fHardened = false, bool fUpdate = true)
    {
        uint32_t nChild = fHardened ? nHGenerated : nGenerated;
        
        int rv;
        if ((rv = DeriveKey(keyOut, nChild, nChildOut, fHardened)) != 0)
            return rv;
        
        nChild = nChildOut & ~(1 << 31); // clear the hardened bit
        if (fUpdate)
            SetCounter(nChild+1, fHardened);
        
        return 0;
    };
    
    int SetCounter(uint32_t nC, bool fHardened)
    {
        if (fHardened)
            nHGenerated = nC;
        else
            nGenerated = nC;
        return 0;
    };
    
    uint32_t GetCounter(bool fHardened)
    {
        return fHardened ? nHGenerated : nGenerated;
    };
    
    IMPLEMENT_SERIALIZE
    (
        // - Never save secret data when key is encrypted
        if (!fRead && vchCryptedSecret.size() > 0)
        {
            CExtKeyPair kpt = kp.Neutered();
            READWRITE(kpt);
        } else
        {
            READWRITE(kp);
        };
        
        READWRITE(vchCryptedSecret);
        READWRITE(sLabel);
        READWRITE(nFlags);
        READWRITE(nGenerated);
        READWRITE(nHGenerated);
        READWRITE(mapValue);
    );
    
    // - when encrypted, pk can't be derived from vk
    CExtKeyPair kp;
    std::vector<uint8_t> vchCryptedSecret;
    
    std::string sLabel;
    
    uint8_t fLocked; // not part of nFlags so not saved
    uint32_t nFlags;
    uint32_t nGenerated;
    uint32_t nHGenerated;
    
    mapEKValue_t mapValue;
};



class CEKAKey
{
public:
    CEKAKey() {};
    CEKAKey(uint32_t nParent_, uint32_t nKey_) : nParent(nParent_), nKey(nKey_) {};
    
    IMPLEMENT_SERIALIZE
    (
        READWRITE(nParent);
        READWRITE(nKey);
        READWRITE(sLabel);
    );
    
    uint32_t nParent; // vExtKeys
    uint32_t nKey;
    //uint32_t nChecksum; // TODO: is it worth storing 4 bytes of the id (160 hash here)
     
    std::string sLabel; // TODO: use later
};

class CEKASCKey
{
// - key derived from stealth key
public:
    CEKASCKey() {};
    CEKASCKey(CKeyID &idStealthKey_, ec_secret &sShared_) : idStealthKey(idStealthKey_), sShared(sShared_) {};
    
    IMPLEMENT_SERIALIZE
    (
        READWRITE(idStealthKey);
        READWRITE(sShared);
        READWRITE(sLabel);
    );
    
    // TODO: store an offset instead of the full id of the stealth address
    CKeyID idStealthKey; // id of parent stealth key (received on)
    ec_secret sShared;
    
    //uint32_t nChecksum; // TODO: is it worth storing 4 bytes of the id (160 hash here)
    std::string sLabel; // TODO: use later
};

class CEKAStealthKey
{
public:
    CEKAStealthKey() {};
    CEKAStealthKey(uint32_t nScanParent_, uint32_t nScanKey_, CKey scanSecret_, uint32_t nSpendParent_, uint32_t nSpendKey_, CKey spendSecret_)
    {
        // - spend secret is not stored
        nFlags = 0;
        nScanParent = nScanParent_;
        nScanKey = nScanKey_;
        skScan = scanSecret_;
        CPubKey pk = skScan.GetPubKey();
        pkScan.resize(pk.size());
        memcpy(&pkScan[0], pk.begin(), pk.size());
        
        akSpend = CEKAKey(nSpendParent_, nSpendKey_);
        pk = spendSecret_.GetPubKey();
        pkSpend.resize(pk.size());
        memcpy(&pkSpend[0], pk.begin(), pk.size());
    };
    
    std::string ToStealthAddress() const;
    int SetSxAddr(CStealthAddress &sxAddr);
    
    CKeyID GetID() const
    {
        // - not likely to be called very often
        return skScan.GetPubKey().GetID();
    };
    
    
    IMPLEMENT_SERIALIZE
    (
        READWRITE(nFlags);
        READWRITE(sLabel);
        READWRITE(nScanParent);
        READWRITE(nScanKey);
        READWRITE(skScan);
        READWRITE(akSpend);
        READWRITE(pkScan);
        READWRITE(pkSpend);
    );
    
    
    uint8_t nFlags; // options of CStealthAddress
    std::string sLabel;
    uint32_t nScanParent; // vExtKeys
    uint32_t nScanKey;
    CKey skScan;
    CEKAKey akSpend;
    
    ec_point pkScan;
    ec_point pkSpend;
};

class CEKAKeyPack
{
public:
    CEKAKeyPack() {};
    CEKAKeyPack(CKeyID id_, CEKAKey &ak_) : id(id_), ak(ak_) {};
    
    IMPLEMENT_SERIALIZE
    (
        READWRITE(id);
        READWRITE(ak);
    );
    
    CKeyID id;
    CEKAKey ak;
};

class CEKASCKeyPack
{
public:
    CEKASCKeyPack() {};
    CEKASCKeyPack(CKeyID id_, CEKASCKey &asck_) : id(id_), asck(asck_) {};
    
    IMPLEMENT_SERIALIZE
    (
        READWRITE(id);
        READWRITE(asck);
    );
    
    CKeyID id;
    CEKASCKey asck;
};

class CEKAStealthKeyPack
{
public:
    CEKAStealthKeyPack() {};
    CEKAStealthKeyPack(CKeyID id_, CEKAStealthKey &aks_) : id(id_), aks(aks_) {};
    
    IMPLEMENT_SERIALIZE
    (
        READWRITE(id);
        READWRITE(aks);
    );
    
    CKeyID id;
    CEKAStealthKey aks;
};


typedef std::map<CKeyID, CEKAKey> AccKeyMap;
typedef std::map<CKeyID, CEKASCKey> AccKeySCMap;
typedef std::map<CKeyID, CEKAStealthKey> AccStealthKeyMap;

class CExtKeyAccount
{ // stored by idAccount
public:
    CExtKeyAccount()
    {
        nActiveExternal = 0;
        nActiveInternal = 0;
        nActiveStealth = 0;
        nHeightCheckedUncrypted = 0;
        nFlags = 0;
        nPack = 0;
        nPackStealth = 0;
    };
    
    int FreeChains()
    {
        // - Keys are normally freed by the wallet
        std::vector<CStoredExtKey*>::iterator it;
        for (it = vExtKeys.begin(); it != vExtKeys.end(); ++it)
        {
            delete *it;
            *it = NULL;
        };
        return 0;
    };
    
    std::string GetIDString58() const;
    
    CKeyID GetID() const
    {
        if (vExtKeyIDs.size() < 1)
            return CKeyID(0);
        return vExtKeyIDs[0];
    };
    
    int HaveKey(const CKeyID &id, bool fUpdate, CEKAKey &ak);
    bool GetKey(const CKeyID &id, CKey &keyOut) const;
    bool GetKey(const CEKAKey &ak, CKey &keyOut) const;
    bool GetKey(const CEKASCKey &asck, CKey &keyOut) const;
    
    bool GetPubKey(const CKeyID &id, CPubKey &pkOut) const;
    bool GetPubKey(const CEKAKey &ak, CPubKey &pkOut) const;
    bool GetPubKey(const CEKASCKey &asck, CPubKey &pkOut) const;
    
    bool SaveKey(const CKeyID &id, CEKAKey &keyIn);
    bool SaveKey(const CKeyID &id, CEKASCKey &keyIn);
    
    bool IsLocked(const CEKAStealthKey &aks);
    
    CStoredExtKey *GetChain(uint32_t nChain) const
    {
        if (nChain >= vExtKeys.size())
            return NULL;
        return vExtKeys[nChain];
    };
    
    CStoredExtKey *ChainExternal()
    {
        return GetChain(nActiveExternal);
    };
    
    CStoredExtKey *ChainInternal()
    {
        return GetChain(nActiveInternal);
    };
    
    CStoredExtKey *ChainStealth()
    {
        return GetChain(nActiveStealth);
    };
    
    CStoredExtKey *ChainAccount()
    {
        if (vExtKeys.size() < 1)
            return NULL;
        return vExtKeys[0];
    };
    
    int AddLookAhead(uint32_t nChain, uint32_t nKeys);
    
    int AddLookAheadInternal(uint32_t nKeys)
    {
        return AddLookAhead(nActiveExternal, nKeys);
    };
    
    int AddLookAheadExternal(uint32_t nKeys)
    {
        return AddLookAhead(nActiveInternal, nKeys);
    };
    
    int ExpandStealthChildKey(const CEKAStealthKey *aks, const ec_secret &sShared, CKey &kOut) const;
    int ExpandStealthChildPubKey(const CEKAStealthKey *aks, const ec_secret &sShared, CPubKey &pkOut) const;
    
    int WipeEncryption();
    
    IMPLEMENT_SERIALIZE
    (
        READWRITE(sLabel);
        READWRITE(idMaster);
        
        READWRITE(nActiveExternal);
        READWRITE(nActiveInternal);
        READWRITE(nActiveStealth);
        
        READWRITE(vExtKeyIDs);
        READWRITE(nHeightCheckedUncrypted);
        READWRITE(nFlags);
        READWRITE(nPack);
        READWRITE(nPackStealth);
        READWRITE(nPackStealthKeys);
        READWRITE(mapValue);
    );
    
    
    // TODO: Could store used keys in archived packs, which don't get loaded into memory
    AccKeyMap mapKeys;
    AccKeyMap mapLookAhead;
    
    AccKeySCMap mapStealthChildKeys; // keys derived from stealth addresses
    
    AccStealthKeyMap mapStealthKeys;
    AccStealthKeyMap mapLookAheadStealth;
    
    
    std::string sLabel; // account name
    CKeyID idMaster;
    
    uint32_t nActiveExternal;
    uint32_t nActiveInternal;
    uint32_t nActiveStealth;
    
    
    // Note: Stealth addresses consist of 2 secret keys, one of which (scan secret) must remain unencrypted while wallet locked
    // store a separate child key used only to derive secret keys
    // Stealth addresses must only ever be generated as hardened keys
    
    mutable CCriticalSection cs_account;
    
    // - 0th key is always the account key
    std::vector<CStoredExtKey*> vExtKeys;
    std::vector<CKeyID> vExtKeyIDs;
    
    int nHeightCheckedUncrypted; // last block checked while uncrypted
    
    uint32_t nFlags;
    uint32_t nPack;
    uint32_t nPackStealth;
    uint32_t nPackStealthKeys;
    mapEKValue_t mapValue;
};



const char *ExtKeyGetString(int ind);

inline int GetNumBytesReqForInt(uint64_t v)
{
    int n = 0;
    while (v != 0)
    {
        v >>= 8;
        n ++;
    };
    return n;
};

std::vector<uint8_t> &SetCompressedInt64(std::vector<uint8_t> &v, uint64_t n);
int64_t GetCompressedInt64(const std::vector<uint8_t> &v, uint64_t &n);

std::vector<uint8_t> &SetCKeyID(std::vector<uint8_t> &v, CKeyID n);
bool GetCKeyID(const std::vector<uint8_t> &v, CKeyID &n);

std::vector<uint8_t> &SetString(std::vector<uint8_t> &v, const char *s);
std::vector<uint8_t> &SetChar(std::vector<uint8_t> &v, const uint8_t c);
std::vector<uint8_t> &PushUInt32(std::vector<uint8_t> &v, const uint32_t i);



int ExtractExtKeyPath(const std::string &sPath, std::vector<uint32_t> &vPath);

int PathToString(const std::vector<uint8_t> &vPath, std::string &sPath, char cH='\'');

bool IsBIP32(const char *base58);


class LoopExtKeyCallback
{
public:
    // NOTE: the key and account instances passed to Process are temporary
    virtual int ProcessKey(CKeyID &id, CStoredExtKey &sek) {return 1;};
    virtual int ProcessAccount(CKeyID &id, CExtKeyAccount &sek) {return 1;};
};

int LoopExtKeysInDB(bool fInactive, bool fInAccount, LoopExtKeyCallback &callback);
int LoopExtAccountsInDB(bool fInactive, LoopExtKeyCallback &callback);


int GetWordOffset(const char *p, const char *pwl, int max, int &o);
int MnemonicDetectLanguage(const std::string &sWordList);
int MnemonicEncode(int nLanguage, const std::vector<uint8_t> &vEntropy, std::string &sWordList, std::string &sError);
int MnemonicDecode(int nLanguage, const std::string &sWordListIn, std::vector<uint8_t> &vEntropy, std::string &sError, bool fIgnoreChecksum=false);
int MnemonicToSeed(const std::string &sMnemonic, const std::string &sPasswordIn, std::vector<uint8_t> &vSeed);
int MnemonicAddChecksum(int nLanguageIn, const std::string &sWordListIn, std::string &sWordListOut, std::string &sError);

#endif // EXT_KEY_H


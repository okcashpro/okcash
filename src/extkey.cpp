// Copyright (c) 2014-2023 The Okcash developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "extkey.h"

#include "util.h"
#include "base58.h"
#include "state.h"
#include "wallet.h"
#include "init.h" // for pwalletMain

#include "wordlists/english.h"
#include "wordlists/french.h"
#include "wordlists/japanese.h"
#include "wordlists/spanish.h"
#include "wordlists/chinese_simplified.h"
#include "wordlists/chinese_traditional.h"

#include <stdint.h>


#include <openssl/rand.h>
#include <openssl/hmac.h>
#include <openssl/evp.h>

CCriticalSection cs_extKey;

const char *ExtKeyGetString(int ind)
{
    switch (ind)
    {
        case 2:     return "Path string too long";
        case 3:     return "Path string empty";
        case 4:     return "Integer conversion invalid character";
        case 5:     return "Integer conversion out of range";
        case 6:     return "'0' only valid at start or end";
        case 7:     return "Malformed path";
        case 8:     return "Offset is hardened already";
        case 9:     return "Can't use BIP44 key as master";
        case 10:    return "Ext key not found in wallet";
        case 11:    return "This key is already the master key";
        case 12:    return "Derived key already exists in wallet";
        case 13:    return "Failed to unlock";
        default:    return "Make sure your wallet is fully Unlocked,\n Else this is an Unknown error, check the log";
    };
    
};

std::vector<uint8_t> &SetCompressedInt64(std::vector<uint8_t> &v, uint64_t n)
{
    int b = GetNumBytesReqForInt(n);
    v.resize(b);
    if (b > 0)
        memcpy(&v[0], (uint8_t*) &n, b);
    
    return v;
};

int64_t GetCompressedInt64(const std::vector<uint8_t> &v, uint64_t &n)
{
    int b = v.size();
    n = 0;
    if (b < 1)
        n = 0;
    else
    if (b < 9)
        memcpy((uint8_t*) &n, &v[0], b);
    
    return (int64_t)n;
};

std::vector<uint8_t> &SetCKeyID(std::vector<uint8_t> &v, CKeyID n)
{
    v.resize(20);
    memcpy(&v[0], (uint8_t*) &n, 20);
    return v;
};

bool GetCKeyID(const std::vector<uint8_t> &v, CKeyID &n)
{
    if (v.size() != 20)
        return false;
    
    memcpy((uint8_t*) &n, &v[0], 20);
    
    return true;
};

std::vector<uint8_t> &SetString(std::vector<uint8_t> &v, const char *s)
{
    size_t len = strlen(s);
    v.resize(len);
    memcpy(&v[0], (uint8_t*) &s, len);
    
    return v;
};

std::vector<uint8_t> &SetChar(std::vector<uint8_t> &v, const uint8_t c)
{
    v.resize(1);
    v[0] = c;
    
    return v;
};

std::vector<uint8_t> &PushUInt32(std::vector<uint8_t> &v, const uint32_t i)
{
    size_t o = v.size();
    v.resize(o+4);
    
    memcpy(&v[o], (uint8_t*) &i, 4);
    return v;
};


#define _UINT32_MAX  (0xffffffff)
static uint32_t strtou32max(const char *nptr, int base)
{
    const char *s;
    uintmax_t acc;
    char c;
    uintmax_t cutoff;
    int neg, any, cutlim;
    
    s = nptr;
    do {
        c = *s++;
    } while (isspace((unsigned char)c));
    
    if (c == '-') {
        neg = 1;
        c = *s++;
    } else {
        neg = 0;
        if (c == '+')
            c = *s++;
    }
    if ((base == 0 || base == 16) &&
        c == '0' && (*s == 'x' || *s == 'X') &&
        ((s[1] >= '0' && s[1] <= '9') ||
        (s[1] >= 'A' && s[1] <= 'F') ||
        (s[1] >= 'a' && s[1] <= 'f'))) {
        c = s[1];
        s += 2;
        base = 16;
    }
    if (base == 0)
        base = c == '0' ? 8 : 10;
    acc = any = 0;
    if (base < 2 || base > 36)
        goto noconv;

    cutoff = _UINT32_MAX / base;
    cutlim = _UINT32_MAX % base;
    for ( ; ; c = *s++) {
        if (c >= '0' && c <= '9')
            c -= '0';
        else if (c >= 'A' && c <= 'Z')
            c -= 'A' - 10;
        else if (c >= 'a' && c <= 'z')
            c -= 'a' - 10;
        else
            break;
        if (c >= base)
            break;
        if (any < 0 || acc > cutoff || (acc == cutoff && c > cutlim))
            any = -1;
        else {
            any = 1;
            acc *= base;
            acc += c;
        }
    }
    if (any < 0) {
        acc = _UINT32_MAX;
        errno = ERANGE;
    } else if (!any) {
noconv:
        errno = EINVAL;
    } else if (neg)
        acc = -acc;
    return (acc);
};

static inline int validDigit(char c, int base)
{
    switch(base)
    {
        case 2:  return c == '0' || c == '1';
        case 10: return c >= '0' && c <= '9';
        case 16: return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
        default: errno = EINVAL;
    };
    return 0;
};

int ExtractExtKeyPath(const std::string &sPath, std::vector<uint32_t> &vPath)
{
    char data[512];
    
    vPath.clear();
    
    if (sPath.length() > sizeof(data) -2)
        return 2;
    if (sPath.length() < 1)
        return 3;
    
    memcpy(data, sPath.data(), sPath.length());
    data[sPath.length()] = '\0';
    
    int nSlashes = 0;
    for (size_t k = 0; k < sPath.length(); ++k)
    {
        if (sPath[k] == '/')
        {
            nSlashes++;
            
            // - catch start or end '/', and '//'
            if (k == 0
                || k == sPath.length()-1
                || (k < sPath.length()-1 && sPath[k+1] == '/'))
                return 7;
        };
    };
    
    vPath.reserve(nSlashes + 1);
    
    char *p = strtok(data, "/");
    
    while (p)
    {
        uint32_t nChild;
        if (tolower(*p) == 'm')
        {
            nChild = 0;
        } else
        {
            
            bool fHarden = false;
            
            // - don't allow octal, only hex and binary
            int nBase = *p == '0' && (*(p+1) == 'b' || *(p+1) == 'B') ? 2
                : *p == '0' && (*(p+1) == 'x' || *(p+1) == 'X') ? 16 : 10;
            if (nBase != 10)
                p += 2; // step over 0b / 0x
            char *ps = p;
            for (; *p; ++p)
            {
                // -last char can be (h, H ,')
                if (!*(p+1) && (tolower(*p) == 'h' || *p == '\''))
                {
                    fHarden = true;
                    *p = '\0';
                } else
                if (!validDigit(*p, nBase))
                    return 4;
            };
            
            errno = 0;
            nChild = strtou32max(ps, nBase);
            if (errno != 0)
                return 5;
            
            if (fHarden)
            {
                if ((nChild >> 31) == 0)
                {
                    nChild |= 1 << 31;
                } else
                {
                    return 8;
                };
            };
        };
        
        vPath.push_back(nChild);
        
        p = strtok(NULL, "/");
        
        if (nChild == 0
            && vPath.size() != 1
            && p)
            return 6;
    };
    
    if (vPath.size() < 1)
        return 3;
    
    return 0;
};

int PathToString(const std::vector<uint8_t> &vPath, std::string &sPath, char cH)
{
    sPath = "";
    if (vPath.size() % 4 != 0)
        return 1;
    
    sPath = "m";
    for (size_t o = 0; o < vPath.size(); o+=4)
    {
        uint32_t n;
        memcpy(&n, &vPath[o], 4);
        sPath += "/";
        
        bool fHardened = false;
        if ((n >> 31) == 1)
        {
            n &= ~(1 << 31);
            fHardened = true;
        };
        sPath += strprintf("%u", n);
        if (fHardened)
            sPath += cH;
    };
    
    return 0;
};

std::string CEKAStealthKey::ToStealthAddress() const
{
    // - return base58 encoded public stealth address
    
    std::vector<uint8_t> raw;
    raw = Params().Base58Prefix(CChainParams::STEALTH_ADDRESS);
    
    raw.push_back(nFlags);
    raw.insert(raw.end(), pkScan.begin(), pkScan.end());
    raw.push_back(1); // number of spend pubkeys
    raw.insert(raw.end(), pkSpend.begin(), pkSpend.end());
    raw.push_back(0); // number of signatures
    raw.push_back(0); // ?
    AppendChecksum(raw);
    
    return EncodeBase58(raw);
};

int CEKAStealthKey::SetSxAddr(CStealthAddress &sxAddr)
{
    sxAddr.scan_pubkey = pkScan;
    sxAddr.spend_pubkey = pkSpend;
    sxAddr.scan_secret.resize(EC_SECRET_SIZE);
    memcpy(&sxAddr.scan_secret[0], skScan.begin(), EC_SECRET_SIZE);
    
    return 0;
};

std::string CStoredExtKey::GetIDString58() const
{
    CBitcoinAddress addr;
    addr.Set(kp.GetID(), CChainParams::EXT_KEY_HASH);
    return addr.ToString();
};

std::string CExtKeyAccount::GetIDString58() const
{
    // - 0th chain is always account chain
    if (vExtKeyIDs.size() < 1)
        return "Not Set";
    CBitcoinAddress addr;
    addr.Set(vExtKeyIDs[0], CChainParams::EXT_ACC_HASH);
    return addr.ToString();
};

int CExtKeyAccount::HaveKey(const CKeyID &id, bool fUpdate, CEKAKey &ak)
{
    // - rv 0 = no, 1 = yes, 2 = lookahead, 3 = lookahead + updated
    
    LOCK(cs_account);
    // - if fUpdate, promote key if found in look ahead
    AccKeyMap::const_iterator mi = mapKeys.find(id);
    if (mi != mapKeys.end())
        return 1;
    
    mi = mapLookAhead.find(id);
    if (mi != mapLookAhead.end())
    {
        CBitcoinAddress addr(mi->first);
        if (fDebug)
            LogPrintf("HaveKey in lookAhead %s\n", addr.ToString().c_str());
        if (fUpdate)
        {
            ak = mi->second; // pass up for save to db
            return 3;
        };
        return 2;
    };
    
    AccKeySCMap::const_iterator miSck = mapStealthChildKeys.find(id);
    if (miSck != mapStealthChildKeys.end())
        return 1;
    
    return 0;
};

bool CExtKeyAccount::GetKey(const CKeyID &id, CKey &keyOut) const
{
    LOCK(cs_account);
    
    AccKeyMap::const_iterator mi;
    AccKeySCMap::const_iterator miSck;
    if ((mi = mapKeys.find(id)) != mapKeys.end())
    {
        if (!GetKey(mi->second, keyOut))
            return false;
    } else
    if ((miSck = mapStealthChildKeys.find(id)) != mapStealthChildKeys.end())
    {
        if (!GetKey(miSck->second, keyOut))
            return false;
    } else
    {
        return false;
    };
    
    // [rm] necessary?
    if (fDebug && keyOut.GetPubKey().GetID() != id)
    {
        return error("Stored key mismatch.");
    };
    
    return true;
}

bool CExtKeyAccount::GetKey(const CEKAKey &ak, CKey &keyOut) const
{
    LOCK(cs_account);
    
    if (ak.nParent >= vExtKeys.size())
        return error("%s: Account key invalid parent ext key %d, account %s.", __func__, ak.nParent, GetIDString58().c_str());
    
    const CStoredExtKey *chain = vExtKeys[ak.nParent];
    
    if (chain->fLocked)
        return error("%s: Chain locked, account %s.", __func__, GetIDString58().c_str());
    
    if (!chain->kp.Derive(keyOut, ak.nKey))
        return false;
    
    return true;
};

bool CExtKeyAccount::GetKey(const CEKASCKey &asck, CKey &keyOut) const
{
    LOCK(cs_account);
    
    AccStealthKeyMap::const_iterator miSk = mapStealthKeys.find(asck.idStealthKey);
    if (miSk == mapStealthKeys.end())
        return error("%s: CEKASCKey Stealth key not in this account!", __func__);
    
    return (0 == ExpandStealthChildKey(&miSk->second, asck.sShared, keyOut));
};

bool CExtKeyAccount::GetPubKey(const CKeyID &id, CPubKey &pkOut) const
{
    LOCK(cs_account);
    AccKeyMap::const_iterator mi;
    AccKeySCMap::const_iterator miSck;
    if ((mi = mapKeys.find(id)) != mapKeys.end())
    {
        if (!GetPubKey(mi->second, pkOut))
            return false;
    } else
    if ((miSck = mapStealthChildKeys.find(id)) != mapStealthChildKeys.end())
    {
        if (!GetPubKey(miSck->second, pkOut))
            return false;
    } else
    {
        return false;
    };
    
    if (fDebug) // [rm] necessary
    {
        if (pkOut.GetID() != id)
            return errorN(1, "%s: Extracted public key mismatch.", __func__);
    };
    
    return true;
};

bool CExtKeyAccount::GetPubKey(const CEKAKey &ak, CPubKey &pkOut) const
{
    LOCK(cs_account);
    
    if (ak.nParent >= vExtKeys.size())
        return error("%s: Account key invalid parent ext key %d, account %s.", __func__, ak.nParent, GetIDString58().c_str());
    
    const CStoredExtKey *chain = GetChain(ak.nParent);
    
    if (!chain)
        return error("%s: Chain unknown, account %s.", __func__, GetIDString58().c_str());
    
    if (!chain->kp.Derive(pkOut, ak.nKey))
        return false;
    
    return true;
};

bool CExtKeyAccount::GetPubKey(const CEKASCKey &asck, CPubKey &pkOut) const
{
    LOCK(cs_account);
    
    AccStealthKeyMap::const_iterator miSk = mapStealthKeys.find(asck.idStealthKey);
    if (miSk == mapStealthKeys.end())
        return error("%s: CEKASCKey Stealth key not in this account!", __func__);
    
    
    return (0 == ExpandStealthChildPubKey(&miSk->second, asck.sShared, pkOut));
};

bool CExtKeyAccount::SaveKey(const CKeyID &id, CEKAKey &keyIn)
{
    // TODO: rename? this is taking a key from lookahead and saving it
    LOCK(cs_account);
    AccKeyMap::const_iterator mi = mapKeys.find(id);
    if (mi != mapKeys.end())
        return false; // already saved
    
    if (mapLookAhead.erase(id) != 1)
    {
        CBitcoinAddress addr(id);
        LogPrintf("Warning: SaveKey %s key not found in look ahead %s.\n", GetIDString58().c_str(), addr.ToString().c_str());
    };
    
    mapKeys[id] = keyIn;
    
    CStoredExtKey *pc;
    if ((pc = GetChain(keyIn.nParent)) != NULL)
    {
        if (keyIn.nKey == pc->nGenerated) // TODO: gaps?
            pc->nGenerated++;
        
        if (pc->nFlags & EAF_ACTIVE
            && pc->nFlags & EAF_RECEIVE_ON)
            AddLookAhead(keyIn.nParent, 1);
    };
    
    if (fDebug)
    {
        CBitcoinAddress addr(id);
        LogPrintf("Saved key %s, %s.\n", GetIDString58().c_str(), addr.ToString().c_str());
        
        // - check match
        CStoredExtKey *pa;
        if ((pa = GetChain(keyIn.nParent)) != NULL)
        {
            if ((keyIn.nKey >> 31) == 1
                && pa->fLocked == 1)
            {
                LogPrintf("Can't check hardened key when wallet locked.\n");
                return true;
            };
            
            CPubKey pk;
            if (!GetPubKey(keyIn, pk))
                return error("GetPubKey failed.");
            
            if (pk.GetID() != id)
                return error("Key mismatch!!!");
            
            LogPrintf("key match verified.\n");
        } else
        {
            return error("Unknown chain.");
        };
    };
    
    return true;
};

bool CExtKeyAccount::SaveKey(const CKeyID &id, CEKASCKey &keyIn)
{
    LOCK(cs_account);
    AccKeySCMap::const_iterator mi = mapStealthChildKeys.find(id);
    if (mi != mapStealthChildKeys.end())
        return false; // already saved
    
    AccStealthKeyMap::const_iterator miSk = mapStealthKeys.find(keyIn.idStealthKey);
    if (miSk == mapStealthKeys.end())
        return error("SaveKey(): CEKASCKey Stealth key not in this account!");
    
    mapStealthChildKeys[id] = keyIn;
    
    if (fDebug)
    {
        CBitcoinAddress addr(id);
        LogPrintf("SaveKey(): CEKASCKey %s, %s.\n", GetIDString58().c_str(), addr.ToString().c_str());
    };
    
    return true;
};

bool CExtKeyAccount::IsLocked(const CEKAStealthKey &aks)
{
    // TODO: check aks belongs to account??
    
    CStoredExtKey *pc = GetChain(aks.akSpend.nParent);
    if (pc && !pc->fLocked)
        return false;
    return true;
};

int CExtKeyAccount::AddLookAhead(uint32_t nChain, uint32_t nKeys)
{
    // -- start from key 0
    CStoredExtKey *pc = GetChain(nChain);
    if (!pc)
        return errorN(1, "%s: Unknown chain, %d.", __func__, nChain);
    
    if (fDebug)
        LogPrintf("%s: chain %s, keys %d.\n", __func__, pc->GetIDString58(), nKeys);
    
    AccKeyMap::const_iterator mi;
    uint32_t nChild = pc->nGenerated;
    uint32_t nChildOut = nChild;
    
    CKeyID keyId;
    CPubKey pk;
    for (uint32_t k = 0; k < nKeys; ++k)
    {
        bool fGotKey = false;
        for (uint32_t i = 0; i < MAX_DERIVE_TRIES; ++i) // MAX_DERIVE_TRIES > lookahead pool
        {
            if (pc->DeriveKey(pk, nChild, nChildOut, false) != 0)
            {
                LogPrintf("%s: DeriveKey failed, chain %d, child %d.\n", __func__, nChain, nChild);
                nChild = nChildOut+1;
                continue;
            };
            nChild = nChildOut+1;
            
            keyId = pk.GetID();
            if ((mi = mapKeys.find(keyId)) != mapKeys.end())
            {
                if (fDebug)
                {
                    CBitcoinAddress addr(keyId);
                    LogPrintf("%s: key exists in map skipping %s.\n", __func__, addr.ToString().c_str());
                };
                continue;
            };
            fGotKey = true;
            break;
        };
        
        if (!fGotKey)
        {
            LogPrintf("%s: DeriveKey loop failed, chain %d, child %d.\n", __func__, nChain, nChild);
            continue;
        };
        
        mapLookAhead[keyId] = CEKAKey(nChain, nChildOut);
        
        if (fDebug)
        {
            CBitcoinAddress addr(keyId);
            LogPrintf("%s: added %s\n", __func__, addr.ToString().c_str());
        };
    };
    
    return 0;
};

int CExtKeyAccount::ExpandStealthChildKey(const CEKAStealthKey *aks, const ec_secret &sShared, CKey &kOut) const
{
    // - derive the secret key of the stealth address and then the secret key out
    
    LOCK(cs_account);
    
    if (!aks)
        return errorN(1, "%s: Sanity checks failed.", __func__);
    
    CKey kSpend;
    if (!GetKey(aks->akSpend, kSpend))
        return errorN(1, "%s: GetKey() failed.", __func__);
    
    ec_secret sSpendR;
    ec_secret sSpend;
    
    memcpy(&sSpend.e[0], kSpend.begin(), EC_SECRET_SIZE);
    
    if (StealthSharedToSecretSpend(sShared, sSpend, sSpendR) != 0)
        return errorN(1, "%s: StealthSharedToSecretSpend() failed.", __func__);
    
    kOut.Set(&sSpendR.e[0], true);
    
    if (!kOut.IsValid())
        return errorN(1, "%s: Invalid key.", __func__);
    return 0;
};

int CExtKeyAccount::ExpandStealthChildPubKey(const CEKAStealthKey *aks, const ec_secret &sShared, CPubKey &pkOut) const
{
    // - works with locked wallet
    
    LOCK(cs_account);
    
    if (!aks)
        return errorN(1, "%s: Sanity checks failed.", __func__);
    
    ec_point pkExtract;
    
    if (StealthSharedToPublicKey(aks->pkSpend, sShared, pkExtract) != 0)
        return errorN(1, "%s: StealthSharedToPublicKey() failed.", __func__);
    
    pkOut = CPubKey(pkExtract);
    
    if (!pkOut.IsValid())
        return errorN(1, "%s: Invalid public key.", __func__);
    
    return 0;
};

int CExtKeyAccount::WipeEncryption()
{
    std::vector<CStoredExtKey*>::iterator it;
    for (it = vExtKeys.begin(); it != vExtKeys.end(); ++it)
    {
        if (!((*it)->nFlags & EAF_IS_CRYPTED))
            continue;
        
        if ((*it)->fLocked)
            return errorN(1, "Attempting to undo encryption of a locked key.");
        
        (*it)->nFlags &= ~EAF_IS_CRYPTED;
        (*it)->vchCryptedSecret.clear();
    };
    
    return 0;
};

bool IsBIP32(const char *base58)
{
    std::vector<uint8_t> vchBytes;
    if (!DecodeBase58(base58, vchBytes))
        return false;
    
    if (vchBytes.size() != BIP32_KEY_LEN)
        return false;
    
    if (0 == memcmp(&vchBytes[0], &Params().Base58Prefix(CChainParams::EXT_SECRET_KEY)[0], 4)
        || 0 == memcmp(&vchBytes[0], &Params().Base58Prefix(CChainParams::EXT_PUBLIC_KEY)[0], 4))
        return true;
    
    if (!VerifyChecksum(vchBytes))
        return false;
    
    return false;
};


int LoopExtKeysInDB(bool fInactive, bool fInAccount, LoopExtKeyCallback &callback)
{
    AssertLockHeld(pwalletMain->cs_wallet);
    
    CWalletDB wdb(pwalletMain->strWalletFile);
    
    Dbc *pcursor;
    if (!(pcursor = wdb.GetAtCursor()))
        throw std::runtime_error(strprintf("%s : cannot create DB cursor", __func__).c_str());
    
    CDataStream ssKey(SER_DISK, CLIENT_VERSION);
    CDataStream ssValue(SER_DISK, CLIENT_VERSION);
    
    CKeyID ckeyId;
    CStoredExtKey sek;
    std::string strType;
    
    uint32_t fFlags = DB_SET_RANGE;
    ssKey << std::string("ek32");
    
    while (wdb.ReadAtCursor(pcursor, ssKey, ssValue, fFlags) == 0)
    {
        fFlags = DB_NEXT;
        
        ssKey >> strType;
        if (strType != "ek32")
            break;
        
        ssKey >> ckeyId;
        ssValue >> sek;
        
        if (!fInAccount
            && sek.nFlags & EAF_IN_ACCOUNT)
            continue;
        
        callback.ProcessKey(ckeyId, sek);
    };
    
    pcursor->close();
    
    return 0;
};

int LoopExtAccountsInDB(bool fInactive, LoopExtKeyCallback &callback)
{
    AssertLockHeld(pwalletMain->cs_wallet);
    CWalletDB wdb(pwalletMain->strWalletFile);
    // - list accounts
    
    Dbc *pcursor;
    if (!(pcursor = wdb.GetAtCursor()))
        throw std::runtime_error(strprintf("%s : cannot create DB cursor", __func__).c_str());
    
    CDataStream ssKey(SER_DISK, CLIENT_VERSION);
    CDataStream ssValue(SER_DISK, CLIENT_VERSION);
    CKeyID idAccount;
    CExtKeyAccount sea;
    CBitcoinAddress addr;
    std::string strType, sError;
    
    uint32_t fFlags = DB_SET_RANGE;
    ssKey << std::string("eacc");
    
    while (wdb.ReadAtCursor(pcursor, ssKey, ssValue, fFlags) == 0)
    {
        fFlags = DB_NEXT;
        
        ssKey >> strType;
        if (strType != "eacc")
            break;
        
        ssKey >> idAccount;
        ssValue >> sea;
        
        sea.vExtKeys.resize(sea.vExtKeyIDs.size());
        for (size_t i = 0; i < sea.vExtKeyIDs.size(); ++i)
        {
            CKeyID &id = sea.vExtKeyIDs[i];
            CStoredExtKey *sek = new CStoredExtKey();
            
            if (wdb.ReadExtKey(id, *sek))
            {
                sea.vExtKeys[i] = sek;
            } else
            {
                addr.Set(idAccount, CChainParams::EXT_ACC_HASH);
                LogPrintf("WARNING: Could not read key %d of account %s\n", i, addr.ToString().c_str());
                sea.vExtKeys[i] = NULL;
                delete sek;
            };
        };
        callback.ProcessAccount(idAccount, sea);
        
        sea.FreeChains();
    };
    
    pcursor->close();
    
    return 0;
};



static int GetWord(int o, const char *pwl, int max, std::string &sWord)
{
    char *pt = (char*)pwl;
    while (o > 0)
    {
        if (*pt == '\n')
            o--;
        pt++;
        
        if (pt >= pwl+max)
            return 1;
    };
    
    while (pt < (pwl+max))
    {
        if (*pt == '\n')
            return 0;
        sWord += *pt;
        pt++;
    };
    
    return 1;
};

int GetWordOffset(const char *p, const char *pwl, int max, int &o)
{
    // - list must end with \n
    char *pt = (char*)pwl;
    int l = strlen(p);
    int i = 0;
    int c = 0;
    int f = 1;
    while (pt < (pwl+max))
    {
        if (*pt == '\n')
        {
            if (f && c == l) // found
            {
                o = i;
                return 0;
            };
            i++;
            c = 0;
            f = 1;
        } else
        {
            if (c >= l)
                f = 0;
            else
            if (f && *(p+c) != *pt)
                f = 0;
            c++;
        };
        pt++;
    };
    
    return 1;
};

static const unsigned char *mnLanguages[] =
{
    NULL,
    english_txt,
    french_txt,
    japanese_txt,
    spanish_txt,
    chinese_simplified_txt,
    chinese_traditional_txt,
};

static const uint32_t mnLanguageLens[] =
{
    0,
    english_txt_len,
    french_txt_len,
    japanese_txt_len,
    spanish_txt_len,
    chinese_simplified_txt_len,
    chinese_traditional_txt_len,
};

int MnemonicDetectLanguage(const std::string &sWordList)
{
    char tmp[2048];
    if (sWordList.size() >= 2048)
        return errorN(-1, "%s: Word List too long.", __func__);
    
    // try to detect the language
    // try max 4 words
    // allow errors to account for spelling mistakes
    for (int l = 1; l < WLL_MAX; ++l)
    {
        strcpy(tmp, sWordList.c_str());
        
        char *pwl = (char*) mnLanguages[l];
        int m = mnLanguageLens[l];
        
        int maxTries = 4;
        int nHit = 0;
        int nMiss = 0;
        char *p;
        p = strtok(tmp, " ");
        while (p != NULL)
        {
            int ofs;
            if (0 == GetWordOffset(p, pwl, m, ofs))
                nHit++;
            else
                nMiss++;
            
            if (!maxTries--)
                break;
            p = strtok(NULL, " ");
        };
        
        if (nHit > nMiss)
            return l;
    };
    
    return 0;
};

int MnemonicEncode(int nLanguage, const std::vector<uint8_t> &vEntropy, std::string &sWordList, std::string &sError)
{
    if (fDebug)
        LogPrintf("%s: language %d.\n", __func__, nLanguage);
    
    if (nLanguage < 1 || nLanguage > WLL_MAX)
    {
        sError = "Unknown language.";
        return errorN(1, "%s: %s", __func__, sError.c_str());
    };
    
    // -- checksum is 1st n bytes of the sha256 hash
    uint8_t hash[32];
    SHA256(&vEntropy[0], vEntropy.size(), (uint8_t*)hash);
    
    int nCsSize = vEntropy.size() / 4; // 32 / 8
    
    if (nCsSize < 1 || nCsSize > 256)
    {
        sError = "Entropy bytes out of range.";
        return errorN(2, "%s: %s", __func__, sError.c_str());
    };
    
    std::vector<uint8_t> vIn = vEntropy;
    
    int ncb = nCsSize/8;
    int r = nCsSize % 8;
    if (r != 0)
        ncb++;
    std::vector<uint8_t> vTmp(32);
    memcpy(&vTmp[0], &hash, ncb);
    memset(&vTmp[ncb], 0, 32-ncb);
    
    vIn.insert(vIn.end(), vTmp.begin(), vTmp.end());
    
    std::vector<int> vWord;
    
    int nBits = vEntropy.size() * 8 + nCsSize;
    
    int i = 0;
    while (i < nBits)
    {
        int o = 0;
        int s = i / 8;
        int r = i % 8;
        
        uint8_t b1 = vIn[s];
        uint8_t b2 = vIn[s+1];
        
        o = (b1 << r) & 0xFF;
        o = o << (11 - 8);
        
        if (r > 5)
        {
            uint8_t b3 = vIn[s+2];
            o |= (b2 << (r-5));
            o |= (b3 >> (8-(r-5)));
        } else
        {
            o |= ((int)b2) >> ((8 - (11 - 8))-r);
        };
        
        o = o & 0x7FF;
        
        vWord.push_back(o);
        i += 11;
    };
    
    char *pwl = (char*) mnLanguages[nLanguage];
    int m = mnLanguageLens[nLanguage];
    
    for (size_t k = 0; k < vWord.size(); ++k)
    {
        int o = vWord[k];
        
        std::string sWord;
        
        if (0 != GetWord(o, pwl, m, sWord))
        {
            sError = strprintf("Word extract failed %d.", o);
            return errorN(3, "%s: %s", __func__, sError.c_str());
        };
         
        if (sWordList != "")
            sWordList += " ";
        sWordList += sWord;
    };
    
    if (nLanguage == WLL_JAPANESE)
        ReplaceStrInPlace(sWordList, " ", "\u3000");
    
    return 0;
};

int MnemonicDecode(int nLanguage, const std::string &sWordListIn, std::vector<uint8_t> &vEntropy, std::string &sError, bool fIgnoreChecksum)
{
    if (fDebug)
        LogPrintf("%s: Language %d.\n", __func__, nLanguage);
    
    std::string sWordList = sWordListIn;
    ReplaceStrInPlace(sWordList, "\u3000", " ");
    
    if (nLanguage == -1)
        nLanguage = MnemonicDetectLanguage(sWordList);
    
    if (nLanguage < 1 || nLanguage > WLL_MAX)
    {
        sError = "Unknown language.";
        return errorN(1, "%s: %s", __func__, sError.c_str());
    };
    
    char tmp[2048];
    if (sWordList.size() >= 2048)
    {
        sError = "Word List too long.";
        return errorN(2, "%s: %s", __func__, sError.c_str());
    };
    
    strcpy(tmp, sWordList.c_str());
    
    char *pwl = (char*) mnLanguages[nLanguage];
    int m = mnLanguageLens[nLanguage];
    
    std::vector<int> vWordInts;
    
    char *p;
    p = strtok(tmp, " ");
    while (p != NULL)
    {
        int ofs;
        if (0 != GetWordOffset(p, pwl, m, ofs))
        {
            sError = strprintf("Unknown word: %s", p);
            return errorN(3, "%s: %s", __func__, sError.c_str());
        };
        
        vWordInts.push_back(ofs);
        
        p = strtok(NULL, " ");
    };
    
    if (!fIgnoreChecksum
        && vWordInts.size() % 3 != 0)
    {
        sError = "No. of words must be divisible by 3.";
        return errorN(4, "%s: %s", __func__, sError.c_str());
    };
    
    int nBits = vWordInts.size() * 11;
    int nBytes = nBits/8 + (nBits % 8 == 0 ? 0 : 1);
    vEntropy.resize(nBytes);
    
    memset(&vEntropy[0], 0, nBytes);
    
    int i = 0;
    size_t wl = vWordInts.size();
    size_t el = vEntropy.size();
    for (size_t k = 0; k < wl; ++k)
    {
        int o = vWordInts[k];
        
        int s = i / 8;
        int r = i % 8;
        
        vEntropy[s] |= (o >> (r+3)) & 0x7FF;
        
        if (s < (int)el-1)
        {
            if (r > 5)
            {
                vEntropy[s+1] |= ((o >> (r-5))) & 0x7FF;
                if (s < (int)el-2)
                {
                    vEntropy[s+2] |= (o << (8-(r-5))) & 0x7FF;
                };
            } else
            {
                vEntropy[s+1] |= (o << (5-r)) & 0x7FF;
            };
        };
        i += 11;
    };
    
    if (fIgnoreChecksum)
        return 0;
    
    // -- checksum
    int nLenChecksum = nBits / 32;
    int nLenEntropy = nBits - nLenChecksum;
    
    int nBytesEntropy = nLenEntropy / 8;
    int nBytesChecksum = nLenChecksum / 8 + (nLenChecksum % 8 == 0 ? 0 : 1);
    
    std::vector<uint8_t> vCS;
    
    vCS.resize(nBytesChecksum);
    memcpy(&vCS[0], &vEntropy[nBytesEntropy], nBytesChecksum);
    
    vEntropy.resize(nBytesEntropy);
    
    uint8_t hash[32];
    SHA256(&vEntropy[0], vEntropy.size(), (uint8_t*)hash);
    
    std::vector<uint8_t> vCSTest;
    
    vCSTest.resize(nBytesChecksum);
    memcpy(&vCSTest[0], &hash, nBytesChecksum);
    
    int r = nLenChecksum % 8;
    
    if (r > 0)
        vCSTest[nBytesChecksum-1] &= (((1<<r)-1) << (8-r));
    
    if (vCSTest != vCS)
    {
        sError = "Checksum mismatch.";
        return errorN(5, "%s: %s", __func__, sError.c_str());
    };
    
    return 0;
};

int MnemonicToSeed(const std::string &sMnemonic, const std::string &sPasswordIn, std::vector<uint8_t> &vSeed)
{
    if (fDebug)
        LogPrintf("%s\n", __func__);
    
    vSeed.resize(64);
    
    std::string sWordList = sMnemonic;
    ReplaceStrInPlace(sWordList, "\u3000", " ");
    
    std::string sPassword = sPasswordIn;
    ReplaceStrInPlace(sPassword, "\u3000", " ");
    
    int nIterations = 2048;
    
    std::string sSalt = std::string("mnemonic") + sPassword;
    
    int nBytesOut = 64;
    if (1 != PKCS5_PBKDF2_HMAC(
        sWordList.data(), sWordList.size(),
        (const unsigned char*)sSalt.data(), sSalt.size(),
        nIterations, EVP_sha512(), nBytesOut, &vSeed[0]))
        return errorN(1, "%s: PKCS5_PBKDF2_HMAC failed.", __func__);
    
    return 0;
};

int MnemonicAddChecksum(int nLanguageIn, const std::string &sWordListIn, std::string &sWordListOut, std::string &sError)
{
    int nLanguage = nLanguageIn;
    if (nLanguage == -1)
        nLanguage = MnemonicDetectLanguage(sWordListIn); // needed here for MnemonicEncode, MnemonicDecode will complain if in error
    
    int rv;
    std::vector<uint8_t> vEntropy;
    if (0 != (rv = MnemonicDecode(nLanguage, sWordListIn, vEntropy, sError, true)))
        return rv;
    
    if (0 != (rv = MnemonicEncode(nLanguage, vEntropy, sWordListOut, sError)))
        return rv;
    
    if (0 != (rv = MnemonicDecode(nLanguage, sWordListOut, vEntropy, sError)))
        return rv;
    
    return 0;
};


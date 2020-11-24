// Copyright (c) 2014-2021 The Okcash developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "extkey.h"

#include "util.h"
#include "base58.h"
#include "state.h"
#include "wallet.h"

#include <stdint.h>


#include <openssl/rand.h>
#include <openssl/hmac.h>

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
        default:    return "Unknown error";
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
    {
        return 1;
    };

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
        if (keyIn.nKey == pc->nGenerated + 1) // TODO: gaps?
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
    // -- start from key 1, child key 0 is not used
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
            nChild = nChildOut+1; // 1st key is 1
            if (pc->DeriveKey(pk, nChild, nChildOut, false) != 0)
            {
                LogPrintf("%s: DeriveKey failed, chain %d, child %d.\n", __func__, nChain, nChild);
                continue;
            };

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
        if (!(*it)->nFlags & EAF_IS_CRYPTED)
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
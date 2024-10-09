// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2012 The Bitcoin Developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.


//
// Why base-58 instead of standard base-64 encoding?
// - Don't want 0OIl characters that look the same in some fonts and
//      could be used to create visually identical looking account numbers.
// - A string with non-alphanumeric characters is not as easily accepted as an account number.
// - E-mail usually won't line-break if there's no punctuation to break at.
// - Double-clicking selects the whole number as one word if it's all alphanumeric.
//
#ifndef BITCOIN_BASE58_H
#define BITCOIN_BASE58_H

#include <string>
#include <vector>

#include "chainparams.h"
#include "bignum.h"
#include "key.h"
#include "extkey.h"
#include "script.h"
#include "allocators.h"
#include "util.h"

static const char* pszBase58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// Encode a byte sequence as a base58-encoded string
inline std::string EncodeBase58(const unsigned char* pbegin, const unsigned char* pend)
{
    CAutoBN_CTX pctx;
    CBigNum bn58 = 58;
    CBigNum bn0 = 0;

    // Convert big endian data to little endian
    // Extra zero at the end make sure bignum will interpret as a positive number
    std::vector<unsigned char> vchTmp(pend-pbegin+1, 0);
    reverse_copy(pbegin, pend, vchTmp.begin());

    // Convert little endian data to bignum
    CBigNum bn;
    bn.setvch(vchTmp);

    // Convert bignum to std::string
    std::string str;
    // Expected size increase from base58 conversion is approximately 137%
    // use 138% to be safe
    str.reserve((pend - pbegin) * 138 / 100 + 1);
    CBigNum dv;
    CBigNum rem;
    while (bn > bn0)
    {
        if (!BN_div(&dv, &rem, &bn, &bn58, pctx))
            throw bignum_error("EncodeBase58 : BN_div failed");
        bn = dv;
        unsigned int c = rem.getulong();
        str += pszBase58[c];
    }

    // Leading zeroes encoded as base58 zeros
    for (const unsigned char* p = pbegin; p < pend && *p == 0; p++)
        str += pszBase58[0];

    // Convert little endian std::string to big endian
    reverse(str.begin(), str.end());
    return str;
}

// Encode a byte vector as a base58-encoded string
inline std::string EncodeBase58(const std::vector<unsigned char>& vch)
{
    return EncodeBase58(&vch[0], &vch[0] + vch.size());
}

// Decode a base58-encoded string psz into byte vector vchRet
// returns true if decoding is successful
inline bool DecodeBase58(const char* psz, std::vector<unsigned char>& vchRet)
{
    CAutoBN_CTX pctx;
    vchRet.clear();
    CBigNum bn58 = 58;
    CBigNum bn = 0;
    CBigNum bnChar;
    while (isspace(*psz))
        psz++;

    // Convert big endian string to bignum
    for (const char* p = psz; *p; p++)
    {
        const char* p1 = strchr(pszBase58, *p);
        if (p1 == NULL)
        {
            while (isspace(*p))
                p++;
            if (*p != '\0')
                return false;
            break;
        }
        bnChar.setulong(p1 - pszBase58);
        if (!BN_mul(&bn, &bn, &bn58, pctx))
            throw bignum_error("DecodeBase58 : BN_mul failed");
        bn += bnChar;
    }

    // Get bignum as little endian data
    std::vector<unsigned char> vchTmp = bn.getvch();

    // Trim off sign byte if present
    if (vchTmp.size() >= 2 && vchTmp.end()[-1] == 0 && vchTmp.end()[-2] >= 0x80)
        vchTmp.erase(vchTmp.end()-1);

    // Restore leading zeros
    int nLeadingZeros = 0;
    for (const char* p = psz; *p == pszBase58[0]; p++)
        nLeadingZeros++;
    vchRet.assign(nLeadingZeros + vchTmp.size(), 0);

    // Convert little endian data to big endian
    reverse_copy(vchTmp.begin(), vchTmp.end(), vchRet.end() - vchTmp.size());
    return true;
}

// Decode a base58-encoded string str into byte vector vchRet
// returns true if decoding is successful
inline bool DecodeBase58(const std::string& str, std::vector<unsigned char>& vchRet)
{
    return DecodeBase58(str.c_str(), vchRet);
}




// Encode a byte vector to a base58-encoded string, including checksum
inline std::string EncodeBase58Check(const std::vector<unsigned char>& vchIn)
{
    // add 4-byte hash check to the end
    std::vector<unsigned char> vch(vchIn);
    uint256 hash = Hash(vch.begin(), vch.end());
    vch.insert(vch.end(), (unsigned char*)&hash, (unsigned char*)&hash + 4);
    return EncodeBase58(vch);
}

// Decode a base58-encoded string psz that includes a checksum, into byte vector vchRet
// returns true if decoding is successful
inline bool DecodeBase58Check(const char* psz, std::vector<unsigned char>& vchRet)
{
    if (!DecodeBase58(psz, vchRet))
        return false;
    if (vchRet.size() < 4)
    {
        vchRet.clear();
        return false;
    }
    uint256 hash = Hash(vchRet.begin(), vchRet.end()-4);
    if (memcmp(&hash, &vchRet.end()[-4], 4) != 0)
    {
        vchRet.clear();
        return false;
    }
    vchRet.resize(vchRet.size()-4);
    return true;
}

// Decode a base58-encoded string str that includes a checksum, into byte vector vchRet
// returns true if decoding is successful
inline bool DecodeBase58Check(const std::string& str, std::vector<unsigned char>& vchRet)
{
    return DecodeBase58Check(str.c_str(), vchRet);
}





/** Base class for all base58-encoded data */
class CBase58Data
{
protected:
    // the version byte(s)
    std::vector<unsigned char> vchVersion;

    // the actually encoded data
    typedef std::vector<unsigned char, zero_after_free_allocator<unsigned char> > vector_uchar;
    vector_uchar vchData;

    CBase58Data()
    {
        vchVersion.clear();
        vchData.clear();
    }

    void SetData(const std::vector<unsigned char> &vchVersionIn, const void* pdata, size_t nSize)
    {
        vchVersion = vchVersionIn;
        vchData.resize(nSize);
        if (!vchData.empty())
            memcpy(&vchData[0], pdata, nSize);
    }

    void SetData(const std::vector<unsigned char> &vchVersionIn, const unsigned char *pbegin, const unsigned char *pend)
    {
        SetData(vchVersionIn, (void*)pbegin, pend - pbegin);
    }

public:
    bool SetString(const char* psz, unsigned int nVersionBytes = 1)
    {
        std::vector<unsigned char> vchTemp;
        DecodeBase58Check(psz, vchTemp);
        
        if (vchTemp.size() == BIP32_KEY_N_BYTES + 4) // no point checking smaller keys
        {
            if (0 == memcmp(&vchTemp[0], &Params().Base58Prefix(CChainParams::EXT_PUBLIC_KEY)[0], 4))
                nVersionBytes = 4;
            else
            if (0 == memcmp(&vchTemp[0], &Params().Base58Prefix(CChainParams::EXT_SECRET_KEY)[0], 4))
            {
                // - never display secret in a CBitcoinAddress
                
                // - length already checked
                vchVersion = Params().Base58Prefix(CChainParams::EXT_PUBLIC_KEY);
                CExtKeyPair ekp;
                ekp.DecodeV(&vchTemp[4]);
                vchData.resize(74);
                ekp.EncodeP(&vchData[0]);
                OPENSSL_cleanse(&vchTemp[0], vchData.size());
                return true;
            };
        };
        
        if (vchTemp.size() < nVersionBytes)
        {
            vchData.clear();
            vchVersion.clear();
            return false;
        };
        
        vchVersion.assign(vchTemp.begin(), vchTemp.begin() + nVersionBytes);
        vchData.resize(vchTemp.size() - nVersionBytes);
        if (!vchData.empty())
            memcpy(&vchData[0], &vchTemp[nVersionBytes], vchData.size());
        OPENSSL_cleanse(&vchTemp[0], vchData.size());
        return true;
    }

    bool SetString(const std::string& str)
    {
        return SetString(str.c_str());
    }

    std::string ToString() const
    {
        std::vector<unsigned char> vch = vchVersion;
        vch.insert(vch.end(), vchData.begin(), vchData.end());
        return EncodeBase58Check(vch);
    }

    int CompareTo(const CBase58Data& b58) const
    {
        if (vchVersion < b58.vchVersion) return -1;
        if (vchVersion > b58.vchVersion) return  1;
        if (vchData < b58.vchData)   return -1;
        if (vchData > b58.vchData)   return  1;
        return 0;
    }

    bool operator==(const CBase58Data& b58) const { return CompareTo(b58) == 0; }
    bool operator<=(const CBase58Data& b58) const { return CompareTo(b58) <= 0; }
    bool operator>=(const CBase58Data& b58) const { return CompareTo(b58) >= 0; }
    bool operator< (const CBase58Data& b58) const { return CompareTo(b58) <  0; }
    bool operator> (const CBase58Data& b58) const { return CompareTo(b58) >  0; }
};

/** base58-encoded addresses.
 * Public-key-hash-addresses have version 25 (or 111 testnet).
 * The data vector contains RIPEMD160(SHA256(pubkey)), where pubkey is the serialized public key.
 * Script-hash-addresses have version 85 (or 196 testnet).
 * The data vector contains RIPEMD160(SHA256(cscript)), where cscript is the serialized redemption script.
 */
class CBitcoinAddress;
class CBitcoinAddressVisitor : public boost::static_visitor<bool>
{
private:
    CBitcoinAddress *addr;
public:
    CBitcoinAddressVisitor(CBitcoinAddress *addrIn) : addr(addrIn) { }
    bool operator()(const CKeyID &id) const;
    bool operator()(const CScriptID &id) const;
    bool operator()(const CStealthAddress &sxAddr) const;
    bool operator()(const CExtKeyPair &ek) const;
    bool operator()(const CNoDestination &no) const;
};

class CBitcoinAddress : public CBase58Data
{
public:
    bool Set(const CKeyID &id)
    {
        SetData(Params().Base58Prefix(CChainParams::PUBKEY_ADDRESS), &id, 20);
        return true;
    }

    bool Set(const CScriptID &id)
    {
        SetData(Params().Base58Prefix(CChainParams::SCRIPT_ADDRESS), &id, 20);
        return true;
    }
    
    bool Set(const CKeyID &id, CChainParams::Base58Type prefix)
    {
        SetData(Params().Base58Prefix(prefix), &id, 20);
        return true;
    }
    
    bool Set(const CExtKeyPair &ek)
    {
        std::vector<unsigned char> vchVersion;
        uint8_t data[74];
        
        // - use public key only, should never be a need to reveal the secret in an address
        
        /*
        if (ek.IsValidV())
        {
            vchVersion = Params().Base58Prefix(CChainParams::EXT_SECRET_KEY);
            ek.EncodeV(data);
        } else
        */
        
        vchVersion = Params().Base58Prefix(CChainParams::EXT_PUBLIC_KEY);
        ek.EncodeP(data);
        
        SetData(vchVersion, data, 74);
        return true;
    };

    bool Set(const CTxDestination &dest)
    {
        return boost::apply_visitor(CBitcoinAddressVisitor(this), dest);
    }

    bool IsValid() const
    {
        if (vchVersion.size() == 4 
            && (vchVersion == Params().Base58Prefix(CChainParams::EXT_PUBLIC_KEY)
                || vchVersion == Params().Base58Prefix(CChainParams::EXT_SECRET_KEY)))
            return vchData.size() == BIP32_KEY_N_BYTES;
        
        bool fCorrectSize = vchData.size() == 20;
        bool fKnownVersion = vchVersion == Params().Base58Prefix(CChainParams::PUBKEY_ADDRESS) ||
                             vchVersion == Params().Base58Prefix(CChainParams::SCRIPT_ADDRESS);
        return fCorrectSize && fKnownVersion;
    }
    
    bool IsValid(CChainParams::Base58Type prefix) const
    {
        bool fKnownVersion = vchVersion == Params().Base58Prefix(prefix);
        if (prefix == CChainParams::EXT_PUBLIC_KEY
            || prefix == CChainParams::EXT_SECRET_KEY)
            return fKnownVersion && vchData.size() == BIP32_KEY_N_BYTES;
        
        bool fCorrectSize = vchData.size() == 20;
        return fCorrectSize && fKnownVersion;
    }
    
    bool IsBIP32() const
    {
        return vchVersion == Params().Base58Prefix(CChainParams::EXT_SECRET_KEY)
            || vchVersion == Params().Base58Prefix(CChainParams::EXT_PUBLIC_KEY);
    }

    CBitcoinAddress()
    {
    }

    CBitcoinAddress(const CTxDestination &dest)
    {
        Set(dest);
    }

    CBitcoinAddress(const std::string& strAddress)
    {
        // NOTE: SetString checks Params(), Params() must be initialised before
        SetString(strAddress);
    }

    CBitcoinAddress(const char* pszAddress)
    {
        SetString(pszAddress);
    }

    CTxDestination Get() const {
        if (!IsValid())
            return CNoDestination();
        
        uint160 id;
        if (vchVersion == Params().Base58Prefix(CChainParams::PUBKEY_ADDRESS))
        {
            memcpy(&id, &vchData[0], 20);
            return CKeyID(id);
        } else 
        if (vchVersion == Params().Base58Prefix(CChainParams::SCRIPT_ADDRESS))
        {
            memcpy(&id, &vchData[0], 20);
            return CScriptID(id);
        } else
        if (vchVersion == Params().Base58Prefix(CChainParams::EXT_SECRET_KEY))
        {
            CExtKeyPair kp;
            kp.DecodeV(&vchData[0]);
            return kp;
        } else
        if (vchVersion == Params().Base58Prefix(CChainParams::EXT_PUBLIC_KEY))
        {
            CExtKeyPair kp;
            kp.DecodeP(&vchData[0]);
            return kp;
        } else
        {
            return CNoDestination();
        };
    }

    bool GetKeyID(CKeyID &keyID) const {
        if (!IsValid() || vchVersion != Params().Base58Prefix(CChainParams::PUBKEY_ADDRESS))
            return false;
        uint160 id;
        memcpy(&id, &vchData[0], 20);
        keyID = CKeyID(id);
        return true;
    }
    
    bool GetKeyID(CKeyID &keyID, CChainParams::Base58Type prefix) const {
        if (!IsValid(prefix))
            return false;
        uint160 id;
        memcpy(&id, &vchData[0], 20);
        keyID = CKeyID(id);
        return true;
    }

    bool IsScript() const {
        return IsValid() && vchVersion == Params().Base58Prefix(CChainParams::SCRIPT_ADDRESS);
    }
};

bool inline CBitcoinAddressVisitor::operator()(const CKeyID &id) const                  { return addr->Set(id); }
bool inline CBitcoinAddressVisitor::operator()(const CScriptID &id) const               { return addr->Set(id); }
bool inline CBitcoinAddressVisitor::operator()(const CStealthAddress &sxAddr) const     { return false; }
bool inline CBitcoinAddressVisitor::operator()(const CExtKeyPair &ek) const             { return addr->Set(ek); }
bool inline CBitcoinAddressVisitor::operator()(const CNoDestination &id) const          { return false; }

/** A base58-encoded secret key */
class CBitcoinSecret : public CBase58Data
{
public:
    void SetKey(const CKey& vchSecret)
    {
        assert(vchSecret.IsValid());
        SetData(Params().Base58Prefix(CChainParams::SECRET_KEY), vchSecret.begin(), vchSecret.size());
        if (vchSecret.IsCompressed())
            vchData.push_back(1);
    }

    CKey GetKey()
    {
        CKey ret;
        ret.Set(&vchData[0], &vchData[32], vchData.size() > 32 && vchData[32] == 1);
        return ret;
    }

    bool IsValid() const
    {
        bool fExpectedFormat = vchData.size() == 32 || (vchData.size() == 33 && vchData[32] == 1);
        bool fCorrectVersion = vchVersion == Params().Base58Prefix(CChainParams::SECRET_KEY);
        return fExpectedFormat && fCorrectVersion;
    }

    bool SetString(const char* pszSecret)
    {
        return CBase58Data::SetString(pszSecret) && IsValid();
    }

    bool SetString(const std::string& strSecret)
    {
        return SetString(strSecret.c_str());
    }

    CBitcoinSecret(const CKey& vchSecret)
    {
        SetKey(vchSecret);
    }

    CBitcoinSecret()
    {
    }
};


template<typename K, int Size, CChainParams::Base58Type Type> class CBitcoinExtKeyBase : public CBase58Data
{
public:
    void SetKey(const K &key) {
        unsigned char vch[Size];
        key.Encode(vch);
        SetData(Params().Base58Prefix(Type), vch, vch+Size);
    }
    
    void SetVch(const uint8_t *vch) {
        SetData(Params().Base58Prefix(Type), vch, vch+Size);
    }

    K GetKey() {
        K ret;
        //ret.Decode(&vchData[0], &vchData[Size]);
        ret.Decode(&vchData[0]);
        return ret;
    }

    CBitcoinExtKeyBase(const K &key) {
        SetKey(key);
    }
    
    int Set58(const char *base58)
    {
        std::vector<uint8_t> vchBytes;
        if (!DecodeBase58(base58, vchBytes))
            return 1;
        
        if (vchBytes.size() != BIP32_KEY_LEN)
            return 2;
        
        if (!VerifyChecksum(vchBytes))
            return 3;
        
        if (0 != memcmp(&vchBytes[0], &Params().Base58Prefix(Type)[0], 4))
            return 4;
        
        SetData(Params().Base58Prefix(Type), &vchBytes[4], &vchBytes[4]+Size);
        return 0;
    }

    CBitcoinExtKeyBase() {}
};

typedef CBitcoinExtKeyBase<CExtKey, 74, CChainParams::EXT_SECRET_KEY> CBitcoinExtKey;
typedef CBitcoinExtKeyBase<CExtPubKey, 74, CChainParams::EXT_PUBLIC_KEY> CBitcoinExtPubKey;


class CExtKey58 : public CBase58Data
{
public:
    CExtKey58() {};
    
    CExtKey58(const CExtKeyPair &key, CChainParams::Base58Type type)
    {
        SetKey(key, type);
    };
    
    void SetKeyV(const CExtKeyPair &key)
    {
        SetKey(key, CChainParams::EXT_SECRET_KEY);
    };
    
    void SetKeyP(const CExtKeyPair &key)
    {
        SetKey(key, CChainParams::EXT_PUBLIC_KEY);
    };
    
    void SetKey(const CExtKeyPair &key, CChainParams::Base58Type type)
    {
        uint8_t vch[74];
        
        switch (type)
        {
            case CChainParams::EXT_SECRET_KEY:
            case CChainParams::EXT_SECRET_KEY_BTC:
                key.EncodeV(vch);
                break;
            //case CChainParams::EXT_PUBLIC_KEY:
            //case CChainParams::EXT_PUBLIC_KEY_BTC:
            default:
                key.EncodeP(vch);
                break;
        };
        
        SetData(Params().Base58Prefix(type), vch, vch+74);
    };
    
    CExtKeyPair GetKey()
    {
        CExtKeyPair ret;
        if (vchVersion == Params().Base58Prefix(CChainParams::EXT_SECRET_KEY)
            || vchVersion == Params().Base58Prefix(CChainParams::EXT_SECRET_KEY_BTC))
        {
            ret.DecodeV(&vchData[0]);
            return ret;
        };
        ret.DecodeP(&vchData[0]);
        return ret;
    };
    
    int Set58(const char *base58)
    {
        std::vector<uint8_t> vchBytes;
        if (!DecodeBase58(base58, vchBytes))
            return 1;
        
        if (vchBytes.size() != BIP32_KEY_LEN)
            return 2;
        
        if (!VerifyChecksum(vchBytes))
            return 3;
        
        CChainParams::Base58Type type;
        if (0 == memcmp(&vchBytes[0], &Params().Base58Prefix(CChainParams::EXT_SECRET_KEY)[0], 4))
            type = CChainParams::EXT_SECRET_KEY;
        else
        if (0 == memcmp(&vchBytes[0], &Params().Base58Prefix(CChainParams::EXT_PUBLIC_KEY)[0], 4))
            type = CChainParams::EXT_PUBLIC_KEY;
        else
        if (0 == memcmp(&vchBytes[0], &Params().Base58Prefix(CChainParams::EXT_SECRET_KEY_BTC)[0], 4))
            type = CChainParams::EXT_SECRET_KEY_BTC;
        else
        if (0 == memcmp(&vchBytes[0], &Params().Base58Prefix(CChainParams::EXT_PUBLIC_KEY_BTC)[0], 4))
            type = CChainParams::EXT_PUBLIC_KEY_BTC;
        else
            return 4;
        
        SetData(Params().Base58Prefix(type), &vchBytes[4], &vchBytes[4]+74);
        return 0;
    };
    
    bool IsValid(CChainParams::Base58Type prefix) const
    {
        return vchVersion == Params().Base58Prefix(prefix)
            && vchData.size() == BIP32_KEY_N_BYTES;
    }
};

#endif // BITCOIN_BASE58_H

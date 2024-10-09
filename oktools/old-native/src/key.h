// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2013 The Bitcoin developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#ifndef BITCOIN_KEY_H
#define BITCOIN_KEY_H

#include <vector>

#include "allocators.h"
#include "serialize.h"
#include "uint256.h"
#include "hash.h"

// secp256k1:
// const unsigned int PRIVATE_KEY_SIZE = 279;
// const unsigned int PUBLIC_KEY_SIZE  = 65;
// const unsigned int SIGNATURE_SIZE   = 72;
//
// see www.keylength.com
// script supports up to 75 for single byte push

/** A reference to a CKey: the Hash160 of its serialized public key */
class CKeyID : public uint160
{
public:
    CKeyID() : uint160(0) { }
    CKeyID(const uint160 &in) : uint160(in) { }
};

/** An encapsulated public key. */
class CPubKey {
private:
    // Just store the serialized data.
    // Its length can very cheaply be computed from the first byte.
    unsigned char vch[65];

    // Compute the length of a pubkey with a given first byte.
    unsigned int static GetLen(unsigned char chHeader) {
        if (chHeader == 2 || chHeader == 3)
            return 33;
        if (chHeader == 4 || chHeader == 6 || chHeader == 7)
            return 65;
        return 0;
    }

    // Set this key data to be invalid
    void Invalidate() {
        vch[0] = 0xFF;
    }

public:
    // Construct an invalid public key.
    CPubKey() {
        Invalidate();
    }

    // Initialize a public key using begin/end iterators to byte data.
    template<typename T>
    void Set(const T pbegin, const T pend)
    {
        int len = pend == pbegin ? 0 : GetLen(pbegin[0]);
        if (len && len == (pend-pbegin))
            memcpy(vch, (unsigned char*)&pbegin[0], len);
        else
            Invalidate();
    }

    // Construct a public key using begin/end iterators to byte data.
    template<typename T>
    CPubKey(const T pbegin, const T pend) {
        Set(pbegin, pend);
    }

    // Construct a public key from a byte vector.
    CPubKey(const std::vector<unsigned char> &vch) {
        Set(vch.begin(), vch.end());
    }
    
    CPubKey(const unsigned char* p, const int len)
    {
        if (len <= 65)
            memcpy(&vch[0], p, len);
        else
            Invalidate();
    }

    // Simple read-only vector-like interface to the pubkey data.
    unsigned int size() const { return GetLen(vch[0]); }
    const unsigned char *begin() const { return vch; }
    const unsigned char *end() const { return vch+size(); }
    const unsigned char &operator[](unsigned int pos) const { return vch[pos]; }

    // Comparator implementation.
    friend bool operator==(const CPubKey &a, const CPubKey &b) {
        return a.vch[0] == b.vch[0] &&
               memcmp(a.vch, b.vch, a.size()) == 0;
    }
    friend bool operator!=(const CPubKey &a, const CPubKey &b) {
        return !(a == b);
    }
    friend bool operator<(const CPubKey &a, const CPubKey &b) {
        return a.vch[0] < b.vch[0] ||
               (a.vch[0] == b.vch[0] && memcmp(a.vch, b.vch, a.size()) < 0);
    }

    // Implement serialization, as if this was a byte vector.
    unsigned int GetSerializeSize(int nType, int nVersion) const {
        return size() + 1;
    }
    template<typename Stream> void Serialize(Stream &s, int nType, int nVersion) const {
        unsigned int len = size();
        ::WriteCompactSize(s, len);
        s.write((char*)vch, len);
    }
    template<typename Stream> void Unserialize(Stream &s, int nType, int nVersion) {
        unsigned int len = ::ReadCompactSize(s);
        if (len <= 65) {
            s.read((char*)vch, len);
        } else {
            // invalid pubkey, skip available data
            char dummy;
            while (len--)
                s.read(&dummy, 1);
            Invalidate();
        }
    }

    // Get the KeyID of this public key (hash of its serialization)
    CKeyID GetID() const {
        return CKeyID(Hash160(vch, vch+size()));
    }

    // Get the 256-bit hash of this public key.
    uint256 GetHash() const {
        return Hash(vch, vch+size());
    }

    // Check syntactic correctness.
    //
    // Note that this is consensus critical as CheckSig() calls it!
    bool IsValid() const {
        return size() > 0;
    }

    // fully validate whether this is a valid public key (more expensive than IsValid())
    bool IsFullyValid() const;

    // Check whether this is a compressed public key.
    bool IsCompressed() const {
        return size() == 33;
    }
    
    bool SetZero()
    {
        memset(&vch[0], 0, 65);
        return true;
    }

    // Verify a DER signature (~72 bytes).
    // If this public key is not fully valid, the return value will be false.
    bool Verify(const uint256 &hash, const std::vector<unsigned char>& vchSig) const;

    // Verify a compact signature (~65 bytes).
    // See CKey::SignCompact.
    bool VerifyCompact(const uint256 &hash, const std::vector<unsigned char>& vchSig) const;

    // Recover a public key from a compact signature.
    bool RecoverCompact(const uint256 &hash, const std::vector<unsigned char>& vchSig);

    // Turn this public key into an uncompressed public key.
    bool Decompress();

    // Derive BIP32 child pubkey.
    bool Derive(CPubKey& pubkeyChild, unsigned char ccChild[32], unsigned int nChild, const unsigned char cc[32]) const;
    
};


// secure_allocator is defined in allocators.h
// CPrivKey is a serialized private key, with all parameters included (279 bytes)
typedef std::vector<unsigned char, secure_allocator<unsigned char> > CPrivKey;
// CSecret is a serialization of just the secret parameter (32 bytes)
typedef std::vector<unsigned char, secure_allocator<unsigned char> > CSecret;

/** An encapsulated private key. */
class CKey {
private:
    // Whether this private key is valid. We check for correctness when modifying the key
    // data, so fValid should always correspond to the actual state.
    bool fValid;

    // Whether the public key corresponding to this private key is (to be) compressed.
    bool fCompressed;

    // The actual byte data
    unsigned char vch[32];

    // Check whether the 32-byte array pointed to be vch is valid keydata.
    bool static Check(const unsigned char *vch);
public:

    // Construct an invalid private key.
    CKey() : fValid(false) {
        LockObject(vch);
        fCompressed = true;
        memset(vch, 0, sizeof(vch));
    }

    // Copy constructor. This is necessary because of memlocking.
    CKey(const CKey &secret) : fValid(secret.fValid), fCompressed(secret.fCompressed) {
        LockObject(vch);
        memcpy(vch, secret.vch, sizeof(vch));
    }

    // Destructor (again necessary because of memlocking).
    ~CKey() {
        UnlockObject(vch);
    }

    friend bool operator==(const CKey &a, const CKey &b) {
        return a.fCompressed == b.fCompressed && a.size() == b.size() &&
               memcmp(&a.vch[0], &b.vch[0], a.size()) == 0;
    }

    // Initialize using begin and end iterators to byte data.
    template<typename T>
    void Set(const T pbegin, const T pend, bool fCompressedIn) {
        if (pend - pbegin != 32) {
            fValid = false;
            return;
        }
        if (Check(&pbegin[0])) {
            memcpy(vch, (unsigned char*)&pbegin[0], 32);
            fValid = true;
            fCompressed = fCompressedIn;
        } else {
            fValid = false;
        }
    }
    
    void Clear()
    {
        memset(vch, 0, sizeof(vch));
        fCompressed = true;
        fValid = false;
    };
    
    
    void Set(const unsigned char *p, bool fCompressedIn)
    {
        if (Check(p)) {
            memcpy(vch, p, 32);
            fValid = true;
            fCompressed = fCompressedIn;
        } else
        {
            fValid = false;
        }
    }

    // Simple read-only vector-like interface.
    unsigned int size() const { return (fValid ? 32 : 0); }
    const unsigned char *begin() const { return vch; }
    const unsigned char *end() const { return vch + size(); }

    // Check whether this private key is valid.
    bool IsValid() const { return fValid; }

    // Check whether the public key corresponding to this private key is (to be) compressed.
    bool IsCompressed() const { return fCompressed; }

    // Initialize from a CPrivKey (serialized OpenSSL private key data).
    bool SetPrivKey(const CPrivKey &vchPrivKey, bool fCompressed);

    // Generate a new private key using a cryptographic PRNG.
    void MakeNewKey(bool fCompressed);

    // Convert the private key to a CPrivKey (serialized OpenSSL private key data).
    // This is expensive.
    CPrivKey GetPrivKey() const;

    // Compute the public key from a private key.
    // This is expensive.
    CPubKey GetPubKey() const;
    CPubKey GetPubKey(const bool fForceCompressed) const;

    // Create a DER-serialized signature.
    bool Sign(const uint256 &hash, std::vector<unsigned char>& vchSig) const;

    // Create a compact signature (65 bytes), which allows reconstructing the used public key.
    // The format is one header byte, followed by two times 32 bytes for the serialized r and s values.
    // The header byte: 0x1B = first key with even y, 0x1C = first key with odd y,
    //                  0x1D = second key with even y, 0x1E = second key with odd y,
    //                  add 0x04 for compressed keys.
    bool SignCompact(const uint256 &hash, std::vector<unsigned char>& vchSig) const;

    // Derive BIP32 child key.
    bool Derive(CKey& keyChild, unsigned char ccChild[32], unsigned int nChild, const unsigned char cc[32]) const;
    
    /**
     * Verify thoroughly whether a private key and a public key match.
     * This is done using a different mechanism than just regenerating it.
     */
    bool VerifyPubKey(const CPubKey& vchPubKey) const;
    
    // Load private key and check that public key matches.
    bool Load(CPrivKey &privkey, CPubKey &vchPubKey, bool fSkipCheck);

    // Check whether an element of a signature (r or s) is valid.
    static bool CheckSignatureElement(const unsigned char *vch, int len, bool half);

    unsigned int GetSerializeSize(int nType, int nVersion) const
    {
        return 33;
    }
    
    template<typename Stream> void Serialize(Stream &s, int nType, int nVersion) const
    {
        s.write((char*)vch, 32);
        s.write((char*)&fValid, 1);
    }
    
    template<typename Stream> void Unserialize(Stream &s, int nType, int nVersion)
    {
        fCompressed = true;
        s.read((char*)vch, 32);
        s.read((char*)&fValid, 1);
    }
};

struct CExtPubKey {
    unsigned char nDepth;
    unsigned char vchFingerprint[4];
    unsigned int nChild;
    unsigned char vchChainCode[32];
    CPubKey pubkey;

    friend bool operator==(const CExtPubKey &a, const CExtPubKey &b) {
        return a.nDepth == b.nDepth && memcmp(&a.vchFingerprint[0], &b.vchFingerprint[0], 4) == 0 && a.nChild == b.nChild &&
               memcmp(&a.vchChainCode[0], &b.vchChainCode[0], 32) == 0 && a.pubkey == b.pubkey;
    }
    
    bool IsValid() const { return pubkey.IsValid(); }
    
    CKeyID GetID() const {
        return pubkey.GetID();
    }

    void Encode(unsigned char code[74]) const;
    void Decode(const unsigned char code[74]);
    bool Derive(CExtPubKey &out, unsigned int nChild) const;
    
    
    unsigned int GetSerializeSize(int nType, int nVersion) const
    {
        return 41 + pubkey.GetSerializeSize(nType, nVersion);
    }
    
    template<typename Stream> void Serialize(Stream &s, int nType, int nVersion) const
    {
        s.write((char*)&nDepth, 1);
        s.write((char*)vchFingerprint, 4);
        s.write((char*)&nChild, 4);
        s.write((char*)vchChainCode, 32);
        
        pubkey.Serialize(s, nType, nVersion);
    }
    
    template<typename Stream> void Unserialize(Stream &s, int nType, int nVersion)
    {
        s.read((char*)&nDepth, 1);
        s.read((char*)vchFingerprint, 4);
        s.read((char*)&nChild, 4);
        s.read((char*)vchChainCode, 32);
        
        pubkey.Unserialize(s, nType, nVersion);
    }
};

struct CExtKey {
    unsigned char nDepth;
    unsigned char vchFingerprint[4];
    unsigned int nChild;
    unsigned char vchChainCode[32];
    CKey key;

    friend bool operator==(const CExtKey &a, const CExtKey &b) {
        return a.nDepth == b.nDepth && memcmp(&a.vchFingerprint[0], &b.vchFingerprint[0], 4) == 0 && a.nChild == b.nChild &&
               memcmp(&a.vchChainCode[0], &b.vchChainCode[0], 32) == 0 && a.key == b.key;
    }
    
    bool IsValid() const { return key.IsValid(); }

    void Encode(unsigned char code[74]) const;
    void Decode(const unsigned char code[74]);
    bool Derive(CExtKey &out, unsigned int nChild) const;
    CExtPubKey Neutered() const;
    void SetMaster(const unsigned char *seed, unsigned int nSeedLen);
    int SetKeyCode(const unsigned char *pkey, const unsigned char *pcode);
    
    unsigned int GetSerializeSize(int nType, int nVersion) const
    {
        return 42 + (key.IsValid() ? 32 : 0);
    }
    
    template<typename Stream> void Serialize(Stream &s, int nType, int nVersion) const
    {
        s.write((char*)&nDepth, 1);
        s.write((char*)vchFingerprint, 4);
        s.write((char*)&nChild, 4);
        s.write((char*)vchChainCode, 32);
        
        char fValid = key.IsValid();
        s.write((char*)&fValid, 1);
        if (fValid)
            s.write((char*)key.begin(), 32);
    }
    
    template<typename Stream> void Unserialize(Stream &s, int nType, int nVersion)
    {
        s.read((char*)&nDepth, 1);
        s.read((char*)vchFingerprint, 4);
        s.read((char*)&nChild, 4);
        s.read((char*)vchChainCode, 32);
        
        char tmp[33];
        s.read((char*)tmp, 1); // key.IsValid()
        if (tmp[0])
        {
            s.read((char*)tmp+1, 32);
            key.Set((uint8_t*)tmp+1, 1);
        };
    }
};

class CExtKeyPair
{
public:
    //unsigned char nFlags; ? crypted
    unsigned char nDepth;
    unsigned char vchFingerprint[4];
    unsigned int nChild;
    unsigned char vchChainCode[32];
    CKey key;
    CPubKey pubkey;
    
    CExtKeyPair() {};
    CExtKeyPair(CExtKey &vk)
    {
        nDepth = vk.nDepth;
        memcpy(vchFingerprint, vk.vchFingerprint, sizeof(vchFingerprint));
        nChild = vk.nChild;
        memcpy(vchChainCode, vk.vchChainCode, sizeof(vchChainCode));
        key = vk.key;
        pubkey = key.GetPubKey();
    };
    
    
    CExtKey GetExtKey() const
    {
        CExtKey vk;
        vk.nDepth = nDepth;
        memcpy(vk.vchFingerprint, vchFingerprint, sizeof(vchFingerprint));
        vk.nChild = nChild;
        memcpy(vk.vchChainCode, vchChainCode, sizeof(vchChainCode));
        vk.key = key;
        return vk;
    };
    
    CKeyID GetID() const {
        return pubkey.GetID();
    }
    
    
    bool operator <(const CExtKeyPair& y) const
    {
        return pubkey < y.pubkey;
    };
    
    friend bool operator==(const CExtKeyPair &a, const CExtKeyPair &b)
    {
        return a.nDepth == b.nDepth && memcmp(&a.vchFingerprint[0], &b.vchFingerprint[0], 4) == 0 && a.nChild == b.nChild &&
               memcmp(&a.vchChainCode[0], &b.vchChainCode[0], 32) == 0 && a.key == b.key && a.pubkey == b.pubkey ;
    }
    
    bool IsValidV() const { return key.IsValid(); }
    bool IsValidP() const { return pubkey.IsValid(); }

    void EncodeV(unsigned char code[74]) const;
    void DecodeV(const unsigned char code[74]);
    
    void EncodeP(unsigned char code[74]) const;
    void DecodeP(const unsigned char code[74]);
    
    bool Derive(CExtKey &out, unsigned int nChild) const;
    bool Derive(CExtPubKey &out, unsigned int nChild) const;
    bool Derive(CKey &out, unsigned int nChild) const;
    bool Derive(CPubKey &out, unsigned int nChild) const;
    
    CExtPubKey GetExtPubKey() const;
    CExtKeyPair Neutered() const;
    void SetMaster(const unsigned char *seed, unsigned int nSeedLen);
    int SetKeyCode(const unsigned char *pkey, const unsigned char *pcode);
    
    unsigned int GetSerializeSize(int nType, int nVersion) const
    {
        return 42 + (key.IsValid() ? 32 : 0) + pubkey.GetSerializeSize(nType, nVersion);
    }
    
    template<typename Stream> void Serialize(Stream &s, int nType, int nVersion) const
    {
        s.write((char*)&nDepth, 1);
        s.write((char*)vchFingerprint, 4);
        s.write((char*)&nChild, 4);
        s.write((char*)vchChainCode, 32);
        
        char fValid = key.IsValid();
        s.write((char*)&fValid, 1);
        if (fValid)
            s.write((char*)key.begin(), 32);
        
        pubkey.Serialize(s, nType, nVersion);
    }
    
    template<typename Stream> void Unserialize(Stream &s, int nType, int nVersion)
    {
        s.read((char*)&nDepth, 1);
        s.read((char*)vchFingerprint, 4);
        s.read((char*)&nChild, 4);
        s.read((char*)vchChainCode, 32);
        
        char tmp[33];
        s.read((char*)tmp, 1); // key.IsValid()
        if (tmp[0])
        {
            s.read((char*)tmp+1, 32);
            key.Set((uint8_t*)tmp+1, 1);
        };
        pubkey.Unserialize(s, nType, nVersion);
    }
};

/** Check that required EC support is available at runtime */
bool ECC_InitSanityCheck(void);

#endif

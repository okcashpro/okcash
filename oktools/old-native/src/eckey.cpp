// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2013 The Bitcoin developers
// Copyright (c) 2014-2024 The Okcash Developers
// Distributed under the MIT/X11 software license, see the accompanying
// file license.txt or http://www.opensource.org/licenses/mit-license.php.

#include <openssl/opensslv.h>
#include "eckey.h"

// anonymous namespace with local implementation code (OpenSSL interaction)
namespace {

// Generate a private key from just the secret parameter
int EC_KEY_regenerate_key(EC_KEY *eckey, BIGNUM *priv_key)
{
    int ok = 0;
    BN_CTX *ctx = NULL;
    EC_POINT *pub_key = NULL;

    if (!eckey) return 0;

    const EC_GROUP *group = EC_KEY_get0_group(eckey);

    if ((ctx = BN_CTX_new()) == NULL)
        goto err;

    pub_key = EC_POINT_new(group);

    if (pub_key == NULL)
        goto err;

    if (!EC_POINT_mul(group, pub_key, priv_key, NULL, NULL, ctx))
        goto err;

    EC_KEY_set_private_key(eckey,priv_key);
    EC_KEY_set_public_key(eckey,pub_key);

    ok = 1;

err:

    if (pub_key)
        EC_POINT_free(pub_key);
    if (ctx != NULL)
        BN_CTX_free(ctx);

    return(ok);
}

// Perform ECDSA key recovery (see SEC1 4.1.6) for curves over (mod p)-fields
// recid selects which key is recovered
// if check is non-zero, additional checks are performed
int ECDSA_SIG_recover_key_GFp(EC_KEY *eckey, ECDSA_SIG *ecsig, const unsigned char *msg, int msglen, int recid, int check)
{
    if (!eckey) return 0;

    int ret = 0;
    BN_CTX *ctx = NULL;

    BIGNUM *x = NULL;
    BIGNUM *e = NULL;
    BIGNUM *order = NULL;
    BIGNUM *sor = NULL;
    BIGNUM *eor = NULL;
    BIGNUM *field = NULL;
    EC_POINT *R = NULL;
    EC_POINT *O = NULL;
    EC_POINT *Q = NULL;
    BIGNUM *rr = NULL;
    BIGNUM *zero = NULL;
    int n = 0;
    int i = recid / 2;

#if OPENSSL_VERSION_NUMBER >= 0x10100000L
    const BIGNUM *r;
    const BIGNUM *s;
    r = BN_new();
    s = BN_new();
    ECDSA_SIG_get0(ecsig, &r, &s);
#endif

    const EC_GROUP *group = EC_KEY_get0_group(eckey);
    if ((ctx = BN_CTX_new()) == NULL) { ret = -1; goto err; }
    BN_CTX_start(ctx);
    order = BN_CTX_get(ctx);
    if (!EC_GROUP_get_order(group, order, ctx)) { ret = -2; goto err; }
    x = BN_CTX_get(ctx);
    if (!BN_copy(x, order)) { ret=-1; goto err; }
    if (!BN_mul_word(x, i)) { ret=-1; goto err; }
#if OPENSSL_VERSION_NUMBER < 0x10100000L
    if (!BN_add(x, x, ecsig->r)) { ret=-1; goto err; }
#else
    if (!BN_add(x, x, r)) { ret=-1; goto err; }
#endif
    field = BN_CTX_get(ctx);
    if (!EC_GROUP_get_curve_GFp(group, field, NULL, NULL, ctx)) { ret=-2; goto err; }
    if (BN_cmp(x, field) >= 0) { ret=0; goto err; }
    if ((R = EC_POINT_new(group)) == NULL) { ret = -2; goto err; }
    if (!EC_POINT_set_compressed_coordinates_GFp(group, R, x, recid % 2, ctx)) { ret=0; goto err; }
    if (check)
    {
        if ((O = EC_POINT_new(group)) == NULL) { ret = -2; goto err; }
        if (!EC_POINT_mul(group, O, NULL, R, order, ctx)) { ret=-2; goto err; }
        if (!EC_POINT_is_at_infinity(group, O)) { ret = 0; goto err; }
    }
    if ((Q = EC_POINT_new(group)) == NULL) { ret = -2; goto err; }
    n = EC_GROUP_get_degree(group);
    e = BN_CTX_get(ctx);
    if (!BN_bin2bn(msg, msglen, e)) { ret=-1; goto err; }
    if (8*msglen > n) BN_rshift(e, e, 8-(n & 7));
    zero = BN_CTX_get(ctx);
#if OPENSSL_VERSION_NUMBER < 0x10100000L
    // OpenSSL 1.0.x and earlier
    if (!BN_zero(zero)) { ret=-1; goto err; }
#else
    // OpenSSL 1.1.x, 3.0 and later
    BN_zero(zero);
    // BN_zero does not return a value in these version.
#endif
    if (!BN_mod_sub(e, zero, e, order, ctx)) { ret=-1; goto err; }
    rr = BN_CTX_get(ctx);
#if OPENSSL_VERSION_NUMBER < 0x10100000L
    if (!BN_mod_inverse(rr, ecsig->r, order, ctx)) { ret=-1; goto err; }
#else
    if (!BN_mod_inverse(rr, r, order, ctx)) { ret=-1; goto err; }
#endif
    sor = BN_CTX_get(ctx);
#if OPENSSL_VERSION_NUMBER < 0x10100000L
    if (!BN_mod_mul(sor, ecsig->s, rr, order, ctx)) { ret=-1; goto err; }
#else
    if (!BN_mod_mul(sor, s, rr, order, ctx)) { ret=-1; goto err; }
#endif
    eor = BN_CTX_get(ctx);
    if (!BN_mod_mul(eor, e, rr, order, ctx)) { ret=-1; goto err; }
    if (!EC_POINT_mul(group, Q, eor, R, sor, ctx)) { ret=-2; goto err; }
    if (!EC_KEY_set_public_key(eckey, Q)) { ret=-2; goto err; }

    ret = 1;

err:
    if (ctx) {
        BN_CTX_end(ctx);
        BN_CTX_free(ctx);
    }
    if (R != NULL) EC_POINT_free(R);
    if (O != NULL) EC_POINT_free(O);
    if (Q != NULL) EC_POINT_free(Q);
    return ret;
}

}; // end of anonymous namespace

void CECKey::GetSecretBytes(unsigned char vch[32]) const
{
    const BIGNUM *bn = EC_KEY_get0_private_key(pkey);
    assert(bn);
    int nBytes = BN_num_bytes(bn);
    int n=BN_bn2bin(bn,&vch[32 - nBytes]);
    assert(n == nBytes);
    memset(vch, 0, 32 - nBytes);
}

void CECKey::SetSecretBytes(const unsigned char vch[32])
{
#if OPENSSL_VERSION_NUMBER < 0x10100000L
    BIGNUM bn;
    BN_init(&bn);
    assert(BN_bin2bn(vch, 32, &bn));
    assert(EC_KEY_regenerate_key(pkey, &bn));
    BN_clear_free(&bn);
#else
    BIGNUM *bn;
    bn = BN_secure_new();
    assert(BN_bin2bn(vch, 32, bn));
    assert(EC_KEY_regenerate_key(pkey, bn));
    BN_clear_free(bn);
#endif
}

void CECKey::GetPrivKey(CPrivKey &privkey, bool fCompressed) {
    EC_KEY_set_conv_form(pkey, fCompressed ? POINT_CONVERSION_COMPRESSED : POINT_CONVERSION_UNCOMPRESSED);
    int nSize = i2d_ECPrivateKey(pkey, NULL);
    assert(nSize);
    privkey.resize(nSize);
    unsigned char* pbegin = &privkey[0];
    int nSize2 = i2d_ECPrivateKey(pkey, &pbegin);
    assert(nSize == nSize2);
}

bool CECKey::SetPrivKey(const CPrivKey &privkey, bool fSkipCheck) {
    const unsigned char* pbegin = &privkey[0];
    if (d2i_ECPrivateKey(&pkey, &pbegin, privkey.size())) {
        if(fSkipCheck)
            return true;

        // d2i_ECPrivateKey returns true if parsing succeeds.
        // This doesn't necessarily mean the key is valid.
        if (EC_KEY_check_key(pkey))
            return true;
    }
    return false;
}

void CECKey::GetPubKey(CPubKey &pubkey, bool fCompressed) {
    EC_KEY_set_conv_form(pkey, fCompressed ? POINT_CONVERSION_COMPRESSED : POINT_CONVERSION_UNCOMPRESSED);
    int nSize = i2o_ECPublicKey(pkey, NULL);
    assert(nSize);
    assert(nSize <= 65);
    unsigned char c[65];
    unsigned char *pbegin = c;
    int nSize2 = i2o_ECPublicKey(pkey, &pbegin);
    assert(nSize == nSize2);
    pubkey.Set(&c[0], &c[nSize]);
}

bool CECKey::SetPubKey(const CPubKey &pubkey) {
    const unsigned char* pbegin = pubkey.begin();
    return o2i_ECPublicKey(&pkey, &pbegin, pubkey.size());
}

bool CECKey::Sign(const uint256 &hash, std::vector<unsigned char>& vchSig) {
    vchSig.clear();

    // Convert uint256 to a byte array
    unsigned char hashData[32];
    memcpy(hashData, hash.begin(), 32); // Assuming hash.begin() gives access to the data

    ECDSA_SIG *sig = ECDSA_do_sign(hashData, sizeof(hashData), pkey);
    if (sig == nullptr) {
        return false;
    }

    BN_CTX *ctx = BN_CTX_new();
    if (!ctx) {
        ECDSA_SIG_free(sig);
        return false;
    }

    BIGNUM *order = BN_new();
    BIGNUM *halfOrder = BN_new();
    if (!order || !halfOrder) {
        ECDSA_SIG_free(sig);
        BN_free(order);
        BN_free(halfOrder);
        BN_CTX_free(ctx);
        return false;
    }

    const EC_GROUP *group = EC_KEY_get0_group(pkey);
    EC_GROUP_get_order(group, order, ctx);
    BN_rshift1(halfOrder, order); // Calculate half order of the curve

    const BIGNUM *sig_r, *sig_s;
    ECDSA_SIG_get0(sig, &sig_r, &sig_s);

    // Normalize S if it's above half the order of the curve
    BIGNUM *normalized_s = BN_new();
    if (BN_cmp(sig_s, halfOrder) > 0) {
        BN_sub(normalized_s, order, sig_s);
    } else {
        BN_copy(normalized_s, sig_s);
    }

    // Set the normalized S value back into the signature object
    ECDSA_SIG_set0(sig, BN_dup(sig_r), normalized_s); // This duplicates r and takes ownership of normalized_s

    // Serialize the signature into a DER encoded byte array
    unsigned char *der = nullptr;
    int nSize = i2d_ECDSA_SIG(sig, &der); // Use 'int' to store the size returned by i2d_ECDSA_SIG
    if (nSize < 0) {
        // Cleanup if serialization failed
        ECDSA_SIG_free(sig);
        BN_free(order);
        BN_free(halfOrder);
        BN_CTX_free(ctx);
        return false;
    }
    vchSig.resize(nSize); // Resize the vector to accommodate the serialized signature
    memcpy(vchSig.data(), der, nSize); // Copy the serialized signature into the vector

    // Cleanup
    OPENSSL_free(der); // Free the allocated buffer by i2d_ECDSA_SIG
    ECDSA_SIG_free(sig);
    BN_free(order);
    BN_free(halfOrder);
    BN_CTX_free(ctx);

    return true;
}

bool CECKey::Verify(const uint256 &hash, const std::vector<unsigned char>& vchSig) {
    const unsigned char *p = vchSig.data();
    ECDSA_SIG *sig = d2i_ECDSA_SIG(NULL, &p, vchSig.size());
    if (sig == NULL) {
        return false;
    }

    int ret = ECDSA_do_verify((const unsigned char*)&hash, sizeof(hash), sig, pkey);
    ECDSA_SIG_free(sig);

    return ret == 1;
}

bool CECKey::SignCompact(const uint256 &hash, unsigned char *p64, int &rec) {
    bool fOk = false;
    ECDSA_SIG *sig = ECDSA_do_sign((unsigned char*)&hash, sizeof(hash), pkey);
    if (sig==NULL)
        return false;
    memset(p64, 0, 64);
#if OPENSSL_VERSION_NUMBER < 0x10100000L
    int nBitsR = BN_num_bits(sig->r);
    int nBitsS = BN_num_bits(sig->s);
#else
    const BIGNUM *r;
    const BIGNUM *s;
    r = BN_secure_new();
    s = BN_secure_new();
    ECDSA_SIG_get0(sig, &r, &s);
    int nBitsR = BN_num_bits(r);
    int nBitsS = BN_num_bits(s);
#endif
    if (nBitsR <= 256 && nBitsS <= 256) {
        CPubKey pubkey;
        GetPubKey(pubkey, true);
        for (int i=0; i<4; i++) {
            CECKey keyRec;
            if (ECDSA_SIG_recover_key_GFp(keyRec.pkey, sig, (unsigned char*)&hash, sizeof(hash), i, 1) == 1) {
                CPubKey pubkeyRec;
                keyRec.GetPubKey(pubkeyRec, true);
                if (pubkeyRec == pubkey) {
                    rec = i;
                    fOk = true;
                    break;
                }
            }
        }
        assert(fOk);
#if OPENSSL_VERSION_NUMBER < 0x10100000L
        BN_bn2bin(sig->r,&p64[32-(nBitsR+7)/8]);
        BN_bn2bin(sig->s,&p64[64-(nBitsS+7)/8]);
#else
        BN_bn2bin(r,&p64[32-(nBitsR+7)/8]);
        BN_bn2bin(s,&p64[64-(nBitsS+7)/8]);
#endif
    }
    ECDSA_SIG_free(sig);
    return fOk;
}

// reconstruct public key from a compact signature
// This is only slightly more CPU intensive than just verifying it.
// If this function succeeds, the recovered public key is guaranteed to be valid
// (the signature is a valid signature of the given data for that key)
bool CECKey::Recover(const uint256 &hash, const unsigned char *p64, int rec)
{
    if (rec<0 || rec>=3)
        return false;
    ECDSA_SIG *sig = ECDSA_SIG_new();
#if OPENSSL_VERSION_NUMBER < 0x10100000L
    BN_bin2bn(&p64[0],  32, sig->r);
    BN_bin2bn(&p64[32], 32, sig->s);
#else
    const BIGNUM *r;
    const BIGNUM *s;
    r = BN_secure_new();
    s = BN_secure_new();
    BIGNUM *r1;
    BIGNUM *s1;
    ECDSA_SIG_get0(sig, &r, &s);
    BN_bin2bn(&p64[0],  32, r1);
    BN_bin2bn(&p64[32], 32, s1);
#endif
    bool ret = ECDSA_SIG_recover_key_GFp(pkey, sig, (unsigned char*)&hash, sizeof(hash), rec, 0) == 1;
    ECDSA_SIG_free(sig);
    return ret;
}

bool CECKey::TweakPublic(const unsigned char vchTweak[32])
{
    bool ret = true;
    BN_CTX *ctx = BN_CTX_new();
    BN_CTX_start(ctx);
    BIGNUM *bnTweak = BN_CTX_get(ctx);
    BIGNUM *bnOrder = BN_CTX_get(ctx);
    BIGNUM *bnOne = BN_CTX_get(ctx);
    const EC_GROUP *group = EC_KEY_get0_group(pkey);
    EC_GROUP_get_order(group, bnOrder, ctx); // what a grossly inefficient way to get the (constant) group order...
    BN_bin2bn(vchTweak, 32, bnTweak);
    if (BN_cmp(bnTweak, bnOrder) >= 0)
        ret = false; // extremely unlikely
    EC_POINT *point = EC_POINT_dup(EC_KEY_get0_public_key(pkey), group);
    BN_one(bnOne);
    EC_POINT_mul(group, point, bnTweak, point, bnOne, ctx);
    if (EC_POINT_is_at_infinity(group, point))
        ret = false; // ridiculously unlikely
    EC_KEY_set_public_key(pkey, point);
    EC_POINT_free(point);
    BN_CTX_end(ctx);
    BN_CTX_free(ctx);
    return ret;
}

bool TweakSecret(unsigned char vchSecretOut[32], const unsigned char vchSecretIn[32], const unsigned char vchTweak[32])
{
    bool ret = true;
    BN_CTX *ctx = BN_CTX_new();
    BN_CTX_start(ctx);
    BIGNUM *bnSecret = BN_CTX_get(ctx);
    BIGNUM *bnTweak = BN_CTX_get(ctx);
    BIGNUM *bnOrder = BN_CTX_get(ctx);
    EC_GROUP *group = EC_GROUP_new_by_curve_name(NID_secp256k1);
    EC_GROUP_get_order(group, bnOrder, ctx); // what a grossly inefficient way to get the (constant) group order...
    BN_bin2bn(vchTweak, 32, bnTweak);
    if (BN_cmp(bnTweak, bnOrder) >= 0)
        ret = false; // extremely unlikely
    BN_bin2bn(vchSecretIn, 32, bnSecret);
    BN_add(bnSecret, bnSecret, bnTweak);
    BN_nnmod(bnSecret, bnSecret, bnOrder, ctx);
    if (BN_is_zero(bnSecret))
        ret = false; // ridiculously unlikely
    int nBits = BN_num_bits(bnSecret);
    memset(vchSecretOut, 0, 32);
    BN_bn2bin(bnSecret, &vchSecretOut[32-(nBits+7)/8]);
    EC_GROUP_free(group);
    BN_CTX_end(ctx);
    BN_CTX_free(ctx);
    return ret;
}



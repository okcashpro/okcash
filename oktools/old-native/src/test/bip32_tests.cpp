// Copyright (c) 2013 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <boost/test/unit_test.hpp>

#include "base58.h"
#include "key.h"
#include "uint256.h"
#include "util.h"

#include <string>
#include <vector>

struct TestDerivation {
    std::string pub;
    std::string prv;
    unsigned int nChild;
};

struct TestVector {
    std::string strHexMaster;
    std::vector<TestDerivation> vDerive;

    TestVector(std::string strHexMasterIn) : strHexMaster(strHexMasterIn) {}

    TestVector& operator()(std::string pub, std::string prv, unsigned int nChild) {
        vDerive.push_back(TestDerivation());
        TestDerivation &der = vDerive.back();
        der.pub = pub;
        der.prv = prv;
        der.nChild = nChild;
        return *this;
    }
};

TestVector test1 =
  TestVector("000102030405060708090a0b0c0d0e0f")
    ("okpmphCJNSUos9rNrtJLHBihz4Gtqa7LMjjAGt4SH5a4tQH9ykYb3cNnp8VvGGAYtfH7phiveYFfYKjQGNNNj6aKTYTW1ztB9buBzJXsCCKg7hY",
     "okvmnKmFxG9k6UnN54BRiwaq8PwLWAgSN7FaQmbitre71x318T8NPjZLCYsGTVcZq1HqLCmtataXdcxjR4T9rrZdCpHom1HAucKgENFhTARR3qu",
     0x80000000)
    ("okpmpjTiN9nGxQyN1VS3UwbLs6P1APfgjpDAxVVLFAxBrbUSM2qmTquswGrL3XjFdyBepv1VWmo6GxoVEmLWg8JhXRvEDdgS4uoQWEfRVoaXBqn",
     "okvmnN2fwyTDBjuMDfK8vhTU1S3SpzEnkBjb6P2crx2Dz9EHVjRYoy6RKhDgEkxuEifo3FfaxBuQ1yoc8pUsWSqoztNKpsxK9a2ZwNtYtF4VFaT",
     1)
    ("okpmpmdqZwLAM7rRqwUVDCVDTqGfDmenjqwTtpAAqSizoEGeaaLuBeLBtqkZTcBq3utznddYJCFCPZHxq55L9TUbD5kAWqXHYYog8yCCnnzVCUb",
     "okvmnQCo9m16aSnR47MaexMLcAw6tNDtkDTt2hhTTDo2vn2VjGvgXmWjHG7uep9xqeSqVLRGm1Vq6gm2Gm16dndnn3rmLev3DKoRcBCvRBBcr6u",
     0x80000002)
    ("okpmppF7cUA23zhqi7GaTntapqJoSvXK1PXTEMPr5n29y6e5zRY1zQAcoHJV1dNfVnLK99jGuaDomVrwHQDcrZ28GXu16jVRdVsMrf7Lt3e2p74",
     "okvmnSp5CHpxHKdpvH9fuYkhyAyF7X6R1m3sNEw8hZ6C6ePw987oLXMABhfqCrNaosxKzoSfMUSkX6avVxjrDoYyu9JRhGUbNG3NDSx93nffRrZ",
     2)
    ("okpmprUWSuGyEUNpnakJA46fiLU7Xjp3dyqefqH9LjYdHYChMXAP4AryzrmQgxN3uaV3cTrT3ahkpEm3qpZcwrTKz8NG1X3cTgmBsM2C2fbX7jP",
     "okvmnV3U2iwuToJozkdPboxnrg8ZCLP9eMN4oipRxWcfR5xYWDkAQJ3XPH8ktAn3GYMm4baMyPgKRv35y9eJRE6L6XtU6WZgvLs5NRRJZK86GzL",
     1000000000)
    ("okpmptCGvatDMbm2JvXkGbfQ23U7KyPMTUegU5fhb1vmVcbC4eZmab7eFxvUKnGzkqZm6A8zYvdZMSTeSExe3hxAqPXNt4ThGALpgJe7GmrkQ3d",
     "okvmnWmEWQZ9avh1X6QqiMXXAP8YzZxTTrB6byCzCnzodAM3DM9YviJBePHpX2ZFBTUqfzyckkfGGxaCyKefxJ74DVY1S1Kv3FcnekyfJPP6sPi",
     0);

TestVector test2 =
  TestVector("fffcf9f6f3f0edeae7e4e1dedbd8d5d2cfccc9c6c3c0bdbab7b4b1aeaba8a5a29f9c999693908d8a8784817e7b7875726f6c696663605d5a5754514e4b484542")
    ("okpmphCJNSUos9rNrVofPLnzSFzf5mFm3MyyxTrAa2JtrnQ2GjZnDm9jF2fWcNFXbue5jFxiZCupwQEezA6brHVUbTTSsw5dz6PrJgCyU7FQ7E2",
     "okvmnKmFxG9k6UnN4fgkq6f7abf6kMps3jWQ6MPTBoNvzL9sRS9ZZtLGdT2roZPd1WqvaFXKLB2yuizvWbBFuGxKpBcaDRMR3xEQocsvp83bv6g",
     0)
    ("okpmpkU3eAAmMAgTNmPxX8AsW4QBSj11kLUGWdbXjqLLwCFyxi1ko2VoPsEmBqDRPzeWwaStRRuaLV5d9KXHjSBtw47j9ypJtSYESAKduHfhAwT",
     "okvmnP31DyqhaVcSawH3xt2zeQ4d7Ka7khzgeX8pMcQP4k1q7QbY99gLnHc7P4fReagkyum9EBSiLtR3s6p5TZTNkQmyDbmUSSQ9w2nVBRAQusZ",
     0xFFFFFFFF)
    ("okpmpmd6tmCHj4rZYdc8waAWyQ5jqUDvHpdxbng4fEF7aw2NR1FDQuv7bw2MoDTY9jFcj6NS5GmBdhWDozPdWLg1fCaMh4SNFAoFJYbEk8qTdBJ",
     "okvmnQC4UasDxPnYkoVEPL2e7jkBW4o2JCANjgDMH1K9iUnDZhpzm36ezMPhzR9QNqREt9631CeMPtvAJLYrBw4WKiDXeKzpCx8Qip81wnR9zqt",
     1)
    ("okpmppS5JnBDti9keFHH1EK5wM1yB16RQ1ZDvEAvWHuStpNp5q7NiRSpVqQje1efwbwuKGpyuurRGpp3tneeRF6xvY3GHLeDTiETEKGBzYUstev",
     "okvmnT12tbrA835jrRANSzBD5ggQqbfXQP5e47iD84yV2N8fEXhA4YdMtFn5qDM2QYcwC6SjkVijoSbNd3L1EpatLC2pn6Xd446oCcYkRQz9q1Q",
     0xFFFFFFFE)
    ("okpmpqc7Dk7aW77TwCWsji8dJriA5jZnSzBiwvtp31brjae4YBSJp6Nq2MmqGfnB8yUMGiUciQv8KS8uYRp378DUdtjiZExi21Ks6YLmXVBrpCw",
     "okvmnUB4oZnWjS3T9NPyBTzkTCNbkL8tTMi95pS6enfts8Pugt26ADZNQn9BTv5R2y1DjfjS4KVjBpAxSARNkmVP22hzc34wCG8RYCZGVG3ZpQr",
     2)
    ("okpmpry9BBL62HRhgThmTnGKHc68Uo6thK6oc6WhSnxMNNVecNmsyjJbCviqM4rTGYq3nmgqzLRYD99u2rsXwDuNx9bJCQnnxNcbmqXxC9nTA4W",
     "okvmnVY6m112FcMgtdaruY8SRwka9PfzhgdDjz3z4a2PVvFVm5MfKrV8bM6BYKkRBz6HmybAM58Ydv1eUiJtV5rc51SiQtaSFgG9EZtpZrEG3j9",
     0);

void RunTest(const TestVector &test) {
    std::vector<unsigned char> seed = ParseHex(test.strHexMaster);
    CExtKey key;
    CExtPubKey pubkey;
    key.SetMaster(&seed[0], seed.size());
    pubkey = key.Neutered();
    BOOST_FOREACH(const TestDerivation &derive, test.vDerive) {
        unsigned char data[74];
        key.Encode(data);
        pubkey.Encode(data);
        // Test private key
        CBitcoinExtKey b58key;
        b58key.SetKey(key);
        BOOST_CHECK(b58key.ToString() == derive.prv);
        // Test public key
        CBitcoinExtPubKey b58pubkey;
        b58pubkey.SetKey(pubkey);
        BOOST_CHECK(b58pubkey.ToString() == derive.pub);
        // Derive new keys
        CExtKey keyNew;
        BOOST_CHECK(key.Derive(keyNew, derive.nChild));
        CExtPubKey pubkeyNew = keyNew.Neutered();
        if (!(derive.nChild & 0x80000000)) {
            // Compare with public derivation
            CExtPubKey pubkeyNew2;
            BOOST_CHECK(pubkey.Derive(pubkeyNew2, derive.nChild));
            BOOST_CHECK(pubkeyNew == pubkeyNew2);
        }
        key = keyNew;
        pubkey = pubkeyNew;
    }
}


BOOST_AUTO_TEST_SUITE(bip32_tests)

BOOST_AUTO_TEST_CASE(bip32_test1) {
    RunTest(test1);
}

BOOST_AUTO_TEST_CASE(bip32_test2) {
    RunTest(test2);
}

BOOST_AUTO_TEST_SUITE_END()

// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2013 The Bitcoin developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CHAIN_PARAMS_H
#define BITCOIN_CHAIN_PARAMS_H

#include "bignum.h"
#include "uint256.h"
#include "util.h"

#include <vector>

#define MESSAGE_START_SIZE 4
typedef unsigned char MessageStartChars[MESSAGE_START_SIZE];

class CAddress;
class CBlock;
class CBlockIndex;

struct CDNSSeedData {
    std::string name, host;
    CDNSSeedData(const std::string &strName, const std::string &strHost) : name(strName), host(strHost) {}
};



/**
 * CChainParams defines various tweakable parameters of a given instance of the
 * Bitcoin system. There are three: the main network on which people trade goods
 * and services, the public test network which gets reset from time to time and
 * a regression test mode which is intended for private networks only. It has
 * minimal difficulty to ensure that blocks can be found instantly.
 */
class CChainParams
{
public:
    enum Network {
        MAIN,
        TESTNET,
        REGTEST,

        MAX_NETWORK_TYPES
    };

    enum Base58Type {
        PUBKEY_ADDRESS,
        SCRIPT_ADDRESS,
        SECRET_KEY,
        STEALTH_ADDRESS,
        EXT_PUBLIC_KEY,
        EXT_SECRET_KEY,
        EXT_KEY_HASH,
        EXT_ACC_HASH,
        EXT_PUBLIC_KEY_BTC,
        EXT_SECRET_KEY_BTC,

        MAX_BASE58_TYPES
    };

    const uint256& HashGenesisBlock() const { return hashGenesisBlock; }
    const MessageStartChars& MessageStart() const { return pchMessageStart; }
    const std::vector<unsigned char>& AlertKey() const { return vAlertPubKey; }
    int GetDefaultPort() const { return nDefaultPort; }

    const bool IsProtocolV2(int nHeight) const { return nHeight > nFirstPosv2Block; }
    const bool IsProtocolV3(int nHeight) const { return nHeight > nFirstPosv3Block; }

    const CBigNum& ProofOfWorkLimit() const { return bnProofOfWorkLimit; }
    const CBigNum& ProofOfStakeLimit(int nHeight) const { return IsProtocolV2(nHeight) ? bnProofOfStakeLimitV2 : bnProofOfStakeLimit; }


    virtual const CBlock& GenesisBlock() const = 0;
    virtual bool RequireRPCPassword() const { return true; }
    const std::string& DataDir() const { return strDataDir; }
    virtual Network NetworkID() const = 0;
    const std::vector<CDNSSeedData>& DNSSeeds() const { return vSeeds; }
    const std::vector<unsigned char> &Base58Prefix(Base58Type type) const { return base58Prefixes[type]; }
    virtual const std::vector<CAddress>& FixedSeeds() const = 0;

    std::string NetworkIDString() const { return strNetworkID; }

    int RPCPort() const { return nRPCPort; }
    int FourteenBlockHalve() const { return nFourteenBlockHalve; }
    int ThirteenBlockHalve() const { return nThirteenBlockHalve; }
    int TwelveBlockHalve() const { return nTwelveBlockHalve; }
    int ElevenBlockHalve() const { return nElevenBlockHalve; }
    int TenthBlockHalve() const { return nTenthBlockHalve; }
    int NinthBlockHalve() const { return nNinthBlockHalve; }
    int EighthBlockHalve() const { return nEighthBlockHalve; }
    int SeventhBlockHalve() const { return nSeventhBlockHalve; }
    int SixthBlockHalve() const { return nSixthBlockHalve; }
    int FifthBlockHalve() const { return nFifthBlockHalve; }
    int FourthBlockHalve() const { return nFourthBlockHalve; }
    int ThirdBlockHalve() const { return nThirdBlockHalve; }
    int SecondBlockHalve() const { return nSecondBlockHalve; }
    int FirstBlockHalve() const { return nFirstBlockHalve; }
    int FirstYearStake() const { return nFirstYearStake; }
    int LastPOWBlock() const { return nLastPOWBlock; }
    int LastFairLaunchBlock() const { return nLastFairLaunchBlock; }
    int DistributionFund() const { return nDistributionFund; }

    int BIP44ID() const { return nBIP44ID; }

    int64_t GetProofOfWorkReward(int nHeight, int64_t nFees) const;
    int64_t GetProofOfStakeReward(const CBlockIndex* pindexPrev, int64_t nCoinAge, int64_t nFees) const;

protected:
    CChainParams() {};

    uint256 hashGenesisBlock;
    MessageStartChars pchMessageStart;
    // Raw pub key bytes for the broadcast alert signing key.
    std::vector<unsigned char> vAlertPubKey;
    std::string strNetworkID;
    int nDefaultPort;
    int nRPCPort;
    int nBIP44ID;

    int nFirstPosv2Block;
    int nFirstPosv3Block;
    CBigNum bnProofOfWorkLimit;
    CBigNum bnProofOfStakeLimit;
    CBigNum bnProofOfStakeLimitV2;

    std::string strDataDir;
    std::vector<CDNSSeedData> vSeeds;
    std::vector<unsigned char> base58Prefixes[MAX_BASE58_TYPES];
    int nLastPOWBlock;
    int nLastFairLaunchBlock;
    int nDistributionFund;
    int nFourteenBlockHalve;
    int nThirteenBlockHalve;
    int nTwelveBlockHalve;
    int nElevenBlockHalve;
    int nTenthBlockHalve;
    int nNinthBlockHalve;
    int nEighthBlockHalve;
    int nSeventhBlockHalve;
    int nSixthBlockHalve;
    int nFifthBlockHalve;
    int nFourthBlockHalve;
    int nThirdBlockHalve;
    int nSecondBlockHalve;
    int nFirstBlockHalve;
    int nFirstYearStake;
};

/**
 * Return the currently selected parameters. This won't change after app startup
 * outside of the unit tests.
 */
const CChainParams &Params();

/**
 * Return the testnet parameters.
 */
const CChainParams &TestNetParams();

/**
 * Return the mainnet parameters.
 */
const CChainParams &MainNetParams();

/** Sets the params returned by Params() to those for the given network. */
void SelectParams(CChainParams::Network network);

/**
 * Looks for -regtest or -testnet and then calls SelectParams as appropriate.
 * Returns false if an invalid combination is given.
 */
bool SelectParamsFromCommandLine();

inline bool TestNet() {
    // Note: it's deliberate that this returns "false" for regression test mode.
    return Params().NetworkID() == CChainParams::TESTNET;
}

#endif

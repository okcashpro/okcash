// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2012 The Bitcoin developers
// Distributed under the MIT/X11 software license, see the accompanying
// Thanks and Credits for Technologies found in Okcash: Bitcoin, Novacoin, Blackcoin, Bitmessage, Sdc, Cryptonote
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "assert.h"

#include "chainparams.h"
#include "main.h"

#include <boost/assign/list_of.hpp>

using namespace boost::assign;

struct SeedSpec6 {
    uint8_t addr[16];
    uint16_t port;
};

#include "chainparamsseeds.h"

int64_t CChainParams::GetProofOfWorkReward(int nHeight, int64_t nFees) const
{
    // miner's coin base reward
    int64_t nSubsidy = 0;
    
    if (nHeight <= 0)
        nSubsidy = 0;
    else
    if (nHeight <= nDistributionFund)
        nSubsidy = 2691000 * COIN;
	else
    if (nHeight <= nLastFairLaunchBlock)
        nSubsidy = 1 * COIN;
    else
    if (nHeight <= nLastPOWBlock)
        nSubsidy = 2000 * COIN;
        //nSubsidy = (NetworkID() == CChainParams::TESTNET ? 10000 : 400) * COIN;

    if (fDebug && GetBoolArg("-printcreation"))
        LogPrintf("GetProofOfWorkReward() : create=%s nSubsidy=%d\n", FormatMoney(nSubsidy).c_str(), nSubsidy);

    return nSubsidy + nFees;
};


int64_t CChainParams::GetProofOfStakeReward(const CBlockIndex* pindexPrev, int64_t nCoinAge, int64_t nFees) const
{
    // miner's coin stake rewards based LTSSposv2 + LTSSposv3hybrid system : posv3hybrid block 3027542
    int64_t nSubsidy = 0;

    if (IsProtocolV3(pindexPrev->nHeight)) {
        nSubsidy = (pindexPrev->nMoneySupply / COIN) * (FCOIN_YEAR_REWARD / 10) / (365 * 24 * (60 * 60 / 62.9138346197));

        if (pindexBest->nHeight <= nSixthBlockHalve)
            nSubsidy = (pindexPrev->nMoneySupply / COIN) * (DCOIN_YEAR_REWARD / 3) / (365 * 24 * (60 * 60 / 62.9138346197));
        else if (pindexBest->nHeight <= nSeventhBlockHalve)
            nSubsidy = (pindexPrev->nMoneySupply / COIN) * (RCOIN_YEAR_REWARD / 3) / (365 * 24 * (60 * 60 / 62.9138346197));
        else if (pindexBest->nHeight <= nEighthBlockHalve)
            nSubsidy = (pindexPrev->nMoneySupply / COIN) * (ECOIN_YEAR_REWARD / 3) / (365 * 24 * (60 * 60 / 62.9138346197));
        else if (pindexBest->nHeight <= nNinthBlockHalve)
            nSubsidy = (pindexPrev->nMoneySupply / COIN) * (ACOIN_YEAR_REWARD / 3) / (365 * 24 * (60 * 60 / 62.9138346197));
        else if (pindexBest->nHeight <= nTenthBlockHalve)
            nSubsidy = (pindexPrev->nMoneySupply / COIN) * (MCOIN_YEAR_REWARD / 3) / (365 * 24 * (60 * 60 / 62.9138346197));
        else if (pindexBest->nHeight <= nElevenBlockHalve)
            nSubsidy = (pindexPrev->nMoneySupply / COIN) * (ZCOIN_YEAR_REWARD / 6) / (365 * 24 * (60 * 60 / 62.9138346197));
        else if (pindexBest->nHeight <= nTwelveBlockHalve)
            nSubsidy = (pindexPrev->nMoneySupply / COIN) * (XCOIN_YEAR_REWARD / 6) / (365 * 24 * (60 * 60 / 62.9138346197));
        else if (pindexBest->nHeight <= nThirteenBlockHalve)
            nSubsidy = (pindexPrev->nMoneySupply / COIN) * (BCOIN_YEAR_REWARD / 10) / (365 * 24 * (60 * 60 / 62.9138346197));
        else if (pindexBest->nHeight <= nFourteenBlockHalve)
            nSubsidy = (pindexPrev->nMoneySupply / COIN) * (GCOIN_YEAR_REWARD / 10) / (365 * 24 * (60 * 60 / 62.9138346197));
    } else {

        if (pindexBest->nHeight <= nFirstYearStake)
            nSubsidy = nCoinAge * COIN_YEAR_REWARD * 33 / (365 * 33 + 8);
        else if (pindexBest->nHeight <= nFirstBlockHalve)
            nSubsidy = nCoinAge * SCOIN_YEAR_REWARD * 33 / (365 * 33 + 8);
        else if (pindexBest->nHeight <= nSecondBlockHalve)
            nSubsidy = nCoinAge * CCOIN_YEAR_REWARD * 33 / (365 * 33 + 8);
        else if (pindexBest->nHeight <= nThirdBlockHalve)
            nSubsidy = nCoinAge * KCOIN_YEAR_REWARD * 33 / (365 * 33 + 8);
        else if (pindexBest->nHeight <= nFourthBlockHalve)
            nSubsidy = nCoinAge * ICOIN_YEAR_REWARD * 33 / (365 * 33 + 8);
        else if (pindexBest->nHeight <= nFifthBlockHalve)
            nSubsidy = nCoinAge * OCOIN_YEAR_REWARD * 33 / (365 * 33 + 8);
    }

    if (fDebug && GetBoolArg("-printcreation"))
        LogPrintf("GetProofOfStakeReward(): create=%s nCoinAge=%d\n", FormatMoney(nSubsidy).c_str(), nCoinAge);

    return nSubsidy + nFees;
}

//
// Main network
//

// Convert the pnSeeds6 array into usable address objects.
static void convertSeed6(std::vector<CAddress> &vSeedsOut, const SeedSpec6 *data, unsigned int count)
{
    // It'll only connect to one or two seed nodes because once it connects,
    // it'll get a pile of addresses with newer timestamps.
    // Seed nodes are given a random 'last seen time' of between one and two
    // weeks ago.
    const int64_t nOneWeek = 7*24*60*60;
    for (unsigned int i = 0; i < count; i++)
    {
        struct in6_addr ip;
        memcpy(&ip, data[i].addr, sizeof(ip));
        CAddress addr(CService(ip, data[i].port));
        addr.nTime = GetTime() - GetRand(nOneWeek) - nOneWeek;
        vSeedsOut.push_back(addr);
    }
}

// Convert the pnSeeds array into usable address objects.
static void convertSeeds(std::vector<CAddress> &vSeedsOut, const unsigned int *data, unsigned int count, int port)
{
    // It'll only connect to one or two seed nodes because once it connects,
    // it'll get a pile of addresses with newer timestamps.
    // Seed nodes are given a random 'last seen time' of between one and two
    // weeks ago.
    const int64_t nOneWeek = 7*24*60*60;
    for (unsigned int k = 0; k < count; ++k)
    {
        struct in_addr ip;
        unsigned int i = data[k], t;

        // -- convert to big endian
        t =   (i & 0x000000ff) << 24u
            | (i & 0x0000ff00) << 8u
            | (i & 0x00ff0000) >> 8u
            | (i & 0xff000000) >> 24u;

        memcpy(&ip, &t, sizeof(ip));

        CAddress addr(CService(ip, port));
        addr.nTime = GetTime()-GetRand(nOneWeek)-nOneWeek;
        vSeedsOut.push_back(addr);
    }
}

class CBaseChainParams : public CChainParams {
public:
    CBaseChainParams() {
        const char* pszTimestamp = "www.cryptocoinsnews.com/nydfss-ben-lawsky-reveals-plans-transitional-bitlicense-money2020/2014/11/03";
        CTransaction txNew;
        txNew.nTime = GENESIS_BLOCK_TIME;
        txNew.vin.resize(1);
        txNew.vout.resize(1);
        txNew.vin[0].scriptSig = CScript() << 0 << CBigNum(42) << std::vector<unsigned char>((const unsigned char*)pszTimestamp, (const unsigned char*)pszTimestamp + strlen(pszTimestamp));
        txNew.vout[0].SetEmpty();
        genesis.vtx.push_back(txNew);
        genesis.hashPrevBlock = 0;
        genesis.hashMerkleRoot = genesis.BuildMerkleTree();
        genesis.nVersion = 1;
        genesis.nTime    = GENESIS_BLOCK_TIME;

        vSeeds.push_back(CDNSSeedData("coinzen.pro", "xdns99.coinzen.pro"));
        vSeeds.push_back(CDNSSeedData("okcash.co", "seed1.okcash.co"));
        vSeeds.push_back(CDNSSeedData("okcash.co", "seed2.okcash.co"));
        vSeeds.push_back(CDNSSeedData("okcash.co", "seed3.okcash.co"));
        vSeeds.push_back(CDNSSeedData("okcash.co", "seed4.okcash.co"));
        vSeeds.push_back(CDNSSeedData("okcash.co", "seed5.okcash.co"));
        vSeeds.push_back(CDNSSeedData("okcash.co", "seed6.okcash.co"));
        vSeeds.push_back(CDNSSeedData("okcash.co", "seed7.okcash.co"));
        vSeeds.push_back(CDNSSeedData("okcash.co", "seed8.okcash.co"));
        vSeeds.push_back(CDNSSeedData("okcash.co", "seed9.okcash.co"));
    }
    virtual const CBlock& GenesisBlock() const { return genesis; }
    virtual const std::vector<CAddress>& FixedSeeds() const {
        return vFixedSeeds;
    }
protected:
    CBlock genesis;
    std::vector<CAddress> vFixedSeeds;
};

class CMainParams : public CBaseChainParams {
public:
    CMainParams() {
        strNetworkID = "main";

        // The message start string is designed to be unlikely to occur in normal data.
        // The characters are rarely used upper ASCII, not valid as UTF-8, and produce
        // a large 4-byte int at any alignment.
        pchMessageStart[0] = 0x69;
        pchMessageStart[1] = 0xf0;
        pchMessageStart[2] = 0x0f;
        pchMessageStart[3] = 0x69;

        vAlertPubKey = ParseHex("0482299e1ba91b8d726160247ff58cf8aa8030054e778c496a1271d190414d1e5babeb9fbb2ec594cbde7d299cb2d529f9dcee06d180315eec72c532b40dff1e5f");

        nDefaultPort = 6970;
        nRPCPort = 6969;
        nBIP44ID = 0x80000045;

        nLastPOWBlock = 33186;
        nLastFairLaunchBlock = 30;
        nDistributionFund = 1;

        nFirstPosv2Block = 575000;
        nFirstPosv3Block = 3027542;

        bnProofOfWorkLimit = CBigNum(~uint256(0) >> 20); // "standard" scrypt target limit for proof of work, results with 0,000244140625 proof-of-work difficulty
        bnProofOfStakeLimit = CBigNum(~uint256(0) >> 20);
        bnProofOfStakeLimitV2 = CBigNum(~uint256(0) >> 48);

        genesis.nBits    = bnProofOfWorkLimit.GetCompact();
        genesis.nNonce   = 672095;
        hashGenesisBlock = genesis.GetHash();

        assert(hashGenesisBlock == uint256("0x0000046309984501e5e724498cddb4aff41a126927355f64b44f1b8bba4f447e"));
        assert(genesis.hashMerkleRoot == uint256("0xeb465c4bc52c2730efca9ed897e1581f6266ba8d630e282b140d61a00e422108"));

        base58Prefixes[PUBKEY_ADDRESS]  = list_of(55).convert_to_container<std::vector<unsigned char> >();
        base58Prefixes[SCRIPT_ADDRESS]  = list_of(28).convert_to_container<std::vector<unsigned char> >();
        base58Prefixes[SECRET_KEY]      = list_of(183).convert_to_container<std::vector<unsigned char> >();
        base58Prefixes[STEALTH_ADDRESS] = list_of(40).convert_to_container<std::vector<unsigned char> >();
        base58Prefixes[EXT_PUBLIC_KEY]  = list_of(0x03)(0xCC)(0x23)(0xD7).convert_to_container<std::vector<unsigned char> >(); // okpv
        base58Prefixes[EXT_SECRET_KEY]  = list_of(0x03)(0xCC)(0x1C)(0x73).convert_to_container<std::vector<unsigned char> >(); // okub
        base58Prefixes[EXT_KEY_HASH]    = list_of(137).convert_to_container<std::vector<unsigned char> >();         // x
        base58Prefixes[EXT_ACC_HASH]    = list_of(83).convert_to_container<std::vector<unsigned char> >();          // a
        base58Prefixes[EXT_PUBLIC_KEY_BTC]  = list_of(0x04)(0x88)(0xB2)(0x1E).convert_to_container<std::vector<unsigned char> >(); // xprv
        base58Prefixes[EXT_SECRET_KEY_BTC]  = list_of(0x04)(0x88)(0xAD)(0xE4).convert_to_container<std::vector<unsigned char> >(); // xpub

        convertSeed6(vFixedSeeds, pnSeed6_main, ARRAYLEN(pnSeed6_main));
        convertSeeds(vFixedSeeds, pnSeed, ARRAYLEN(pnSeed), nDefaultPort);

        // 1 Year aprox = 501257 blocks 
        nFourteenBlockHalve = 27589135; // + 10 year blocks average            x 0.69 % staking rest at 0.33 %
        nThirteenBlockHalve = 22576565; // + 10 year blocks average            x 1 % staking
        nTwelveBlockHalve = 17563995; // + 10 year blocks average              x 2 % staking
        nElevenBlockHalve = 12551425; // + 10 year blocks average              x 3 % staking
        nTenthBlockHalve = 7538855; // + 2 year blocks average                 x 3.3 % staking
        nNinthBlockHalve = 6536341; // + 2 year blocks average                 x 3.6 % staking
        nEighthBlockHalve = 5533827; // + 2 year blocks average                x 3.9 % staking
        nSeventhBlockHalve = 4531313; // + 2 year blocks average               x 6.9 % staking
        nSixthBlockHalve = 3528799; // + 1 year blocks average                 x 11 % staking
        nFifthBlockHalve = 3027542; // + 1 year blocks average                 x 22 % staking
        nFourthBlockHalve = 2526285; // + 1 year blocks average                x 2.5 % staking
        nThirdBlockHalve = 2025028; // + 1 year blocks average                 x 5 % staking
        nSecondBlockHalve = 1523771; // + 1 year blocks average                x 10 % staking
        nFirstBlockHalve = 1022514; // + 1 year blocks average - 10k blockupdt x 20 % staking
        nFirstYearStake = 531257;  // 501257 blocks/year + 20k blocks(nov 30) + 10 k blocksupdate x 69 % staking    

    }

    virtual Network NetworkID() const { return CChainParams::MAIN; }
};
static CMainParams mainParams;

//
// Testnet
//

class CTestNetParams : public CBaseChainParams {
public:
    CTestNetParams() {
        strNetworkID = "test";
        strDataDir = "testnet";

        // The message start string is designed to be unlikely to occur in normal data.
        // The characters are rarely used upper ASCII, not valid as UTF-8, and produce
        // a large 4-byte int at any alignment.
        pchMessageStart[0] = 0x00;
        pchMessageStart[1] = 0x09;
        pchMessageStart[2] = 0x7a;
        pchMessageStart[3] = 0x0f;

        vAlertPubKey = ParseHex("04c20398b68bda9178e6b2ff4cddc8188608b9274921539e65af6e3b3199fbd8d3d9069d2c154aa3dbd54f89cd0bd8c04f0ba39bb100bc8ae25af2cf7fae21fd6c");

        nDefaultPort = 7980;
        nRPCPort = 7979;
        nBIP44ID = 0x80000001;

        nLastPOWBlock = 250;
        nLastFairLaunchBlock = 10;

        nFirstPosv2Block = 250;
        nFirstPosv3Block = 350;

        bnProofOfWorkLimit = CBigNum(~uint256(0) >> 16);
        bnProofOfStakeLimit = CBigNum(~uint256(0) >> 20);
        bnProofOfStakeLimitV2 = CBigNum(~uint256(0) >> 16);

        genesis.nBits  = bnProofOfWorkLimit.GetCompact();
        genesis.nNonce = 57136;
        hashGenesisBlock = genesis.GetHash();
        assert(hashGenesisBlock == uint256("0x0000e3283629707a14a6c5f3297995095ac0e337b2af9bca1358d4788ed86169"));

        base58Prefixes[PUBKEY_ADDRESS]  = list_of(68).convert_to_container<std::vector<unsigned char> >();
        base58Prefixes[SCRIPT_ADDRESS]  = list_of(73).convert_to_container<std::vector<unsigned char> >();
        base58Prefixes[SECRET_KEY]      = list_of(196).convert_to_container<std::vector<unsigned char> >();
        base58Prefixes[STEALTH_ADDRESS] = list_of(40).convert_to_container<std::vector<unsigned char> >();
        base58Prefixes[EXT_PUBLIC_KEY]  = list_of(0x04)(0x34)(0x18)(0xBB).convert_to_container<std::vector<unsigned char> >();
        base58Prefixes[EXT_SECRET_KEY]  = list_of(0x04)(0x34)(0x11)(0x56).convert_to_container<std::vector<unsigned char> >();
        base58Prefixes[EXT_KEY_HASH]    = list_of(75).convert_to_container<std::vector<unsigned char> >();          // X
        base58Prefixes[EXT_ACC_HASH]    = list_of(23).convert_to_container<std::vector<unsigned char> >();          // A
        base58Prefixes[EXT_PUBLIC_KEY_BTC]  = list_of(0x04)(0x35)(0x87)(0xCF).convert_to_container<std::vector<unsigned char> >(); // tprv
        base58Prefixes[EXT_SECRET_KEY_BTC]  = list_of(0x04)(0x35)(0x83)(0x94).convert_to_container<std::vector<unsigned char> >(); // tpub

        convertSeed6(vFixedSeeds, pnSeed6_test, ARRAYLEN(pnSeed6_test));
        convertSeeds(vFixedSeeds, pnTestnetSeed, ARRAYLEN(pnTestnetSeed), nDefaultPort);
    }
    virtual Network NetworkID() const { return CChainParams::TESTNET; }
};
static CTestNetParams testNetParams;


//
// Regression test
//
class CRegTestParams : public CTestNetParams {
public:
    CRegTestParams() {
        strNetworkID = "regtest";
        strDataDir = "regtest";

        nFirstPosv2Block = -1;
        nFirstPosv3Block = -1;

        pchMessageStart[0] = 0xaf;
        pchMessageStart[1] = 0x6b;
        pchMessageStart[2] = 0xb3;
        pchMessageStart[3] = 0xaa;
        bnProofOfWorkLimit = CBigNum(~uint256(0) >> 1);
        genesis.nTime = 1442228811;
        genesis.nBits  = bnProofOfWorkLimit.GetCompact();
        genesis.nNonce = 2;
        hashGenesisBlock = genesis.GetHash();
        nDefaultPort = 8989;

        assert(hashGenesisBlock == uint256("0x4bc540075b990f3f31755de4270047374c5681fd9deda3867f500cb5c71bb7f5"));

        vSeeds.clear();  // Regtest mode doesn't have any DNS seeds.
    }

    virtual bool RequireRPCPassword() const { return false; }
    virtual Network NetworkID() const { return CChainParams::REGTEST; }
};
static CRegTestParams regTestParams;

static CChainParams *pCurrentParams = &mainParams;

const CChainParams &Params() {
    return *pCurrentParams;
}

const CChainParams &TestNetParams() {
    return testNetParams;
}

const CChainParams &MainNetParams() {
    return mainParams;
}

void SelectParams(CChainParams::Network network)
{
    switch (network)
    {
        case CChainParams::MAIN:
            pCurrentParams = &mainParams;
            break;
        case CChainParams::TESTNET:
            pCurrentParams = &testNetParams;
            break;
        case CChainParams::REGTEST:
            pCurrentParams = &regTestParams;
            break;
        default:
            assert(false && "Unimplemented network");
            return;
    };
};

bool SelectParamsFromCommandLine()
{
    bool fRegTest = GetBoolArg("-regtest", false);
    bool fTestNet = GetBoolArg("-testnet", false);

    if (fTestNet && fRegTest)
    {
        return false;
    };

    if (fRegTest)
    {
        SelectParams(CChainParams::REGTEST);
    } else
    if (fTestNet)
    {
        SelectParams(CChainParams::TESTNET);
    } else
    {
        SelectParams(CChainParams::MAIN);
    };

    return true;
}

// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2012 The Bitcoin developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "rpcserver.h"
#include "main.h"
#include "db.h"
#include "txdb.h"
#include "init.h"
#include "miner.h"
#include "kernel.h"

#include <boost/assign/list_of.hpp>

using namespace json_spirit;
using namespace std;
using namespace boost::assign;

// Key used by getwork/getblocktemplate miners.
// Allocated in InitRPCMining, free'd in ShutdownRPCMining
static CReserveKey* pMiningKey = NULL;

void InitRPCMining()
{
    if (!pwalletMain)
        return;

    // getwork/getblocktemplate mining rewards paid here:
    pMiningKey = new CReserveKey(pwalletMain);
}

void ShutdownRPCMining()
{
    if (!pMiningKey)
        return;

    delete pMiningKey; pMiningKey = NULL;
}

Value getsubsidy(const Array& params, bool fHelp)
{
    if (fHelp || params.size() > 1)
        throw runtime_error(
            "getsubsidy [nTarget]\n"
            "Returns proof-of-work subsidy value for the specified value of target.");

   int nShowHeight;
   if (params.size() > 0)
       nShowHeight = atoi(params[0].get_str());
   else
       nShowHeight = nBestHeight+1; // block currently being solved

   return (uint64_t)Params().GetProofOfWorkReward(nShowHeight, 0);

}

Value getstakesubsidy(const Array& params, bool fHelp)
{
    if (fHelp || params.size() != 1)
        throw runtime_error(
            "getstakesubsidy <hex string>\n"
            "Returns proof-of-stake subsidy value for the specified coinstake.");

    RPCTypeCheck(params, list_of(str_type));

    vector<unsigned char> txData(ParseHex(params[0].get_str()));
    CDataStream ssData(txData, SER_NETWORK, PROTOCOL_VERSION);
    CTransaction tx;
    try {
        ssData >> tx;
    }
    catch (std::exception &e) {
        throw JSONRPCError(RPC_DESERIALIZATION_ERROR, "TX decode failed");
    }

    uint64_t nCoinAge;
    CTxDB txdb("r");
    if (!tx.GetCoinAge(txdb, pindexBest, nCoinAge))
        throw JSONRPCError(RPC_MISC_ERROR, "GetCoinAge failed");

    return (uint64_t)Params().GetProofOfStakeReward(pindexBest, nCoinAge, 0);
}

Value getmininginfo(const Array& params, bool fHelp)
{
    if (fHelp || params.size() != 0)
        throw runtime_error(
            "getmininginfo\n"
            "Returns an object containing mining-related information.");

    uint64_t nWeight = pwalletMain->GetStakeWeight();

    Object obj, diff, weight;
    obj.push_back(Pair("blocks",                (int)nBestHeight));
    obj.push_back(Pair("currentblocksize",      (uint64_t)nLastBlockSize));
    obj.push_back(Pair("currentblocktx",        (uint64_t)nLastBlockTx));

    if (nNodeMode == NT_FULL)
    {
        diff.push_back(Pair("proof-of-work",        GetDifficulty()));
        diff.push_back(Pair("proof-of-stake",       GetDifficulty(GetLastBlockIndex(pindexBest, true))));
    } else
    {
        diff.push_back(Pair("proof-of-work",  GetHeaderDifficulty()));
        diff.push_back(Pair("proof-of-stake", GetHeaderDifficulty(GetLastBlockThinIndex(pindexBestHeader, true))));  
    };

    diff.push_back(Pair("search-interval",      (int)nLastCoinStakeSearchInterval));
    obj.push_back(Pair("difficulty",            diff));

    obj.push_back(Pair("blockvalue",            (uint64_t)Params().GetProofOfWorkReward(nBestHeight+1, 0)));
    obj.push_back(Pair("netmhashps",            GetPoWMHashPS()));
    obj.push_back(Pair("netstakeweight",        GetPoSKernelPS()));
    obj.push_back(Pair("errors",                GetWarnings("statusbar")));
    obj.push_back(Pair("pooledtx",              (uint64_t)mempool.size()));
    weight.push_back(Pair("minimum",            (uint64_t)nWeight));
    weight.push_back(Pair("maximum",            (uint64_t)0));
    weight.push_back(Pair("combined",           (uint64_t)nWeight));
    obj.push_back(Pair("stakeweight",           weight));

    obj.push_back(Pair("stakeinterest",         (uint64_t)COIN_YEAR_REWARD));
    obj.push_back(Pair("stakeinterest",         (uint64_t)SCOIN_YEAR_REWARD));
    obj.push_back(Pair("stakeinterest",         (uint64_t)CCOIN_YEAR_REWARD));
    obj.push_back(Pair("stakeinterest",         (uint64_t)KCOIN_YEAR_REWARD));
    obj.push_back(Pair("stakeinterest",         (uint64_t)ICOIN_YEAR_REWARD));
    obj.push_back(Pair("stakeinterest",         (uint64_t)OCOIN_YEAR_REWARD));
    obj.push_back(Pair("stakeinterest",         (uint64_t)DCOIN_YEAR_REWARD));
    obj.push_back(Pair("stakeinterest",         (uint64_t)RCOIN_YEAR_REWARD));
    obj.push_back(Pair("stakeinterest",         (uint64_t)ECOIN_YEAR_REWARD));
    obj.push_back(Pair("stakeinterest",         (uint64_t)ACOIN_YEAR_REWARD));
    obj.push_back(Pair("stakeinterest",         (uint64_t)MCOIN_YEAR_REWARD));
    obj.push_back(Pair("stakeinterest",         (uint64_t)ZCOIN_YEAR_REWARD));
    obj.push_back(Pair("stakeinterest",         (uint64_t)XCOIN_YEAR_REWARD));
    obj.push_back(Pair("stakeinterest",         (uint64_t)BCOIN_YEAR_REWARD));
    obj.push_back(Pair("stakeinterest",         (uint64_t)GCOIN_YEAR_REWARD));
    obj.push_back(Pair("stakeinterest",         (uint64_t)FCOIN_YEAR_REWARD));
    obj.push_back(Pair("testnet",               fTestNet));
    return obj;
}

Value getstakinginfo(const Array& params, bool fHelp)
{
    if (fHelp || params.size() != 0)
        throw runtime_error(
            "getstakinginfo\n"
            "Returns an object containing staking-related information.");

    uint64_t nWeight = pwalletMain->GetStakeWeight();

    uint64_t nNetworkWeight = GetPoSKernelPS();
    bool staking = nLastCoinStakeSearchInterval && nWeight;
    uint64_t nExpectedTime = staking ? (GetTargetSpacing(nBestHeight) * nNetworkWeight / nWeight) : 0;

    Object obj;

    obj.push_back(Pair("enabled", GetBoolArg("-staking", true)));
    obj.push_back(Pair("staking", staking));
    obj.push_back(Pair("errors", GetWarnings("statusbar")));

    obj.push_back(Pair("currentblocksize", (uint64_t)nLastBlockSize));
    obj.push_back(Pair("currentblocktx", (uint64_t)nLastBlockTx));
    obj.push_back(Pair("pooledtx", (uint64_t)mempool.size()));

    obj.push_back(Pair("difficulty", GetDifficulty(GetLastBlockIndex(pindexBest, true))));
    obj.push_back(Pair("search-interval", (int)nLastCoinStakeSearchInterval));

    obj.push_back(Pair("weight", (uint64_t)nWeight));
    obj.push_back(Pair("netstakeweight", (uint64_t)nNetworkWeight));

    obj.push_back(Pair("expectedtime", nExpectedTime));

    return obj;
}

Value checkkernel(const Array& params, bool fHelp)
{
    if (fHelp || params.size() < 1 || params.size() > 2)
        throw runtime_error(
            "checkkernel [{\"txid\":txid,\"vout\":n},...] [createblocktemplate=false]\n"
            "Check if one of given inputs is a kernel input at the moment.\n"
        );

    RPCTypeCheck(params, list_of(array_type)(bool_type));

    Array inputs = params[0].get_array();
    bool fCreateBlockTemplate = params.size() > 1 ? params[1].get_bool() : false;

    if (vNodes.empty())
        throw JSONRPCError(-9, "Okcash is not connected!");

    if (IsInitialBlockDownload())
        throw JSONRPCError(-10, "Okcash is downloading blocks...");

    COutPoint kernel;
    CBlockIndex* pindexPrev = pindexBest;
    unsigned int nBits = GetNextTargetRequired(pindexPrev, true);
    int64_t nTime = GetAdjustedTime();
    nTime &= ~STAKE_TIMESTAMP_MASK;

    BOOST_FOREACH(Value& input, inputs)
    {
        const Object& o = input.get_obj();

        const Value& txid_v = find_value(o, "txid");
        if (txid_v.type() != str_type)
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid parameter, missing txid key");
        string txid = txid_v.get_str();
        if (!IsHex(txid))
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid parameter, expected hex txid");

        const Value& vout_v = find_value(o, "vout");
        if (vout_v.type() != int_type)
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid parameter, missing vout key");
        int nOutput = vout_v.get_int();
        if (nOutput < 0)
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid parameter, vout must be positive");

        COutPoint cInput(uint256(txid), nOutput);
        if (CheckKernel(pindexPrev, nBits, nTime, cInput))
        {
            kernel = cInput;
            break;
        }
    }

    Object result;
    result.push_back(Pair("found", !kernel.IsNull()));

    if (kernel.IsNull())
        return result;

    Object oKernel;
    oKernel.push_back(Pair("txid", kernel.hash.GetHex()));
    oKernel.push_back(Pair("vout", (int64_t)kernel.n));
    oKernel.push_back(Pair("time", nTime));
    result.push_back(Pair("kernel", oKernel));

    if (!fCreateBlockTemplate)
        return result;

    int64_t nFees;
    auto_ptr<CBlock> pblock(CreateNewBlock(pwalletMain, true, &nFees));

    pblock->nTime = pblock->vtx[0].nTime = nTime;

    CDataStream ss(SER_DISK, PROTOCOL_VERSION);
    ss << *pblock;

    result.push_back(Pair("blocktemplate", HexStr(ss.begin(), ss.end())));
    result.push_back(Pair("blocktemplatefees", nFees));

    CPubKey pubkey;
    if (!pMiningKey->GetReservedKey(pubkey))
        throw JSONRPCError(RPC_MISC_ERROR, "GetReservedKey failed");

    result.push_back(Pair("blocktemplatesignkey", HexStr(pubkey)));

    return result;
}

Value getworkex(const Array& params, bool fHelp)
{
    if (fHelp || params.size() > 2)
        throw runtime_error(
            "getworkex [data, coinbase]\n"
            "If [data, coinbase] is not specified, returns extended work data.\n"
        );

    if (vNodes.empty())
        throw JSONRPCError(-9, "Okcash is not connected!");

    if (IsInitialBlockDownload())
        throw JSONRPCError(-10, "Okcash is downloading blocks...");

    if (pindexBest->nHeight >= Params().LastPOWBlock())
        throw JSONRPCError(RPC_MISC_ERROR, "No more PoW blocks");

    typedef map<uint256, pair<CBlock*, CScript> > mapNewBlock_t;
    static mapNewBlock_t mapNewBlock;
    static vector<CBlock*> vNewBlock;

    if (params.size() == 0)
    {
        // Update block
        static unsigned int nTransactionsUpdatedLast;
        static CBlockIndex* pindexPrev;
        static int64_t nStart;
        static CBlock* pblock;
        if (pindexPrev != pindexBest ||
            (mempool.GetTransactionsUpdated() != nTransactionsUpdatedLast && GetTime() - nStart > 60))
        {
            if (pindexPrev != pindexBest)
            {
                // Deallocate old blocks since they're obsolete now
                mapNewBlock.clear();
                BOOST_FOREACH(CBlock* pblock, vNewBlock)
                    delete pblock;
                vNewBlock.clear();
            }
            nTransactionsUpdatedLast = mempool.GetTransactionsUpdated();
            pindexPrev = pindexBest;
            nStart = GetTime();

            // Create new block
            pblock = CreateNewBlock(pwalletMain);
            if (!pblock)
                throw JSONRPCError(-7, "Out of memory");
            vNewBlock.push_back(pblock);
        }

        // Update nTime
        pblock->nTime = max(pindexPrev->GetPastTimeLimit()+1, GetAdjustedTime());
        pblock->nNonce = 0;

        // Update nExtraNonce
        static unsigned int nExtraNonce = 0;
        IncrementExtraNonce(pblock, pindexPrev, nExtraNonce);

        // Save
        mapNewBlock[pblock->hashMerkleRoot] = make_pair(pblock, pblock->vtx[0].vin[0].scriptSig);

        // Prebuild hash buffers
        char pmidstate[32];
        char pdata[128];
        char phash1[64];
        FormatHashBuffers(pblock, pmidstate, pdata, phash1);

        uint256 hashTarget = CBigNum().SetCompact(pblock->nBits).getuint256();

        CTransaction coinbaseTx = pblock->vtx[0];
        std::vector<uint256> merkle = pblock->GetMerkleBranch(0);

        Object result;
        result.push_back(Pair("data",     HexStr(BEGIN(pdata), END(pdata))));
        result.push_back(Pair("target",   HexStr(BEGIN(hashTarget), END(hashTarget))));

        CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
        ssTx << coinbaseTx;
        result.push_back(Pair("coinbase", HexStr(ssTx.begin(), ssTx.end())));

        Array merkle_arr;

        BOOST_FOREACH(uint256 merkleh, merkle) {
            merkle_arr.push_back(HexStr(BEGIN(merkleh), END(merkleh)));
        }

        result.push_back(Pair("merkle", merkle_arr));


        return result;
    }
    else
    {
        // Parse parameters
        vector<unsigned char> vchData = ParseHex(params[0].get_str());
        vector<unsigned char> coinbase;

        if(params.size() == 2)
            coinbase = ParseHex(params[1].get_str());

        if (vchData.size() != 128)
            throw JSONRPCError(-8, "Invalid parameter");

        CBlock* pdata = (CBlock*)&vchData[0];

        // Byte reverse
        for (int i = 0; i < 128/4; i++)
            ((unsigned int*)pdata)[i] = ByteReverse(((unsigned int*)pdata)[i]);

        // Get saved block
        if (!mapNewBlock.count(pdata->hashMerkleRoot))
            return false;
        CBlock* pblock = mapNewBlock[pdata->hashMerkleRoot].first;

        pblock->nTime = pdata->nTime;
        pblock->nNonce = pdata->nNonce;

        if(coinbase.size() == 0)
            pblock->vtx[0].vin[0].scriptSig = mapNewBlock[pdata->hashMerkleRoot].second;
        else
            CDataStream(coinbase, SER_NETWORK, PROTOCOL_VERSION) >> pblock->vtx[0]; // FIXME - HACK!

        pblock->hashMerkleRoot = pblock->BuildMerkleTree();

        return CheckWork(pblock, *pwalletMain, *pMiningKey);
    }
}


Value getwork(const Array& params, bool fHelp)
{
    if (fHelp || params.size() > 1)
        throw runtime_error(
            "getwork [data]\n"
            "If [data] is not specified, returns formatted hash data to work on:\n"
            "  \"midstate\" : precomputed hash state after hashing the first half of the data (DEPRECATED)\n" // deprecated
            "  \"data\" : block data\n"
            "  \"hash1\" : formatted hash buffer for second hash (DEPRECATED)\n" // deprecated
            "  \"target\" : little endian hash target\n"
            "If [data] is specified, tries to solve the block and returns true if it was successful.");

    if (nNodeMode != NT_FULL)
        throw JSONRPCError(RPC_MISC_ERROR, "Not running as a full node!");

    if (vNodes.empty())
        throw JSONRPCError(RPC_CLIENT_NOT_CONNECTED, "Okcash is not connected!");

    if (IsInitialBlockDownload())
        throw JSONRPCError(RPC_CLIENT_IN_INITIAL_DOWNLOAD, "Okcash is downloading blocks...");

    if (pindexBest->nHeight >= Params().LastPOWBlock())
        throw JSONRPCError(RPC_MISC_ERROR, "No more PoW blocks");

    typedef map<uint256, pair<CBlock*, CScript> > mapNewBlock_t;
    static mapNewBlock_t mapNewBlock;    // FIXME: thread safety
    static vector<CBlock*> vNewBlock;
    static CReserveKey reservekey(pwalletMain);

    if (params.size() == 0)
    {
        // Update block
        static unsigned int nTransactionsUpdatedLast;
        static CBlockIndex* pindexPrev;
        static int64_t nStart;
        static CBlock* pblock;
        if (pindexPrev != pindexBest ||
            (mempool.GetTransactionsUpdated() != nTransactionsUpdatedLast && GetTime() - nStart > 60))
        {
            if (pindexPrev != pindexBest)
            {
                // Deallocate old blocks since they're obsolete now
                mapNewBlock.clear();
                BOOST_FOREACH(CBlock* pblock, vNewBlock)
                    delete pblock;
                vNewBlock.clear();
            }

            // Clear pindexPrev so future getworks make a new block, despite any failures from here on
            pindexPrev = NULL;

            // Store the pindexBest used before CreateNewBlock, to avoid races
            nTransactionsUpdatedLast = mempool.GetTransactionsUpdated();
            CBlockIndex* pindexPrevNew = pindexBest;
            nStart = GetTime();

            // Create new block
            pblock = CreateNewBlock(pwalletMain);
            if (!pblock)
                throw JSONRPCError(RPC_OUT_OF_MEMORY, "Out of memory");
            vNewBlock.push_back(pblock);

            // Need to update only after we know CreateNewBlock succeeded
            pindexPrev = pindexPrevNew;
        }

        // Update nTime
        pblock->UpdateTime(pindexPrev);
        pblock->nNonce = 0;

        // Update nExtraNonce
        static unsigned int nExtraNonce = 0;
        IncrementExtraNonce(pblock, pindexPrev, nExtraNonce);

        // Save
        mapNewBlock[pblock->hashMerkleRoot] = make_pair(pblock, pblock->vtx[0].vin[0].scriptSig);

        // Pre-build hash buffers
        char pmidstate[32];
        char pdata[128];
        char phash1[64];
        FormatHashBuffers(pblock, pmidstate, pdata, phash1);

        uint256 hashTarget = CBigNum().SetCompact(pblock->nBits).getuint256();

        Object result;
        result.push_back(Pair("midstate", HexStr(BEGIN(pmidstate), END(pmidstate)))); // deprecated
        result.push_back(Pair("data",     HexStr(BEGIN(pdata), END(pdata))));
        result.push_back(Pair("hash1",    HexStr(BEGIN(phash1), END(phash1)))); // deprecated
        result.push_back(Pair("target",   HexStr(BEGIN(hashTarget), END(hashTarget))));
        return result;
    }
    else
    {
        // Parse parameters
        vector<unsigned char> vchData = ParseHex(params[0].get_str());
        if (vchData.size() != 128)
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid parameter");
        CBlock* pdata = (CBlock*)&vchData[0];

        // Byte reverse
        for (int i = 0; i < 128/4; i++)
            ((unsigned int*)pdata)[i] = ByteReverse(((unsigned int*)pdata)[i]);

        // Get saved block
        if (!mapNewBlock.count(pdata->hashMerkleRoot))
            return false;
        CBlock* pblock = mapNewBlock[pdata->hashMerkleRoot].first;

        pblock->nTime = pdata->nTime;
        pblock->nNonce = pdata->nNonce;
        pblock->vtx[0].vin[0].scriptSig = mapNewBlock[pdata->hashMerkleRoot].second;
        pblock->hashMerkleRoot = pblock->BuildMerkleTree();

        return CheckWork(pblock, *pwalletMain, reservekey);
    }
}


Value getblocktemplate(const Array& params, bool fHelp)
{
    if (fHelp || params.size() > 1)
        throw runtime_error(
            "getblocktemplate [params]\n"
            "Returns data needed to construct a block to work on:\n"
            "  \"version\" : block version\n"
            "  \"previousblockhash\" : hash of current highest block\n"
            "  \"transactions\" : contents of non-coinbase transactions that should be included in the next block\n"
            "  \"coinbaseaux\" : data that should be included in coinbase\n"
            "  \"coinbasevalue\" : maximum allowable input to coinbase transaction, including the generation award and transaction fees\n"
            "  \"target\" : hash target\n"
            "  \"mintime\" : minimum timestamp appropriate for next block\n"
            "  \"curtime\" : current timestamp\n"
            "  \"mutable\" : list of ways the block template may be changed\n"
            "  \"noncerange\" : range of valid nonces\n"
            "  \"sigoplimit\" : limit of sigops in blocks\n"
            "  \"sizelimit\" : limit of block size\n"
            "  \"bits\" : compressed target of next block\n"
            "  \"height\" : height of the next block\n"
            "See https://en.bitcoin.it/wiki/BIP_0022 for full specification.");

    std::string strMode = "template";
    if (params.size() > 0)
    {
        const Object& oparam = params[0].get_obj();
        const Value& modeval = find_value(oparam, "mode");
        if (modeval.type() == str_type)
            strMode = modeval.get_str();
        else if (modeval.type() == null_type)
        {
            /* Do nothing */
        }
        else
            throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid mode");
    }

    if (strMode != "template")
        throw JSONRPCError(RPC_INVALID_PARAMETER, "Invalid mode");

    if (vNodes.empty())
        throw JSONRPCError(RPC_CLIENT_NOT_CONNECTED, "Okcash is not connected!");

    if (IsInitialBlockDownload())
        throw JSONRPCError(RPC_CLIENT_IN_INITIAL_DOWNLOAD, "Okcash is downloading blocks...");

    if (pindexBest->nHeight >= Params().LastPOWBlock())
        throw JSONRPCError(RPC_MISC_ERROR, "No more PoW blocks");

    static CReserveKey reservekey(pwalletMain);

    // Update block
    static unsigned int nTransactionsUpdatedLast;
    static CBlockIndex* pindexPrev;
    static int64_t nStart;
    static CBlock* pblock;
    if (pindexPrev != pindexBest ||
        (mempool.GetTransactionsUpdated() != nTransactionsUpdatedLast && GetTime() - nStart > 5))
    {
        // Clear pindexPrev so future calls make a new block, despite any failures from here on
        pindexPrev = NULL;

        // Store the pindexBest used before CreateNewBlock, to avoid races
        nTransactionsUpdatedLast = mempool.GetTransactionsUpdated();
        CBlockIndex* pindexPrevNew = pindexBest;
        nStart = GetTime();

        // Create new block
        if(pblock)
        {
            delete pblock;
            pblock = NULL;
        }

        pblock = CreateNewBlock(pwalletMain);
        if (!pblock)
            throw JSONRPCError(RPC_OUT_OF_MEMORY, "Out of memory");

        // Need to update only after we know CreateNewBlock succeeded
        pindexPrev = pindexPrevNew;
    }

    // Update nTime
    pblock->UpdateTime(pindexPrev);
    pblock->nNonce = 0;

    Array transactions;
    map<uint256, int64_t> setTxIndex;
    int i = 0;
    CTxDB txdb("r");
    BOOST_FOREACH (CTransaction& tx, pblock->vtx)
    {
        uint256 txHash = tx.GetHash();
        setTxIndex[txHash] = i++;

        if (tx.IsCoinBase() || tx.IsCoinStake())
            continue;

        Object entry;

        CDataStream ssTx(SER_NETWORK, PROTOCOL_VERSION);
        ssTx << tx;
        entry.push_back(Pair("data", HexStr(ssTx.begin(), ssTx.end())));

        entry.push_back(Pair("hash", txHash.GetHex()));

        MapPrevTx mapInputs;
        map<uint256, CTxIndex> mapUnused;
        bool fInvalid = false;
        if (tx.FetchInputs(txdb, mapUnused, false, false, mapInputs, fInvalid))
        {
            entry.push_back(Pair("fee", (int64_t)(tx.GetValueIn(mapInputs) - tx.GetValueOut())));

            Array deps;
            BOOST_FOREACH (MapPrevTx::value_type& inp, mapInputs)
            {
                if (setTxIndex.count(inp.first))
                    deps.push_back(setTxIndex[inp.first]);
            }
            entry.push_back(Pair("depends", deps));

            int64_t nSigOps = tx.GetLegacySigOpCount();
            nSigOps += tx.GetP2SHSigOpCount(mapInputs);
            entry.push_back(Pair("sigops", nSigOps));
        }

        transactions.push_back(entry);
    }

    Object aux;
    aux.push_back(Pair("flags", HexStr(COINBASE_FLAGS.begin(), COINBASE_FLAGS.end())));

    uint256 hashTarget = CBigNum().SetCompact(pblock->nBits).getuint256();

    static Array aMutable;

    if (aMutable.empty())
    {
        aMutable.push_back("time");
        aMutable.push_back("transactions");
        aMutable.push_back("prevblock");
    }

    Object result;
    result.push_back(Pair("version", pblock->nVersion));
    result.push_back(Pair("previousblockhash", pblock->hashPrevBlock.GetHex()));
    result.push_back(Pair("transactions", transactions));
    result.push_back(Pair("coinbaseaux", aux));
    result.push_back(Pair("coinbasevalue", (int64_t)pblock->vtx[0].vout[0].nValue));
    result.push_back(Pair("target", hashTarget.GetHex()));
    result.push_back(Pair("mintime", (int64_t)pindexPrev->GetPastTimeLimit()+1));
    result.push_back(Pair("mutable", aMutable));
    result.push_back(Pair("noncerange", "00000000ffffffff"));
    result.push_back(Pair("sigoplimit", (int64_t)MAX_BLOCK_SIGOPS));
    result.push_back(Pair("sizelimit", (int64_t)MAX_BLOCK_SIZE));
    result.push_back(Pair("curtime", (int64_t)pblock->nTime));
    result.push_back(Pair("bits", HexBits(pblock->nBits)));
    result.push_back(Pair("height", (int64_t)(pindexPrev->nHeight+1)));

    return result;
}

Value submitblock(const Array& params, bool fHelp)
{
    if (fHelp || params.size() < 1 || params.size() > 2)
        throw runtime_error(
            "submitblock <hex data> [optional-params-obj]\n"
            "[optional-params-obj] parameter is currently ignored.\n"
            "Attempts to submit new block to network.\n"
            "See https://en.bitcoin.it/wiki/BIP_0022 for full specification.");

    vector<unsigned char> blockData(ParseHex(params[0].get_str()));
    CDataStream ssBlock(blockData, SER_NETWORK, PROTOCOL_VERSION);
    CBlock block;
    try {
        ssBlock >> block;
    }
    catch (std::exception &e) {
        throw JSONRPCError(RPC_DESERIALIZATION_ERROR, "Block decode failed");
    }

    if (params.size() > 1)
    {
        const Object& oparam = params[1].get_obj();

        const Value& coinstake_v = find_value(oparam, "coinstake");
        if (coinstake_v.type() == str_type)
        {
            vector<unsigned char> txData(ParseHex(coinstake_v.get_str()));
            CDataStream ssTx(txData, SER_NETWORK, PROTOCOL_VERSION);
            CTransaction txCoinStake;
            try {
                ssTx >> txCoinStake;
            }
            catch (std::exception &e) {
                throw JSONRPCError(RPC_DESERIALIZATION_ERROR, "Coinstake decode failed");
            }

            block.vtx.insert(block.vtx.begin() + 1, txCoinStake);
            block.hashMerkleRoot = block.BuildMerkleTree();

            CPubKey pubkey;
            if (!pMiningKey->GetReservedKey(pubkey))
                throw JSONRPCError(RPC_MISC_ERROR, "GetReservedKey failed");

            CKey key;
            if (!pwalletMain->GetKey(pubkey.GetID(), key))
                throw JSONRPCError(RPC_MISC_ERROR, "GetKey failed");

            if (!key.Sign(block.GetHash(), block.vchBlockSig))
                throw JSONRPCError(RPC_MISC_ERROR, "Sign failed");
        }
    }
    uint256 hashblock = block.GetHash();
    bool fAccepted = ProcessBlock(NULL, &block, hashblock);
    if (!fAccepted)
        return "rejected";

    return Value::null;
}


// Copyright (c) 2009-2012 The Bitcoin developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <boost/assign/list_of.hpp> // for 'map_list_of()'
#include <boost/foreach.hpp>

#include "checkpoints.h"

#include "txdb.h"
#include "main.h"
#include "uint256.h"


static const int nCheckpointSpan = 500;

namespace Checkpoints
{

    //
    // What makes a good checkpoint block?
    // + Is surrounded by blocks with reasonable timestamps
    //   (no blocks before with a timestamp after, none after with
    //    timestamp before)
    // + Contains no strange transactions
    //

    typedef std::map<int, uint256> MapCheckpoints;


    //
    // How many times we expect transactions after the last checkpoint to
    // be slower. This number is conservative. On multi-core CPUs with
    // parallel signature checking enabled, this number is way too high.
    // We prefer a progressbar that's faster at the end than the other
    // way around, though.
    static const double fSigcheckVerificationFactor = 15.0;

    struct CCheckpointData {
        const MapCheckpoints *mapCheckpoints;
        int64_t nTimeLastCheckpoint;
        int64_t nTransactionsLastCheckpoint;
        double fTransactionsPerDay;
    };

    MapCheckpoints mapCheckpoints =
        boost::assign::map_list_of
        ( 0,        uint256("0x0000046309984501e5e724498cddb4aff41a126927355f64b44f1b8bba4f447e") ) // Params().HashGenesisBlock())
        ( 6900,     uint256("0x00000000007ab23f193e14dce62f4e7713b15e9fc7555ee82188d126abbe2c2f") )
        ( 69000,    uint256("0x2145ba590371077d372550850c81a4db38e8bc026e500cfe0a20e8859485dcc3") )
        ( 88888,    uint256("0xbe44edfa112d8cc3fcabd873a2fb4f606310f57ce1c7f7630db790ed0dbd325e") )
        ( 111111,   uint256("0xf3ada8d6d5aea41dad9d8a6146c2f5066b796e33d465c58e0bc1cdfd81d656a3") )
        ( 200000,   uint256("0x40ffcce0ac611aab08c7acd41c66201e1584ba36d017657e224a77901282bb7d") )
        ( 240000,   uint256("0x1db5755d5947747cbfb5f6edd98a8ff0bf5f4c8d42a5958c96f1682763f3827f") )
        ( 280000,   uint256("0xf8f9b5bb15d44af850e566e112679f13673d2d32ba65ef78549161bcadfc388b") )
        ( 300000,   uint256("0xbd1178c903fbf5a2ed6c7e7207f82a828f392d8d80499d9daa2ad2311817d075") )
        ( 360000,   uint256("0xfad01c88115aeacf5871459cc76325b6766214334c98d9b53da48dc6605b725c") )
        ( 400000,   uint256("0xc0bf944bac3cb24974578c5c17479cb05ac41d12305b51b324eadcb2855b1a14") )
        ( 471000,   uint256("0x8ea2035f9a8bd9edaa9f39897f9e6e7492736a2815ec1507ddcb40a963c93293") )
        ( 500000,   uint256("0x2d2139f39759be2e70b1ea42211ccf07c2a20787f81485b2cc4544166dd57bef") )
        ( 560000,   uint256("0x9bab9b7588d4a2929ec36a27b5c7fccf1ae9063b408d91f92fc288a1c1dea751") )
        ( 720000,   uint256("0xd379d5bba81966d4fe3d7d1065a2e8be2380582d12a92101e4d648d14b32055f") )
        ( 798000,   uint256("0xb84acefdd7acd8b63e78fab121ed57aa5428e5f634c6f9c09d7cfe79a4ff19fc") )
        ( 900000,   uint256("0x1ee5e72f281b50f95ac5452f9f2b1fca34595b99b8815a85a7ab97e964919860") )
        ( 972000,   uint256("0xd302a7015edd96078ba02a5d4b51e7377428386e3e911a76eb0dd5bddaf0697a") )
        ( 1117300,   uint256("0x190e3b4224643d868b451f2b8e13a2a48ac605dc776e661920fc1ab48e27a460") )
        ( 1230333,   uint256("0xeba330f3efa967bef8f9e6530577a3e030b2e442cc817dce5460eb1beb5e1b20") )
        ( 1330333,   uint256("0xf81d9e7013b95ea3be7d41674029dd6fe2c8f4abf6ecefb98c4a80ad01eeb5bc") )
        ( 1904444,   uint256("0x1dbe1b873c8fddf05aa5055274b5b15e22161fdc3bd8b7dc7819f94ca58bc5ae") )
        ( 2017171,   uint256("0x8c46a987d8b7956d8d30ee0e9f21700923187053074c677c1f75bd99abda90fa") )
        ( 2308300,   uint256("0x7125680b2ed17924a3a77915334e44b119d0c32c215c6f3be8700a3fc08e2deb") )
        ( 2370700,   uint256("0x7f2bccc681e40ca2aa44a9f83fa8301676cc66a690e7a346b486353dcdf6176a") )
        ( 2494200,   uint256("0x1dd3dca52ec2f3aa80492e48926eec03edb73897269b69c6eaabee3452ddce97") )
        ( 2530000,   uint256("0x13fdac99dee847cab93c16e56cb3ce432c50b0b89988b89e160d7bb7d6666da2") )
        ( 2672672,   uint256("0xe8523e5c85baa3266f4b48e142870f134eaf1002bdbf303df62e6293fbb4756b") )
        ( 2743333,   uint256("0x20f49fe920e37b017800ef1156b2d3f3cbae80692048a942fdf5e7500c0f24e4") )
        ( 2796069,   uint256("0xb39d845f2307dd4b2e1b615f9311d26edae83327c3831a65220658093dc24666") )
        ( 3219000,   uint256("0x33dc4efceab9f20455432ff4d57bb3a08ac6c21e429d4f9a8fda4fbf277e1936") )
        ( 3560969,   uint256("0x16a73f910d4f7fb2835d5321662de7ef899079f76e292b9d4faf4e9f3ded6774") )
    ;
    static const CCheckpointData data = {
        &mapCheckpoints,
        1668839168, // * UNIX timestamp of last checkpoint block
        11011160,   // * total number of transactions between genesis and last checkpoint
                    //   (the tx=... number in the SetBestChain debug.log lines)
        5000.0     // * estimated number of transactions per day after checkpoint
    };

    // TestNet has no checkpoints
    MapCheckpoints mapCheckpointsTestnet;


    bool CheckHardened(int nHeight, const uint256& hash)
    {
        MapCheckpoints& checkpoints = (fTestNet ? mapCheckpointsTestnet : mapCheckpoints);

        MapCheckpoints::const_iterator i = checkpoints.find(nHeight);
        if (i == checkpoints.end())
            return true;
        return hash == i->second;
    }

    int GetTotalBlocksEstimate()
    {

        MapCheckpoints& checkpoints = (fTestNet ? mapCheckpointsTestnet : mapCheckpoints);

        if (checkpoints.empty())
            return 0;
        return checkpoints.rbegin()->first;
    }

    // Guess how far we are in the verification process at the given block index
    double GuessVerificationProgress(CBlockIndex *pindex) {

        //int64_t nNow = time(NULL);
        //int nEstimBlocks = GetNumBlocksOfPeers();
        //double nRemainingBlocks = nEstimBlocks - pindex->nHeight;

        if (pindex->nHeight < 0) {
            return 0.0;
        } else if (pindex->nHeight > GetNumBlocksOfPeers()) {
            return 0.99996298;
        } else {
            return pindex->nHeight / (GetNumBlocksOfPeers() * 1.0);
        }
    }

    CBlockIndex* GetLastCheckpoint(const std::map<uint256, CBlockIndex*>& mapBlockIndex)
    {
        MapCheckpoints& checkpoints = (fTestNet ? mapCheckpointsTestnet : mapCheckpoints);

        BOOST_REVERSE_FOREACH(const MapCheckpoints::value_type& i, checkpoints)
        {
            const uint256& hash = i.second;
            std::map<uint256, CBlockIndex*>::const_iterator t = mapBlockIndex.find(hash);
            if (t != mapBlockIndex.end())
                return t->second;
        }
        return NULL;
    }

    CBlockThinIndex* GetLastCheckpoint(const std::map<uint256, CBlockThinIndex*>& mapBlockThinIndex)
    {
        MapCheckpoints& checkpoints = (fTestNet ? mapCheckpointsTestnet : mapCheckpoints);

        BOOST_REVERSE_FOREACH(const MapCheckpoints::value_type& i, checkpoints)
        {
            const uint256& hash = i.second;
            std::map<uint256, CBlockThinIndex*>::const_iterator t = mapBlockThinIndex.find(hash);
            if (t != mapBlockThinIndex.end())
                return t->second;
        }
        return NULL;
    }


    // Automatically select a suitable sync-checkpoint
    const CBlockIndex* AutoSelectSyncCheckpoint()
    {
        const CBlockIndex *pindex = pindexBest;
        // Search backward for a block within max span and maturity window
        while (pindex->pprev && pindex->nHeight + nCheckpointSpan > pindexBest->nHeight)
            pindex = pindex->pprev;
        return pindex;
    }

    // Automatically select a suitable sync-checkpoint - Thin mode
    const CBlockThinIndex* AutoSelectSyncThinCheckpoint()
    {
        const CBlockThinIndex *pindex = pindexBestHeader;
        // Search backward for a block within max span and maturity window
        while (pindex->pprev && pindex->nHeight + nCheckpointSpan > pindexBest->nHeight)
            pindex = pindex->pprev;
        return pindex;
    }

    // Check against synchronized checkpoint
    bool CheckSync(int nHeight)
    {
        if(nNodeMode == NT_FULL)
        {
            const CBlockIndex* pindexSync = AutoSelectSyncCheckpoint();

            if (nHeight <= pindexSync->nHeight)
                return false;
        }
        else {
            const CBlockThinIndex *pindexSync = AutoSelectSyncThinCheckpoint();

            if (nHeight <= pindexSync->nHeight)
                return false;
        }
        return true;
    }
}

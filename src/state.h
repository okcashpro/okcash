// Copyright (c) 2014 The Okcash Developers
// Distributed under the MIT/X11 software license, see the accompanying
// file license.txt or http://www.opensource.org/licenses/mit-license.php.

#ifndef COIN_STATE_H
#define COIN_STATE_H

#include <string>
#include "sync.h"

enum eNodeType
{
    NT_FULL = 1,
    NT_THIN,
    NT_UNKNOWN // end marker
};

enum eNodeState
{
    NS_STARTUP = 1,
    NS_GET_HEADERS,
    NS_GET_FILTERED_BLOCKS,
    NS_READY,
    
    NS_UNKNOWN // end marker
};

enum eBlockFlags
{
    BLOCK_PROOF_OF_STAKE = (1 << 0), // is proof-of-stake block
    BLOCK_STAKE_ENTROPY  = (1 << 1), // entropy bit for stake modifier
    BLOCK_STAKE_MODIFIER = (1 << 2), // regenerated stake modifier
};


/*  nServices flags
    top 32 bits of CNode::nServices are used to mark services required 
*/

enum
{
    NODE_NETWORK        = (1 << 0),
    THIN_SUPPORT        = (1 << 1),
    THIN_STAKE          = (1 << 2),  // deprecated
    THIN_STEALTH        = (1 << 3),
    SMSG_RELAY          = (1 << 4),
};

const int64_t GENESIS_BLOCK_TIME = 1416737561;

static const int64_t COIN = 100000000;
static const int64_t CENT = 1000000;

static const int64_t MIN_TX_FEE = 10000;
static const int64_t MIN_TX_FEE_ANON = 1000000;
static const int64_t MIN_RELAY_TX_FEE = MIN_TX_FEE;
static const int64_t MAX_MONEY = 105000000 * COIN;        //  105 million OKCash Total
static const int64_t COIN_YEAR_REWARD = 69 * CENT;       //  69% 1st Year
static const int64_t SCOIN_YEAR_REWARD = 20 * CENT;     //  20% 1st halving
static const int64_t CCOIN_YEAR_REWARD = 10 * CENT;     //  10% 2nd halving
static const int64_t KCOIN_YEAR_REWARD = 5 * CENT;       //  5% 3rd halving
static const int64_t ICOIN_YEAR_REWARD = 2.5 * CENT;    //  2.5% 4th halving
static const int64_t OCOIN_YEAR_REWARD = 2 * CENT;       //  2% 5th halving
static const int64_t DCOIN_YEAR_REWARD = 1 * CENT;       //  1% 6th halving
static const int64_t RCOIN_YEAR_REWARD = 0.5 * CENT;    //  0.5% 7th halving
static const int64_t ECOIN_YEAR_REWARD = 0.25 * CENT;  //   0.25% 8th halving
static const int64_t ACOIN_YEAR_REWARD = 0.1 * CENT;    //   0.1% 9th halving
static const int64_t MCOIN_YEAR_REWARD = 0.05 * CENT;  //   0.05% 10th halving
static const int64_t ZCOIN_YEAR_REWARD = 0.03 * CENT;  //   0.03% 11th halving and onwards


extern int nNodeMode;
extern int nNodeState;

extern int nMaxThinPeers;
extern int nBloomFilterElements;


extern int nMinStakeInterval;

extern int nThinIndexWindow;

static const int nTryStakeMempoolTimeout = 5 * 60; // seconds
static const int nTryStakeMempoolMaxAsk = 16;

extern uint64_t nLocalServices;
extern uint32_t nLocalRequirements;




extern bool fTestNet;
extern bool fDebug;
extern bool fDebugNet;
extern bool fDebugSmsg;
extern bool fDebugChain;
extern bool fDebugRingSig;
extern bool fDebugPoS;
extern bool fNoSmsg;
extern bool fPrintToConsole;
extern bool fPrintToDebugLog;
//extern bool fShutdown;
extern bool fDaemon;
extern bool fServer;
extern bool fCommandLine;
extern std::string strMiscWarning;
extern bool fNoListen;
extern bool fLogTimestamps;
extern bool fReopenDebugLog;
extern bool fThinFullIndex;
extern bool fReindexing;
extern bool fHaveGUI;
extern volatile bool fIsStaking;

extern bool fConfChange;
extern bool fEnforceCanonical;
extern unsigned int nNodeLifespan;
extern unsigned int nDerivationMethodIndex;
extern unsigned int nMinerSleep;
extern unsigned int nBlockMaxSize;
extern unsigned int nBlockPrioritySize;
extern unsigned int nBlockMinSize;
extern int64_t nMinTxFee;

extern unsigned int nStakeSplitAge;
extern int64_t nStakeCombineThreshold;


#endif /* COIN_STATE_H */


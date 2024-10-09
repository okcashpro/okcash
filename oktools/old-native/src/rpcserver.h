// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2012 The Bitcoin developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef _BITCOINRPC_SERVER_H_
#define _BITCOINRPC_SERVER_H_ 1

#include "uint256.h"
#include "rpcprotocol.h"

#include <list>
#include <map>

class CBlockIndex;
class CBlockThinIndex;
class CNetAddr;

void StartRPCThreads();
void StopRPCThreads();

/*
  Type-check arguments; throws JSONRPCError if wrong type given. Does not check that
  the right number of arguments are passed, just that any passed are the correct type.
  Use like:  RPCTypeCheck(params, boost::assign::list_of(str_type)(int_type)(obj_type));
*/
void RPCTypeCheck(const json_spirit::Array& params,
                  const std::list<json_spirit::Value_type>& typesExpected, bool fAllowNull=false);
/*
  Check for expected keys/value types in an Object.
  Use like: RPCTypeCheck(object, boost::assign::map_list_of("name", str_type)("value", int_type));
*/
void RPCTypeCheck(const json_spirit::Object& o,
                  const std::map<std::string, json_spirit::Value_type>& typesExpected, bool fAllowNull=false);

/*
  Run func nSeconds from now. Uses boost deadline timers.
  Overrides previous timer <name> (if any).
 */
void RPCRunLater(const std::string& name, boost::function<void(void)> func, int64_t nSeconds);

//! Convert boost::asio address to CNetAddr
CNetAddr BoostAsioToCNetAddr(boost::asio::ip::address address);

typedef json_spirit::Value(*rpcfn_type)(const json_spirit::Array& params, bool fHelp);

class CRPCCommand
{
public:
    std::string name;
    rpcfn_type actor;
    bool okSafeMode;
    bool threadSafe;
    bool reqWallet;
};

class JSONRequest
{
public:
    json_spirit::Value id;
    std::string strMethod;
    json_spirit::Array params;

    JSONRequest() { id = json_spirit::Value::null; }
    void parse(const json_spirit::Value& valRequest);
};


/**
 * Bitcoin RPC command dispatcher.
 */
class CRPCTable
{
private:
    std::map<std::string, const CRPCCommand*> mapCommands;
public:
    CRPCTable();
    const CRPCCommand* operator[](std::string name) const;
    std::string help(std::string name) const;

    /**
     * Execute a method.
     * @param method   Method to execute
     * @param params   Array of arguments (JSON objects)
     * @returns Result of the call.
     * @throws an exception (json_spirit::Value) when an error happens.
     */
    json_spirit::Value execute(const std::string &method, const json_spirit::Array &params) const;
};

extern const CRPCTable tableRPC;

extern void InitRPCMining();
extern void ShutdownRPCMining();

extern int64_t nWalletUnlockTime;
extern int64_t AmountFromValue(const json_spirit::Value& value);
extern json_spirit::Value ValueFromAmount(int64_t amount);

bool IsStringBoolPositive(std::string& value);
bool IsStringBoolNegative(std::string& value);
bool GetStringBool(std::string& value, bool &fOut);

extern double GetDifficulty(const CBlockIndex* blockindex = NULL);
extern double GetHeaderDifficulty(const CBlockThinIndex* blockindex = NULL);

extern double GetPoWMHashPS();
extern double GetPoSKernelPS();

extern std::string HexBits(unsigned int nBits);
extern std::string HelpRequiringPassphrase();
extern void EnsureWalletIsUnlocked();

//
// Utilities: convert hex-encoded Values
// (throws error if not hex).
//
extern uint256 ParseHashV(const json_spirit::Value& v, std::string strName);
extern uint256 ParseHashO(const json_spirit::Object& o, std::string strKey);
extern std::vector<unsigned char> ParseHexV(const json_spirit::Value& v, std::string strName);
extern std::vector<unsigned char> ParseHexO(const json_spirit::Object& o, std::string strKey);

extern json_spirit::Value getconnectioncount(const json_spirit::Array& params, bool fHelp); // in rpcnet.cpp
extern json_spirit::Value getpeerinfo(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value ping(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value addnode(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getaddednodeinfo(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getnettotals(const json_spirit::Array& params, bool fHelp);

extern json_spirit::Value dumpwallet(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value importwallet(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value dumpprivkey(const json_spirit::Array& params, bool fHelp); // in rpcdump.cpp
extern json_spirit::Value importprivkey(const json_spirit::Array& params, bool fHelp);

extern json_spirit::Value sendalert(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getnetworkinfo(const json_spirit::Array& params, bool fHelp);

extern json_spirit::Value getsubsidy(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getstakesubsidy(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getmininginfo(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getstakinginfo(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value checkkernel(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getwork(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getworkex(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getblocktemplate(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value submitblock(const json_spirit::Array& params, bool fHelp);

extern json_spirit::Value getnewaddress(const json_spirit::Array& params, bool fHelp); // in rpcwallet.cpp
extern json_spirit::Value getnewextaddress(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getaccountaddress(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value setaccount(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getaccount(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getaddressesbyaccount(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value sendtoaddress(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value signmessage(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value verifymessage(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getreceivedbyaddress(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getreceivedbyaccount(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getbalance(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value movecmd(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value sendfrom(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value sendmany(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value addmultisigaddress(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value createmultisig(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value addredeemscript(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value listreceivedbyaddress(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value listreceivedbyaccount(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value listtransactions(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value listaddressgroupings(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value listaccounts(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value listsinceblock(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value gettransaction(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value backupwallet(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value keypoolrefill(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value walletpassphrase(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value walletpassphrasechange(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value walletlock(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value encryptwallet(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value validateaddress(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getinfo(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getwalletinfo(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getblockchaininfo(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value reservebalance(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value checkwallet(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value repairwallet(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value resendtx(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value makekeypair(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value validatepubkey(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getnewpubkey(const json_spirit::Array& params, bool fHelp);

extern json_spirit::Value getrawtransaction(const json_spirit::Array& params, bool fHelp); // in rcprawtransaction.cpp
extern json_spirit::Value listunspent(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value createrawtransaction(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value decoderawtransaction(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value decodescript(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value signrawtransaction(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value sendrawtransaction(const json_spirit::Array& params, bool fHelp);

extern json_spirit::Value getbestblockhash(const json_spirit::Array& params, bool fHelp); // in rpcblockchain.cpp
extern json_spirit::Value getblockcount(const json_spirit::Array& params, bool fHelp); // in rpcblockchain.cpp
extern json_spirit::Value getdifficulty(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value settxfee(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getrawmempool(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getblockhash(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getblock(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getblockheader(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getblockbynumber(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value setbestblockbyheight(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value rewindchain(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value nextorphan(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value getcheckpoint(const json_spirit::Array& params, bool fHelp);

extern json_spirit::Value getnewstealthaddress(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value liststealthaddresses(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value importstealthaddress(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value sendtostealthaddress(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value clearwallettransactions(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value scanforalltxns(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value scanforstealthtxns(const json_spirit::Array& params, bool fHelp);

extern json_spirit::Value sendoktookx(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value sendokxtookx(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value sendokxtook(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value estimateokxfee(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value okxoutputs(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value okxinfo(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value reloadokxdata(const json_spirit::Array& params, bool fHelp);

extern json_spirit::Value txnreport(const json_spirit::Array& params, bool fHelp);

extern json_spirit::Value smsgenable(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value smsgdisable(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value smsglocalkeys(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value smsgoptions(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value smsgscanchain(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value smsgscanbuckets(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value smsgaddkey(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value smsggetpubkey(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value smsgsend(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value smsgsendanon(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value smsginbox(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value smsgoutbox(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value smsgbuckets(const json_spirit::Array& params, bool fHelp);

extern json_spirit::Value thinscanmerkleblocks(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value thinforcestate(const json_spirit::Array& params, bool fHelp);

extern json_spirit::Value extkey(const json_spirit::Array& params, bool fHelp);
extern json_spirit::Value mnemonic(const json_spirit::Array& params, bool fHelp);

#endif

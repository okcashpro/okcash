// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2012 The Bitcoin developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "rpcserver.h"

#include "base58.h"
#include "init.h"
#include "util.h"
#include "sync.h"
#include "base58.h"
#include "db.h"
#include "ui_interface.h"
#include "wallet.h"

#include <boost/algorithm/string.hpp>
#include <boost/asio.hpp>
#include <boost/asio/ip/v6_only.hpp>
#include <boost/asio/ssl.hpp>
#include <boost/bind.hpp>
#include <boost/filesystem.hpp>
#include <boost/filesystem/fstream.hpp>
#include <boost/foreach.hpp>
#include <boost/iostreams/concepts.hpp>
#include <boost/iostreams/stream.hpp>
#include <boost/shared_ptr.hpp>
#include <list>

using namespace std;
using namespace boost;
using namespace boost::asio;
using namespace json_spirit;

namespace ba = boost::asio;

static std::string strRPCUserColonPass;

// These are created by StartRPCThreads, destroyed in StopRPCThreads
static ioContext* rpc_io_service = NULL;
static map<string, boost::shared_ptr<deadline_timer> > deadlineTimers;
static ssl::context* rpc_ssl_context = NULL;
static boost::thread_group* rpc_worker_group = NULL;

void RPCTypeCheck(const Array& params,
                  const list<Value_type>& typesExpected,
                  bool fAllowNull)
{
    unsigned int i = 0;
    BOOST_FOREACH(Value_type t, typesExpected)
    {
        if (params.size() <= i)
            break;

        const Value& v = params[i];
        if (!((v.type() == t) || (fAllowNull && (v.type() == null_type))))
        {
            string err = strprintf("Expected type %s, got %s",
                                   Value_type_name[t], Value_type_name[v.type()]);
            throw JSONRPCError(RPC_TYPE_ERROR, err);
        }
        i++;
    }
}

void RPCTypeCheck(const Object& o,
                  const map<string, Value_type>& typesExpected,
                  bool fAllowNull)
{
    BOOST_FOREACH(const PAIRTYPE(string, Value_type)& t, typesExpected)
    {
        const Value& v = find_value(o, t.first);
        if (!fAllowNull && v.type() == null_type)
            throw JSONRPCError(RPC_TYPE_ERROR, strprintf("Missing %s", t.first));

        if (!((v.type() == t.second) || (fAllowNull && (v.type() == null_type))))
        {
            string err = strprintf("Expected type %s for %s, got %s",
                                   Value_type_name[t.second], t.first, Value_type_name[v.type()]);
            throw JSONRPCError(RPC_TYPE_ERROR, err);
        }
    }
}

int64_t AmountFromValue(const Value& value)
{
    double dAmount = value.get_real();
    if (dAmount <= 0.0 || dAmount > MAX_MONEY)
        throw JSONRPCError(RPC_TYPE_ERROR, "Invalid amount");
    int64_t nAmount = roundint64(dAmount * COIN);
    if (!MoneyRange(nAmount))
        throw JSONRPCError(RPC_TYPE_ERROR, "Invalid amount");
    return nAmount;
}

Value ValueFromAmount(int64_t amount)
{
    return (double)amount / (double)COIN;
}

std::string HexBits(unsigned int nBits)
{
    union {
        int32_t nBits;
        char cBits[4];
    } uBits;
    uBits.nBits = htonl((int32_t)nBits);
    return HexStr(BEGIN(uBits.cBits), END(uBits.cBits));
}

bool IsStringBoolPositive(std::string& value)
{
    return (value == "+" || value == "on"  || value == "true"  || value == "1" || value == "yes");
};

bool IsStringBoolNegative(std::string& value)
{
    return (value == "-" || value == "off" || value == "false" || value == "0" || value == "no" || value == "n");
};

bool GetStringBool(std::string& value, bool &fOut)
{
    if (IsStringBoolPositive(value))
    {
        fOut = true;
        return true;
    };
    
    if (IsStringBoolNegative(value))
    {
        fOut = false;
        return true;
    };
    
    return false;
};

//
// Utilities: convert hex-encoded Values
// (throws error if not hex).
//
uint256 ParseHashV(const Value& v, string strName)
{
    string strHex;
    if (v.type() == str_type)
        strHex = v.get_str();
    if (!IsHex(strHex)) // Note: IsHex("") is false
        throw JSONRPCError(RPC_INVALID_PARAMETER, strName+" must be hexadecimal string (not '"+strHex+"')");
    uint256 result;
    result.SetHex(strHex);
    return result;
}

uint256 ParseHashO(const Object& o, string strKey)
{
    return ParseHashV(find_value(o, strKey), strKey);
}

vector<unsigned char> ParseHexV(const Value& v, string strName)
{
    string strHex;
    if (v.type() == str_type)
        strHex = v.get_str();
    if (!IsHex(strHex))
        throw JSONRPCError(RPC_INVALID_PARAMETER, strName+" must be hexadecimal string (not '"+strHex+"')");
    return ParseHex(strHex);
}

vector<unsigned char> ParseHexO(const Object& o, string strKey)
{
    return ParseHexV(find_value(o, strKey), strKey);
}


///
/// Note: This interface may still be subject to change.
///

string CRPCTable::help(string strCommand) const
{
    bool fAllOkx = strCommand == "okx" ? true : false;

    string strRet;
    set<rpcfn_type> setDone;
    for (map<string, const CRPCCommand*>::const_iterator mi = mapCommands.begin(); mi != mapCommands.end(); ++mi)
    {
        const CRPCCommand *pcmd = mi->second;
        string strMethod = mi->first;
        // We already filter duplicates, but these deprecated screw up the sort order
        if (strMethod.find("label") != string::npos)
            continue;
            
        
        if (fAllOkx)
        {
            if (strMethod != "sendoktookx"
                && strMethod != "sendokxtookx"
                && strMethod != "sendokxtook"
                && strMethod != "estimateokxfee"
                && strMethod != "okxoutputs"
                && strMethod != "okxinfo"
                && strMethod != "reloadokxdata")
            continue;
        } else
        if (strCommand != "" && strMethod != strCommand)
            continue;
        
        if (pcmd->reqWallet && !pwalletMain)
            continue;
        
        try
        {
            Array params;
            rpcfn_type pfn = pcmd->actor;
            if (setDone.insert(pfn).second)
                (*pfn)(params, true);
        }
        catch (std::exception& e)
        {
            // Help text is returned in an exception
            string strHelp = string(e.what());
            if (strCommand == "")
                if (strHelp.find('\n') != string::npos)
                    strHelp = strHelp.substr(0, strHelp.find('\n'));
            strRet += strHelp + "\n";
        }
    }
    if (strRet == "")
        strRet = strprintf("help: unknown command: %s\n", strCommand);
    strRet = strRet.substr(0,strRet.size()-1);
    return strRet;
}

Value help(const Array& params, bool fHelp)
{
    if (fHelp || params.size() > 1)
        throw runtime_error(
            "help [command]\n"
            "List commands, or get help for a command.");

    string strCommand;
    if (params.size() > 0)
        strCommand = params[0].get_str();

    return tableRPC.help(strCommand);
}


Value stop(const Array& params, bool fHelp)
{
    // Accept the deprecated and ignored 'detach' boolean argument
    if (fHelp || params.size() > 1)
        throw std::runtime_error(
            "stop\n"
            "Stop Okcash server.");
    // Shutdown will take long enough that the response should get back
    StartShutdown();
    return "Okcash server stopping";
}



//
// Call Table
//


static const CRPCCommand vRPCCommands[] =
{ //  name                      actor (function)         okSafeMode threadSafe reqWallet
  //  ------------------------  -----------------------  ---------- ---------- ---------
    { "help",                   &help,                   true,      true,      false },
    { "stop",                   &stop,                   true,      true,      false },
    { "getbestblockhash",       &getbestblockhash,       true,      false,     false },
    { "getblockcount",          &getblockcount,          true,      false,     false },
    { "getconnectioncount",     &getconnectioncount,     true,      false,     false },
    { "getpeerinfo",            &getpeerinfo,            true,      false,     false },
    { "addnode",                &addnode,                true,      true,      false },
    { "getaddednodeinfo",       &getaddednodeinfo,       true,      true,      false },
    { "ping",                   &ping,                   true,      false,     false },
    { "getnettotals",           &getnettotals,           true,      true,      false },
    { "getdifficulty",          &getdifficulty,          true,      false,     false },
    { "getinfo",                &getinfo,                true,      false,     false },
    { "getsubsidy",             &getsubsidy,             true,      true,      false },
    { "getstakesubsidy",        &getstakesubsidy,        true,      true,      false },
    { "getmininginfo",          &getmininginfo,          true,      false,     false },
    { "getstakinginfo",         &getstakinginfo,         true,      false,     false },
    { "getnewaddress",          &getnewaddress,          true,      false,     false },
    { "getnewextaddress",       &getnewextaddress,       true,      false,     false },
    { "getnewpubkey",           &getnewpubkey,           true,      false,     true  },
    { "getaccountaddress",      &getaccountaddress,      true,      false,     false },
    { "getblockchaininfo",      &getblockchaininfo,      true,      false,     false },
    { "setaccount",             &setaccount,             true,      false,     false },
    { "getaccount",             &getaccount,             false,     false,     false },
    { "getaddressesbyaccount",  &getaddressesbyaccount,  true,      false,     false },
    { "sendtoaddress",          &sendtoaddress,          false,     false,     false },
    { "getreceivedbyaddress",   &getreceivedbyaddress,   false,     false,     false },
    { "getreceivedbyaccount",   &getreceivedbyaccount,   false,     false,     false },
    { "listreceivedbyaddress",  &listreceivedbyaddress,  false,     false,     false },
    { "listreceivedbyaccount",  &listreceivedbyaccount,  false,     false,     false },
    { "backupwallet",           &backupwallet,           true,      false,     false },
    { "keypoolrefill",          &keypoolrefill,          true,      false,     false },
    { "walletpassphrase",       &walletpassphrase,       true,      false,     false },
    { "walletpassphrasechange", &walletpassphrasechange, false,     false,     false },
    { "walletlock",             &walletlock,             true,      false,     false },
    { "getwalletinfo",          &getwalletinfo,          true,      false,      true },
    { "encryptwallet",          &encryptwallet,          false,     false,     false },
    { "validateaddress",        &validateaddress,        true,      false,     false },
    { "validatepubkey",         &validatepubkey,         true,      false,     false },
    { "getbalance",             &getbalance,             false,     false,     false },
    { "move",                   &movecmd,                false,     false,     false },
    { "sendfrom",               &sendfrom,               false,     false,     false },
    { "sendmany",               &sendmany,               false,     false,     false },
    { "addmultisigaddress",     &addmultisigaddress,     false,     false,     true  },
    { "createmultisig",         &createmultisig,         true,      false,     true  },
    { "addredeemscript",        &addredeemscript,        false,     false,     false },
    { "getrawmempool",          &getrawmempool,          true,      false,     false },
    { "getblock",               &getblock,               true,      false,     false },
    { "getblockheader",         &getblockheader,         true,      false,     false },
    { "getblockbynumber",       &getblockbynumber,       false,     false,     false },
    { "setbestblockbyheight",   &setbestblockbyheight,   false,     false,     false },
    { "rewindchain",            &rewindchain,            false,     false,     false },
    { "nextorphan",             &nextorphan,             false,     false,     false },
    { "getblockhash",           &getblockhash,           false,     false,     false },
    { "gettransaction",         &gettransaction,         false,     false,     false },
    { "listtransactions",       &listtransactions,       false,     false,     false },
    { "listaddressgroupings",   &listaddressgroupings,   false,     false,     false },
    { "signmessage",            &signmessage,            false,     false,     false },
    { "verifymessage",          &verifymessage,          false,     false,     false },
    { "getwork",                &getwork,                true,      false,     false },
    { "getworkex",              &getworkex,              true,      false,     false },
    { "listaccounts",           &listaccounts,           false,     false,     false },
    { "settxfee",               &settxfee,               false,     false,     false },
    { "getblocktemplate",       &getblocktemplate,       true,      false,     false },
    { "submitblock",            &submitblock,            false,     false,     false },
    { "listsinceblock",         &listsinceblock,         false,     false,     false },
    { "dumpprivkey",            &dumpprivkey,            false,     false,     false },
    { "dumpwallet",             &dumpwallet,             true,      false,     false },
    { "importwallet",           &importwallet,           false,     false,     false },
    { "importprivkey",          &importprivkey,          false,     false,     false },
    { "listunspent",            &listunspent,            false,     false,     false },
    { "getrawtransaction",      &getrawtransaction,      false,     false,     false },
    { "createrawtransaction",   &createrawtransaction,   false,     false,     false },
    { "decoderawtransaction",   &decoderawtransaction,   false,     false,     false },
    { "decodescript",           &decodescript,           false,     false,     false },
    { "signrawtransaction",     &signrawtransaction,     false,     false,     false },
    { "sendrawtransaction",     &sendrawtransaction,     false,     false,     false },
    { "getcheckpoint",          &getcheckpoint,          true,      false,     false },
    { "reservebalance",         &reservebalance,         false,     true,      false },
    { "checkwallet",            &checkwallet,            false,     true,      false },
    { "repairwallet",           &repairwallet,           false,     true,      false },
    { "resendtx",               &resendtx,               false,     true,      false },
    { "makekeypair",            &makekeypair,            false,     true,      false },
    { "checkkernel",            &checkkernel,            true,      false,     true },
    
    { "sendalert",              &sendalert,              false,     false,     false },
    { "getnetworkinfo",         &getnetworkinfo,         false,     false,     false },
    
    
    { "getnewstealthaddress",   &getnewstealthaddress,   false,     false,     false },
    { "liststealthaddresses",   &liststealthaddresses,   false,     false,     false },
    { "importstealthaddress",   &importstealthaddress,   false,     false,     false },
    { "sendtostealthaddress",   &sendtostealthaddress,   false,     false,     false },
    { "clearwallettransactions",&clearwallettransactions,false,     false,     false },
    { "scanforalltxns",         &scanforalltxns,         false,     false,     false },
    { "scanforstealthtxns",     &scanforstealthtxns,     false,     false,     false },
    
    { "sendoktookx",            &sendoktookx,            false,     false,     false },
    { "sendokxtookx",           &sendokxtookx,           false,     false,     false },
    { "sendokxtook",            &sendokxtook,            false,     false,     false },
    { "estimateokxfee",         &estimateokxfee,         false,     false,     false },
    { "okxoutputs",             &okxoutputs,             false,     false,     false },
    { "okxinfo",                &okxinfo,                false,     false,     false },
    { "reloadokxdata",          &reloadokxdata,          false,     false,     false },

    { "txnreport",              &txnreport,              false,     false,     false },

    { "smsgenable",             &smsgenable,             false,     false,     false },
    { "smsgdisable",            &smsgdisable,            false,     false,     false },
    { "smsglocalkeys",          &smsglocalkeys,          false,     false,     false },
    { "smsgoptions",            &smsgoptions,            false,     false,     false },
    { "smsgscanchain",          &smsgscanchain,          false,     false,     false },
    { "smsgscanbuckets",        &smsgscanbuckets,        false,     false,     false },
    { "smsgaddkey",             &smsgaddkey,             false,     false,     false },
    { "smsggetpubkey",          &smsggetpubkey,          false,     false,     false },
    { "smsgsend",               &smsgsend,               false,     false,     false },
    { "smsgsendanon",           &smsgsendanon,           false,     false,     false },
    { "smsginbox",              &smsginbox,              false,     false,     false },
    { "smsgoutbox",             &smsgoutbox,             false,     false,     false },
    { "smsgbuckets",            &smsgbuckets,            false,     false,     false },
    
    
    { "thinscanmerkleblocks",   &thinscanmerkleblocks,   false,     false,     false },
    { "thinforcestate",         &thinforcestate,         false,     false,     false },
    
    { "extkey",                 &extkey,                 false,     false,     true  },
    { "bip32",                  &extkey,                 false,     false,     true  },
    { "mnemonic",               &mnemonic,               false,     false,     false },
    { "bip39",                  &mnemonic,               false,     false,     false },
};

CRPCTable::CRPCTable()
{
    unsigned int vcidx;
    for (vcidx = 0; vcidx < (sizeof(vRPCCommands) / sizeof(vRPCCommands[0])); vcidx++)
    {
        const CRPCCommand *pcmd;

        pcmd = &vRPCCommands[vcidx];
        mapCommands[pcmd->name] = pcmd;
    }
}

const CRPCCommand *CRPCTable::operator[](string name) const
{
    map<string, const CRPCCommand*>::const_iterator it = mapCommands.find(name);
    if (it == mapCommands.end())
        return NULL;
    return (*it).second;
}


bool HTTPAuthorized(map<string, string>& mapHeaders)
{
    string strAuth = mapHeaders["authorization"];
    if (strAuth.substr(0,6) != "Basic ")
        return false;
    string strUserPass64 = strAuth.substr(6); boost::trim(strUserPass64);
    string strUserPass = DecodeBase64(strUserPass64);
    return TimingResistantEqual(strUserPass, strRPCUserColonPass);
}

void ErrorReply(std::ostream& stream, const Object& objError, const Value& id)
{
    // Send error reply from json-rpc error object
    int nStatus = HTTP_INTERNAL_SERVER_ERROR;
    int code = find_value(objError, "code").get_int();
    if (code == RPC_INVALID_REQUEST) nStatus = HTTP_BAD_REQUEST;
    else if (code == RPC_METHOD_NOT_FOUND) nStatus = HTTP_NOT_FOUND;
    string strReply = JSONRPCReply(Value::null, objError, id);
    stream << HTTPReply(nStatus, strReply, false) << std::flush;
}

bool ClientAllowed(const boost::asio::ip::address& address)
{
    // Make sure that IPv4-compatible and IPv4-mapped IPv6 addresses are treated as IPv4 addresses
    if (address.is_v6()
     && (address.to_v6().is_v4_compatible()
      || address.to_v6().is_v4_mapped()))
        return ClientAllowed(address.to_v6().to_v4());

    if (address == asio::ip::address_v4::loopback()
     || address == asio::ip::address_v6::loopback()
     || (address.is_v4()
         // Check whether IPv4 addresses match 127.0.0.0/8 (loopback subnet)
      && (address.to_v4().to_ulong() & 0xff000000) == 0x7f000000))
        return true;

    const string strAddress = address.to_string();
    const vector<string>& vAllow = mapMultiArgs["-rpcallowip"];
    BOOST_FOREACH(string strAllow, vAllow)
        if (WildcardMatch(strAddress, strAllow))
            return true;
    return false;
}

class AcceptedConnection
{
public:
    virtual ~AcceptedConnection() {}

    virtual std::iostream& stream() = 0;
    virtual std::string peer_address_to_string() const = 0;
    virtual void close() = 0;
};

template <typename Protocol>
class AcceptedConnectionImpl : public AcceptedConnection
{
public:
    AcceptedConnectionImpl(
            ioContext& io_context,
            ssl::context &context,
            bool fUseSSL) :
        sslStream(io_context, context),
        _d(sslStream, fUseSSL),
        _stream(_d)
    {
    }

    virtual std::iostream& stream()
    {
        return _stream;
    }

    virtual std::string peer_address_to_string() const
    {
        return peer.address().to_string();
    }

    virtual void close()
    {
        _stream.close();
    }

    typename Protocol::endpoint peer;
    asio::ssl::stream<typename Protocol::socket> sslStream;

private:
    SSLIOStreamDevice<Protocol> _d;
    iostreams::stream< SSLIOStreamDevice<Protocol> > _stream;
};

void ServiceConnection(AcceptedConnection *conn);

// Forward declaration required for RPCListen
template <typename Protocol>
static void RPCAcceptHandler(boost::shared_ptr<ba::basic_socket_acceptor<Protocol> > acceptor,
                             ssl::context& context,
                             bool fUseSSL,
                             AcceptedConnection* conn,
                             const boost::system::error_code& error);

/**
 * Sets up I/O resources to accept and handle a new connection.
 */
template <typename Protocol>
static void RPCListen(boost::shared_ptr<ba::basic_socket_acceptor<Protocol> > acceptor,
                   ba::ssl::context& context,
                   const bool fUseSSL)
{
    // Accept connection
    AcceptedConnectionImpl<Protocol>* conn = new AcceptedConnectionImpl<Protocol>(GetIOServiceFromPtr(acceptor), context, fUseSSL);

    acceptor->async_accept(
            conn->sslStream.lowest_layer(),
            conn->peer,
            boost::bind(&RPCAcceptHandler<Protocol>,
                acceptor,
                boost::ref(context),
                fUseSSL,
                conn,
                boost::asio::placeholders::error));
}


/**
 * Accept and handle incoming connection.
 */
template <typename Protocol>
static void RPCAcceptHandler(boost::shared_ptr<ba::basic_socket_acceptor<Protocol> > acceptor,
                             ssl::context& context,
                             const bool fUseSSL,
                             AcceptedConnection* conn,
                             const boost::system::error_code& error)
{
    // Immediately start accepting new connections, except when we're cancelled or our socket is closed.
    if (error != asio::error::operation_aborted && acceptor->is_open())
        RPCListen(acceptor, context, fUseSSL);

    AcceptedConnectionImpl<ip::tcp>* tcp_conn = dynamic_cast< AcceptedConnectionImpl<ip::tcp>* >(conn);

    // TODO: Actually handle errors
    if (error)
    {
        delete conn;
    }

    // Restrict callers by IP.  It is important to
    // do this before starting client thread, to filter out
    // certain DoS and misbehaving clients.
    else if (tcp_conn && !ClientAllowed(tcp_conn->peer.address()))
    {
        // Only send a 403 if we're not using SSL to prevent a DoS during the SSL handshake.
        if (!fUseSSL)
            conn->stream() << HTTPReply(HTTP_FORBIDDEN, "", false) << std::flush;
        delete conn;
    }
    else {
        ServiceConnection(conn);
        conn->close();
        delete conn;
    }
}

void StartRPCThreads()
{
    strRPCUserColonPass = mapArgs["-rpcuser"] + ":" + mapArgs["-rpcpassword"];
    if (((mapArgs["-rpcpassword"] == "") ||
         (mapArgs["-rpcuser"] == mapArgs["-rpcpassword"])) && Params().RequireRPCPassword())
    {
        unsigned char rand_pwd[32];
        RAND_bytes(rand_pwd, 32);
        std::string strWhatAmI = "To use okcashd";
        if (mapArgs.count("-server"))
            strWhatAmI = strprintf(_("To use the %s option"), "\"-server\"");
        else if (mapArgs.count("-daemon"))
            strWhatAmI = strprintf(_("To use the %s option"), "\"-daemon\"");
        uiInterface.ThreadSafeMessageBox(strprintf(
            _("%s, you must set a rpcpassword in the configuration file:\n"
              "%s\n"
              "It is recommended you use the following random password:\n"
              "rpcuser=okcashrpc\n"
              "rpcpassword=%s\n"
              "(you do not need to remember this password)\n"
              "The username and password MUST NOT be the same.\n"
              "If the file does not exist, create it with owner-readable-only file permissions.\n"
              "It is also recommended to set alertnotify so you are notified of problems;\n"
              "for example: alertnotify=echo %%s | mail -s \"Okcash Alert\" admin@foo.com\n"),
                strWhatAmI,
                GetConfigFile().string(),
                EncodeBase58(&rand_pwd[0],&rand_pwd[0]+32)),
                "", CClientUIInterface::MSG_ERROR);
        StartShutdown();
        return;
    }

    assert(rpc_io_service == NULL);
    rpc_io_service = new ioContext();
    rpc_ssl_context = new ba::ssl::context(ba::ssl::context::sslv23);

    const bool fUseSSL = GetBoolArg("-rpcssl", false);

    if (fUseSSL)
    {
        rpc_ssl_context->set_options(ssl::context::no_sslv2);

        boost::filesystem::path pathCertFile(GetArg("-rpcsslcertificatechainfile", "server.cert"));
        if (!pathCertFile.is_complete()) pathCertFile = boost::filesystem::path(GetDataDir()) / pathCertFile;
        if (boost::filesystem::exists(pathCertFile)) rpc_ssl_context->use_certificate_chain_file(pathCertFile.string());
        else LogPrintf("ThreadRPCServer ERROR: missing server certificate file %s\n", pathCertFile.string());

        boost::filesystem::path pathPKFile(GetArg("-rpcsslprivatekeyfile", "server.pem"));
        if (!pathPKFile.is_complete()) pathPKFile = boost::filesystem::path(GetDataDir()) / pathPKFile;
        if (boost::filesystem::exists(pathPKFile)) rpc_ssl_context->use_private_key_file(pathPKFile.string(), ssl::context::pem);
        else LogPrintf("ThreadRPCServer ERROR: missing server private key file %s\n", pathPKFile.string());

        string strCiphers = GetArg("-rpcsslciphers", "TLSv1.2+HIGH:TLSv1+HIGH:!SSLv2:!aNULL:!eNULL:!3DES:@STRENGTH");
        SSL_CTX_set_cipher_list(rpc_ssl_context->native_handle(), strCiphers.c_str());
    }

    // Try a dual IPv6/IPv4 socket, falling back to separate IPv4 and IPv6 sockets
    const bool loopback = !mapArgs.count("-rpcallowip");
    ba::ip::address bindAddress = loopback ? ba::ip::address_v6::loopback() : ba::ip::address_v6::any();
    ba::ip::tcp::endpoint endpoint(bindAddress, GetArg("-rpcport", Params().RPCPort()));
    boost::system::error_code v6_only_error;
    boost::shared_ptr<ba::ip::tcp::acceptor> acceptor(new ba::ip::tcp::acceptor(*rpc_io_service));

    bool fListening = false;
    std::string strerr;
    try
    {
        acceptor->open(endpoint.protocol());
        acceptor->set_option(ba::ip::tcp::acceptor::reuse_address(true));

        // Try making the socket dual IPv6/IPv4 (if listening on the "any" address)
        acceptor->set_option(ba::ip::v6_only(loopback), v6_only_error);

        acceptor->bind(endpoint);
        acceptor->listen(ba::socket_base::max_connections);
        RPCListen(acceptor, *rpc_ssl_context, fUseSSL);

        fListening = true;
    }
    catch(boost::system::system_error &e)
    {
        strerr = strprintf(_("An error occurred while setting up the RPC port %u for listening on IPv6, falling back to IPv4: %s"), endpoint.port(), e.what());
    }

    try {
        // If dual IPv6/IPv4 failed (or we're opening loopback interfaces only), open IPv4 separately
        if (!fListening || loopback || v6_only_error)
        {
            bindAddress = loopback ? asio::ip::address_v4::loopback() : asio::ip::address_v4::any();
            endpoint.address(bindAddress);

            acceptor.reset(new ip::tcp::acceptor(*rpc_io_service));
            acceptor->open(endpoint.protocol());
            acceptor->set_option(boost::asio::ip::tcp::acceptor::reuse_address(true));
            acceptor->bind(endpoint);
            acceptor->listen(socket_base::max_connections);

            RPCListen(acceptor, *rpc_ssl_context, fUseSSL);

            fListening = true;
        }
    }
    catch(boost::system::system_error &e)
    {
        strerr = strprintf(_("An error occurred while setting up the RPC port %u for listening on IPv4: %s"), endpoint.port(), e.what());
    }

    if (!fListening) {
        uiInterface.ThreadSafeMessageBox(strerr, "", CClientUIInterface::MSG_ERROR);
        StartShutdown();
        return;
    }

    rpc_worker_group = new boost::thread_group();
    for (int i = 0; i < GetArg("-rpcthreads", 4); i++)
        rpc_worker_group->create_thread(boost::bind(&ioContext::run, rpc_io_service));
}

void StopRPCThreads()
{
    if (rpc_io_service == NULL) return;

    deadlineTimers.clear();
    rpc_io_service->stop();
    if (rpc_worker_group != NULL)
        rpc_worker_group->join_all();
    delete rpc_worker_group; rpc_worker_group = NULL;
    delete rpc_ssl_context; rpc_ssl_context = NULL;
    delete rpc_io_service; rpc_io_service = NULL;
}

void RPCRunHandler(const boost::system::error_code& err, boost::function<void(void)> func)
{
    if (!err)
        func();
}

void RPCRunLater(const std::string& name, boost::function<void(void)> func, int64_t nSeconds)
{
    assert(rpc_io_service != NULL);

    if (deadlineTimers.count(name) == 0)
    {
        deadlineTimers.insert(make_pair(name,
                                        boost::shared_ptr<deadline_timer>(new deadline_timer(*rpc_io_service))));
    }
    deadlineTimers[name]->expires_from_now(posix_time::seconds(nSeconds));
    deadlineTimers[name]->async_wait(boost::bind(RPCRunHandler, _1, func));
}

CNetAddr BoostAsioToCNetAddr(boost::asio::ip::address address)
{
    CNetAddr netaddr;
    // Make sure that IPv4-compatible and IPv4-mapped IPv6 addresses are treated as IPv4 addresses
    if (address.is_v6()
        && (address.to_v6().is_v4_compatible()
            || address.to_v6().is_v4_mapped()))
        address = address.to_v6().to_v4();

    if (address.is_v4())
    {
        boost::asio::ip::address_v4::bytes_type bytes = address.to_v4().to_bytes();
        netaddr.SetRaw(NET_IPV4, &bytes[0]);
    } else
    {
        boost::asio::ip::address_v6::bytes_type bytes = address.to_v6().to_bytes();
        netaddr.SetRaw(NET_IPV6, &bytes[0]);
    };
    
    return netaddr;
}

void JSONRequest::parse(const Value& valRequest)
{
    // Parse request
    if (valRequest.type() != obj_type)
        throw JSONRPCError(RPC_INVALID_REQUEST, "Invalid Request object");
    const Object& request = valRequest.get_obj();

    // Parse id now so errors from here on will have the id
    id = find_value(request, "id");

    // Parse method
    Value valMethod = find_value(request, "method");
    if (valMethod.type() == null_type)
        throw JSONRPCError(RPC_INVALID_REQUEST, "Missing method");
    if (valMethod.type() != str_type)
        throw JSONRPCError(RPC_INVALID_REQUEST, "Method must be a string");
    strMethod = valMethod.get_str();
    if (strMethod != "getwork" && strMethod != "getblocktemplate")
        LogPrint("rpc", "ThreadRPCServer method=%s\n", strMethod);

    // Parse params
    Value valParams = find_value(request, "params");
    if (valParams.type() == array_type)
        params = valParams.get_array();
    else if (valParams.type() == null_type)
        params = Array();
    else
        throw JSONRPCError(RPC_INVALID_REQUEST, "Params must be an array");
}


static Object JSONRPCExecOne(const Value& req)
{
    Object rpc_result;

    JSONRequest jreq;
    try {
        jreq.parse(req);

        Value result = tableRPC.execute(jreq.strMethod, jreq.params);
        rpc_result = JSONRPCReplyObj(result, Value::null, jreq.id);
    }
    catch (Object& objError)
    {
        rpc_result = JSONRPCReplyObj(Value::null, objError, jreq.id);
    }
    catch (std::exception& e)
    {
        rpc_result = JSONRPCReplyObj(Value::null,
                                     JSONRPCError(RPC_PARSE_ERROR, e.what()), jreq.id);
    }

    return rpc_result;
}

static string JSONRPCExecBatch(const Array& vReq)
{
    Array ret;
    for (unsigned int reqIdx = 0; reqIdx < vReq.size(); reqIdx++)
        ret.push_back(JSONRPCExecOne(vReq[reqIdx]));

    return write_string(Value(ret), false) + "\n";
}

void ServiceConnection(AcceptedConnection *conn)
{
    bool fRun = true;
    while (fRun)
    {
        int nProto = 0;
        map<string, string> mapHeaders;
        string strRequest, strMethod, strURI;

        // Read HTTP request line
        if (!ReadHTTPRequestLine(conn->stream(), nProto, strMethod, strURI))
            break;

        // Read HTTP message headers and body
        ReadHTTPMessage(conn->stream(), mapHeaders, strRequest, nProto);

        if (strURI != "/") {
            conn->stream() << HTTPReply(HTTP_NOT_FOUND, "", false) << std::flush;
            break;
        }

        // Check authorization
        if (mapHeaders.count("authorization") == 0)
        {
            conn->stream() << HTTPReply(HTTP_UNAUTHORIZED, "", false) << std::flush;
            break;
        }
        if (!HTTPAuthorized(mapHeaders))
        {
            LogPrintf("ThreadRPCServer incorrect password attempt from %s\n", conn->peer_address_to_string());
            /* Deter brute-forcing short passwords.
               If this results in a DoS the user really
               shouldn't have their RPC port exposed. */
            if (mapArgs["-rpcpassword"].size() < 20)
                MilliSleep(250);

            conn->stream() << HTTPReply(HTTP_UNAUTHORIZED, "", false) << std::flush;
            break;
        }
        if (mapHeaders["connection"] == "close")
            fRun = false;

        JSONRequest jreq;
        try
        {
            // Parse request
            Value valRequest;
            if (!read_string(strRequest, valRequest))
                throw JSONRPCError(RPC_PARSE_ERROR, "Parse error");

            string strReply;

            // singleton request
            if (valRequest.type() == obj_type) {
                jreq.parse(valRequest);

                Value result = tableRPC.execute(jreq.strMethod, jreq.params);

                // Send reply
                strReply = JSONRPCReply(result, Value::null, jreq.id);

            // array of requests
            } else if (valRequest.type() == array_type)
                strReply = JSONRPCExecBatch(valRequest.get_array());
            else
                throw JSONRPCError(RPC_PARSE_ERROR, "Top-level object parse error");

            conn->stream() << HTTPReply(HTTP_OK, strReply, fRun) << std::flush;
        }
        catch (Object& objError)
        {
            ErrorReply(conn->stream(), objError, jreq.id);
            break;
        }
        catch (std::exception& e)
        {
            ErrorReply(conn->stream(), JSONRPCError(RPC_PARSE_ERROR, e.what()), jreq.id);
            break;
        }
    }
}

json_spirit::Value CRPCTable::execute(const std::string &strMethod, const json_spirit::Array &params) const
{
    // Find method
    const CRPCCommand *pcmd = tableRPC[strMethod];
    if (!pcmd)
        throw JSONRPCError(RPC_METHOD_NOT_FOUND, "Method not found");
    
    if (pcmd->reqWallet && !pwalletMain)
        throw JSONRPCError(RPC_METHOD_NOT_FOUND, "Method not found (disabled)");


    // Observe safe mode
    string strWarning = GetWarnings("rpc");
    if (strWarning != "" && !GetBoolArg("-disablesafemode", false) &&
        !pcmd->okSafeMode)
        throw JSONRPCError(RPC_FORBIDDEN_BY_SAFE_MODE, string("Safe mode: ") + strWarning);

    try
    {
        // Execute
        Value result;
        {
            if (pcmd->threadSafe)
                result = pcmd->actor(params, false);
            else if (!pwalletMain) {
                LOCK(cs_main);
                result = pcmd->actor(params, false);
            } else
            {
                LOCK2(cs_main, pwalletMain->cs_wallet);
                result = pcmd->actor(params, false);
            }
        }
        return result;
    }
    catch (std::exception& e)
    {
        throw JSONRPCError(RPC_MISC_ERROR, e.what());
    }
}

const CRPCTable tableRPC;

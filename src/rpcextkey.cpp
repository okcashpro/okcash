// Copyright (c) 2020 The Okcash developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "init.h"
#include "main.h"
#include "rpcserver.h"
#include "wallet.h"
#include "key.h"
#include "extkey.h"
#include "chainparams.h"
#include "hash.h"
#include "base58.h"

#include <sstream>
#include <algorithm>
#include <inttypes.h>


namespace bt = boost::posix_time;

using namespace json_spirit;

inline uint32_t reversePlace(uint8_t *p)
{
    uint32_t rv = 0;
    for (int i = 0; i < 4; ++i)
        rv |= (uint32_t) *(p+i) << (8 * (3-i));
    return rv;
};


int ExtractBip32InfoV(std::vector<unsigned char> &vchKey, Object &keyInfo, std::string &sError)
{
    CExtKey58 ek58;
    CExtKeyPair vk;
    vk.DecodeV(&vchKey[4]);
    keyInfo.push_back(Pair("type", "Okcash extended secret key"));
    keyInfo.push_back(Pair("version", strprintf("%02X", reversePlace(&vchKey[0]))));
    keyInfo.push_back(Pair("depth", strprintf("%u", vchKey[4])));
    keyInfo.push_back(Pair("parent_fingerprint", strprintf("%08X", reversePlace(&vchKey[5]))));
    keyInfo.push_back(Pair("child_index", strprintf("%u", reversePlace(&vchKey[9]))));
    keyInfo.push_back(Pair("chain_code", strprintf("%s", HexStr(&vchKey[13], &vchKey[13+32]))));
    keyInfo.push_back(Pair("key", strprintf("%s", HexStr(&vchKey[46], &vchKey[46+32]))));

    // don't display raw secret ??
    // TODO: add option

    CKey key;
    key.Set(&vchKey[46], true);
    CKeyID id = key.GetPubKey().GetID();
    CBitcoinAddress addr;
    addr.Set(id, CChainParams::EXT_KEY_HASH);

    keyInfo.push_back(Pair("id", addr.ToString().c_str()));
    addr.Set(id);
    keyInfo.push_back(Pair("address", addr.ToString().c_str()));
    keyInfo.push_back(Pair("checksum", strprintf("%02X", reversePlace(&vchKey[78]))));

     ek58.SetKeyP(vk);
    keyInfo.push_back(Pair("ext_public_key", ek58.ToString()));

    return 0;
};

int ExtractBip32InfoP(std::vector<unsigned char> &vchKey, Object &keyInfo, std::string &sError)
{
    CExtPubKey pk;
    keyInfo.push_back(Pair("type", "Okcash extended public key"));
    keyInfo.push_back(Pair("version", strprintf("%02X", reversePlace(&vchKey[0]))));
    keyInfo.push_back(Pair("depth", strprintf("%u", vchKey[4])));
    keyInfo.push_back(Pair("parent_fingerprint", strprintf("%08X", reversePlace(&vchKey[5]))));
    keyInfo.push_back(Pair("child_index", strprintf("%u", reversePlace(&vchKey[9]))));
    keyInfo.push_back(Pair("chain_code", strprintf("%s", HexStr(&vchKey[13], &vchKey[13+32]))));
    keyInfo.push_back(Pair("key", strprintf("%s", HexStr(&vchKey[45], &vchKey[45+33]))));

    CPubKey key;
    key.Set(&vchKey[45], &vchKey[78]);
    CKeyID id = key.GetID();
    CBitcoinAddress addr;
    addr.Set(id, CChainParams::EXT_KEY_HASH);

    keyInfo.push_back(Pair("id", addr.ToString().c_str()));
    addr.Set(id);
    keyInfo.push_back(Pair("address", addr.ToString().c_str()));
    keyInfo.push_back(Pair("checksum", strprintf("%02X", reversePlace(&vchKey[78]))));

    return 0;
};

int ExtKeyPathV(std::string &sPath, std::vector<uint8_t> &vchKey, Object &keyInfo, std::string &sError)
{
    if (sPath.compare("info") == 0)
        return ExtractBip32InfoV(vchKey, keyInfo, sError);

    CExtKey vk;
    vk.Decode(&vchKey[4]);

    CExtKey vkOut;
    CExtKey vkWork = vk;

    std::vector<uint32_t> vPath;
    int rv;
    if ((rv = ExtractExtKeyPath(sPath, vPath)) != 0)
    {
        sError = ExtKeyGetString(rv);
        return 1;
    };

    for (std::vector<uint32_t>::iterator it = vPath.begin(); it != vPath.end(); ++it)
    {
        if (*it == 0)
        {
            vkOut = vkWork;
        } else
        if (!vkWork.Derive(vkOut, *it))
        {
            sError = "CExtKey Derive failed.";
            return 1;
        };
        vkWork = vkOut;
    };

    CBitcoinExtKey ekOut;
    ekOut.SetKey(vkOut);
    keyInfo.push_back(Pair("result", ekOut.ToString()));

    return 0;
};

int ExtKeyPathP(std::string &sPath, std::vector<uint8_t> &vchKey, Object &keyInfo, std::string &sError)
{
    if (sPath.compare("info") == 0)
        return ExtractBip32InfoP(vchKey, keyInfo, sError);

    CExtPubKey pk;
    pk.Decode(&vchKey[4]);

    CExtPubKey pkOut;
    CExtPubKey pkWork = pk;

    std::vector<uint32_t> vPath;
    int rv;
    if ((rv = ExtractExtKeyPath(sPath, vPath)) != 0)
    {
        sError = ExtKeyGetString(rv);
        return 1;
    };

    for (std::vector<uint32_t>::iterator it = vPath.begin(); it != vPath.end(); ++it)
    {
        if (*it == 0)
        {
            pkOut = pkWork;
        } else
        if ((*it >> 31) == 1)
        {
            sError = "Can't derive hardened keys from public ext key.";
            return 1;
        } else
        if (!pkWork.Derive(pkOut, *it))
        {
            sError = "CExtKey Derive failed.";
            return 1;
        };
        pkWork = pkOut;
    };

    CBitcoinExtPubKey ekOut;
    ekOut.SetKey(pkOut);
    keyInfo.push_back(Pair("result", ekOut.ToString()));

    return 0;
};

int AccountInfo(CExtKeyAccount *pa, int nShowKeys, Object &obj, std::string &sError)
{
    CExtKey58 eKey58;

    obj.push_back(Pair("type", "Account"));
    obj.push_back(Pair("active", pa->nFlags & EAF_ACTIVE ? "true" : "false"));
    obj.push_back(Pair("label", pa->sLabel));

    if (pwalletMain->idDefaultAccount == pa->GetID())
        obj.push_back(Pair("default_account", "true"));

    obj.push_back(Pair("id", pa->GetIDString58()));
    obj.push_back(Pair("has_secret", pa->nFlags & EAF_HAVE_SECRET ? "true" : "false"));

    CStoredExtKey *sekAccount = pa->ChainAccount();
    if (!sekAccount)
    {
        obj.push_back(Pair("error", "chain account not set."));
        return 0;
    };

    mapEKValue_t::iterator mi = sekAccount->mapValue.find(EKVT_PATH);
    if (mi != sekAccount->mapValue.end())
    {
        std::string sPath;
        if (0 == PathToString(mi->second, sPath, 'h'))
            obj.push_back(Pair("path", sPath));
    };
    // TODO: separate passwords for accounts
    if (pa->nFlags & EAF_HAVE_SECRET
        && nShowKeys > 1
        && pwalletMain->ExtKeyUnlock(sekAccount) == 0)
    {
        eKey58.SetKeyV(sekAccount->kp);
        obj.push_back(Pair("evkey", eKey58.ToString()));
    };

    if (nShowKeys > 0)
    {
        eKey58.SetKeyP(sekAccount->kp);
        obj.push_back(Pair("epkey", eKey58.ToString()));
    };

    if (pa->nActiveExternal < pa->vExtKeys.size())
    {
        CStoredExtKey *sekE = pa->vExtKeys[pa->nActiveExternal];
        if (nShowKeys > 0)
        {
            eKey58.SetKeyP(sekE->kp);
            obj.push_back(Pair("external_chain", eKey58.ToString()));
        };
        obj.push_back(Pair("num_derives_external", strprintf("%u", sekE->nGenerated)));
        obj.push_back(Pair("num_derives_external_h", strprintf("%u", sekE->nHGenerated)));
    };

    if (pa->nActiveInternal < pa->vExtKeys.size())
    {
        CStoredExtKey *sekI = pa->vExtKeys[pa->nActiveInternal];
        if (nShowKeys > 0)
        {
            eKey58.SetKeyP(sekI->kp);
            obj.push_back(Pair("internal_chain", eKey58.ToString()));
        };
        obj.push_back(Pair("num_derives_internal", strprintf("%u", sekI->nGenerated)));
        obj.push_back(Pair("num_derives_internal_h", strprintf("%u", sekI->nHGenerated)));
    };

    if (pa->nActiveStealth < pa->vExtKeys.size())
    {
        CStoredExtKey *sekS = pa->vExtKeys[pa->nActiveStealth];
        obj.push_back(Pair("num_derives_stealth", strprintf("%u", sekS->nGenerated)));
        obj.push_back(Pair("num_derives_stealth_h", strprintf("%u", sekS->nHGenerated)));
    };

    return 0;
};

int AccountInfo(CKeyID &keyId, int nShowKeys, Object &obj, std::string &sError)
{
    // TODO: inactive keys can be in db and not in memory - search db for keyId
    ExtKeyAccountMap::iterator mi = pwalletMain->mapExtAccounts.find(keyId);
    if (mi == pwalletMain->mapExtAccounts.end())
    {
        sError = "Unknown account.";
        return 1;
    };

    CExtKeyAccount *pa = mi->second;

    return AccountInfo(pa, nShowKeys, obj, sError);
};

int ListLooseExtKeys(int nShowKeys, Array &ret, size_t &nKeys)
{
    /* 
        nShowKeys 1 for public, 2 for private
    */
    AssertLockHeld(pwalletMain->cs_wallet);

    CWalletDB wdb(pwalletMain->strWalletFile);

    CKeyID idMaster;
    wdb.ReadNamedExtKeyId("master", idMaster);


    // - list loose keys

    Dbc *pcursor;
    if (!(pcursor = wdb.GetAtCursor()))
        throw std::runtime_error(strprintf("%s : cannot create DB cursor", __func__).c_str());

    CDataStream ssKey(SER_DISK, CLIENT_VERSION);
    CDataStream ssValue(SER_DISK, CLIENT_VERSION);

    CKeyID ckeyId;
    CStoredExtKey sek;
    CExtKey58 eKey58;
    std::string strType;

    uint32_t fFlags = DB_SET_RANGE;
    ssKey << std::string("ek32");

    while (wdb.ReadAtCursor(pcursor, ssKey, ssValue, fFlags) == 0)
    {
        fFlags = DB_NEXT;

        ssKey >> strType;
        if (strType != "ek32")
            break;

        ssKey >> ckeyId;
        ssValue >> sek;

        if (sek.nFlags & EAF_IN_ACCOUNT)
            continue;

        nKeys++;

        Object obj;
        obj.push_back(Pair("type", "Loose"));
        obj.push_back(Pair("active", sek.nFlags & EAF_ACTIVE ? "true" : "false"));
        obj.push_back(Pair("receive_on", sek.nFlags & EAF_RECEIVE_ON ? "true" : "false"));
        obj.push_back(Pair("encrypted", sek.nFlags & EAF_IS_CRYPTED ? "true" : "false"));
        obj.push_back(Pair("label", sek.sLabel));

        if (reversePlace(&sek.kp.vchFingerprint[0]) == 0)
        {
            obj.push_back(Pair("path", "Root"));
        } else
        {

        };

        if (idMaster == ckeyId)
            obj.push_back(Pair("current_master", "true"));

        CBitcoinAddress addr;
        addr.Set(ckeyId, CChainParams::EXT_KEY_HASH);
        obj.push_back(Pair("id", addr.ToString()));

        if (nShowKeys > 1
            && pwalletMain->ExtKeyUnlock(&sek) == 0)
        {
            eKey58.SetKeyV(sek.kp);
            obj.push_back(Pair("evkey", eKey58.ToString()));
        };
        if (nShowKeys > 0)
        {
            eKey58.SetKeyP(sek.kp);
            obj.push_back(Pair("epkey", eKey58.ToString()));
        };

        obj.push_back(Pair("num_derives", strprintf("%u", sek.nGenerated)));
        obj.push_back(Pair("num_derives_hardened", strprintf("%u", sek.nHGenerated)));

        ret.push_back(obj);
    };

    pcursor->close();

    return 0;
};

int ListAccountExtKeys(int nShowKeys, Array &ret, size_t &nKeys)
{
    /* 
        nShowKeys 1 for public, 2 for private
    */

    AssertLockHeld(pwalletMain->cs_wallet);

    CWalletDB wdb(pwalletMain->strWalletFile);

    // - list accounts

    Dbc *pcursor;
    if (!(pcursor = wdb.GetAtCursor()))
        throw std::runtime_error(strprintf("%s : cannot create DB cursor", __func__).c_str());

    CDataStream ssKey(SER_DISK, CLIENT_VERSION);
    CDataStream ssValue(SER_DISK, CLIENT_VERSION);

    CKeyID idAccount;
    CExtKeyAccount sea;
    CBitcoinAddress addr;
    std::string strType, sError;

    uint32_t fFlags = DB_SET_RANGE;
    ssKey << std::string("eacc");

    while (wdb.ReadAtCursor(pcursor, ssKey, ssValue, fFlags) == 0)
    {
        fFlags = DB_NEXT;

        ssKey >> strType;
        if (strType != "eacc")
            break;

        ssKey >> idAccount;
        ssValue >> sea;

        sea.vExtKeys.resize(sea.vExtKeyIDs.size());
        for (size_t i = 0; i < sea.vExtKeyIDs.size(); ++i)
        {
            CKeyID &id = sea.vExtKeyIDs[i];
            CStoredExtKey *sek = new CStoredExtKey();

            if (wdb.ReadExtKey(id, *sek))
            {
                sea.vExtKeys[i] = sek;
            } else
            {
                addr.Set(idAccount, CChainParams::EXT_ACC_HASH);
                LogPrintf("WARNING: Could not read key %d of account %s\n", i, addr.ToString().c_str());
                sea.vExtKeys[i] = NULL;
                delete sek;
            };
        };

        Object obj;
        if (0 != AccountInfo(&sea, nShowKeys, obj, sError))
        {
            obj.push_back(Pair("id", sea.GetIDString58()));
            obj.push_back(Pair("error", sError));
        };

        ret.push_back(obj);

        sea.FreeChains();
    };

    pcursor->close();

    return 0;
};

int ManageExtKey(CStoredExtKey &sek, std::string &sOptName, std::string &sOptValue, Object &result, std::string &sError)
{
    if (sOptName == "label")
    {
        if (sOptValue.length() == 0)
            sek.sLabel = sOptValue;

        result.push_back(Pair("set_label", sek.sLabel));
    } else
    if (sOptName == "active")
    {
        if (sOptValue.length() > 0)
        {
            if (IsStringBoolPositive(sOptValue))
                sek.nFlags |= EAF_ACTIVE;
            else
                sek.nFlags &= ~EAF_ACTIVE;
        };

        result.push_back(Pair("set_active", sek.nFlags & EAF_ACTIVE ? "true" : "false"));
    } else
    if (sOptName == "receive_on")
    {
        if (sOptValue.length() > 0)
        {
            if (IsStringBoolPositive(sOptValue))
                sek.nFlags |= EAF_RECEIVE_ON;
            else
                sek.nFlags &= ~EAF_RECEIVE_ON;
        };

        result.push_back(Pair("receive_on", sek.nFlags & EAF_RECEIVE_ON ? "true" : "false"));
    } else
    {
        // - list all possible
        result.push_back(Pair("label", sek.sLabel));
        result.push_back(Pair("active", sek.nFlags & EAF_ACTIVE ? "true" : "false"));
        result.push_back(Pair("receive_on", sek.nFlags & EAF_RECEIVE_ON ? "true" : "false"));
    };

    return 0;
};

int ManageExtAccount(CExtKeyAccount &sea, std::string &sOptName, std::string &sOptValue, Object &result, std::string &sError)
{
    if (sOptName == "label")
    {
        if (sOptValue.length() > 0)
            sea.sLabel = sOptValue;

        result.push_back(Pair("set_label", sea.sLabel));
    } else
    if (sOptName == "active")
    {
        if (sOptValue.length() > 0)
        {
            if (IsStringBoolPositive(sOptValue))
                sea.nFlags |= EAF_ACTIVE;
            else
                sea.nFlags &= ~EAF_ACTIVE;
        };

        result.push_back(Pair("set_active", sea.nFlags & EAF_ACTIVE ? "true" : "false"));
    } else
    {
        // - list all possible
        result.push_back(Pair("label", sea.sLabel));
        result.push_back(Pair("active", sea.nFlags & EAF_ACTIVE ? "true" : "false"));
    };

    return 0;
};


Value extkey(const Array &params, bool fHelp)
{
    static const char *help = ""
        "extkey [info|list|account|gen|import|importAccount|setMaster|setDefaultAccount|deriveAccount|options]\n" 
        "extkey [\"info\"] [key] [path]\n"
        "extkey list [show_secrets] - default\n"
        "    List loose and account ext keys.\n"
        "extkey account <key/id> [show_secrets]\n"
        "    Display details of account.\n"
        "extkey gen [passphrase] [num hashes] [seed string]\n"
        "    If no passhrase is specified key will be generated from random data.\n"
        "    Warning: It is recommended to not use the passphrase\n"
        "extkey import <key> [label]\n"
        "    Add loose key to wallet.\n"
        "extkey importAccount <key> [time_scan_from] [label] \n"
        "    Add account key to wallet.\n"
        "        time_scan_from: N no check, Y-m-d date to start scanning the blockchain for owned txns.\n"
        "extkey setMaster <key/id>\n"
        "    Set a private ext key as current master key.\n"
        "    key can be a extkeyid or full key, but must be in the wallet.\n"
        "extkey setDefaultAccount <id>\n"
        "    Set an account as the default.\n"
        "extkey deriveAccount [label] [path]\n"
        "    Make a new account from the current master key, saves to wallet.\n"
        "extkey options <key> [optionName] [newValue]"
        "    Manage keys and accounts"
        "\n"
        "";


    // default mode is list unless 1st parameter is a key - then mode is set to info

    // path:
    // master keys are hashed with an integer (child_index) to form child keys
    // each child key can spawn more keys
    // payments etc are not send to keys derived from the master keys 
    //  m - master key
    //  m/0 - key0 (1st) key derived from m
    //  m/1/2 key2 (3rd) key derived from key1 derived from m

    // hardened keys are keys with (child_index) > 2^31
    // it's not possible to compute the next extended public key in the sequence from a hardened public key (still possible with a hardened private key)

    // this maintains privacy, you can give hardened public keys to customers
    // and they will not be able to compute/guess the key you give out to other customers
    // but will still be able to send payments to you on the 2^32 keys derived from the public key you provided


    // accounts to receive must be non-hardened
    //   - locked wallets must be able to derive new keys as they receive


    if (fHelp || params.size() > 4) // defaults to info, will always take at least 1 parameter
        throw std::runtime_error(help);

    std::string mode = "list";

    if (pwalletMain->IsLocked())
        throw std::runtime_error("Wallet is locked.");

    std::string sInKey = "";

    uint32_t nParamOffset = 0;
    if (params.size() > 0)
    {
        std::string s = params[0].get_str();
        std::string st = " " + s + " "; // Note the spaces
        std::transform(st.begin(), st.end(), st.begin(), ::tolower);
        static const char *pmodes = " info list gen account import importaccount setmaster setdefaultaccount deriveaccount options ";
        if (strstr(pmodes, st.c_str()) != NULL)
        {
            st.erase(std::remove(st.begin(), st.end(), ' '), st.end());
            mode = st;

            nParamOffset = 1;
        } else
        {
            sInKey = s;
            mode = "info";
        };
    };

    CBitcoinExtKey bvk;
    CBitcoinExtPubKey bpk;

    std::vector<uint8_t> vchVersionIn;
    vchVersionIn.resize(4);

    Object result;

    if (mode == "info")
    {
        std::string sMode = "info"; // info lists details of bip32 key, m displays internal key

        if (sInKey.length() == 0)
        {
            if (params.size() > nParamOffset + 1)
            {
                sInKey = params[nParamOffset].get_str();
                nParamOffset++;
            };
        };

        if (params.size() > nParamOffset + 1)
            sMode = params[nParamOffset+1].get_str();

        Object keyInfo;
        std::vector<uint8_t> vchOut;

        if (!DecodeBase58(sInKey.c_str(), vchOut))
            throw std::runtime_error("DecodeBase58 failed.");

        if (!VerifyChecksum(vchOut))
            throw std::runtime_error("VerifyChecksum failed.");



        size_t keyLen = vchOut.size();
        std::string sError;
        switch (keyLen)
        {
            case BIP32_KEY_LEN:
                if (memcmp(&vchOut[0], &Params().Base58Prefix(CChainParams::EXT_SECRET_KEY)[0], 4) == 0)
                {
                    if (ExtKeyPathV(sMode, vchOut, keyInfo, sError) != 0)
                        throw std::runtime_error(strprintf("ExtKeyPathV failed %s.", sError.c_str()));
                } else
                if (memcmp(&vchOut[0], &Params().Base58Prefix(CChainParams::EXT_PUBLIC_KEY)[0], 4) == 0)
                {
                    if (ExtKeyPathP(sMode, vchOut, keyInfo, sError) != 0)
                        throw std::runtime_error(strprintf("ExtKeyPathP failed %s.", sError.c_str()));
                } else
                if (TestNet()
                    && (memcmp(&vchOut[0], &MainNetParams().Base58Prefix(CChainParams::EXT_PUBLIC_KEY)[0], 4) == 0
                        || memcmp(&vchOut[0], &MainNetParams().Base58Prefix(CChainParams::EXT_SECRET_KEY)[0], 4) == 0))
                {
                    throw std::runtime_error("Prefix is for main-net bip32 key.");
                } else
                if (!TestNet()
                    && (memcmp(&vchOut[0], &TestNetParams().Base58Prefix(CChainParams::EXT_PUBLIC_KEY)[0], 4) == 0
                        || memcmp(&vchOut[0], &TestNetParams().Base58Prefix(CChainParams::EXT_SECRET_KEY)[0], 4) == 0))
                {
                    throw std::runtime_error("Prefix is for test-net bip32 key.");
                } else
                {
                    throw std::runtime_error(strprintf("Unknown prefix '%s'", sInKey.substr(0, 4)));
                };
                break;
            default:
                throw std::runtime_error(strprintf("Unknown ext key length '%d'", keyLen));
        };

        result.push_back(Pair("key_info", keyInfo));
    } else
    if (mode == "list")
    {
        Array ret;

        int nListFull = 0; // 0 id only, 1 id+pubkey, 2 id+pubkey+secret
        if (params.size() > nParamOffset)
        {
            std::string st = params[nParamOffset].get_str();
            if (IsStringBoolPositive(st))
                nListFull = 2;

            nParamOffset++;
        };

        size_t nKeys = 0;

        {
            LOCK(pwalletMain->cs_wallet);
            ListLooseExtKeys(nListFull, ret, nKeys);
            ListAccountExtKeys(nListFull, ret, nKeys);
        } // cs_wallet

        if (nKeys)
            return ret;

        result.push_back(Pair("result", "No keys to list."));

        //result.push_back(Pair("ext_keys", ret));

    } else
    if (mode == "account")
    {
        if (params.size() > nParamOffset)
        {
            sInKey = params[nParamOffset].get_str();
            nParamOffset++;
        } else
            throw std::runtime_error("Must specify ext key or id.");

        int nListFull = 0; // 0 id only, 1 id+pubkey, 2 id+pubkey+secret
        if (params.size() > nParamOffset)
        {
            std::string st = params[nParamOffset].get_str();
            if (IsStringBoolPositive(st))
                nListFull = 2;

            nParamOffset++;
        };

        CKeyID keyId;
        CExtKey58 eKey58;
        CExtKeyPair ekp;
        CBitcoinAddress addr;

        if (addr.SetString(sInKey)
            && addr.IsValid(CChainParams::EXT_ACC_HASH)
            && addr.GetKeyID(keyId, CChainParams::EXT_ACC_HASH))
        {
            // keyId is set
        } else
        if (eKey58.Set58(sInKey.c_str()) == 0)
        {
            ekp = eKey58.GetKey();
            keyId = ekp.GetID();
        } else
        {
            throw std::runtime_error("Invalid key.");
        };


        std::string sError;
        if (0 != AccountInfo(keyId, nListFull, result, sError))
            throw std::runtime_error("AccountInfo failed: " + sError);

    } else
    if (mode == "gen")
    {
        // - make a new master key
        //   from random or passphrase + int + seed string

        CExtKey newKey;

        CBitcoinExtKey b58Key;

        if (params.size() > 1)
        {
            std::string sPassphrase = params[1].get_str();
            int32_t nHashes = 100;
            std::string sSeed = "Okcash seed";

            // - generate from passphrase
            //   allow generator string and nhashes to be specified
            //   To allow importing of bip32 strings from other systems
            //   Match bip32.org: bip32 gen "pass" 50000 "Bitcoin seed"

            if (params.size() > 2)
            {
                std::stringstream sstr(params[2].get_str());

                sstr >> nHashes;
                if (!sstr)
                    throw std::runtime_error("Invalid num hashes");

                if (nHashes < 1)
                    throw std::runtime_error("Num hashes must be more 1 or higher.");
            };

            if (params.size() > 3)
            {
                sSeed = params[3].get_str();
            };

            if (params.size() > 4)
                throw std::runtime_error(help);

            pwalletMain->ExtKeyNew32(newKey, sPassphrase.c_str(), nHashes, sSeed.c_str());

            result.push_back(Pair("warning",
                "If the same passphrase is used by another your privacy and coins will be compromised.\n"
                "It is recommended not to use this feature - if you must, pick very unique values for passphrase, num hashes and generator parameters."));
        } else
        {
             pwalletMain->ExtKeyNew32(newKey);
        };

        b58Key.SetKey(newKey);


        result.push_back(Pair("result", b58Key.ToString()));
    } else
    if (mode == "import")
    {
        if (sInKey.length() == 0)
        {
            if (params.size() > nParamOffset)
            {
                sInKey = params[nParamOffset].get_str();
                nParamOffset++;
            };
        };

        CStoredExtKey sek;
        if (params.size() > nParamOffset)
        {
            sek.sLabel = params[nParamOffset].get_str();
            nParamOffset++;
        };

        std::vector<uint8_t> v;
        sek.mapValue[EKVT_CREATED_AT] = SetCompressedInt64(v, GetTime());

        CExtKey58 eKey58;
        if (eKey58.Set58(sInKey.c_str()) == 0)
        {
            sek.kp = eKey58.GetKey();
        } else
        {
            throw std::runtime_error("Import failed - Invalid key.");
        };

        {
            LOCK(pwalletMain->cs_wallet);
            CWalletDB wdb(pwalletMain->strWalletFile, "r+");
            if (!wdb.TxnBegin())
                throw std::runtime_error("TxnBegin failed.");

            if (0 != pwalletMain->ExtKeyImportLoose(&wdb, sek))
            {
                wdb.TxnAbort();
                throw std::runtime_error("Import failed - ExtKeyImportLoose failed.");
            } else
            {
                if (!wdb.TxnCommit())
                    throw std::runtime_error("TxnCommit failed.");
                result.push_back(Pair("result", "Success."));
                result.push_back(Pair("key_label", sek.sLabel));
                result.push_back(Pair("note", "Please backup your wallet.")); // TODO: check for child of existing key?
            };

        } // cs_wallet
    } else
    if (mode == "importaccount")
    {
        if (sInKey.length() == 0)
        {
            if (params.size() > nParamOffset)
            {
                sInKey = params[nParamOffset].get_str();
                nParamOffset++;
            };
        };

        int64_t nTimeStartScan = 1; // scan from start, 0 means no scan
        {
            std::string sVar = params[nParamOffset].get_str();
            nParamOffset++;

            if (sVar == "N")
            {
                nTimeStartScan = 0;
            } else
            if (IsStrOnlyDigits(sVar))
            {
                // - setting timestamp directly
                errno = 0;
                nTimeStartScan = strtoimax(sVar.c_str(), NULL, 10);
                if (errno != 0)
                    throw std::runtime_error("Import Account failed - Parse time error.");
            } else
            {
                int year, month, day;

                if (sscanf(sVar.c_str(), "%d-%d-%d", &year, &month, &day) != 3)
                    throw std::runtime_error("Import Account failed - Parse time error.");

                struct tm tmdate;
                tmdate.tm_year = year - 1900;
                tmdate.tm_mon = month - 1;
                tmdate.tm_mday = day;
                time_t t = mktime(&tmdate);

                nTimeStartScan = t;
            };
        };


        std::string sLabel;
        if (params.size() > nParamOffset)
        {
            sLabel = params[nParamOffset].get_str();
            nParamOffset++;
        };

        CStoredExtKey sek;
        CExtKey58 eKey58;
        if (eKey58.Set58(sInKey.c_str()) == 0)
        {
            sek.kp = eKey58.GetKey();
        } else
        {
            throw std::runtime_error("Import Account failed - Invalid key.");
        };

        {
            LOCK(pwalletMain->cs_wallet);
            CWalletDB wdb(pwalletMain->strWalletFile, "r+");
            if (!wdb.TxnBegin())
                throw std::runtime_error("TxnBegin failed.");

            int rv = pwalletMain->ExtKeyImportAccount(&wdb, sek, nTimeStartScan, sLabel);
            if (rv == 1)
            {
                wdb.TxnAbort();
                throw std::runtime_error("Import failed - ExtKeyImportAccount failed.");
            } else
            if (rv == 2)
            {
                wdb.TxnAbort();
                throw std::runtime_error("Import failed - account exists.");
            } else
            {
                if (!wdb.TxnCommit())
                    throw std::runtime_error("TxnCommit failed.");
                result.push_back(Pair("result", "Success."));

                if (rv == 3)
                    result.push_back(Pair("result", "secret added to existing account."));

                result.push_back(Pair("account_label", sLabel));
                result.push_back(Pair("scanned_from", nTimeStartScan));
                result.push_back(Pair("note", "Please backup your wallet.")); // TODO: check for child of existing key?
            };

        } // cs_wallet



    } else
    if (mode == "setmaster")
    {
        if (sInKey.length() == 0)
        {
            if (params.size() > nParamOffset)
            {
                sInKey = params[nParamOffset].get_str();
                nParamOffset++;
            } else
                throw std::runtime_error("Must specify ext key or id.");
        };

        CKeyID idNewMaster;
        CExtKey58 eKey58;
        CExtKeyPair ekp;
        CBitcoinAddress addr;

        if (addr.SetString(sInKey)
            && addr.IsValid(CChainParams::EXT_KEY_HASH)
            && addr.GetKeyID(idNewMaster, CChainParams::EXT_KEY_HASH))
        {
            // idNewMaster is set
        } else
        if (eKey58.Set58(sInKey.c_str()) == 0)
        {
            ekp = eKey58.GetKey();
            idNewMaster = ekp.GetID();
        } else
        {
            throw std::runtime_error("Invalid key.");
        };

        {
            LOCK(pwalletMain->cs_wallet);
            CWalletDB wdb(pwalletMain->strWalletFile, "r+");
            if (!wdb.TxnBegin())
                throw std::runtime_error("TxnBegin failed.");

            if (pwalletMain->ExtKeySetMaster(&wdb, idNewMaster) != 0)
            {
                wdb.TxnAbort();
                throw std::runtime_error("ExtKeySetMaster failed.");
            };
            if (!wdb.TxnCommit())
                throw std::runtime_error("TxnCommit failed.");
            result.push_back(Pair("result", "Success."));
        } // cs_wallet

    } else
    if (mode == "setdefaultaccount")
    {
        if (sInKey.length() == 0)
        {
            if (params.size() > nParamOffset)
            {
                sInKey = params[nParamOffset].get_str();
                nParamOffset++;
            } else
                throw std::runtime_error("Must specify ext key or id.");
        };

        CKeyID idNewDefault;
        CBitcoinAddress addr;

        CExtKeyAccount *sea = new CExtKeyAccount();

        if (addr.SetString(sInKey)
            && addr.IsValid(CChainParams::EXT_ACC_HASH)
            && addr.GetKeyID(idNewDefault, CChainParams::EXT_ACC_HASH))
        {
            // idNewDefault is set
        };


        {
            LOCK(pwalletMain->cs_wallet);
            CWalletDB wdb(pwalletMain->strWalletFile, "r+");
            if (!wdb.TxnBegin())
                throw std::runtime_error("TxnBegin failed.");

            if (!wdb.ReadExtAccount(idNewDefault, *sea))
                throw std::runtime_error("Account not in wallet.");

            if (!wdb.WriteNamedExtKeyId("defaultAccount", idNewDefault))
            {
                wdb.TxnAbort();
                throw std::runtime_error("WriteNamedExtKeyId failed.");
            };
            if (!wdb.TxnCommit())
                throw std::runtime_error("TxnCommit failed.");

            pwalletMain->idDefaultAccount = idNewDefault;

            // TODO: necessary?
            ExtKeyAccountMap::iterator mi = pwalletMain->mapExtAccounts.find(idNewDefault);
            if (mi == pwalletMain->mapExtAccounts.end())
            {
                pwalletMain->mapExtAccounts[idNewDefault] = sea;
            } else
            {
                delete sea;
            };

            result.push_back(Pair("result", "Success."));
        } // cs_wallet

    } else
    if (mode == "deriveaccount")
    {
        std::string sLabel, sPath;
        if (params.size() > nParamOffset)
        {
            sLabel = params[nParamOffset].get_str();
            nParamOffset++;
        };

        if (params.size() > nParamOffset)
        {
            sPath = params[nParamOffset].get_str();
            nParamOffset++;
        };

        CExtKeyAccount *sea = new CExtKeyAccount();

        {
            LOCK(pwalletMain->cs_wallet);
            CWalletDB wdb(pwalletMain->strWalletFile, "r+");
            if (!wdb.TxnBegin())
                throw std::runtime_error("TxnBegin failed.");

            if (pwalletMain->ExtKeyDeriveNewAccount(&wdb, sea, sLabel, sPath) != 0)
            {
                wdb.TxnAbort();
                result.push_back(Pair("result", "Failed."));
            } else
            {
                if (!wdb.TxnCommit())
                    throw std::runtime_error("TxnCommit failed.");

                result.push_back(Pair("result", "Success."));
                result.push_back(Pair("account", sea->GetIDString58()));
                CStoredExtKey *sekAccount = sea->ChainAccount();
                if (sekAccount)
                {
                    CExtKey58 eKey58;
                    eKey58.SetKeyP(sekAccount->kp);
                    result.push_back(Pair("public key", eKey58.ToString()));
                };

                if (sLabel != "")
                    result.push_back(Pair("label", sLabel));
            };
        } // cs_wallet
    } else
    if (mode == "options")
    {
        std::string sOptName, sOptValue, sError;
        if (sInKey.length() == 0)
        {
            if (params.size() > nParamOffset)
            {
                sInKey = params[nParamOffset].get_str();
                nParamOffset++;
            } else
                throw std::runtime_error("Must specify ext key or id.");
        };
        if (params.size() > nParamOffset)
        {
            sOptName = params[nParamOffset].get_str();
            nParamOffset++;
        };
        if (params.size() > nParamOffset)
        {
            sOptValue = params[nParamOffset].get_str();
            nParamOffset++;
        };

        CBitcoinAddress addr;

        CKeyID id;
        if (!addr.SetString(sInKey))
            throw std::runtime_error("Invalid key or account id.");

        bool fAccount = false;
        bool fKey = false;
        if (addr.IsValid(CChainParams::EXT_KEY_HASH)
            && addr.GetKeyID(id, CChainParams::EXT_KEY_HASH))
        {
            // id is set
            fKey = true;
        } else
        if (addr.IsValid(CChainParams::EXT_ACC_HASH)
            && addr.GetKeyID(id, CChainParams::EXT_ACC_HASH))
        {
            // id is set
            fAccount = true;
        } else
            throw std::runtime_error("Invalid key or account id.");


        // TODO: work directly with key?

        CStoredExtKey sek;
        CExtKeyAccount sea;
        {
            LOCK(pwalletMain->cs_wallet);
            CWalletDB wdb(pwalletMain->strWalletFile, "r+");
            if (!wdb.TxnBegin())
                throw std::runtime_error("TxnBegin failed.");

            if (fKey)
            {
                if (wdb.ReadExtKey(id, sek))
                {
                    if (0 != ManageExtKey(sek, sOptName, sOptValue, result, sError))
                    {
                        wdb.TxnAbort();
                        throw std::runtime_error("Error: " + sError);
                    };

                    if (sOptValue.length() > 0
                        && !wdb.WriteExtKey(id, sek))
                    {
                        wdb.TxnAbort();
                        throw std::runtime_error("Write failed.");
                    };
                } else
                {
                    wdb.TxnAbort();
                    throw std::runtime_error("Account not in wallet.");
                };
            };

            if (fAccount)
            {
                if (wdb.ReadExtAccount(id, sea))
                {
                    if (0 != ManageExtAccount(sea, sOptName, sOptValue, result, sError))
                    {
                        wdb.TxnAbort();
                        throw std::runtime_error("Error: " + sError);
                    };

                    if (sOptValue.length() > 0
                        && !wdb.WriteExtAccount(id, sea))
                    {
                        wdb.TxnAbort();
                        throw std::runtime_error("Write failed.");
                    };
                } else
                {
                    wdb.TxnAbort();
                    throw std::runtime_error("Account not in wallet.");
                };
            };

            if (sOptValue.length() == 0)
            {
                wdb.TxnAbort();
            } else
            {
                if (!wdb.TxnCommit())
                    throw std::runtime_error("TxnCommit failed.");
                result.push_back(Pair("result", "Success."));
            };
        } // cs_wallet

    } else
    {
        throw std::runtime_error(help);
    };

    return result;
};


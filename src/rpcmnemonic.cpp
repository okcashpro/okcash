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


using namespace json_spirit;

Value mnemonic(const Array &params, bool fHelp)
{
    static const char *help = ""
        "mnemonic <new|decode|addchecksum>\n" 
        "mnemonic new [password] [language] [nBytesEntropy] [bip44]\n"
        "    Generate a new extended key and mnemonic\n"
        "    password, can be blank "", default blank\n"
        "    language, english|french|japanese|spanish|chinese_s|chinese_t, default english\n"
        "    nBytesEntropy, 16 -> 64, default 32\n"
        "    bip44, true|false, default false\n"
        "mnemonic decode <password> <mnemonic> [bip44]\n"
        "    Decode mnemonic\n"
        "mnemonic addchecksum <mnemonic>\n"
        "    Add checksum words to mnemonic.\n"
        "    Final no of words in mnemonic must be divisible by three.\n"
        "\n"
        "";
    
    if (fHelp || params.size() > 5) // defaults to info, will always take at least 1 parameter
        throw std::runtime_error(help);
    
    std::string mode = "";
    
    uint32_t nParamOffset = 0;
    if (params.size() > 0)
    {
        std::string s = params[0].get_str();
        std::string st = " " + s + " "; // Note the spaces
        std::transform(st.begin(), st.end(), st.begin(), ::tolower);
        static const char *pmodes = " new decode addchecksum ";
        if (strstr(pmodes, st.c_str()) != NULL)
        {
            st.erase(std::remove(st.begin(), st.end(), ' '), st.end());
            mode = st;
            
            nParamOffset = 1;
        } else
        {
            throw std::runtime_error("Unknown mode.");
        };
    };
    
    Object result;
    
    if (mode == "new")
    {
        int nLanguage = WLL_ENGLISH;
        int nBytesEntropy = 32;
        bool fBip44 = false;
        std::string sPassword = "";
        std::string sError;
        
        if (params.size() > 1)
        {
            sPassword = params[1].get_str();
        };
        
        if (params.size() > 2)
        {
            static const char *planguages = "\nenglish\nfrench\njapanese\nspanish\nchinese_s\nchinese_t\n";
            std::string s = params[2].get_str();
            std::transform(s.begin(), s.end(), s.begin(), ::tolower);
            
            if (GetWordOffset(s.c_str(), planguages, strlen(planguages), nLanguage) != 0)
                throw std::runtime_error("Unknown language.");
            
            if (nLanguage < 1 || nLanguage >= WLL_MAX)
                throw std::runtime_error("Unknown language.");
        };
        
        if (params.size() > 3)
        {
            std::stringstream sstr(params[3].get_str());
            
            sstr >> nBytesEntropy;
            if (!sstr)
                throw std::runtime_error("Invalid num bytes entropy");
            
            if (nBytesEntropy < 16 || nBytesEntropy > 64)
                throw std::runtime_error("Num bytes entropy out of range [16,64].");
        };
        
        if (params.size() > 4)
        {
            std::string s = params[4].get_str();
            if (IsStringBoolPositive(s))
                fBip44 = true;
        };
        
        std::vector<uint8_t> vEntropy;
        std::vector<uint8_t> vSeed;
        vEntropy.resize(nBytesEntropy);
        
        std::string sMnemonic;
        CExtKey ekMaster;
        
        RandAddSeedPerfmon();
        for (uint32_t i = 0; i < MAX_DERIVE_TRIES; ++i)
        {
            if (1 != RAND_bytes(&vEntropy[0], nBytesEntropy))
                throw std::runtime_error("RAND_bytes failed.");
            
            if (0 != MnemonicEncode(nLanguage, vEntropy, sMnemonic, sError))
                throw std::runtime_error(strprintf("MnemonicEncode failed %s.", sError.c_str()).c_str());
            
            if (0 != MnemonicToSeed(sMnemonic, sPassword, vSeed))
                throw std::runtime_error("MnemonicToSeed failed.");
            
            ekMaster.SetMaster(&vSeed[0], vSeed.size());
            
            if (!ekMaster.IsValid())
                continue;
            break;
        };
        
        CExtKey58 eKey58;
        result.push_back(Pair("mnemonic", sMnemonic));
        
        if (fBip44)
        {
            eKey58.SetKey(ekMaster, CChainParams::EXT_SECRET_KEY_BTC);
            result.push_back(Pair("master", eKey58.ToString()));
            
            // m / purpose' / coin_type' / account' / change / address_index
            // path "44' Params().RPCPort()
        } else
        {
            eKey58.SetKey(ekMaster, CChainParams::EXT_SECRET_KEY);
            result.push_back(Pair("master", eKey58.ToString()));
        };
        
        // - in c++11 strings are definitely contiguous, and before they're very unlikely not to be
        OPENSSL_cleanse(&sMnemonic[0], sMnemonic.size());
        OPENSSL_cleanse(&sPassword[0], sPassword.size());
    } else
    if (mode == "decode")
    {
        bool fBip44 = false;
        std::string sPassword;
        std::string sMnemonic;
        std::string sError;
        
        if (params.size() > 1)
        {
            sPassword = params[1].get_str();
        } else
        {
            throw std::runtime_error("Must specify password.");
        };
        
        if (params.size() > 2)
        {
            sMnemonic = params[2].get_str();
        } else
        {
            throw std::runtime_error("Must specify mnemonic.");
        };
        
        if (params.size() > 3)
        {
            std::string s = params[3].get_str();
            if (IsStringBoolPositive(s))
                fBip44 = true;
        };
        
        std::vector<uint8_t> vEntropy;
        std::vector<uint8_t> vSeed;
        
        // - decode to determine validity of mnemonic
        if (0 != MnemonicDecode(-1, sMnemonic, vEntropy, sError))
            throw std::runtime_error(strprintf("MnemonicDecode failed %s.", sError.c_str()).c_str());
        
        if (0 != MnemonicToSeed(sMnemonic, sPassword, vSeed))
            throw std::runtime_error("MnemonicToSeed failed.");
        
        CExtKey ekMaster;
        CExtKey58 eKey58;
        ekMaster.SetMaster(&vSeed[0], vSeed.size());
        
        if (!ekMaster.IsValid())
            throw std::runtime_error("Invalid key.");
        
        if (fBip44)
        {
            eKey58.SetKey(ekMaster, CChainParams::EXT_SECRET_KEY_BTC);
            result.push_back(Pair("master", eKey58.ToString()));
            
            // m / purpose' / coin_type' / account' / change / address_index
            CExtKey ekDerived;
            ekMaster.Derive(ekDerived, BIP44_PURPOSE);
            ekDerived.Derive(ekDerived, Params().BIP44ID());
            
            eKey58.SetKey(ekDerived, CChainParams::EXT_SECRET_KEY);
            result.push_back(Pair("derived", eKey58.ToString()));
        } else
        {
            eKey58.SetKey(ekMaster, CChainParams::EXT_SECRET_KEY);
            result.push_back(Pair("master", eKey58.ToString()));
        };
        
        // - in c++11 strings are definitely contiguous, and before they're very unlikely not to be
        OPENSSL_cleanse(&sMnemonic[0], sMnemonic.size());
        OPENSSL_cleanse(&sPassword[0], sPassword.size());
    } else
    if (mode == "addchecksum")
    {
        std::string sMnemonicIn;
        std::string sMnemonicOut;
        std::string sError;
        if (params.size() != 2)
            throw std::runtime_error("Must provide input mnemonic.");
            
        sMnemonicIn = params[1].get_str();
        
        if (0 != MnemonicAddChecksum(-1, sMnemonicIn, sMnemonicOut, sError))
            throw std::runtime_error(strprintf("MnemonicAddChecksum failed %s", sError.c_str()).c_str());
        result.push_back(Pair("result", sMnemonicOut));
    } else
    {
        throw std::runtime_error(help);
    };
    
    return result;
};


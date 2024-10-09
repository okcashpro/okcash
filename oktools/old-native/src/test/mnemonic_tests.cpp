// Copyright (c) 2020 The Okcash developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <boost/test/unit_test.hpp>

#include "base58.h"
#include "key.h"
#include "extkey.h"
#include "uint256.h"
#include "util.h"
#include "chainparams.h"
#include "state.h"
#include "serialize.h"

#include "pbkdf2.h"

#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <boost/preprocessor/stringize.hpp>

#include "json/json_spirit_reader_template.h"
#include "json/json_spirit_utils.h"
#include "json/json_spirit_writer_template.h"

using namespace json_spirit;

Object read_json_object(const std::string &filename)
{
    namespace fs = boost::filesystem;
    fs::path testFile = fs::current_path() / "test" / "data" / filename;
    
#ifdef TEST_DATA_DIR
    if (!fs::exists(testFile))
    {
        testFile = fs::path(BOOST_PP_STRINGIZE(TEST_DATA_DIR)) / filename;
    }
#endif
    
    std::ifstream ifs(testFile.string().c_str(), std::ifstream::in);
    Value v;
    if (!read_stream(ifs, v))
    {
        if (ifs.fail())
            BOOST_ERROR("Cound not find/open " << filename);
        else
            BOOST_ERROR("JSON syntax error in " << filename);
        return Object();
    };
    
    if (v.type() != obj_type)
    {
        BOOST_ERROR(filename << " does not contain a json object");
        return Object();
    };
    
    return v.get_obj();
};

// test_okcash --log_level=all  --run_test=mnemonic_tests

void TestMnemonic(int nLanguage, const Array &va)
{
    std::string sError;
    
    std::string sEntropy = va[0].get_str();
    std::string sWords = va[1].get_str();
    std::string sSeed;
    std::string sPassphrase;
    if (va.size() > 3)
    {
        sPassphrase = va[2].get_str();
        sSeed = va[3].get_str();
    } else
    {
        sPassphrase = "TREZOR";
        sSeed = va[2].get_str();
    };
    
    //BOOST_MESSAGE("sEntropy " << sEntropy);
    //BOOST_MESSAGE("sWords " << sWords);
    //BOOST_MESSAGE("sSeed " << sSeed);
    //BOOST_MESSAGE("sPassphrase " << sPassphrase);
    
    std::vector<uint8_t> vEntropy = ParseHex(sEntropy);
    std::vector<uint8_t> vEntropyTest;
    
    std::string sWordsTest;
    BOOST_CHECK_MESSAGE(0 == MnemonicEncode(nLanguage, vEntropy, sWordsTest, sError), "MnemonicEncode: " << sError);
    
    BOOST_CHECK(sWords == sWordsTest);
    
    BOOST_CHECK_MESSAGE(0 == MnemonicDecode(-1, sWords, vEntropyTest, sError), "MnemonicDecode: " << sError);
    BOOST_CHECK(vEntropy == vEntropyTest);
    
    std::vector<uint8_t> vSeed = ParseHex(sSeed);
    std::vector<uint8_t> vSeedTest;
    
    BOOST_CHECK(0 == MnemonicToSeed(sWords, sPassphrase, vSeedTest));
    BOOST_CHECK(vSeed == vSeedTest);
    //BOOST_MESSAGE("vSeedTest " << HexStr(vSeedTest));
    
    if (va.size() > 4)
    {
        CExtKey58 eKey58;
        std::string sExtKey = va[4].get_str();
        
        CExtKey ekTest;
        ekTest.SetMaster(&vSeed[0], vSeed.size());
        
        eKey58.SetKey(ekTest, CChainParams::EXT_SECRET_KEY_BTC);
        BOOST_CHECK(eKey58.ToString() == sExtKey);
        
        //BOOST_MESSAGE("sExtKey " << sExtKey);
        //BOOST_MESSAGE("eKey58  " << eKey58.ToString());
    };
};

void RunMnemonicTests()
{
    // -- fail tests
    std::vector<uint8_t> vEntropy;
    std::string sWords = "legals winner thank year wave sausage worth useful legal winner thank yellow";
    std::string sError;
    BOOST_CHECK_MESSAGE(3 == MnemonicDecode(-1, sWords, vEntropy, sError), "MnemonicDecode: " << sError);
    
    sWords = "winner legal thank year wave sausage worth useful legal winner thank yellow";
    BOOST_CHECK_MESSAGE(5 == MnemonicDecode(-1, sWords, vEntropy, sError), "MnemonicDecode: " << sError);
    
    Object vectors = read_json_object("bip39_vectors.json");
    
    int nLanguage;
    for (Object::size_type i = 0; i < vectors.size(); ++i)
    {   
        const Pair &pair = vectors[i];
        const std::string &name = pair.name_;
        
        BOOST_MESSAGE("Language: " << name);
        
        if (name == "english")
            nLanguage = WLL_ENGLISH;
        else
        if (name == "japanese")
            nLanguage = WLL_JAPANESE;
        else
            nLanguage = -1;
        
        BOOST_CHECK(nLanguage != -1);
        
        if (pair.value_.type() != array_type)
        {
            BOOST_MESSAGE("Error, not array.");
            continue;
        };
        
        const Array &array = pair.value_.get_array();
        
        BOOST_FOREACH(const Value &v, array)
        {
            if (v.type() != array_type)
            {
                BOOST_MESSAGE("Error, not array.");
                continue;
            };
            
            const Array &va = v.get_array();
            if (va.size() < 3
                || va.size() > 5)
                continue;
            
            TestMnemonic(nLanguage, va);
        };
    };
};

BOOST_AUTO_TEST_SUITE(mnemonic_tests)

BOOST_AUTO_TEST_CASE(mnemonic_encode_decode)
{
    RunMnemonicTests();
};


BOOST_AUTO_TEST_SUITE_END()

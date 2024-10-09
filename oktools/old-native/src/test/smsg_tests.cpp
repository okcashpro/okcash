#include <boost/test/unit_test.hpp>

#include <boost/atomic.hpp>

#include "smessage.h"
#include "init.h" // for pwalletMain

// test_okcash --log_level=all  --run_test=smsg_tests

BOOST_AUTO_TEST_SUITE(smsg_tests)

BOOST_AUTO_TEST_CASE(smsg_test)
{
    
    const std::string sTestMessage =
        "Okcash is a STATE OF THE ART, Proof of Stake crypto currency, utilizing cutting edge technology, "
        "such as instant p2p encrypted messaging (OKChat), and anonymous dual-key stealth addresses (StealthSend). "
        "Initial distribution was done using Proof of Work and Proof of Stake.";
    
    fSecMsgEnabled = true;
    int rv;
    int nKeys = 4;
    CWallet keystore;
    CKey keyOwn[nKeys];
    for (int i = 0; i < nKeys; i++)
    {
        keyOwn[i].MakeNewKey(true);
        LOCK(keystore.cs_wallet);
        keystore.AddKey(keyOwn[i]);
    };
    
    CKey keyRemote[nKeys];
    for (int i = 0; i < nKeys; i++)
    {
        keyRemote[i].MakeNewKey(true);
        LOCK(keystore.cs_wallet);
        keystore.AddKey(keyRemote[i]); // need pubkey
    };
    
    CWallet *pwalletMainOld = pwalletMain;
    UnregisterWallet(pwalletMain);
    pwalletMain = &keystore;
    RegisterWallet(&keystore);
    
    for (int i = 0; i < nKeys; i++)
    {
        SecureMessage smsg;
        MessageData msg;
        CKeyID kFrom = keyOwn[i].GetPubKey().GetID();
        CKeyID kTo = keyRemote[i].GetPubKey().GetID();
        CKeyID kFail = keyRemote[(i+1) % nKeys].GetPubKey().GetID();
        CBitcoinAddress addrFrom(kFrom);
        CBitcoinAddress addrTo(kTo);
        CBitcoinAddress addrFail(kFail);
        std::string sAddrFrom = addrFrom.ToString();
        std::string sAddrTo = addrFrom.ToString();
        std::string sAddrFail = addrFail.ToString();
        
        BOOST_MESSAGE("sAddrFrom " << sAddrFrom);
        BOOST_MESSAGE("sAddrTo " << sAddrTo);
        
        BOOST_CHECK_MESSAGE(0 == (rv = SecureMsgEncrypt(smsg, sAddrFrom, sAddrTo, sTestMessage)), "SecureMsgEncrypt " << rv);
        
        BOOST_CHECK_MESSAGE(0 == (rv = SecureMsgSetHash((uint8_t*)&smsg, ((uint8_t*)&smsg) + SMSG_HDR_LEN, smsg.nPayload)), "SecureMsgSetHash " << rv);
        
        BOOST_CHECK_MESSAGE(0 == (rv = SecureMsgValidate((uint8_t*)&smsg, ((uint8_t*)&smsg) + SMSG_HDR_LEN, smsg.nPayload)), "SecureMsgValidate " << rv);
        
        BOOST_CHECK_MESSAGE(0 == (rv = SecureMsgDecrypt(false, sAddrTo, smsg, msg)), "SecureMsgDecrypt " << rv);
        
        BOOST_CHECK(msg.vchMessage.size()-1 == sTestMessage.size()
            && 0 == memcmp(&msg.vchMessage[0], sTestMessage.data(), msg.vchMessage.size()-1));
        
        
        BOOST_CHECK_MESSAGE(1 == (rv = SecureMsgDecrypt(false, sAddrFail, smsg, msg)), "SecureMsgDecrypt " << rv);
    };
    
    
    UnregisterWallet(&keystore);
    pwalletMain = pwalletMainOld;
    RegisterWallet(pwalletMain);
    fSecMsgEnabled = false;
}

BOOST_AUTO_TEST_SUITE_END()

#define BOOST_TEST_MODULE Okcash Test Suite
#include <boost/test/unit_test.hpp>
#include <boost/filesystem.hpp>

#include "state.h"
#include "db.h"
#include "main.h"
#include "wallet.h"


CWallet *pwalletMain;
CClientUIInterface uiInterface;

extern bool fPrintToConsole;
extern void noui_connect();

boost::filesystem::path pathTemp;

struct TestingSetup {
    TestingSetup() {
        //fPrintToDebugLog = false; // don't want to write to debug.log file
        
        //pathTemp = GetTempPath() / strprintf("test_okcash_%lu_%i", (unsigned long)GetTime(), (int)(GetRand(100000)));
        pathTemp = GetTempPath() / "test_okcash";
        //printf("pathTemp %s\n", pathTemp.string().c_str());
        boost::filesystem::create_directories(pathTemp);
        mapArgs["-datadir"] = pathTemp.string();
        
        fDebug = true;
        fDebugSmsg = true;
        fDebugChain = true;
        fDebugRingSig = true;
        fDebugPoS = true;
        
        noui_connect();
        bitdb.MakeMock();
        
        LoadBlockIndex(true);
        pwalletMain = new CWallet("walletUT.dat");
        pwalletMain->LoadWallet();
        RegisterWallet(pwalletMain);
    }
    ~TestingSetup()
    {
        delete pwalletMain;
        pwalletMain = NULL;
        bitdb.Flush(true);
    }
};

BOOST_GLOBAL_FIXTURE(TestingSetup);

void Shutdown(void* parg)
{
  exit(0);
}

void StartShutdown()
{
  exit(0);
}


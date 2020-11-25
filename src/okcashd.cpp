// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2012 The Bitcoin developers
// Distributed under the MIT/X11 software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "rpcserver.h"
#include "rpcclient.h"
#include "init.h"

#include <boost/algorithm/string/predicate.hpp>

#include "protocol.h"


void ThreadCli()
{
    // - Simple persistent cli
    //   TODO:
    //      unbuffered terminal input on linux
    //      format help text

    char buffer[4096];
    size_t n;
    fd_set rfds;
    struct timeval tv;

    printf("Okcash CLI ready:\n> ");
    fflush(stdout);

    for (;;)
    {
        boost::this_thread::interruption_point();

        // - must be set every iteration
        FD_ZERO(&rfds);
        FD_SET(STDIN_FILENO, &rfds);
        tv.tv_sec = 0;
        tv.tv_usec = 200000;

        if (select(1, &rfds, NULL, NULL, &tv) < 1) // read blocks thread from interrupt
            continue;

        if ((n = read(STDIN_FILENO, buffer, sizeof(buffer))) < 1)
            continue;

        buffer[n] = '\0';
        for ( ; n > 0 && (buffer[n-1] == '\n' || buffer[n-1] == '\r'); --n)
            buffer[n-1] = '\0';

        if (strcmp(buffer, "stop") == 0
            || strcmp(buffer, "exit") == 0
            || strcmp(buffer, "quit") == 0
            || strcmp(buffer, "q") == 0)
        {
            puts("Exiting...");
            break;
        };


        std::string strMethod;
        std::vector<std::string> strParams;
        char *p;
        if ((p = strchr(buffer, ' ')))
        {
            strMethod = std::string(buffer, p);

            char *pPS = p+1;
            char *pPE = p+1;
            while (*pPS
                && ((pPE = strchr(pPS, ' '))
                || (pPE = strchr(pPS, '\0'))))
            {
                strParams.push_back(std::string(pPS, pPE));
                pPS = pPE+1;
            };
        } else
        {
            strMethod = std::string(buffer);
        };

        std::string strReply;
        JSONRequest jreq;

        try
        {
            json_spirit::Array params = RPCConvertValues(strMethod, strParams);
            json_spirit::Value result = tableRPC.execute(strMethod, params);

            strReply = json_spirit::write_string(result, true);

            ReplaceStrInPlace(strReply, "\\n", "\n"); // format help msg

            if (write(STDOUT_FILENO, strReply.data(), strReply.length()) != (uint32_t) strReply.length())
                throw std::runtime_error("write failed.");

            printf("\n> ");
            fflush(stdout);
        } catch (json_spirit::Object& objError)
        {
            std::string strReply = JSONRPCReply(json_spirit::Value::null, objError, 0);
            printf("Error: %s\n> ", strReply.c_str());
            fflush(stdout);
        } catch (std::exception& e)
        {
            printf("Error: %s\n> ", e.what());
            fflush(stdout);
        };
        fflush(stdout);
    };

    StartShutdown();
};


void WaitForShutdown(boost::thread_group* threadGroup)
{
    bool fShutdown = ShutdownRequested();

    if (!fDaemon && GetBoolArg("-cli", false))
    {
        threadGroup->create_thread(boost::bind(&TraceThread<void (*)()>, "cli", &ThreadCli));
    };

    // Tell the main threads to shutdown.
    while (!fShutdown)
    {
        MilliSleep(200);
        fShutdown = ShutdownRequested();
    };
    
    LogPrintf("Okcash shutdown.\n\n");
    
    if (threadGroup)
    {
        threadGroup->interrupt_all();
        threadGroup->join_all();
    };
}

//////////////////////////////////////////////////////////////////////////////
//
// Start
//
bool AppInit(int argc, char* argv[])
{
    boost::thread_group threadGroup;
    
    bool fRet = false;
    try
    {
        //
        // Parameters
        //
        // If Qt is used, parameters/bitcoin.conf are parsed in qt/bitcoin.cpp's main()
        ParseParameters(argc, argv);
        if (!boost::filesystem::is_directory(GetDataDir(false)))
        {
            fprintf(stderr, "Error: Specified directory does not exist\n");
            Shutdown();
        };
        
        ReadConfigFile(mapArgs, mapMultiArgs);
        
        if (mapArgs.count("-?") || mapArgs.count("--help"))
        {
            // First part of help message is specific to bitcoind / RPC client
            std::string strUsage = _("Okcash version") + " " + FormatFullVersion() + "\n\n" +
                _("Usage:") + "\n" +
                  "  okcashd [options]                     " + "\n" +
                  "  okcashd [options] <command> [params]  " + _("Send command to -server or okcashd") + "\n" +
                  "  okcashd [options] help                " + _("List commands") + "\n" +
                  "  okcashd [options] help <command>      " + _("Get help for a command") + "\n";

            strUsage += "\n" + HelpMessage();

            fprintf(stdout, "%s", strUsage.c_str());
            return false;
        };

        // Command-line RPC
        for (int i = 1; i < argc; i++)
            if (!IsSwitchChar(argv[i][0]) && !boost::algorithm::istarts_with(argv[i], "okcash:"))
                fCommandLine = true;

        if (fCommandLine)
        {
            if (!SelectParamsFromCommandLine())
            {
                fprintf(stderr, "Error: invalid combination of -regtest and -testnet.\n");
                return false;
            };
            
            int ret = CommandLineRPC(argc, argv);
            exit(ret);
        };
		
#if !defined(WIN32)
        fDaemon = GetBoolArg("-daemon", false);
        if (fDaemon)
        {
            // Daemonize
            pid_t pid = fork();
            if (pid < 0)
            {
                fprintf(stderr, "Error: fork() returned %d errno %d\n", pid, errno);
                return false;
            };
            
            if (pid > 0) // Parent process, pid is child process id
            {
                CreatePidFile(GetPidFile(), pid);
                return true;
            };
            
            // Child process falls through to rest of initialization


            pid_t sid = setsid();
            if (sid < 0)
                fprintf(stderr, "Error: setsid() returned %d errno %d\n", sid, errno);
        };
#endif

        if (GetBoolArg("-cli", false))
            printf("Starting...\n");

        fRet = AppInit2(threadGroup);
    } catch (std::exception& e)
    {
        PrintException(&e, "AppInit()");
    } catch (...)
    {
        PrintException(NULL, "AppInit()");
    };

    if (!fRet)
    {
        threadGroup.interrupt_all();
        // threadGroup.join_all(); was left out intentionally here, because we didn't re-test all of
        // the startup-failure cases to make sure they don't result in a hang due to some
        // thread-blocking-waiting-for-another-thread-during-startup case
    } else
    {
        WaitForShutdown(&threadGroup);
    };
    Shutdown();

    return fRet;
}

extern void noui_connect();
int main(int argc, char* argv[])
{
    bool fRet = false;
    fHaveGUI = false;
    
    // Connect okcashd signal handlers
    noui_connect();
    
    fRet = AppInit(argc, argv);
    
    if (fRet && fDaemon)
        return 0;
    
    return (fRet ? 0 : 1);
};

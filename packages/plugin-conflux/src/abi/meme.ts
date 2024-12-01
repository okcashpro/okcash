const MEMEABI = [
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "address",
                        name: "tokenImpl_",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "tokenImplV2_",
                        type: "address",
                    },
                    {
                        internalType: "uint256",
                        name: "feeRate_",
                        type: "uint256",
                    },
                    {
                        internalType: "address",
                        name: "feeReceiver_",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "dexLauncher_",
                        type: "address",
                    },
                    {
                        internalType: "enum IConfiPumpTypes.DexThreshType",
                        name: "defaultDexThreshType_",
                        type: "uint8",
                    },
                    {
                        internalType: "enum IConfiPumpTypes.CurveType",
                        name: "defaultCurveType_",
                        type: "uint8",
                    },
                    {
                        internalType: "enum IConfiPumpTypes.TokenVersion",
                        name: "defaultTokenVersion_",
                        type: "uint8",
                    },
                    {
                        internalType: "address",
                        name: "v2Factory_",
                        type: "address",
                    },
                    {
                        internalType: "bytes32",
                        name: "v2InitCodeHash_",
                        type: "bytes32",
                    },
                    {
                        internalType: "address",
                        name: "weth_",
                        type: "address",
                    },
                    {
                        internalType: "uint256",
                        name: "creation_fee_",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "lpEth_",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "lpEthTokenCreator_",
                        type: "uint256",
                    },
                ],
                internalType: "struct ConfiPumpBase.ConfiPumpInitParams",
                name: "params",
                type: "tuple",
            },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "actualAmount",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "amount1",
                type: "uint256",
            },
        ],
        name: "ActualAmountMustLTEAmount",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "AmountTooSmall",
        type: "error",
    },
    {
        inputs: [],
        name: "CallReverted",
        type: "error",
    },
    {
        inputs: [],
        name: "FeatureDisabled",
        type: "error",
    },
    {
        inputs: [],
        name: "GameNotLive",
        type: "error",
    },
    {
        inputs: [],
        name: "GameNotPaused",
        type: "error",
    },
    {
        inputs: [],
        name: "GameNotPending",
        type: "error",
    },
    {
        inputs: [],
        name: "GameNotStarted",
        type: "error",
    },
    {
        inputs: [],
        name: "InvalidDEXSupplyThreshold",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "threshold",
                type: "uint256",
            },
        ],
        name: "InvalidDexThreshold",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "enum IConfiPumpTypes.DexThreshType",
                name: "threshold",
                type: "uint8",
            },
        ],
        name: "InvalidDexThresholdType",
        type: "error",
    },
    {
        inputs: [],
        name: "InvalidGameSupplyThreshold",
        type: "error",
    },
    {
        inputs: [],
        name: "InvalidLocks",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "expected",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "actual",
                type: "uint256",
            },
        ],
        name: "InvalidPiggybackLength",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "id",
                type: "uint256",
            },
        ],
        name: "InvalidRoundID",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "signer",
                type: "address",
            },
        ],
        name: "InvalidSigner",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        name: "InvalidTokenForBattle",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                internalType: "enum IConfiPumpTypes.TokenMode",
                name: "mode",
                type: "uint8",
            },
        ],
        name: "InvalidTokenModeForGame",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                internalType: "enum IConfiPumpTypes.TokenMode",
                name: "from",
                type: "uint8",
            },
            {
                internalType: "enum IConfiPumpTypes.TokenMode",
                name: "to",
                type: "uint8",
            },
        ],
        name: "InvalidTokenModeTransition",
        type: "error",
    },
    {
        inputs: [],
        name: "LastRoundNotResolved",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "expected",
                type: "address",
            },
            {
                internalType: "address",
                name: "actual",
                type: "address",
            },
        ],
        name: "MismatchedAddressInProof",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "srcToken",
                type: "address",
            },
            {
                internalType: "address",
                name: "dstToken",
                type: "address",
            },
        ],
        name: "NoConversionPath",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "created",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "max",
                type: "uint256",
            },
        ],
        name: "NoQuotaForCreator",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "collection",
                type: "address",
            },
        ],
        name: "NonPositionNFTReceived",
        type: "error",
    },
    {
        inputs: [],
        name: "NotImplemented",
        type: "error",
    },
    {
        inputs: [],
        name: "NotRoller",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "sender",
                type: "address",
            },
        ],
        name: "NotUniswapV3Pool",
        type: "error",
    },
    {
        inputs: [],
        name: "PermissionlessCreateDisabled",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint160",
                name: "sqrtPriceA",
                type: "uint160",
            },
            {
                internalType: "uint160",
                name: "sqrtPriceB",
                type: "uint160",
            },
        ],
        name: "PriceAMustLTPriceB",
        type: "error",
    },
    {
        inputs: [],
        name: "ProtocolDisabled",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "requiredToken",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "reserveToken",
                type: "uint256",
            },
        ],
        name: "RequiredTokenMustLTE",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "id",
                type: "uint256",
            },
        ],
        name: "RoundNotFound",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "tokenA",
                type: "address",
            },
        ],
        name: "SameToken",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "seq",
                type: "uint256",
            },
        ],
        name: "SeqNotFound",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "actualAmount",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "minAmount",
                type: "uint256",
            },
        ],
        name: "SlippageTooHigh",
        type: "error",
    },
    {
        inputs: [],
        name: "StakingDisabled",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "newSupply",
                type: "uint256",
            },
        ],
        name: "SupplyExceedsTotalSupply",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        name: "TokenAlreadyDEXed",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        name: "TokenAlreadyInGame",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        name: "TokenInDuel",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        name: "TokenKilled",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        name: "TokenNotDEXed",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        name: "TokenNotFound",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        name: "TokenNotKilled",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        name: "TokenNotTradable",
        type: "error",
    },
    {
        inputs: [],
        name: "TradeDisabled",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "pool",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "liquidity",
                type: "uint256",
            },
        ],
        name: "UniswapV2PoolNotZero",
        type: "error",
    },
    {
        inputs: [],
        name: "UniswapV3Slot0Failed",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "next",
                type: "uint256",
            },
        ],
        name: "cannotCheckInUntil",
        type: "error",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "uint256",
                name: "oldFlags",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "newFlags",
                type: "uint256",
            },
        ],
        name: "BitFlagsChanged",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "user",
                type: "address",
            },
        ],
        name: "CheckedIn",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "newSupply",
                type: "uint256",
            },
        ],
        name: "FlapTokenCirculatingSupplyChanged",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "uint8",
                name: "version",
                type: "uint8",
            },
        ],
        name: "Initialized",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                indexed: false,
                internalType: "address",
                name: "pool",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "eth",
                type: "uint256",
            },
        ],
        name: "LaunchedToDEX",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "bytes32",
                name: "previousAdminRole",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "bytes32",
                name: "newAdminRole",
                type: "bytes32",
            },
        ],
        name: "RoleAdminChanged",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
            },
        ],
        name: "RoleGranted",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
            },
        ],
        name: "RoleRevoked",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "uint256",
                name: "ts",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                indexed: false,
                internalType: "address",
                name: "buyer",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "eth",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "fee",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "postPrice",
                type: "uint256",
            },
        ],
        name: "TokenBought",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "uint256",
                name: "ts",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "address",
                name: "creator",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "nonce",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                indexed: false,
                internalType: "string",
                name: "name",
                type: "string",
            },
            {
                indexed: false,
                internalType: "string",
                name: "symbol",
                type: "string",
            },
            {
                indexed: false,
                internalType: "string",
                name: "meta",
                type: "string",
            },
        ],
        name: "TokenCreated",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                indexed: false,
                internalType: "address",
                name: "curve",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "curveParameter",
                type: "uint256",
            },
        ],
        name: "TokenCurveSet",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "dexSupplyThresh",
                type: "uint256",
            },
        ],
        name: "TokenDexSupplyThreshSet",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "uint256",
                name: "ts",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "address",
                name: "srcToken",
                type: "address",
            },
            {
                indexed: false,
                internalType: "address",
                name: "dstToken",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "srcAmount",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "dstAmount",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "address",
                name: "who",
                type: "address",
            },
        ],
        name: "TokenRedeemed",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "uint256",
                name: "ts",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                indexed: false,
                internalType: "address",
                name: "seller",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "eth",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "fee",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "postPrice",
                type: "uint256",
            },
        ],
        name: "TokenSold",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                indexed: false,
                internalType: "enum IConfiPumpTypes.TokenVersion",
                name: "version",
                type: "uint8",
            },
        ],
        name: "TokenVersionSet",
        type: "event",
    },
    {
        stateMutability: "nonpayable",
        type: "fallback",
    },
    {
        inputs: [],
        name: "DEFAULT_ADMIN_ROLE",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                internalType: "address",
                name: "recipient",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "minAmount",
                type: "uint256",
            },
            {
                internalType: "bool",
                name: "isCreator",
                type: "bool",
            },
        ],
        name: "buy",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "payable",
        type: "function",
    },
    {
        inputs: [],
        name: "checkIn",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
        ],
        name: "getRoleAdmin",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        name: "getToken",
        outputs: [
            {
                components: [
                    {
                        internalType: "enum IConfiPumpTypes.TokenStatus",
                        name: "status",
                        type: "uint8",
                    },
                    {
                        internalType: "uint256",
                        name: "reserve",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "circulatingSupply",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "price",
                        type: "uint256",
                    },
                    {
                        internalType: "bool",
                        name: "inGame",
                        type: "bool",
                    },
                    {
                        internalType: "uint256",
                        name: "seqInGame",
                        type: "uint256",
                    },
                ],
                internalType: "struct IConfiPumpTypes.TokenState",
                name: "",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        name: "getTokenEx",
        outputs: [
            {
                components: [
                    {
                        internalType: "enum IConfiPumpTypes.TokenStatus",
                        name: "status",
                        type: "uint8",
                    },
                    {
                        internalType: "uint256",
                        name: "reserve",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "circulatingSupply",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "price",
                        type: "uint256",
                    },
                    {
                        internalType: "bool",
                        name: "inGame",
                        type: "bool",
                    },
                    {
                        internalType: "uint256",
                        name: "seqInGame",
                        type: "uint256",
                    },
                    {
                        internalType: "enum IConfiPumpTypes.TokenMode",
                        name: "mode",
                        type: "uint8",
                    },
                ],
                internalType: "struct IConfiPumpTypes.TokenStateEx",
                name: "",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        name: "getTokenV2",
        outputs: [
            {
                components: [
                    {
                        internalType: "enum IConfiPumpTypes.TokenStatus",
                        name: "status",
                        type: "uint8",
                    },
                    {
                        internalType: "uint256",
                        name: "reserve",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "circulatingSupply",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "price",
                        type: "uint256",
                    },
                    {
                        internalType: "enum IConfiPumpTypes.TokenVersion",
                        name: "tokenVersion",
                        type: "uint8",
                    },
                    {
                        internalType: "uint256",
                        name: "r",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "dexSupplyThresh",
                        type: "uint256",
                    },
                ],
                internalType: "struct IConfiPumpTypes.TokenStateV2",
                name: "state",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "grantRole",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "hasRole",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "admin",
                type: "address",
            },
        ],
        name: "initialize",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "lastCheckIn",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "string",
                name: "name",
                type: "string",
            },
            {
                internalType: "string",
                name: "symbol",
                type: "string",
            },
            {
                internalType: "string",
                name: "meta",
                type: "string",
            },
        ],
        name: "newToken",
        outputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        stateMutability: "payable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "string",
                name: "name",
                type: "string",
            },
            {
                internalType: "string",
                name: "symbol",
                type: "string",
            },
            {
                internalType: "string",
                name: "meta",
                type: "string",
            },
        ],
        name: "newTokenNoDuel",
        outputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        stateMutability: "payable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "string",
                name: "name",
                type: "string",
            },
            {
                internalType: "string",
                name: "symbol",
                type: "string",
            },
            {
                internalType: "string",
                name: "meta",
                type: "string",
            },
            {
                internalType: "enum IConfiPumpTypes.DexThreshType",
                name: "dexTreshType",
                type: "uint8",
            },
        ],
        name: "newTokenWithDexSupplyThresh",
        outputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        stateMutability: "payable",
        type: "function",
    },
    {
        inputs: [],
        name: "nonce",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "eth",
                type: "uint256",
            },
        ],
        name: "previewBuy",
        outputs: [
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "srcToken",
                type: "address",
            },
            {
                internalType: "address",
                name: "dstToken",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "srcAmount",
                type: "uint256",
            },
        ],
        name: "previewRedeem",
        outputs: [
            {
                internalType: "uint256",
                name: "dstAmount",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "previewSell",
        outputs: [
            {
                internalType: "uint256",
                name: "eth",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "srcToken",
                type: "address",
            },
            {
                internalType: "address",
                name: "dstToken",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "srcAmount",
                type: "uint256",
            },
        ],
        name: "redeem",
        outputs: [
            {
                internalType: "uint256",
                name: "dstAmount",
                type: "uint256",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "renounceRole",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "revokeRole",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "minEth",
                type: "uint256",
            },
        ],
        name: "sell",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "flags",
                type: "uint256",
            },
        ],
        name: "setBitFlags",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes4",
                name: "interfaceId",
                type: "bytes4",
            },
        ],
        name: "supportsInterface",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        name: "tokenCreators",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        name: "tokenCreatorsFeeBalance",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        stateMutability: "payable",
        type: "receive",
    },
] as const;

export default MEMEABI;

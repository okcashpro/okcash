import type { Principal } from "@dfinity/principal";
import type { ActorMethod } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";

export interface Candle {
    low: number;
    high: number;
    close: number;
    open: number;
    timestamp: bigint;
}
export interface Comment {
    creator: string;
    token: string;
    content: string;
    created_at: bigint;
    image: [] | [string];
}
export interface CreateCommentArg {
    token: string;
    content: string;
    image: [] | [string];
}
export interface CreateMemeTokenArg {
    twitter: [] | [string];
    logo: string;
    name: string;
    description: string;
    website: [] | [string];
    telegram: [] | [string];
    symbol: string;
}
export interface Holder {
    balance: bigint;
    owner: string;
}
export interface InitArg {
    fee_receiver: Principal;
    create_token_fee: [] | [bigint];
    icp_canister_id: Principal;
    maintenance: boolean;
    fee_percentage: [] | [number];
}
export interface MemeToken {
    id: bigint;
    creator: string;
    available_token: bigint;
    twitter: [] | [string];
    volume_24h: bigint;
    logo: string;
    name: string;
    liquidity: number;
    description: string;
    created_at: bigint;
    website: [] | [string];
    last_tx_time: bigint;
    canister: [] | [string];
    market_cap_icp: bigint;
    market_cap_usd: number;
    price: number;
    telegram: [] | [string];
    symbol: string;
}
export interface MemeTokenView {
    token: MemeToken;
    balance: bigint;
}
export type Result = { Ok: bigint } | { Err: string };
export type Result_1 = { Ok: MemeToken } | { Err: string };
export type Sort =
    | { CreateTimeDsc: null }
    | { LastTradeDsc: null }
    | { MarketCapDsc: null };
export interface Transaction {
    token_amount: bigint;
    token_id: bigint;
    token_symbol: string;
    from: string;
    timestamp: bigint;
    icp_amount: bigint;
    tx_type: string;
}
export interface User {
    principal: string;
    name: string;
    last_login_seconds: bigint;
    register_at_second: bigint;
    avatar: string;
}
export interface WalletReceiveResult {
    accepted: bigint;
}
export interface _SERVICE {
    buy: ActorMethod<[bigint, number], Result>;
    calculate_buy: ActorMethod<[bigint, number], Result>;
    calculate_sell: ActorMethod<[bigint, number], Result>;
    create_token: ActorMethod<[CreateMemeTokenArg], Result_1>;
    king_of_hill: ActorMethod<[], [] | [MemeToken]>;
    last_txs: ActorMethod<[bigint], Array<Transaction>>;
    post_comment: ActorMethod<[CreateCommentArg], undefined>;
    query_all_tokens: ActorMethod<
        [bigint, bigint, [] | [Sort]],
        [Array<MemeToken>, bigint]
    >;
    query_token: ActorMethod<[bigint], [] | [MemeToken]>;
    query_token_candle: ActorMethod<[bigint, [] | [bigint]], Array<Candle>>;
    query_token_comments: ActorMethod<
        [Principal, bigint, bigint],
        [Array<Comment>, bigint]
    >;
    query_token_holders: ActorMethod<
        [bigint, bigint, bigint],
        [Array<Holder>, bigint]
    >;
    query_token_transactions: ActorMethod<
        [bigint, bigint, bigint],
        [Array<Transaction>, bigint]
    >;
    query_user: ActorMethod<[[] | [Principal]], User>;
    query_user_launched: ActorMethod<[[] | [Principal]], Array<MemeToken>>;
    query_user_tokens: ActorMethod<[[] | [Principal]], Array<MemeTokenView>>;
    sell: ActorMethod<[bigint, number], Result>;
    wallet_balance: ActorMethod<[], bigint>;
    wallet_receive: ActorMethod<[], WalletReceiveResult>;
}
export declare const idlFactory: IDL.InterfaceFactory;

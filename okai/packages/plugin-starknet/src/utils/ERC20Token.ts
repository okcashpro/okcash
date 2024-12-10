import {
    AccountInterface,
    cairo,
    CallData,
    Calldata,
    Contract,
    ProviderInterface,
} from "starknet";
import erc20Abi from "./erc20.json";

export type ApproveCall = {
    contractAddress: string;
    entrypoint: "approve";
    calldata: Calldata;
};

export type TransferCall = {
    contractAddress: string;
    entrypoint: "transfer";
    calldata: Calldata;
};

export class ERC20Token {
    abi: any;
    contract: Contract;
    calldata: CallData;
    constructor(
        token: string,
        providerOrAccount?: ProviderInterface | AccountInterface
    ) {
        this.contract = new Contract(erc20Abi, token, providerOrAccount);
        this.calldata = new CallData(this.contract.abi);
    }

    public address() {
        return this.contract.address;
    }

    public async balanceOf(account: string): Promise<bigint> {
        const result = await this.contract.call("balance_of", [account]);
        return result as bigint;
    }

    public async decimals() {
        const result = await this.contract.call("decimals");
        return result as bigint;
    }

    public approveCall(spender: string, amount: bigint): ApproveCall {
        return {
            contractAddress: this.contract.address,
            entrypoint: "approve",
            calldata: this.calldata.compile("approve", {
                spender: spender,
                amount: cairo.uint256(amount),
            }),
        };
    }

    public transferCall(recipient: string, amount: bigint): TransferCall {
        return {
            contractAddress: this.contract.address,
            entrypoint: "transfer",
            calldata: this.calldata.compile("transfer", {
                recipient: recipient,
                amount: cairo.uint256(amount),
            }),
        };
    }
}

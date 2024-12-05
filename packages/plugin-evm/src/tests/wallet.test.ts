import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { mainnet, iotex, arbitrum } from "viem/chains";

import { WalletProvider } from "../providers/wallet";

describe("Wallet provider", () => {
    let walletProvider: WalletProvider;
    let pk: `0x${string}`;

    beforeAll(() => {
        pk = generatePrivateKey();
    });

    describe("Constructor", () => {
        it("sets address", () => {
            const account = privateKeyToAccount(pk);
            const expectedAddress = account.address;

            walletProvider = new WalletProvider(pk, ["iotexTestnet"]);

            expect(walletProvider.getAddress()).to.be.eq(expectedAddress);
        });
        it("sets default chain to ethereum mainnet", () => {
            walletProvider = new WalletProvider(pk, []);

            expect(walletProvider.chains.mainnet.id).to.be.eq(mainnet.id);
            expect(walletProvider.getCurrentChain().id).to.be.eq(mainnet.id);
        });
        it("sets custom chains", () => {
            walletProvider = new WalletProvider(pk, ["iotex", "arbitrum"]);

            expect(walletProvider.chains.iotex.id).to.be.eq(iotex.id);
            expect(walletProvider.chains.arbitrum.id).to.be.eq(arbitrum.id);
        });
        it("sets the first provided custom chain as current chain", () => {
            walletProvider = new WalletProvider(pk, ["iotex", "arbitrum"]);

            expect(walletProvider.getCurrentChain().id).to.be.eq(iotex.id);
        });
        it("throws if invalid chain name", () => {
            // @ts-ignore
            expect(() => new WalletProvider(pk, ["eth"])).to.throw();
        });
        it("throws if unsupported chain name", () => {
            // @ts-ignore
            expect(() => new WalletProvider(pk, ["ethereum"])).to.throw();
        });
    });
    describe("Clients", () => {
        beforeEach(() => {
            walletProvider = new WalletProvider(pk, []);
        });
        it("generates public client", () => {
            const client = walletProvider.getPublicClient("mainnet");
            expect(client.chain.id).to.be.equal(mainnet.id);
        });
        it("generates wallet client", () => {
            const account = privateKeyToAccount(pk);
            const expectedAddress = account.address;

            const client = walletProvider.getWalletClient("mainnet");

            expect(client.account.address).to.be.equal(expectedAddress);
        });
    });
    describe("Balance", () => {
        beforeEach(() => {
            walletProvider = new WalletProvider(pk, ["iotex"]);
        });
        it("should fetch balance", async () => {
            const bal = await walletProvider.getWalletBalance();

            expect(bal).to.be.eq("0");
        });
        it("should fetch balance for a specific added chain", async () => {
            const bal = await walletProvider.getWalletBalanceForChain("iotex");

            expect(bal).to.be.eq("0");
        });
        it("should return null if chain is not added", async () => {
            const bal =
                await walletProvider.getWalletBalanceForChain("arbitrum");
            expect(bal).to.be.null;
        });
    });
    describe("Chain", () => {
        beforeEach(() => {
            walletProvider = new WalletProvider(pk, ["iotex"]);
        });
        it("switches chain", () => {
            const initialChain = walletProvider.getCurrentChain().id;
            expect(initialChain).to.be.eq(iotex.id);

            walletProvider.switchChain("mainnet");

            const newChain = walletProvider.getCurrentChain().id;
            expect(newChain).to.be.eq(mainnet.id);
        });
        it("switches chain (by adding new chain)", () => {
            const initialChain = walletProvider.getCurrentChain().id;
            expect(initialChain).to.be.eq(iotex.id);

            walletProvider.switchChain("arbitrum");

            const newChain = walletProvider.getCurrentChain().id;
            expect(newChain).to.be.eq(arbitrum.id);
        });
        it("adds chain", () => {
            const initialChains = walletProvider.chains;
            expect(initialChains.arbitrum).to.be.undefined;

            walletProvider.addChain("arbitrum");
            const newChains = walletProvider.chains;
            expect(newChains.arbitrum.id).to.be.eq(arbitrum.id);
        });
        it("throws if tries to switch to an invalid chain", () => {
            const initialChain = walletProvider.getCurrentChain().id;
            expect(initialChain).to.be.eq(iotex.id);

            // @ts-ignore
            expect(() => walletProvider.switchChain("eth")).to.throw();
        });
    });
});

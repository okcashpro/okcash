const { ethers } = require("ethers");
require("dotenv").config();

// Get and validate the private key
const privateKey = process.env.EVM_PRIVATE_KEY;
if (!privateKey) {
    throw new Error("EVM_PRIVATE_KEY is not set in environment variables");
}

// Ensure the private key has the correct format
const formattedPrivateKey = privateKey.startsWith("0x")
    ? privateKey
    : `0x${privateKey}`;

// Create a wallet instance
const wallet = new ethers.Wallet(formattedPrivateKey);

console.log("\nWallet Information:");
console.log("------------------");
console.log("Public Key:", wallet.signingKey.publicKey);
console.log("Wallet Address:", wallet.address);

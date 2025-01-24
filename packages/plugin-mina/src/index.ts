import type { Plugin } from "@elizaos/core";
import transferToken from "./actions/transfer.ts";
import faucetToken from "./actions/faucet.ts";
import { WalletProvider, walletProvider } from "./providers/wallet.ts";

export {
    WalletProvider,
    transferToken as TransferMinaToken,
    faucetToken as FaucetMinaToken,
};

export const minaPlugin: Plugin = {
    name: "mina",
    description: "Mina Plugin for Eliza",
    actions: [transferToken, faucetToken],
    evaluators: [],
    providers: [walletProvider],
};

export default minaPlugin;

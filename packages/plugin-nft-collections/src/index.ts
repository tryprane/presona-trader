import {
    Plugin,
    Action,
    Provider,
    IAgentRuntime,
    Memory,
    State,
    ServiceType,
    Evaluator,
} from "@ai16z/eliza";
import axios from "axios";

interface NFTCollection {
    name: string;
    totalSupply: number;
    floorPrice: number;
    volume24h: number;
}

interface NFTKnowledge {
    mentionsCollection: boolean;
    mentionsFloorPrice: boolean;
    mentionsVolume: boolean;
    mentionsRarity: boolean;
}

interface INFTMarketplaceService {
    getFloorNFTs(collectionAddress: string, quantity: number): Promise<any[]>;
    batchPurchaseNFTs(nfts: any[]): Promise<string[]>;
}

// Helper function to enhance responses based on NFT knowledge
const enhanceResponse = (response: string, state: State) => {
    const { nftKnowledge } = state;

    if (nftKnowledge?.mentionsCollection) {
        response +=
            " Would you like to know more about specific NFT collections?";
    }

    if (nftKnowledge?.mentionsFloorPrice) {
        response +=
            " I can provide information on floor prices for popular collections.";
    }

    if (nftKnowledge?.mentionsVolume) {
        response +=
            " I can share recent trading volume data for NFT collections.";
    }

    if (nftKnowledge?.mentionsRarity) {
        response +=
            " I can explain rarity factors in NFT collections if you're interested.";
    }

    return response;
};

const nftCollectionEvaluator: Evaluator = {
    evaluate: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        const content = message.content.text.toLowerCase();

        // Extract relevant NFT information
        const extractedInfo: NFTKnowledge = {
            mentionsCollection:
                content.includes("collection") || content.includes("nft"),
            mentionsFloorPrice:
                content.includes("floor price") || content.includes("floor"),
            mentionsVolume:
                content.includes("volume") ||
                content.includes("trading volume"),
            mentionsRarity:
                content.includes("rare") || content.includes("rarity"),
        };

        // Update state with extracted information
        return {
            ...state,
            nftKnowledge: {
                ...state.nftKnowledge,
                ...extractedInfo,
            },
        };
    },
};

// Helper function to extract NFT details from the message
function extractNFTDetails(text: string): {
    collectionAddress: string;
    quantity: number;
} {
    // TODO: Implement proper extraction logic
    return {
        collectionAddress: "0x...", // Extract from text
        quantity: 5, // Extract from text
    };
}

const fetchNFTCollections = async (): Promise<NFTCollection[]> => {
    const API_KEY = process.env.RESERVOIR_API_KEY;
    const response = await axios.get(
        "https://api.reservoir.tools/collections/v6",
        {
            headers: {
                accept: "application/json",
                "x-api-key": API_KEY,
            },
        }
    );
    return response.data.collections.map((collection: any) => ({
        name: collection.name,
        totalSupply: collection.totalSupply,
        floorPrice: collection.floorAsk.price.amount.native,
        volume24h: collection.volume["1day"],
    }));
};

const sweepFloorNFTAction: Action = {
    name: "SWEEP_FLOOR_NFT",
    similes: ["BUY_FLOOR_NFT", "PURCHASE_FLOOR_NFT"],
    description:
        "Sweeps the floor of a specified EVM NFT collection by purchasing the lowest-priced available NFTs.",

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const content = message.content.text.toLowerCase();
        return content.includes("sweep") && content.includes("nft");
    },

    handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        try {
            // Extract collection address and quantity from the message
            const { collectionAddress, quantity } = extractNFTDetails(
                message.content.text
            );

            // Get NFT marketplace service
            const nftService = runtime.getService<INFTMarketplaceService>(
                ServiceType.NFT_MARKETPLACE
            );

            // Fetch floor NFTs
            const floorNFTs = await nftService.getFloorNFTs(
                collectionAddress,
                quantity
            );

            // Purchase floor NFTs
            const transactions = await nftService.batchPurchaseNFTs(floorNFTs);

            // Prepare response
            const response = `Successfully swept ${quantity} floor NFTs from collection ${collectionAddress}. Transaction hashes: ${transactions.join(", ")}`;

            // Send response
            await runtime.sendMessage(message.roomId, response);

            return true;
        } catch (error) {
            console.error("Floor sweep failed:", error);
            await runtime.sendMessage(
                message.roomId,
                "Failed to sweep floor NFTs. Please try again later."
            );
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you sweep the floor of the Bored Ape Yacht Club NFT collection? I want to buy 5 of the cheapest ones.",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Certainly! I'll sweep the floor of the Bored Ape Yacht Club NFT collection and purchase the 5 cheapest NFTs available.",
                    action: "SWEEP_FLOOR_NFT",
                },
            },
        ],
    ],
};

const nftCollectionAction: Action = {
    name: "GET_NFT_COLLECTIONS",
    description:
        "Fetches information about curated NFT collections on Ethereum",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return message.content.text.toLowerCase().includes("nft collections");
    },
    handler: async (runtime: IAgentRuntime, message: Memory) => {
        try {
            const collections = await fetchNFTCollections();
            const response = collections
                .map(
                    (c) =>
                        `${c.name}: Supply: ${c.totalSupply}, Floor: ${c.floorPrice.toFixed(2)} ETH, 24h Volume: ${c.volume24h.toFixed(2)} ETH`
                )
                .join("\n");
            await runtime.sendMessage(message.roomId, response);
            return true;
        } catch (error) {
            console.error("Error fetching NFT collections:", error);
            await runtime.sendMessage(
                message.roomId,
                "Failed to fetch NFT collection data."
            );
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you tell me about the top NFT collections?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Certainly! Here are the top NFT collections on Ethereum:",
                    action: "GET_NFT_COLLECTIONS",
                },
            },
        ],
    ],
};

const nftCollectionProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        try {
            const collections = await fetchNFTCollections();
            return `Current top NFT collections on Ethereum:\n${collections
                .map(
                    (c) =>
                        `${c.name}: Supply: ${c.totalSupply}, Floor: ${c.floorPrice.toFixed(2)} ETH, 24h Volume: ${c.volume24h.toFixed(2)} ETH`
                )
                .join("\n")}`;
        } catch (error) {
            console.error("Error in NFT collection provider:", error);
            return "Unable to fetch NFT collection data at the moment.";
        }
    },
};

const nftCollectionPlugin: Plugin = {
    name: "nft-collection-plugin",
    description:
        "Provides information about curated NFT collections on Ethereum",
    actions: [nftCollectionAction, sweepFloorNFTAction],
    providers: [nftCollectionProvider],
    evaluators: [nftCollectionEvaluator],
};

export default nftCollectionPlugin;

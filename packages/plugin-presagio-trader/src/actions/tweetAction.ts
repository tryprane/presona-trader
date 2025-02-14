import {
    type Action,
    elizaLogger,
    generateText,
    ModelClass,
    parseJSONObjectFromText,
} from "@elizaos/core";

interface TweetGenerationParams {
    questionTitle: string;
    predictedOutcome: string;
    confidence: number;
    reasoning: string;
    risks: string[];
    opportunities: string[];
    transactionHash: string;
    marketData: {
        currentOdds: number[];
        volumeUSD: number;
        category: string;
    };
    actualOutcome: string;
    wasCorrect: boolean;
}

export const generateTweetAction: Action = {
    name: "GENERATE_TWEET",
    description: "Generate tweet content for a prediction market trade",
    similes: ["CREATE_TWEET", "COMPOSE_TWEET"],
    examples: [],
    validate: async () => true,
    handler: async (runtime, memory, state, params , callback) => {
        try {
            const prompt = params.action === "RESULT" 
                ? `Generate a concise tweet (max 250 characters) about a prediction market result:

Information:
- Question: ${params.questionTitle}
- Our Prediction: ${params.predictedOutcome}
- Actual Outcome: ${params.actualOutcome}
- Result: ${params.wasCorrect ? "Correctly" : "Incorrectly"} predicted

Guidelines:
- Keep it concise and engaging
- Include relevant emojis (✅ for correct, ❌ for incorrect)
- End with #PresagioMarket #Results
- Must be under 250 characters

Generate ONLY the tweet text, no other explanation or commentary.`
                : `Generate a concise tweet (max 250 characters) about a prediction market trade with the following format:

Information:
- Question: ${params.questionTitle}
- Position: ${params.predictedOutcome}
- Confidence: ${params.confidence}%
- Key Reasoning: ${params.reasoning}
- Transaction: ${params.transactionHash}
- Current Odds: ${(params.currentOdds[0] * 100).toFixed(1)}%


Guidelines:
- Keep it concise and engaging
- Include the transaction
- Highlight the key reason for the trade
- Include relevant emojis
- End with #PregasioMarket #${params.category}
- Must be under 250 characters

Generate ONLY the tweet text, no other explanation or commentary.`;

            const tweetContent = await generateText({
                runtime,
                context: prompt,
                modelClass: ModelClass.LARGE,
            });

            if (!tweetContent) {
                throw new Error("No tweet content generated");
            }

            return {
                success: true,
                content: tweetContent.trim()
            };

        } catch (error) {
            elizaLogger.error("Tweet generation failed:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    }
};


export const generateSkipAction: Action = {
    name: "GENERATE_TWEET",
    description: "Generate tweet content for a prediction market trade",
    similes: ["CREATE_TWEET", "COMPOSE_TWEET"],
    examples: [],
    validate: async () => true,
    handler: async (runtime, memory, state, params , callback) => {
        try {
            const prompt = `Generate a concise tweet (max 250 characters) about a prediction market trade with the following format:

Information:
- Question: ${params.questionTitle}
- Position: ${params.predictedOutcome}
- Confidence: ${params.confidence}%
- Key Reasoning: ${params.reasoning}
- Action ${params.action}
- Current Odds: ${(params.currentOdds[0] * 100).toFixed(1)}%


Guidelines:
- Keep it concise and engaging
- Highlight why u Skipped This Trade
- Include relevant emojis
- End with #PresagioMarket #${params.category}
- Must be under 250 characters

Generate ONLY the tweet text, no other explanation or commentary.`;

            const tweetContent = await generateText({
                runtime,
                context: prompt,
                modelClass: ModelClass.LARGE,
            });

            if (!tweetContent) {
                throw new Error("No tweet content generated");
            }

            return {
                success: true,
                content: tweetContent.trim()
            };

        } catch (error) {
            elizaLogger.error("Tweet generation failed:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    }
};
// Helper function to fetch market data using the provided interface

import { z } from "zod";
import { elizaLogger } from "@elizaos/core";
import { MAX_TWEETS_PER_HOUR } from "../constants";
import { generateSkipAction, generateTweetAction } from "../actions/tweetAction";
import { IAgentRuntime } from "@elizaos/core";
export const TwitterConfigSchema = z.object({
    enabled: z.boolean(),
    username: z.string().min(1),
    dryRun: z.boolean().optional().default(false),
    apiKey: z.string().optional(),
});

export interface PredictionAlert {
    questionId: string;
    questionTitle: string;
    predictedOutcome: string;
    confidence: number;
    reasoning: string;
    risks: string[];
    opportunities: string[];
    trustScore: number;
   
        currentOdds: number[];
        volumeUSD: number;
        liquidity: number;
        category: string;
    
    timestamp: number;
    transactionHash?: string;
    action?: "ENTER" | "EXIT" | "SKIP" | "RESULT";
    actualOutcome?: string;
    wasCorrect?: boolean;
}

interface TweetResult {
    success: boolean;
    content?: string;
    error?: string;
}

// Set up prediction notification function
export const tweetPrediction = async (
    twitterService: TwitterService,
    alert: PredictionAlert,
) => {
    if (twitterService) {
        await twitterService.postPredictionAlert({
            ...alert,
            timestamp: Date.now(),
        });
    }
};

export const tweetSkip = async (
    twitterService: TwitterService,
    alert: PredictionAlert,
) => {
    if (twitterService) {
        await twitterService.postSKIP({
            ...alert,
            timestamp: Date.now(),
        });
    }
};
export const resultPost = async (
    twitterService: TwitterService,
    alert: PredictionAlert,
) => {
    if (twitterService) {
        await twitterService.postResult({
            ...alert,
            timestamp: Date.now(),
        });
    }
};


export function canTweet(tweetType: "prediction" | "market_update" | "resolution"): boolean {
    const now = Date.now();
    const hourKey = `tweets_${tweetType}_${Math.floor(now / 3600000)}`;

    // Simple in-memory rate limiting
    const tweetCounts = new Map<string, number>();
    const currentCount = tweetCounts.get(hourKey) || 0;

    if (currentCount >= MAX_TWEETS_PER_HOUR[tweetType]) {
        elizaLogger.warn(`Tweet rate limit reached for ${tweetType}`);
        return false;
    }

    tweetCounts.set(hourKey, currentCount + 1);
    return true;
}

export class TwitterService {
    private client: any;
    private config: z.infer<typeof TwitterConfigSchema>;
    private runtime : IAgentRuntime;

    public getConfig() {
        return this.config;
    }

    constructor(client: any, config: z.infer<typeof TwitterConfigSchema> , runtime) {
        this.client = client;
        this.config = config;
        this.runtime = runtime;
    }

    async postPredictionAlert(alert: PredictionAlert): Promise<boolean> {
        try {
            // Generate tweet content using the action
            const tweetResult = await generateTweetAction.handler(
                this.runtime,
                null,
                null,
                {
                    questionTitle: alert.questionTitle,
                    predictedOutcome: alert.predictedOutcome,
                    confidence: alert.confidence,
                    reasoning: alert.reasoning,
                    risks: alert.risks,
                    opportunities: alert.opportunities,
                    transactionHash: alert.transactionHash || '',
                    currentOdds: alert.currentOdds, 
                    volumeUSD: alert.volumeUSD,
                    liquidity: alert.liquidity,
                    category: alert.category,
                    action: alert.action
                }
            ) as TweetResult;

            // const tweetResult={
            //     success: true,
            //     content : "This is the test content"
            // }

            if (!tweetResult.success) {
                throw new Error(tweetResult.error || 'Failed to generate tweet content');
            }

            if (this.config.dryRun) {
                elizaLogger.info("Dry run mode - would have posted tweet:", tweetResult.content);
                console.log("DRY RUN RESULT",tweetResult.content)
                return true;
            }

            if (!canTweet("prediction")) {
                elizaLogger.warn("Prediction tweet rate limit reached");
                return false;
            }

            await this.client.post.client.twitterClient.sendTweet(tweetResult.content);
            elizaLogger.info("Successfully posted prediction alert to Twitter:", {
                content: tweetResult.content,
            });

            return true;
        } catch (error) {
            elizaLogger.error("Failed to post prediction alert to Twitter:", error);
            return false;
        }
    }

    async postResult(alert: PredictionAlert): Promise<boolean> {
        try {
            // Ensure the action is set to RESULT
            if (alert.action !== 'RESULT') {
                throw new Error('Invalid action type for postResult. Expected RESULT.');
            }
    
            // Generate tweet content using the action for result
            const tweetResult = await generateTweetAction.handler(
                this.runtime,
                null,
                null,
                {
                    questionTitle: alert.questionTitle,
                    predictedOutcome: alert.predictedOutcome,
                    actualOutcome: alert.actualOutcome, // Added for result
                    wasCorrect: alert.wasCorrect,       // Added for result
                    confidence: alert.confidence,
                    reasoning: alert.reasoning,         // Will contain success/failure message
                    risks: alert.risks,
                    opportunities: alert.opportunities,
                    trustScore: alert.trustScore,      // Added for result
                    transactionHash: alert.transactionHash || '',
                    currentOdds: alert.currentOdds,
                    volumeUSD: alert.volumeUSD,
                    liquidity: alert.liquidity,
                    category: alert.category,
                    action: alert.action
                }
            ) as TweetResult;
    
            if (!tweetResult.success) {
                throw new Error(tweetResult.error || 'Failed to generate result tweet content');
            }
    
            if (this.config.dryRun) {
                elizaLogger.info("Dry run mode - would have posted result tweet:", tweetResult.content);
                console.log("DRY RUN RESULT", tweetResult.content);
                return true;
            }
    
            if (!canTweet("prediction")) {  // Changed to "result" for specific rate limiting
                elizaLogger.warn("Result tweet rate limit reached");
                return false;
            }
    
            await this.client.post.client.twitterClient.sendTweet(tweetResult.content);
            elizaLogger.info("Successfully posted result to Twitter:", {
                content: tweetResult.content,
                wasCorrect: alert.wasCorrect,
                marketId: alert.questionId
            });
    
            return true;
        } catch (error) {
            elizaLogger.error("Failed to post result to Twitter:", {
                error,
                marketId: alert.questionId,
                wasCorrect: alert.wasCorrect
            });
            return false;
        }
    }

    async postSKIP(alert: PredictionAlert): Promise<boolean> {
        try {
            // Ensure the action is set to RESULT
            if (alert.action !== 'SKIP') {
                throw new Error('Invalid action type for postResult. Expected RESULT.');
            }
    
            // Generate tweet content using the action for result
            const tweetResult = await generateSkipAction.handler(
                this.runtime,
                null,
                null,
                {
                    questionTitle: alert.questionTitle,
                    predictedOutcome: alert.predictedOutcome,
                    confidence: alert.confidence,
                    reasoning: alert.reasoning,
                    risks: alert.risks,
                    opportunities: alert.opportunities,
                    transactionHash: alert.transactionHash || '',
                    currentOdds: alert.currentOdds, 
                    volumeUSD: alert.volumeUSD,
                    liquidity: alert.liquidity,
                    category: alert.category,
                    action: alert.action
                }
            ) as TweetResult;
    
            if (!tweetResult.success) {
                throw new Error(tweetResult.error || 'Failed to generate result tweet content');
            }
    
            if (this.config.dryRun) {
                elizaLogger.info("Dry run mode - would have posted result tweet:", tweetResult.content);
                console.log("DRY RUN RESULT", tweetResult.content);
                return true;
            }
    
            if (!canTweet("prediction")) {  // Changed to "result" for specific rate limiting
                elizaLogger.warn("Result tweet rate limit reached");
                return false;
            }
    
            await this.client.post.client.twitterClient.sendTweet(tweetResult.content);
            elizaLogger.info("Successfully posted result to Twitter:", {
                content: tweetResult.content,
                wasCorrect: alert.wasCorrect,
                marketId: alert.questionId
            });
    
            return true;
        } catch (error) {
            elizaLogger.error("Failed to post result to Twitter:", {
                error,
                marketId: alert.questionId,
                wasCorrect: alert.wasCorrect
            });
            return false;
        }
    }
}
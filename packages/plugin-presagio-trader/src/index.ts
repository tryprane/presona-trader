import type { Plugin, IAgentRuntime, Memory, State } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import { getMarketsByCreator } from "./core/fetchMarketID";
import { analyzePredictionMarketAction } from "./actions/analyzeTrade";
import { doubleCheckAction } from "./actions/doubleCheck";
import { PredictionMarketDatabase } from "./adapters/database";
import { PresagioMarket, SwapDirection } from "./market";
import { TwitterClientInterface } from "@elizaos/client-twitter";
import {
    TwitterService,
    TwitterConfigSchema,
    tweetPrediction,
    PredictionAlert,
    resultPost,
    tweetSkip,
} from "./services/twitter";
import { ethers } from "ethers";
import NodeCache from "node-cache";
import { v4 as uuidv4 } from "uuid";
import {
    getMarketAnswer,
    getWinningOutcomeIndex,
    isAnswerFinalized,
} from "./core/fetchAnswer";

// Define interfaces for analysis results
interface AnalysisResult {
    recommendedPosition: string;
    confidence: number;
    reasoning: string;
    risks: string[];
    opportunities: string[];
}

interface ValidationResult {
    isConsistent: boolean;
    finalRecommendation: {
        recommendedPosition: string;
        confidence: number;
        reasoning: string;
    };
}

interface MarketAnalysis {
    id: string;
    title: string;
    recommendedPosition: string;
    confidence: number;
    reasoning: string;
    risks: string[];
    opportunities: string[];
}

interface ExtendedPlugin extends Plugin {
    name: string;
    description: string;
    evaluators: any[];
    providers: any[];
    actions: any[];
    services: any[];
    autoStart?: boolean;
}

// Cache configuration
interface CacheEntry {
    lastAnalysis: number;
    marketData: any;
    analysisResult: {
        initialAnalysis: AnalysisResult;
        validation: ValidationResult;
    };
}

const marketCache = new NodeCache({
    stdTTL: 1200, // 20 minutes in seconds
    checkperiod: 120, // Check for expired entries every 2 minutes
});

async function analyzeMarket(
    runtime: IAgentRuntime & { twitterClient?: any },
    market: PresagioMarket,
    db: PredictionMarketDatabase,
    twitterService: TwitterService | undefined,
    marketData: any
) {
    try {
        // Check cache first
        const cachedData: CacheEntry | undefined = marketCache.get(
            marketData.id
        );
        const now = Date.now();

        // Skip if analyzed within last 20 minutes
        if (cachedData && now - cachedData.lastAnalysis < 1200000) {
            elizaLogger.log(
                `Using cached data for market ${
                    marketData.id
                }, last analyzed ${Math.floor(
                    (now - cachedData.lastAnalysis) / 1000
                )}s ago`
            );
            return;
        }

        // Create initial state
        const state: State = await runtime.composeState({
            userId: runtime.agentId,
            agentId: runtime.agentId,
            roomId: runtime.agentId,
            content: {
                text: `Initialize state for market ${marketData.id}`,
                type: "analysis",
            },
        });

        // Create analysis memory
        const analysisMemory: Memory = {
            userId: state.userId,
            agentId: runtime.agentId,
            roomId: state.roomId,
            content: {
                text: `Analyze market ${marketData.id}`,
                type: "analysis",
            },
        };

        // Initial analysis
        const initialAnalysis = (await analyzePredictionMarketAction.handler(
            runtime,
            analysisMemory,
            state,
            {
                id: marketData.id,
                title: marketData.title,
                outcomes: marketData.outcomes,
                currentAnswer: marketData.currentAnswer,
                outcomeTokenMarginalPrices:
                    marketData.outcomeTokenMarginalPrices,
                collateralVolume: marketData.collateralVolume,
                usdVolume: marketData.usdVolume,
                category: marketData.category,
                resolutionTimestamp: marketData.resolutionTimestamp,
                creationTimestamp: marketData.creationTimestamp,
                scaledLiquidityParameter: marketData.scaledLiquidityParameter,
            },
            null
        )) as AnalysisResult;

        await new Promise((resolve) => setTimeout(resolve, 5000));

        if (initialAnalysis) {
            console.log("Confidence:", initialAnalysis.confidence);
            console.log("Reasoning:", initialAnalysis.reasoning);
            console.log("Opportunities:", initialAnalysis.opportunities);
            console.log("Risks:", initialAnalysis.risks);
        } else {
            elizaLogger.error("No analysis results received");
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));

        if (!initialAnalysis) return;

        // Double check analysis
        const validation = (await doubleCheckAction.handler(
            runtime,
            analysisMemory,
            state,
            {
                title: marketData.title,
                recommendedPosition: initialAnalysis.recommendedPosition,
                confidence: initialAnalysis.confidence,
                reasoning: initialAnalysis.reasoning,
                risks: initialAnalysis.risks,
                opportunities: initialAnalysis.opportunities,
            },
            null
        )) as ValidationResult;

        if (!validation) return;
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const { isConsistent, finalRecommendation } = validation;

        await new Promise((resolve) => setTimeout(resolve, 5000));
        // Cache the analysis
        const cacheEntry: CacheEntry = {
            lastAnalysis: now,
            marketData,
            analysisResult: {
                initialAnalysis,
                validation,
            },
        };
        marketCache.set(marketData.id, cacheEntry);

        if (isConsistent && finalRecommendation.confidence > 50) {
            // Save analysis to database
            const analysisId = await db.addAnalyzedTrade({
                marketId: marketData.id,
                marketTitle: marketData.title,
                recommendedPosition: finalRecommendation.recommendedPosition,
                confidence: finalRecommendation.confidence,
                reasoning: finalRecommendation.reasoning,
                risks: initialAnalysis.risks,
                opportunities: initialAnalysis.opportunities,
                createdAt: new Date().toISOString(),
                result: null,
            });

            // Calculate dynamic buy amount based on confidence
            const confidence = finalRecommendation.confidence;
            const buyAmount = 0.01 + ((confidence - 60) / 6000);
            const amount = buyAmount.toString();
            console.log(confidence);
            console.log(buyAmount);

            // Log total number of analyses for this market

            await new Promise((resolve) => setTimeout(resolve, 2000));
            // Execute trade
            if (finalRecommendation.recommendedPosition !== "Confused") {
                const outcomeIndex =
                    finalRecommendation.recommendedPosition === "Yes" ? 0 : 1;

                const hasAllowance = await market.checkAllowance(
                    marketData.collateralToken,
                    amount,
                    SwapDirection.BUY
                );

                console.log("Has allowance:", hasAllowance);

                if (!hasAllowance) {
                    console.log("\nApproving market...");
                    const approvalTx = await market.approveMarket(
                        marketData.collateralToken,
                        marketData.id,
                        amount,
                        SwapDirection.BUY
                    );
                    console.log("Approval transaction:", approvalTx);

                    // Wait for approval to be mined
                    // console.log('Waiting for approval confirmation...');
                    // await provider.waitForTransaction(approvalTx);
                }

                // Execute the buy trade
                console.log("\nExecuting buy trade...");

                const tradeResult = await market.executeBuyTrade({
                    marketAddress: marketData.id,
                    outcomeIndex,
                    amount: buyAmount.toString(),
                    slippageTolerance: 5, // 5% slippage tolerance
                });

                if (tradeResult) {
                    // Record buy trade
                    await db.addBuyTrade({
                        marketId: marketData.id,
                        position: finalRecommendation.recommendedPosition,
                        amount: buyAmount,
                        createdAt: new Date().toISOString(),
                        resolutionTimestamp: marketData.openingTimestamp,
                        isResolved: false,
                        resultPosition: undefined,
                    });

                    // Post tweet if enabled
                    if (twitterService) {
                        await tweetPrediction(twitterService, {
                            questionId: marketData.id,
                            questionTitle: marketData.title,
                            predictedOutcome:
                                finalRecommendation.recommendedPosition,
                            confidence: finalRecommendation.confidence,
                            reasoning: finalRecommendation.reasoning,
                            risks: initialAnalysis.risks,
                            opportunities: initialAnalysis.opportunities,
                            trustScore: confidence / 100,

                            currentOdds:
                                marketData.outcomeTokenMarginalPrices.map((p) =>
                                    Number(p)
                                ),
                            volumeUSD: Number(marketData.usdVolume),
                            liquidity: Number(marketData.collateralVolume),
                            category: marketData.category,
                            timestamp: Date.now(),
                            transactionHash: tradeResult,
                            action: "ENTER",
                        });
                    }
                    
                }
            }

            // After analyzing the trade and before executing it, you can check previous analyses

            // Or get all analyses for this market
        }else{
            const confidence = finalRecommendation.confidence;
            if (twitterService) {
                await tweetSkip(twitterService, {
                    questionId: marketData.id,
                    questionTitle: marketData.title,
                    predictedOutcome:
                        finalRecommendation.recommendedPosition,
                    confidence: finalRecommendation.confidence,
                    reasoning: finalRecommendation.reasoning,
                    risks: initialAnalysis.risks,
                    opportunities: initialAnalysis.opportunities,
                    trustScore: confidence / 100,

                    currentOdds:
                        marketData.outcomeTokenMarginalPrices.map((p) =>
                            Number(p)
                        ),
                    volumeUSD: Number(marketData.usdVolume),
                    liquidity: Number(marketData.collateralVolume),
                    category: marketData.category,
                    timestamp: Date.now(),
                    
                    action: "SKIP",
                });
            }

            return "SKIP"
        }
    } catch (error) {
        elizaLogger.error(`Error analyzing market ${marketData.id}:`, error);
    }
}

async function checkAndUpdateTradeResolutions(
    runtime: IAgentRuntime,
    db: PredictionMarketDatabase,
    market: PresagioMarket,
    subgraphUrl: string,
    twitterService: TwitterService | undefined
) {
    try {
        // Get all unresolved trades that have passed their resolution timestamp
        const unresolvedTrades = await db.getUnresolvedTrades();
        elizaLogger.info(
            `Found ${unresolvedTrades.length} trades to check for resolution`
        );

        for (const trade of unresolvedTrades) {
            const marketAnswer = await getMarketAnswer(
                subgraphUrl,
                trade.marketId
            );

            if (marketAnswer && isAnswerFinalized(marketAnswer)) {
                const winningIndex = getWinningOutcomeIndex(marketAnswer);
                const resultPosition = winningIndex === 0 ? "Yes" : "No";

                // Update trade resolution in database
                await db.updateTradeResolution(trade.id, resultPosition);

                // Post result to Twitter if enabled
                // Post result to Twitter if enabled
                if (twitterService) {
                    const wasCorrect = resultPosition === trade.position;

                    // Create the prediction alert object that matches the interface
                    const predictionAlert: PredictionAlert = {
                        questionId: trade.marketId,
                        questionTitle:
                            (await db.getAnalyzedTradeByMarket(trade.marketId))
                                ?.marketTitle || "Unknown Market",
                        predictedOutcome: trade.position,
                        actualOutcome: resultPosition,
                        wasCorrect,
                        timestamp: Date.now(),
                        action: "RESULT",
                        // Required fields from interface that weren't in original code
                        confidence: 0,
                        reasoning: wasCorrect
                            ? "Successfully predicted!"
                            : "Prediction was incorrect.",
                        risks: [],
                        opportunities: [],
                        trustScore: wasCorrect ? 1 : 0,
                        currentOdds: [],
                        volumeUSD: 0,
                        liquidity: 0,
                        category: "RESULT",
                    };

                    await resultPost(twitterService, predictionAlert);



                    const marketAddress =trade.id; // Your market address
                    const conditionId =marketAnswer.condition.id; // The condition ID
                    const outcomeIndex = trade.position === 'Yes' ? 0 : 1; // The outcome index you bet on

                    // Check if you can claim
                    const winnerStatus = await market.checkIfWinner(
                        marketAddress,
                        conditionId,
                        outcomeIndex
                    );
                    console.log(winnerStatus);
                    if (winnerStatus.canRedeem) {
                        // Claim winnings
                        const txHash = await market.claimWinnings(
                            marketAddress,
                            conditionId,
                            outcomeIndex
                        );
                        console.log("Claimed winnings:", txHash);
                    }
                }
            }
        }
    } catch (error) {
        elizaLogger.error("Error checking trade resolutions:", error);
    }
}

async function createPresagioTraderPlugin(
    getSetting: (key: string) => string | undefined,
    runtime?: IAgentRuntime
): Promise<ExtendedPlugin> {
    elizaLogger.info("Starting Presagio Trader plugin initialization...");

    // Validate required settings
    const REQUIRED_SETTINGS = {
        SUBGRAPH_URL: "Subgraph URL",
        SAFE_ADDRESS: "Safe address",
        SIGNER_PRIVATE_KEY: "Signer private key",
        RPC_URL: "RPC URL",
        ENABLE_TRADING: "Enable trading flag",
    };

    const missingSettings = [];
    for (const [key, description] of Object.entries(REQUIRED_SETTINGS)) {
        if (!getSetting(key)) {
            missingSettings.push(`${key} (${description})`);
        }
    }

    if (missingSettings.length > 0) {
        const error = `Missing required settings: ${missingSettings.join(
            ", "
        )}`;
        elizaLogger.error(error);
        throw new Error(error);
    }

    const SUBGRAPH_URL = getSetting("SUBGRAPH_URL");
    const SAFE_ADDRESS = getSetting("SAFE_ADDRESS") as `0x${string}`;
    const SIGNER_PRIVATE_KEY = getSetting("SIGNER_PRIVATE_KEY");
    const RPC_URL = getSetting("RPC_URL");

    if (!runtime) {
        throw new Error("Runtime is required");
    }

    elizaLogger.info("Initializing services...");

    // Initialize services
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const market = new PresagioMarket(
        SAFE_ADDRESS,
        SIGNER_PRIVATE_KEY,
        provider
    );
    const db = new PredictionMarketDatabase(runtime.databaseAdapter.db);

    elizaLogger.info("Services initialized successfully");

    // Initialize Twitter service if enabled
    let twitterService: TwitterService | undefined;
    try {
        elizaLogger.info("Configuring Twitter service...");
        const twitterConfig = TwitterConfigSchema.parse({
            enabled: getSetting("TWITTER_ENABLED") === "true",
            username: getSetting("TWITTER_USERNAME"),
            dryRun: getSetting("TWITTER_DRY_RUN") === "true",
        });
        elizaLogger.info("Configuring Twitter service...", twitterConfig);

        if (twitterConfig.enabled && runtime) {
            elizaLogger.info("Starting Twitter client initialization...");
            const twitterClient = await TwitterClientInterface.start(runtime);
            twitterService = new TwitterService(
                twitterClient,
                twitterConfig,
                runtime
            );

            // Add delay after initialization
            await new Promise((resolve) => setTimeout(resolve, 5000));

            elizaLogger.log("Twitter service initialized successfully", {
                username: twitterConfig.username,
                dryRun: twitterConfig.dryRun,
            });
        }
    } catch (error) {
        elizaLogger.error("Failed to initialize Twitter service:", error);
    }

    // Define the trading loop
    const resumeTrading = async () => {
        elizaLogger.info("Starting trading iteration...");
        try {
            // First check resolutions
            await checkAndUpdateTradeResolutions(
                runtime,
                db,
                market,
                SUBGRAPH_URL,
                twitterService
            );

            // Rest of the existing trading logic...
            elizaLogger.info("Fetching latest markets from", SUBGRAPH_URL);
            const markets = await getMarketsByCreator(SUBGRAPH_URL);

            const validMarkets = markets.filter(
                (m) => Number(m.usdVolume) >= 15 && !m.answerFinalizedTimestamp
            );

            // elizaLogger.info("Market Data",markets);

            elizaLogger.info(`Found ${validMarkets.length} valid markets`);

            if (validMarkets.length === 0) {
                elizaLogger.info(
                    "No valid markets found. Waiting for next interval..."
                );
                return;
            }

            // Get random unanalyzed market
            const getRandomMarket = () =>
                validMarkets[Math.floor(Math.random() * validMarkets.length)];
            let attempts = 0;
            let marketFound = false;

            while (attempts < validMarkets.length && !marketFound) {
                const selectedMarket = getRandomMarket();
                const analyzedTrades = await db.getAnalyzedTradeByMarket(
                    selectedMarket.id
                );

                if (!analyzedTrades) {
                    elizaLogger.info(`Analyzing market: ${selectedMarket.id}`);
                    marketFound = true;
                    const test = await analyzeMarket(
                        runtime,
                        market,
                        db,
                        twitterService,
                        selectedMarket
                    );

                    if(test == "SKIP"){
                        marketFound= false
                    }
                }
                attempts++;
            }
        } catch (error) {
            elizaLogger.error("Error in trading loop:", error);
        }
        elizaLogger.info("Completed trading iteration");
    };

    // Create plugin
    const plugin: ExtendedPlugin = {
        name: "presagio-trader",
        description: "Autonomous prediction market trading plugin",
        actions: [analyzePredictionMarketAction, doubleCheckAction],
        providers: [],
        evaluators: [],
        services: [],
        autoStart: true,
    };

    // Start trading if enabled
    if (getSetting("ENABLE_TRADING") === "true") {
        elizaLogger.info("Starting autonomous trading system...");
        const interval = Number(getSetting("TRADING_INTERVAL")) || 3600000;
        elizaLogger.info(`Trading interval set to ${interval}ms`);

        setInterval(resumeTrading, interval);
        // Execute first trading iteration
        resumeTrading();
    } else {
        elizaLogger.warn(
            "Trading is disabled. Set ENABLE_TRADING=true to enable."
        );
    }

    elizaLogger.info("Presagio Trader plugin initialization completed");
    return plugin;
}

export default createPresagioTraderPlugin;

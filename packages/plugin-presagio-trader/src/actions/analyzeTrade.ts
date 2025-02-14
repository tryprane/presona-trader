import {
    type Action,
    elizaLogger,
    generateText,
    ModelClass,
    parseJSONObjectFromText,
} from "@elizaos/core";



export const analyzePredictionMarketAction: Action = {
    name: "ANALYZE_PREDICTION_MARKET",
    description: "Analyze a prediction market question for potential opportunities",
    similes: [
        "ANALYZE_QUESTION",
        "EVALUATE_MARKET",
        "ASSESS_PREDICTION",
        "ANALYZE_PREDICTION",
        "EVALUATE_QUESTION",
    ],
    examples: [],
    validate: async () => true,
    handler: async (runtime, memory, state, params, callback) => {
        try {
            // Compose state
            if (!state) {
                state = await runtime.composeState(memory);
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            const marketData = {
                id: params.id,
                title: params.title,
                outcomes: [...(params.outcomes as string[]), "Confused"],
                currentAnswer: params.currentAnswer,
                outcomePrices: params.outcomeTokenMarginalPrices,
                collateralVolume: params.collateralVolume,
                usdVolume: params.usdVolume,
                category: params.category,
                resolutionTimestamp: params.resolutionTimestamp,
                creationTimestamp: params.creationTimestamp,
                scaledLiquidityParameter: params.scaledLiquidityParameter,
            };

            // Create analysis prompt
            const prompt = `Analyze the following prediction market question and provide a recommendation.
            reasoning and risks should be based on the news which you fetch , Fetch latest news news before processing.
Return the response as a JSON object with the following structure:
{
  "recommendedPosition": string (one of the outcomes),
  "confidence": number (0-100),
  "reasoning": string,
  "risks": string[],
  "opportunities": string[]
}

Market Data:
${JSON.stringify(marketData, null, 2)}

Consider:
1. Current outcome probabilities (derived from prices)
2. Market liquidity and volume
3. Time until resolution
4. Fetch Latest News
5. Market category and context
6. Current answer if available`;



            // Generate analysis
            const content = await generateText({
                runtime,
                context: prompt,
                modelClass: ModelClass.LARGE,
            });

            if (!content) {
                throw new Error("No analysis generated");
            }

            // console.log(content)

            elizaLogger.log(`Raw analysis response:`, content);

            // Parse the response
            const analysis = parseJSONObjectFromText(content);
            elizaLogger.log(
                `Parsed analysis for market ${params.id}:`,
                analysis
            );

            // console.log(analysis)

            // Send result through callback
            if (callback) {
                await callback({
                    text: JSON.stringify(analysis),
                    type: "predictionMarketAnalysis",
                });
            }

            // Return the analysis object instead of true
            return analysis;
        } catch (error) {
            elizaLogger.error(`Analysis failed:`, {
                error: error instanceof Error ? error.message : "Unknown error",
                stack: error instanceof Error ? error.stack : undefined,
            });
            return false;
        }
    },
};

// Helper function to fetch market data using the provided interface

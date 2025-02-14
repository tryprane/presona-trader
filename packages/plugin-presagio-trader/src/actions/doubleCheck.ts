import {
    type Action,
    elizaLogger,
    generateText,
    ModelClass,
    parseJSONObjectFromText,
} from "@elizaos/core";

import { searchPredictionInfo } from "../providers/webSearch";

interface ValidationResponse {
    isConsistent: boolean;
    finalRecommendation: {
        recommendedPosition: string;
        confidence: number;
        reasoning: string;
    };
}

export const doubleCheckAction: Action = {
    name: "DOUBLE_CHECK",
    description: "Double check a prediction market question for potential opportunities",
    similes: [
        "DOUBLE_CHECK",
        "REVIEW_PREDICTION",
        "REVIEW_QUESTION",
        "REVIEW_MARKET",
        "REVIEW_PREDICTION_MARKET",
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

            const initialPrediction = {
                title: params.title,
                recommendedPosition: params.recommendedPosition,
                confidence: params.confidence,
                reasoning: params.reasoning,
                risks: params.risks,
                opportunities: params.opportunities,
            };

            // Fetch search results
            const searchResult = await searchPredictionInfo(params.title as string, runtime);
            console.log('Search Results:', searchResult);

            // Create validation prompt
            const validationPrompt = `Analyze this prediction market question and provide a validation response.
Please return ONLY a JSON object with exactly this structure, no additional text:
{
    "isConsistent": boolean,
    "finalRecommendation": {
        "recommendedPosition": string,
        "confidence": number,
        "reasoning": string(Whole conclusion what you choosed and this can be posted in the twitter)
    }
}

Initial Prediction:
${JSON.stringify(initialPrediction, null, 2)}

Latest Information:
${searchResult}

Notes:
- recommendedPosition must be exactly "Yes", "No", or "Confused"
- confidence must be a number between 0 and 100
- reasoning should be a clear explanation of the final recommendation
- Do not include any text outside the JSON object`;

            // Generate validation analysis
            const validationContent = await generateText({
                runtime,
                context: validationPrompt,
                modelClass: ModelClass.LARGE,
            });

            if (!validationContent) {
                throw new Error("No validation analysis generated");
            }

            elizaLogger.log('Raw validation response:', validationContent);

            // Try to clean and parse the JSON
            let validation: ValidationResponse;
            try {
                // Remove any potential non-JSON text
                const jsonStr = validationContent.substring(
                    validationContent.indexOf('{'),
                    validationContent.lastIndexOf('}') + 1
                );
                validation = JSON.parse(jsonStr) as ValidationResponse;
                console.log(validation)
                
                // Validate the structure
                
                
                // Validate recommendedPosition
                if (!['Yes', 'No', 'Confused'].includes(validation.finalRecommendation.recommendedPosition)) {
                    throw new Error('Invalid recommendedPosition value');
                }
                
                // Validate confidence
                if (typeof validation.finalRecommendation.confidence !== 'number' ||
                    validation.finalRecommendation.confidence < 0 ||
                    validation.finalRecommendation.confidence > 100) {
                    throw new Error('Invalid confidence value');
                }
            } catch (parseError) {
                elizaLogger.error('JSON parsing error:', parseError);
                return false;
            }

            elizaLogger.log('Parsed validation:', validation);

            // Send result through callback
            if (callback) {
                await callback({
                    text: JSON.stringify(validation),
                    type: "predictionValidation",
                });
            }

            return validation;
        } catch (error) {
            elizaLogger.error(`Validation failed:`, {
                error: error instanceof Error ? error.message : "Unknown error",
                stack: error instanceof Error ? error.stack : undefined,
            });
            return false;
        }
    },
};
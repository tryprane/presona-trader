import { WebSearchService } from "../services/webSearchService";


import { encodingForModel, type TiktokenModel } from "js-tiktoken";

import type { SearchResult } from "../types";

const DEFAULT_MAX_TOKENS = 2000;
const DEFAULT_MODEL_ENCODING = "gpt-3.5-turbo";

interface SearchResponse {
    answer: string;
    results: SearchResult[];
}

function getTotalTokens(text: string, model: TiktokenModel = DEFAULT_MODEL_ENCODING): number {
    const encoding = encodingForModel(model);
    return encoding.encode(text).length;
}

function limitTokens(text: string, maxTokens: number = DEFAULT_MAX_TOKENS): string {
    if (getTotalTokens(text) >= maxTokens) {
        return text.slice(0, maxTokens);
    }
    return text;
}

export async function searchPredictionInfo(
    searchPrompt: string,
    runtime: any
): Promise<string | null> {
    try {
        // Initialize web search service
        const webSearchService = new WebSearchService();
        await webSearchService.initialize(runtime);

        // Perform the search
        const searchResponse = await webSearchService.search(searchPrompt) as SearchResponse;

        if (searchResponse && searchResponse.results.length) {
            // Format the response with answer and sources
            const formattedResponse = searchResponse.answer
                ? `${searchResponse.answer}\n\nSources:\n${searchResponse.results
                    .map((result: SearchResult, index: number) => 
                        `${index + 1}. ${result.title} - ${result.url}`
                    )
                    .join("\n")}`
                : "";

            // Limit tokens and return
            return limitTokens(formattedResponse);
        }

        return null;
    } catch (error) {
        console.error("Search failed:", error);
        return null;
    }
}

// Example usage:
/*
const searchResult = await searchPredictionInfo(
    "What is the current prediction for Bitcoin price by end of 2024?",
    runtime
);

if (searchResult) {
    console.log("Search results:", searchResult);
} else {
    console.log("No results found or search failed");
}
*/
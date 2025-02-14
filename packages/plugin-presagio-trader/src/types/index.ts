import { request } from 'graphql-request';
import { gql } from 'graphql-tag';

export interface Answer {
  answer: string;
  bondAggregate: string;
  __typename: string;
}

export interface Question {
  id: string;
  data: string;
  currentAnswer: string;
  answers: Answer[];
  __typename: string;
}

export interface Condition {
  id: string;
  payouts: string[];
  oracle: string;
  __typename: string;
}

export interface MarketMaker {
  id: string;
  creator: string;
  collateralToken: string;
  fee: string;
  collateralVolume: string;
  outcomeTokenAmounts: string[];
  outcomeTokenMarginalPrices: string[];
  condition: Condition;
  templateId: string;
  title: string;
  outcomes: string[];
  category: string;
  language: string;
  lastActiveDay: string;
  runningDailyVolume: string;
  arbitrator: string;
  creationTimestamp: string;
  openingTimestamp: string;
  timeout: string;
  resolutionTimestamp: string;
  currentAnswer: string;
  currentAnswerTimestamp: string;
  currentAnswerBond: string;
  answerFinalizedTimestamp: string;
  scaledLiquidityParameter: string;
  question: Question;
  usdVolume: string;
  __typename: string;
}

export interface QueryResponse {
  fixedProductMarketMakers: MarketMaker[];
}

import type { Service } from "@elizaos/core";

export interface IWebSearchService extends Service {
    search(
        query: string,
        options?: SearchOptions,
    ): Promise<SearchResponse>;
}

export type SearchResult = {
    title: string;
    url: string;
    content: string;
    rawContent?: string;
    score: number;
    publishedDate?: string;
};

export type SearchImage = {
    url: string;
    description?: string;
};


export type SearchResponse = {
    answer?: string;
    query: string;
    responseTime: number;
    images: SearchImage[];
    results: SearchResult[];
};

export interface SearchOptions {
    limit?: number;
    type?: "news" | "general";
    includeAnswer?: boolean;
    searchDepth?: "basic" | "advanced";
    includeImages?: boolean;
    days?: number; // 1 means current day, 2 means last 2 days
}

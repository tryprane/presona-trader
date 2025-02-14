import { request } from 'graphql-request';
import { gql } from 'graphql-tag';

interface Answer {
  answer: string;
  bondAggregate: string;
  __typename: string;
}

interface Question {
  id: string;
  data: string;
  currentAnswer: string;
  answers: Answer[];
  __typename: string;
}

interface Condition {
  id: string;
  payouts: string[];
  oracle: string;
  __typename: string;
}

interface MarketAnswer {
  id: string;
  currentAnswer: string;
  currentAnswerTimestamp: string;
  currentAnswerBond: string;
  answerFinalizedTimestamp: string;
  condition: Condition;
  question: Question;
}

interface QueryResponse {
  fixedProductMarketMaker: MarketAnswer;
}

const QUERY = gql`
  query GetMarketAnswer($marketId: ID!) {
    fixedProductMarketMaker(id: $marketId) {
      id
      currentAnswer
      currentAnswerTimestamp
      currentAnswerBond
      answerFinalizedTimestamp
      condition {
        id
        payouts
        oracle
        __typename
      }
      question {
        id
        data
        currentAnswer
        answers {
          answer
          bondAggregate
          __typename
        }
        __typename
      }
    }
  }
`;

export async function getMarketAnswer(
  subgraphUrl: string,
  marketId: string
): Promise<MarketAnswer | null> {
  try {
    console.log('Fetching answer for market:', marketId);
    
    const variables = { marketId: marketId.toLowerCase() };
    const data = await request<QueryResponse>(subgraphUrl, QUERY, variables);
    
    if (!data.fixedProductMarketMaker) {
      console.log('No market found with ID:', marketId);
      return null;
    }

    console.log('Market answer data:', {
      marketId: data.fixedProductMarketMaker.id,
      currentAnswer: data.fixedProductMarketMaker.currentAnswer,
      answerFinalizedTimestamp: data.fixedProductMarketMaker.answerFinalizedTimestamp,
      conditionId: data.fixedProductMarketMaker.condition.id,
      payouts: data.fixedProductMarketMaker.condition.payouts,
    });

    return data.fixedProductMarketMaker;
  } catch (error) {
    console.error('Failed to fetch market answer:', error);
    throw error;
  }
}

// Helper function to check if answer is finalized
export function isAnswerFinalized(marketAnswer: MarketAnswer): boolean {
  return marketAnswer.answerFinalizedTimestamp !== null && 
         marketAnswer.answerFinalizedTimestamp !== '0' &&
         Date.now() / 1000 > Number(marketAnswer.answerFinalizedTimestamp);
}

// Helper function to get winning outcome index
export function getWinningOutcomeIndex(marketAnswer: MarketAnswer): number | null {
  if (!isAnswerFinalized(marketAnswer)) {
    return null;
  }

  // For binary markets, typically 0 means "No" and 1 means "Yes"
  return marketAnswer.currentAnswer === '0x0000000000000000000000000000000000000000000000000000000000000001' ? 1 : 0;
}

// Example usage:
/*
import { CONFIG } from '../config';

async function example() {
  const marketId = '0x...'; // Your market ID
  const marketAnswer = await getMarketAnswer(CONFIG.SUBGRAPH_URL, marketId);
  
  if (marketAnswer) {
    console.log('Is answer finalized:', isAnswerFinalized(marketAnswer));
    console.log('Winning outcome index:', getWinningOutcomeIndex(marketAnswer));
  }
}
*/ 
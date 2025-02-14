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

interface MarketMaker {
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

interface QueryResponse {
  fixedProductMarketMakers: MarketMaker[];
}

const QUERY = gql`
  query GetMarketsByCreator($creator: String!) {
    fixedProductMarketMakers(
      first: 20
      orderBy: creationTimestamp
      orderDirection: desc
      where: {
        creator: $creator
      }
    ) {
      id
      creator
      collateralToken
      fee
      collateralVolume
      outcomeTokenAmounts
      outcomeTokenMarginalPrices
      condition {
        id
        payouts
        oracle
        __typename
      }
      templateId
      title
      outcomes
      category
      language
      lastActiveDay
      runningDailyVolume
      arbitrator
      creationTimestamp
      openingTimestamp
      timeout
      resolutionTimestamp
      currentAnswer
      currentAnswerTimestamp
      currentAnswerBond
      answerFinalizedTimestamp
      scaledLiquidityParameter
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
      usdVolume
      __typename
    }
  }
`;

export async function getMarketsByCreator(
  subgraphUrl: string,
  creator: string = '0x89c5cc945dd550bcffb72fe42bff002429f46fec'
): Promise<MarketMaker[]> {
  try {
    const variables = { creator: creator.toLowerCase() };

    // console.log(variables)
    const data = await request<QueryResponse>(subgraphUrl, QUERY, variables);
    // console.log(data)
    return data.fixedProductMarketMakers;
  } catch (error) {
    console.error('Failed to fetch market makers:', error);
    throw error;
  }
}
export interface MarketDetails {
    id: string;
    outcomes: Array<{
      name: string;
      odds: string;
    }>;
    collateralToken: string;
    fee: string;
  }
  
  export interface TradeParams {
    marketAddress: string;
    outcomeIndex: number;
    amount: string;
    slippageTolerance: number;
  }
  
  export interface PositionInfo {
    positionId: bigint;
    balance: bigint;
    canRedeem: boolean;
  }
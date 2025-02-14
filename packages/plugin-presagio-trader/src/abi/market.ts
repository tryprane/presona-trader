import { ContractAbi } from "./types";

export const MarketAbi: ContractAbi = [
    {
      constant: true,
      inputs: [{
        name: "investmentAmount",
        type: "uint256"
      }, {
        name: "outcomeIndex",
        type: "uint256"
      }],
      name: "calcBuyAmount",
      outputs: [{
        name: "",
        type: "uint256"
      }],
      payable: false,
      stateMutability: "view",
      type: "function"
    },
    {
      constant: true,
      inputs: [{
        name: "returnAmount",
        type: "uint256"
      }, {
        name: "outcomeIndex",
        type: "uint256"
      }],
      name: "calcSellAmount",
      outputs: [{
        name: "outcomeTokenSellAmount",
        type: "uint256"
      }],
      payable: false,
      stateMutability: "view",
      type: "function"
    },
    {
      constant: false,
      inputs: [{
        name: "investmentAmount",
        type: "uint256"
      }, {
        name: "outcomeIndex",
        type: "uint256"
      }, {
        name: "minOutcomeTokensToBuy",
        type: "uint256"
      }],
      name: "buy",
      outputs: [],
      payable: false,
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      constant: false,
      inputs: [{
        name: "returnAmount",
        type: "uint256"
      }, {
        name: "outcomeIndex",
        type: "uint256"
      }, {
        name: "maxOutcomeTokensToSell",
        type: "uint256"
      }],
      name: "sell",
      outputs: [],
      payable: false,
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      constant: true,
      inputs: [],
      name: "collateralToken",
      outputs: [{
        name: "",
        type: "address"
      }],
      payable: false,
      stateMutability: "view",
      type: "function"
    },
    {
      constant: true,
      inputs: [],
      name: "fee",
      outputs: [{
        name: "",
        type: "uint256"
      }],
      payable: false,
      stateMutability: "view",
      type: "function"
    }
  ];
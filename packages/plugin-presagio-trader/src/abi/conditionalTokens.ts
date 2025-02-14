import { ContractAbi } from "./types";

export const ConditionalTokensAbi: ContractAbi = [
    {
      constant: true,
      inputs: [
        { name: "owner", type: "address" },
        { name: "id", type: "uint256" }
      ],
      name: "balanceOf",
      outputs: [{ name: "", type: "uint256" }],
      payable: false,
      stateMutability: "view",
      type: "function"
    },
    {
      constant: true,
      inputs: [
        { name: "collateralToken", type: "address" },
        { name: "collectionId", type: "bytes32" }
      ],
      name: "getPositionId",
      outputs: [{ name: "", type: "uint256" }],
      payable: false,
      stateMutability: "pure",
      type: "function"
    },
    {
      constant: true,
      inputs: [
        { name: "parentCollectionId", type: "bytes32" },
        { name: "conditionId", type: "bytes32" },
        { name: "indexSet", type: "uint256" }
      ],
      name: "getCollectionId",
      outputs: [{ name: "", type: "bytes32" }],
      payable: false,
      stateMutability: "view",
      type: "function"
    },
    {
      "constant": true,
      "inputs": [
        { "name": "", "type": "bytes32" },
        { "name": "", "type": "uint256" }
      ],
      "name": "payoutNumerators",
      "outputs": [{ "name": "", "type": "uint256" }],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      constant: false,
      inputs: [
        { name: "collateralToken", type: "address" },
        { name: "parentCollectionId", type: "bytes32" },
        { name: "conditionId", type: "bytes32" },
        { name: "indexSets", type: "uint256[]" }
      ],
      name: "redeemPositions",
      outputs: [],
      payable: false,
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      constant: false,
      inputs: [
        { name: "operator", type: "address" },
        { name: "approved", type: "bool" }
      ],
      name: "setApprovalForAll",
      outputs: [],
      payable: false,
      stateMutability: "nonpayable",
      type: "function"
    }
  ];
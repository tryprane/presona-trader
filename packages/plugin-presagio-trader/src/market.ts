import {
    parseEther,
    formatEther,
    Address,
    encodeFunctionData,
    erc20Abi,
  } from "viem";
  import { elizaLogger } from "@elizaos/core";
  import { gnosis } from "viem/chains";
  
  // import { UseReadContractParameters, useReadContract } from 'wagmi';
  import SafeApiKit from "@safe-global/api-kit";
  import Safe from "@safe-global/protocol-kit";
  import { MetaTransactionData, OperationType } from "@safe-global/types-kit";
  
  import { ethers } from "ethers";
  import { MarketAbi, ConditionalTokensAbi } from "./abi";
  import { MarketDetails, TradeParams, PositionInfo } from "./types/market";
  
  const CONDITIONAL_TOKENS_ADDRESS = "0xCeAfDD6bc0bEF976fdCd1112955828E00543c0Ce";
  const WXDAI_ADDRESS = "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d";
  const ZERO_BYTES32 =
    "0x0000000000000000000000000000000000000000000000000000000000000000";
  const ROUNDING_PRECISION = 0.00000000001;
  
  export enum SwapDirection {
    BUY = "BUY",
    SELL = "SELL",
  }

  type IndexSetOptions = [1, 2];
const outcomeIndexOptions: IndexSetOptions = [1, 2];

interface RedeemPositionsParams {
  collateralToken?: string;
  parentCollectionId?: string;
  conditionId: string;
  outcomeIndex?: IndexSetOptions;
}
  
  export class PresagioMarket {
    private readonly safeAddress: Address;
    private readonly provider: any;
    private readonly signer: any;
   
   
    private safeSdk;
  
    constructor(safeAddress: Address, privateKey:any , provider: any) {
      this.safeAddress = safeAddress;
      this.signer = privateKey;
      this.provider = provider;
  
      // Ensure provider is valid
      if (!provider || !(provider instanceof ethers.JsonRpcProvider)) {
        throw new Error("Invalid provider: must be an ethers JsonRpcProvider");
      }
    }
  
    private async getSafeInstance(): Promise<Safe> {
      if (!this.safeSdk) {
        console.log("test");
  
  

        const RPC_URL = "https://rpc.gnosischain.com";
  
        const preExistingSafe = await Safe.default.init({
          provider: RPC_URL,
          signer: this.signer,
          safeAddress: this.safeAddress,
        });
        
        this.safeSdk = preExistingSafe
  
      
        
  
        const isSafeDeployed = await this.safeSdk.isSafeDeployed();
        console.log(isSafeDeployed);
        if (!isSafeDeployed) {
          throw new Error("Safe not deployed at this address");
        }
      }
      return this.safeSdk;
    }
  
    async inspectContract(marketAddress: string): Promise<any> {
      const contract = new ethers.Contract(
        marketAddress,
        MarketAbi,
        this.provider
      );
  
      // Get all function fragments
      const functions = contract.interface.fragments
        .map((fragment) => {
          if (fragment.type === "function") {
            const funcFragment = fragment as ethers.FunctionFragment;
            return {
              name: funcFragment.name,
              inputs: funcFragment.inputs.map((input) => ({
                name: input.name,
                type: input.type,
                components: input.components,
              })),
              outputs: funcFragment.outputs?.map((output) => ({
                name: output.name,
                type: output.type,
                components: output.components,
              })),
              stateMutability: funcFragment.stateMutability,
            };
          }
          return null;
        })
        .filter((f) => f !== null);
  
      // Get all events
      const events = contract.interface.fragments
        .filter((f) => f.type === "event")
        .map((event) => {
          const eventFragment = event as ethers.EventFragment;
          return {
            name: eventFragment.name,
            inputs: eventFragment.inputs.map((input) => ({
              name: input.name,
              type: input.type,
              indexed: input.indexed,
            })),
          };
        });
  
      const contractState = {
        address: contract.target,
        provider: contract.runner,
        functions,
        events,
      };
  
      return contractState;
    }
  
    async getMarketDetails(marketAddress: Address): Promise<MarketDetails> {
      try {
        // const safe = await this.getSafeInstance();
        // In your existing code where you create the contract:
        const contract = new ethers.Contract(
          marketAddress,
          MarketAbi,
          this.provider
        );
        // const contractDetails = await this.inspectContract(marketAddress);
        // console.log('Full Contract Details:', contractDetails);
  
        // useReadContract({
        //   abi: MarketABI as Abi,
        //   address,
        //   functionName,
        //   args,
        //   query,
        //   chainId: gnosis.id,
        // });
  
        // Get market data
        const [collateralToken, fee] = await Promise.all([
          contract.collateralToken(),
          contract.fee(),
        ]);
  
        // Get outcome data
        // const conditionId = await contract.conditionIds(0); // First condition
  
        // Calculate odds
        const outcomes = await Promise.all(
          [0, 1].map(async (index) => {
            const buyAmount = await this.calculateBuyAmount(
              marketAddress,
              "1", // 1 token investment
              index
            );
            const odds = (1 / Number(buyAmount)).toFixed(4);
  
            return {
              name: `Outcome ${index + 1}`,
              odds,
            };
          })
        );
  
        return {
          id: marketAddress,
          outcomes,
          collateralToken,
          fee: formatEther(fee),
        };
      } catch (error) {
        console.error("Error fetching market details:", error);
        throw error;
      }
    }
  
    async getPosition(
      marketAddress: Address,
      conditionId: string,
      outcomeIndex: number
    ): Promise<PositionInfo> {
      const contract = new ethers.Contract(
        CONDITIONAL_TOKENS_ADDRESS,
        ConditionalTokensAbi,
        this.provider
      );
      const marketContract = new ethers.Contract(
        marketAddress,
        MarketAbi,
        this.provider
      );
  
      const indexSet = 1 << outcomeIndex;
      const collectionId = await contract.getCollectionId(
        ZERO_BYTES32,
        conditionId,
        indexSet
      );
      const collateralToken = await marketContract.collateralToken();
      const positionId = await contract.getPositionId(
        collateralToken,
        collectionId
      );
      const balance = await contract.balanceOf(this.safeAddress, positionId);
      const canRedeem = await this.checkCanRedeem(conditionId, balance);
  
      return {
        positionId,
        balance,
        canRedeem,
      };
    }
  
    async calculateBuyAmount(
      marketAddress: Address,
      investmentAmount: string,
      outcomeIndex: number
    ): Promise<string> {
      try {
        const contract = new ethers.Contract(
          marketAddress,
          MarketAbi,
          this.provider
        );
        const amount = parseEther(investmentAmount);
        const buyAmount = await contract.calcBuyAmount(amount, outcomeIndex);
        return formatEther(buyAmount);
      } catch (error) {
        console.error("Error calculating buy amount:", error);
        throw error;
      }
    }
  
    async calculateSellAmount(
      marketAddress: Address,
      returnAmount: string,
      outcomeIndex: number
    ): Promise<string> {
      try {
        const contract = new ethers.Contract(
          marketAddress,
          MarketAbi,
          this.provider
        );
        const amount = parseEther(returnAmount);
        const sellAmount = await contract.calcSellAmount(amount, outcomeIndex);
        return formatEther(sellAmount);
      } catch (error) {
        console.error("Error calculating sell amount:", error);
        throw error;
      }
    }
  
    private async checkCanRedeem(
      conditionId: string,
      balance: bigint
    ): Promise<boolean> {
      return balance > BigInt(0);
    }
  
    async checkAllowance(
      tokenAddress: Address,
      amount: string,
      direction: SwapDirection
    ): Promise<boolean> {
      try {
        if (direction === SwapDirection.BUY) {
          const contract = new ethers.Contract(
            tokenAddress,
            erc20Abi,
            this.provider
          );
          const allowance = await contract.allowance(
            this.safeAddress,
            tokenAddress
          );
          return allowance >= parseEther(amount);
        } else {
          const contract = new ethers.Contract(
            CONDITIONAL_TOKENS_ADDRESS,
            ConditionalTokensAbi,
            this.provider
          );
          const isApproved = await contract.isApprovedForAll(
            this.safeAddress,
            tokenAddress
          );
          return isApproved;
        }
      } catch (error) {
        console.error("Error checking allowance:", error);
        throw error;
      }
    }
  
    private async executeSafeTransaction(tx: {
      to: string;
      data: string;
      value: string;
    }): Promise<string> {
      const safeSdk = await this.getSafeInstance();
      const owners = await safeSdk.getOwners();
      console.log(owners);
  
      // Create transaction
      const safeTransaction = await safeSdk.createTransaction({
        transactions: [
          {
            to: tx.to,
            data: tx.data,
            value: tx.value,
            operation: OperationType.Call, // Adding required operation type
          },
        ],
      });
  
      // console.log(safeTransaction)
  
      // Get transaction hash
      const safeTxHash = await safeSdk.getTransactionHash(safeTransaction);
      // console.log(safeTxHash)
  
         // Single owner flow
      console.log('Single owner flow - executing transaction');
      const signature = await safeSdk.signHash(safeTxHash);
      console.log('Transaction signed');

      const executeTxResponse = await safeSdk.executeTransaction(safeTransaction);
      console.log('Transaction executed, waiting for confirmation...');
      
      const receipt = await this.provider.waitForTransaction(executeTxResponse.hash);
      console.log('Transaction confirmed:', receipt.hash);
      
      if (!receipt.hash) {
        throw new Error('Transaction failed: no transaction hash in receipt');
      }
      
      return receipt.hash;
      
    }
  
    async approveMarket(
      tokenAddress: Address,
      marketAddress: Address,
      amount: string,
      direction: SwapDirection
    ): Promise<string> {
      try {
        let approveTx;
        if (direction === SwapDirection.BUY) {
          // ERC20 approval
          approveTx = {
            to: tokenAddress,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [marketAddress, parseEther(amount)],
            }),
            value: "0",
          };
        } else {
          // ERC1155 approval
          approveTx = {
            to: CONDITIONAL_TOKENS_ADDRESS,
            data: encodeFunctionData({
              abi: ConditionalTokensAbi,
              functionName: "setApprovalForAll",
              args: [marketAddress, true],
            }),
            value: "0",
          };
        }
  
        return await this.executeSafeTransaction(approveTx);
      } catch (error) {
        console.error("Error approving market:", error);
        throw error;
      }
    }
  
    async executeBuyTrade({
      marketAddress,
      outcomeIndex,
      amount,
      slippageTolerance,
    }: TradeParams): Promise<string> {
      try {
        const investmentAmount = parseEther(amount);
        const expectedOutcome = await this.calculateBuyAmount(
          marketAddress as Address,
          amount,
          outcomeIndex
        );
  
        const minOutcomeTokens = BigInt(
          Math.floor(
            Number(parseEther(expectedOutcome)) * (1 - slippageTolerance / 100)
          )
        );
  
        const buyTx = {
          to: marketAddress,
          data: encodeFunctionData({
            abi: MarketAbi,
            functionName: "buy",
            args: [investmentAmount, outcomeIndex, minOutcomeTokens],
          }),
          value: "0",
        };
  
        return await this.executeSafeTransaction(buyTx);
      } catch (error) {
        console.error("Error executing buy trade:", error);
        throw error;
      }
    }
  
    async executeSellTrade({
      marketAddress,
      outcomeIndex,
      amount,
      slippageTolerance,
    }: TradeParams): Promise<string> {
      try {
        const returnAmount = parseEther(amount);
        const expectedSell = await this.calculateSellAmount(
          marketAddress as Address,
          amount,
          outcomeIndex
        );
  
        const returnAmountRounded = BigInt(
          Math.floor(Number(returnAmount) * (1 - ROUNDING_PRECISION))
        );
        const maxOutcomeTokens = BigInt(
          Math.floor(
            Number(parseEther(expectedSell)) * (1 + slippageTolerance / 100)
          )
        );
  
        const sellTx = {
          to: marketAddress,
          data: encodeFunctionData({
            abi: MarketAbi,
            functionName: "sell",
            args: [returnAmountRounded, outcomeIndex, maxOutcomeTokens],
          }),
          value: "0",
        };
  
        return await this.executeSafeTransaction(sellTx);
      } catch (error) {
        console.error("Error executing sell trade:", error);
        throw error;
      }
    }


  async redeemPositions({
    collateralToken = WXDAI_ADDRESS,
    parentCollectionId = ZERO_BYTES32,
    conditionId,
    outcomeIndex = outcomeIndexOptions,
  }: RedeemPositionsParams): Promise<string> {
    try {
      console.log('Redeeming positions with params:', {
        collateralToken,
        parentCollectionId,
        conditionId,
        outcomeIndex
      });

      // Create the redeem transaction
      const redeemTx = {
        to: CONDITIONAL_TOKENS_ADDRESS,
        data: encodeFunctionData({
          abi: ConditionalTokensAbi,
          functionName: "redeemPositions",
          args: [collateralToken, parentCollectionId, conditionId, outcomeIndex],
        }),
        value: "0",
      };

      // Execute the transaction through the Safe
      const txHash = await this.executeSafeTransaction(redeemTx);
      console.log('Redeem transaction executed:', txHash);

      return txHash;
    } catch (error) {
      console.error("Error redeeming positions:", error);
      throw error;
    }
  }

  async checkIfWinner(
    marketAddress: string,
    conditionId: string,
    outcomeIndex: number
  ): Promise<{ canRedeem: boolean; balance: bigint }> {
    try {
      // Get position info
      const position = await this.getPosition(
        marketAddress as Address,
        conditionId,
        outcomeIndex
      );

      // Get condition details from the Conditional Tokens contract
      const contract = new ethers.Contract(
        CONDITIONAL_TOKENS_ADDRESS,
        ConditionalTokensAbi,
        this.provider
      );

      // Check if condition is resolved
      const payoutNumerators = await contract.payoutNumerators(conditionId, outcomeIndex);
      const isResolved = payoutNumerators > 0;

      console.log('Position check results:', {
        balance: position.balance,
        canRedeem: position.canRedeem && isResolved,
        isResolved,
        payoutNumerators
      });

      return {
        canRedeem: position.canRedeem && isResolved,
        balance: position.balance
      };
    } catch (error) {
      console.error("Error checking winner status:", error);
      throw error;
    }
  }

  async claimWinnings(
    marketAddress: string,
    conditionId: string,
    outcomeIndex: number
  ): Promise<string | null> {
    try {
      // First check if the position can be redeemed
      const { canRedeem, balance } = await this.checkIfWinner(
        marketAddress,
        conditionId,
        outcomeIndex
      );

      if (!canRedeem) {
        console.log('Position cannot be redeemed:', {
          marketAddress,
          conditionId,
          outcomeIndex,
          balance: balance.toString()
        });
        return null;
      }

      // Get market details to get collateral token
      const marketDetails = await this.getMarketDetails(marketAddress as Address);

      // Execute redeem transaction
      const txHash = await this.redeemPositions({
        collateralToken: marketDetails.collateralToken,
        conditionId,
        outcomeIndex: [1, 2], // Standard binary market outcomes
      });

      console.log('Successfully claimed winnings:', {
        marketAddress,
        conditionId,
        outcomeIndex,
        balance: balance.toString(),
        txHash
      });

      return txHash;
    } catch (error) {
      console.error("Error claiming winnings:", error);
      throw error;
    }
  }
  }
  
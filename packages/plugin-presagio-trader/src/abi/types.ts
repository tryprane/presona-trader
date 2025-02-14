// src/abi/types.ts
import { Abi, encodeFunctionData } from 'viem';

export interface ExtendedAbi extends Abi {
  encodeFunctionData: (functionName: string, args: any[]) => string;
}

export const extendAbi = (abi: Abi): ExtendedAbi => {
  return {
    ...abi,
    encodeFunctionData: (functionName: string, args: any[]) => 
      encodeFunctionData({ abi, functionName, args })
  };
};


export type AbiEvent = {
    anonymous: boolean;
    inputs: AbiParameter[];
    name: string;
    type: 'event';
  };
  
  export type AbiFunction = {
    constant: boolean;
    inputs: AbiParameter[];
    name: string;
    outputs: AbiParameter[];
    payable: boolean;
    stateMutability: 'view' | 'nonpayable' | 'payable' | 'pure';
    type: 'function';
  };
  
  export type AbiParameter = {
    indexed?: boolean;
    name: string;
    type: string;
  };
  
  export type ContractAbi = Array<AbiEvent | AbiFunction>;
  
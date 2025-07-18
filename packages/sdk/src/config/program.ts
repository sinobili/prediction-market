// packages/sdk/src/config/program.ts
import { PublicKey } from '@solana/web3.js';

export const PROGRAM_ID = new PublicKey('wV5jwseh9fQfrdHUbxafCfGpvuWbQaNYqQaBJS8vuVa');

export const RPC_ENDPOINTS = {
  localnet: 'http://127.0.0.1:8899',
  devnet: 'https://api.devnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com',
};
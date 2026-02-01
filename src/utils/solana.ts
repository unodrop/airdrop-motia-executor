/**
 * Solana 钱包生成：Keypair.generate()，地址为 publicKey.toBase58()，
 * 私钥存 64 字节 secretKey 的 base64，解密后可 Keypair.fromSecretKey() 恢复。
 */

import { Keypair } from '@solana/web3.js'

export type RandomSolanaWalletResult = {
  /** Solana 地址（base58 公钥） */
  address: string
  /** 64 字节 secretKey 的 base64，用于加密存储；解密后 Keypair.fromSecretKey(Buffer.from(..., 'base64')) */
  privateKey: string
  /** Solana 无助记词时为空 */
  mnemonicPhrase: null
}

/**
 * 创建随机 Solana 钱包（Keypair）。无助记词，privateKey 为 secretKey 的 base64。
 */
export function createRandomSolanaWallet(): RandomSolanaWalletResult {
  const keypair = Keypair.generate()
  const address = keypair.publicKey.toBase58()
  const privateKey = Buffer.from(keypair.secretKey).toString('base64')
  return { address, privateKey, mnemonicPhrase: null }
}

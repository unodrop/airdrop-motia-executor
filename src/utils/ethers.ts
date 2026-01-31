/**
 * Reusable Ethers helpers: signMessage, getAddress, gas/fee, sendTransaction, contract read/write.
 * Only this module should depend on ethers; services use these functions.
 */

import {
  Wallet,
  getAddress,
  Contract,
  type Provider,
  type TransactionRequest,
  type TransactionResponse,
  type FeeData,
  type InterfaceAbi,
  type ContractRunner,
} from 'ethers'

/**
 * Sign a message with personal_sign (EIP-191), returns hex signature.
 */
export async function signMessage(
  message: string,
  privateKey: string,
  provider?: Provider
): Promise<string> {
  const wallet = new Wallet(privateKey, provider)
  return wallet.signMessage(message)
}

/**
 * Derive Ethereum address from private key.
 */
export function getAddressFromPrivateKey(
  privateKey: string,
  provider?: Provider
): string {
  const wallet = new Wallet(privateKey, provider)
  return getAddress(wallet.address)
}

/**
 * Get current fee data (gasPrice for legacy, maxFeePerGas / maxPriorityFeePerGas for EIP-1559).
 */
export async function getFeeData(provider: Provider): Promise<FeeData> {
  return provider.getFeeData()
}

/**
 * Get ETH balance of an address (in wei).
 */
export async function getBalance(address: string, provider: Provider): Promise<bigint> {
  return provider.getBalance(address)
}

/**
 * Estimate gas for a transaction.
 */
export async function estimateGas(tx: TransactionRequest, provider: Provider): Promise<bigint> {
  return provider.estimateGas(tx)
}

export type SendValueOptions = {
  /** Optional calldata (contract call). */
  data?: string
  /** Override gas limit; otherwise estimated. */
  gasLimit?: bigint
}

/**
 * Send ETH (or build and send tx with value). Constructs tx: queries gas, checks balance, builds params, sends.
 * Caller only passes to, value, privateKey, provider; optional data/gasLimit.
 */
export async function sendTransaction(
  to: string,
  value: bigint,
  privateKey: string,
  provider: Provider,
  options?: SendValueOptions
): Promise<TransactionResponse> {
  const wallet = new Wallet(privateKey, provider)
  const from = wallet.address

  const balance = await getBalance(from, provider)
  const feeData = await getFeeData(provider)

  const draftTx: TransactionRequest = {
    to,
    value,
    from,
    data: options?.data,
  }
  const gasLimit = options?.gasLimit ?? (await estimateGas(draftTx, provider))

  const gasCost =
    feeData.gasPrice != null
      ? gasLimit * feeData.gasPrice
      : feeData.maxFeePerGas != null
        ? gasLimit * feeData.maxFeePerGas
        : 0n
  if (balance < value + gasCost) {
    throw new Error(
      `Insufficient balance: have ${balance} wei, need ${value + gasCost} wei (value ${value} + gas ~${gasCost})`
    )
  }

  const tx: TransactionRequest = {
    to,
    value,
    data: options?.data,
    gasLimit,
    ...(feeData.gasPrice != null
      ? { gasPrice: feeData.gasPrice }
      : feeData.maxFeePerGas != null
        ? {
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? feeData.maxFeePerGas,
          }
        : {}),
  }
  return wallet.sendTransaction(tx)
}

/**
 * Create a Contract instance for read (with provider) or write (with wallet).
 * - Read-only: getContract(address, abi, provider) then contract.methodName(...)
 * - Write: getContract(address, abi, wallet) then contract.methodName(...) with overrides
 */
export function getContract(
  address: string,
  abi: InterfaceAbi,
  runner?: ContractRunner | null
): Contract {
  return new Contract(address, abi, runner ?? undefined)
}

/**
 * Call a contract view/pure function (read-only, no transaction).
 */
export async function callContract<T = unknown>(
  address: string,
  abi: InterfaceAbi,
  methodName: string,
  args: unknown[],
  provider: Provider
): Promise<T> {
  const contract = getContract(address, abi, provider)
  const fn = contract.getFunction(methodName)
  return fn(...args) as Promise<T>
}

/**
 * Send a contract transaction (state-changing call). Returns transaction response; use .wait() for receipt.
 */
export async function sendContractTransaction(
  address: string,
  abi: InterfaceAbi,
  methodName: string,
  args: unknown[],
  privateKey: string,
  provider: Provider,
  overrides?: Omit<TransactionRequest, 'to' | 'data'>
): Promise<TransactionResponse> {
  const wallet = new Wallet(privateKey, provider)
  const contract = getContract(address, abi, wallet)
  const fn = contract.getFunction(methodName)
  return fn(...args, overrides ?? {}) as Promise<TransactionResponse>
}

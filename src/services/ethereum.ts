/**
 * Ethereum signing for Pharos login. Uses utils/ethers; callers pass private key and provider.
 */

import type { Provider } from 'ethers'
import * as ethersUtils from '../utils/ethers'

/**
 * Sign a message for login (e.g. Pharos login challenge). Returns hex signature.
 */
export async function signMessageForLogin(
  message: string,
  privateKey: string,
  provider?: Provider
): Promise<string> {
  return ethersUtils.signMessage(message, privateKey, provider)
}

/**
 * Get address from private key (for login payload or logging).
 */
export function getAddressFromPrivateKey(privateKey: string, provider?: Provider): string {
  return ethersUtils.getAddressFromPrivateKey(privateKey, provider)
}

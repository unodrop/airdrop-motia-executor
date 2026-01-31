/**
 * AES-256-GCM 加解密，用于钱包私钥/助记词等敏感字段。
 * 密文格式：base64(iv(12) + ciphertext + authTag(16))
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function deriveKey(password: string): Buffer {
  return createHash('sha256').update(password, 'utf8').digest()
}

export function encrypt(plaintext: string, password: string): string {
  if (!plaintext) return ''
  const key = deriveKey(password)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, ciphertext, authTag]).toString('base64')
}

export function decrypt(ciphertextBase64: string, password: string): string {
  if (!ciphertextBase64) return ''
  const key = deriveKey(password)
  const rawBuffer = Buffer.from(ciphertextBase64, 'base64')
  if (rawBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) throw new Error('Invalid ciphertext')
  const iv = rawBuffer.subarray(0, IV_LENGTH)
  const authTag = rawBuffer.subarray(rawBuffer.length - AUTH_TAG_LENGTH)
  const ciphertext = rawBuffer.subarray(IV_LENGTH, rawBuffer.length - AUTH_TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
}

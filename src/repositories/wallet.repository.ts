/**
 * Wallet repository — 适配 docs/wallets-schema.sql。
 * 表列：id, address, private_key_encrypted, user_agent（明文）, created_at, updated_at 等
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Wallet } from '../types'

const WALLETS_TABLE = 'wallets'

function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  return createClient(url, serviceRoleKey)
}

/** List all wallets for scheduled check-in（表无 is_enabled 时全部参与）. */
export async function listEnabledWallets(): Promise<Wallet[]> {
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from(WALLETS_TABLE)
    .select('id, address, private_key_encrypted, user_agent, created_at, updated_at')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Supabase wallets list failed: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    address: row.address,
    encrypted_private_key: row.private_key_encrypted,
    user_agent: row.user_agent ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })) as Wallet[]
}

export async function getWalletById(id: string): Promise<Wallet | null> {
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from(WALLETS_TABLE)
    .select('id, address, private_key_encrypted, user_agent, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) {
    console.warn('[wallet.repository] getWalletById error', { id, code: error.code, message: error.message })
    return null
  }
  if (!data) return null
  return {
    id: data.id,
    address: data.address,
    encrypted_private_key: data.private_key_encrypted,
    user_agent: data.user_agent ?? undefined,
    created_at: data.created_at,
    updated_at: data.updated_at,
  } as Wallet
}

/** 绑定钱包的 User-Agent，明文写入 user_agent */
export async function updateWalletUserAgent(id: string, userAgent: string): Promise<void> {
  const supabase = createSupabaseClient()
  const { error } = await supabase
    .from(WALLETS_TABLE)
    .update({ user_agent: userAgent, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    throw new Error(`Supabase update user_agent failed: ${error.message}`)
  }
}

export type InsertWalletParams = {
  address: string
  private_key_encrypted: string
  mnemonic_encrypted?: string | null
  user_agent: string
  chain?: string
}

/** Insert a new wallet; returns created id. Throws on duplicate address or DB error. */
export async function insertWallet(params: InsertWalletParams): Promise<string> {
  const supabase = createSupabaseClient()
  const row = {
    address: params.address,
    private_key_encrypted: params.private_key_encrypted,
    mnemonic_encrypted: params.mnemonic_encrypted ?? null,
    user_agent: params.user_agent,
    chain: params.chain ?? 'evm',
  }
  const { data, error } = await supabase.from(WALLETS_TABLE).insert(row).select('id').single()
  if (error) {
    throw new Error(`Supabase insert wallet failed: ${error.message}`)
  }
  return data.id
}

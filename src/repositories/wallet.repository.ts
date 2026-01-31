/**
 * Wallet repository — 适配新钱包表结构。
 * 表 wallets: id, address, encrypted_private_key, is_enabled, user_agent, created_at, updated_at
 * listEnabledWallets returns only is_enabled = true; used by Pharos check-in schedule.
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

/** List wallets with is_enabled = true for scheduled check-in. */
export async function listEnabledWallets(): Promise<Wallet[]> {
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from(WALLETS_TABLE)
    .select('id, address, encrypted_private_key, is_enabled, user_agent, created_at, updated_at')
    .eq('is_enabled', true)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Supabase wallets list failed: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    address: row.address,
    encrypted_private_key: row.encrypted_private_key,
    is_enabled: row.is_enabled ?? true,
    user_agent: row.user_agent ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })) as Wallet[]
}

export async function getWalletById(id: string): Promise<Wallet | null> {
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from(WALLETS_TABLE)
    .select('id, address, encrypted_private_key, is_enabled, user_agent, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return {
    id: data.id,
    address: data.address,
    encrypted_private_key: data.encrypted_private_key,
    is_enabled: data.is_enabled ?? true,
    user_agent: data.user_agent ?? undefined,
    created_at: data.created_at,
    updated_at: data.updated_at,
  } as Wallet
}

/** 绑定钱包的 User-Agent，生成后需调用此方法持久化 */
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

-- 撸毛钱包表：敏感字段均加密存储，由应用层用 WALLET_KEY 加解密
-- 适用 PostgreSQL / Supabase
--
-- 使用方式：
-- 1. 在 Supabase Dashboard → SQL Editor 中执行本文件；或放到 supabase/migrations/ 后执行迁移
-- 2. 应用层：写入前用 WALLET_KEY（.env 中）对私钥/助记词/token 做 AES-GCM 等加密，读出后解密
-- 3. 加密列存的是密文（如 base64），切勿在 SQL 中解密或把 WALLET_KEY 写进库

CREATE TABLE IF NOT EXISTS wallets (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 链上地址（明文，用于展示与索引）
  address TEXT NOT NULL,

  -- ========== 加密存储（应用层加密后写入） ==========
  -- 私钥
  private_key_encrypted TEXT NOT NULL,
  -- 助记词（可选，与私钥二选一或同时存）
  mnemonic_encrypted TEXT,
  -- 浏览器 / 请求指纹
  user_agent TEXT,
  -- X (Twitter) 相关 token
  x_token_encrypted TEXT,
  -- Discord token
  discord_token_encrypted TEXT,
  -- 代理地址等（可选）
  proxy_encrypted TEXT,

  -- ========== 指纹 / 元数据（可明文或哈希） ==========
  -- 设备指纹（如 fingerprintjs 等生成的 hash）
  device_fingerprint TEXT,
  -- 最近一次使用的 IP（可选，隐私考虑可只存国家）
  -- 钱包标签（如 "主号" "小号1"）
  label TEXT,
  -- 链类型（evm / solana / 等）
  chain TEXT DEFAULT 'evm',
  -- 备注
  notes TEXT,
  -- 扩展字段（其他 token、cookie、指纹等）
  extra JSONB,

  -- ========== 时间戳 ==========
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT wallets_address_unique UNIQUE (address)
);

-- 便于按地址、时间查询
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets (address);
CREATE INDEX IF NOT EXISTS idx_wallets_created_at ON wallets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallets_chain ON wallets (chain);

-- 可选：更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallets_updated_at ON wallets;
CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

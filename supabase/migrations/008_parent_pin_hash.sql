-- 每家庭独立家长 PIN（哈希存储，明文不落库）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parent_pin_hash TEXT;

COMMENT ON COLUMN profiles.parent_pin_hash IS 'Per-account parent PIN scrypt hash (format scrypt:salt:hex)';

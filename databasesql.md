-- ════════════════════════════════════════════════════════════════
-- NexaPay — Full Database Schema  (updated)
-- Run this in Supabase → SQL Editor → New Query
-- ════════════════════════════════════════════════════════════════


-- ── 1. PROFILES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT,
  full_name           TEXT,
  business_name       TEXT,
  business_sector     TEXT,
  is_operated         TEXT DEFAULT 'yes',
  business_type       TEXT,
  country             TEXT,
  phone               TEXT,
  id_number           TEXT,                         -- national ID or passport number
  tax_id              TEXT,                         -- TPIN / TIN number
  currency            TEXT DEFAULT 'ZMW',
  account_type        TEXT DEFAULT 'business',
  verification_status TEXT DEFAULT 'not_started',
  is_disabled         BOOLEAN DEFAULT FALSE,
  disable_reason      TEXT,                         -- reason when admin suspends account
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ── 2. WALLETS ───────────────────────────────────────────────────
-- Zimbabwe merchants get TWO wallets: USD + ZiG
-- Unique constraint prevents duplicate currency wallets per user
CREATE TABLE IF NOT EXISTS wallets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE,
  currency          TEXT NOT NULL,     -- ZMW | USD | ZiG | NAD | BWP
  country           TEXT,
  balance           NUMERIC DEFAULT 0,
  locked_balance    NUMERIC DEFAULT 0,
  available_balance NUMERIC DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, currency)
);


-- ── 3. TRANSACTIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type               TEXT NOT NULL,           -- 'payin' | 'payout'
  amount             NUMERIC NOT NULL,
  fee                NUMERIC DEFAULT 0,
  currency           TEXT NOT NULL,
  channel            TEXT DEFAULT 'mobile_money',
  network            TEXT,
  phone              TEXT,
  status             TEXT DEFAULT 'pending',  -- pending | success | failed
  mode               TEXT DEFAULT 'LIVE',     -- LIVE | TEST
  tx_ref             TEXT,
  merchant_reference TEXT,
  summary            TEXT,
  recipient          TEXT,
  metadata           JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);


-- ── 4. SETTLEMENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settlements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount              NUMERIC NOT NULL,
  currency            TEXT NOT NULL,
  method              TEXT,
  channel             TEXT,
  beneficiary_name    TEXT,
  beneficiary_phone   TEXT,
  beneficiary_account TEXT,
  reference           TEXT,
  status              TEXT DEFAULT 'pending',  -- pending | success | rejected
  notes               TEXT,
  processed_by        TEXT,
  processed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ── 5. DISBURSEMENTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disbursements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  beneficiary_id   UUID,
  beneficiary_name TEXT,
  beneficiary_phone TEXT,
  amount           NUMERIC NOT NULL,
  fee              NUMERIC DEFAULT 0,
  currency         TEXT NOT NULL,
  method           TEXT,
  reference        TEXT,
  status           TEXT DEFAULT 'pending',  -- pending | success | rejected
  notes            TEXT,
  processed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ── 6. BENEFICIARIES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS beneficiaries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  currency   TEXT NOT NULL,           -- ZMW | USD | ZiG | NAD | BWP
  method     TEXT NOT NULL,           -- mobile_money | bank_transfer
  phone      TEXT NOT NULL,
  country    TEXT,
  network    TEXT,                    -- e.g. Airtel Zambia, Econet Wireless
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── 7. PAYMENT LINKS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT,
  title       TEXT NOT NULL,
  amount      NUMERIC,
  amount_type TEXT DEFAULT 'fixed',  -- fixed | flexible
  currency    TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'active', -- active | inactive
  max_uses    INTEGER,
  usage_count INTEGER DEFAULT 0,
  clicks      INTEGER DEFAULT 0,
  payments    INTEGER DEFAULT 0,
  slug        TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  link_id     TEXT,
  url         TEXT,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ── 8. WEBHOOK HISTORY (delivery log) ────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  url              TEXT,
  event            TEXT,
  status           TEXT DEFAULT 'FINAL_FAILED',
  attempts         INTEGER DEFAULT 1,
  request_payload  TEXT,
  response_status  INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ── 9. WEBHOOK CONFIGS (per-merchant settings) ───────────────────
CREATE TABLE IF NOT EXISTS webhook_configs (
  user_id    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  webhook_url TEXT,
  url        TEXT,
  secret     TEXT DEFAULT encode(gen_random_bytes(24), 'hex'),
  events     TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── 10. API KEYS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  user_id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  test_publishable_key TEXT,
  test_secret_key      TEXT,
  live_publishable_key TEXT,
  live_secret_key      TEXT,
  is_live              BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);


-- ── 11. IP WHITELIST ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ip_whitelist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address  TEXT NOT NULL,
  label       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ── 12. NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT DEFAULT 'info',  -- info | success | warning | error
  is_read    BOOLEAN DEFAULT FALSE, -- use is_read (not read) — consistent with API
  read_at    TIMESTAMPTZ,           -- timestamp when marked read
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── 13. USER SETTINGS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  user_id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_payin          BOOLEAN DEFAULT TRUE,
  email_settlement     BOOLEAN DEFAULT TRUE,
  email_disbursement   BOOLEAN DEFAULT TRUE,
  inapp                BOOLEAN DEFAULT TRUE,
  email_notifications  BOOLEAN DEFAULT TRUE,
  sms_notifications    BOOLEAN DEFAULT FALSE,
  two_factor_auth      BOOLEAN DEFAULT FALSE,
  session_timeout      INTEGER DEFAULT 60,
  language             TEXT DEFAULT 'en',
  timezone             TEXT DEFAULT 'Africa/Lusaka',
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);


-- ── 14. VERIFICATION SUBMISSIONS ─────────────────────────────────
-- One row per merchant — tracks their overall KYC status
CREATE TABLE IF NOT EXISTS verification_submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  status           TEXT DEFAULT 'not_started',  -- not_started | submitted | verified | rejected
  business_type    TEXT,
  submitted_at     TIMESTAMPTZ,
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      TEXT,
  rejection_reason TEXT,                        -- reason when admin rejects KYC
  document_count   INTEGER DEFAULT 0,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ── 15. VERIFICATION DOCUMENTS ───────────────────────────────────
-- One row per uploaded document (6 supported types)
-- Types: business_cert | id_front | id_back | utility_bill | tax_id | id_selfie
CREATE TABLE IF NOT EXISTS verification_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  document_type    TEXT NOT NULL,
  filename         TEXT,
  file_path        TEXT,                         -- Supabase Storage path (kyc/{uid}/{uuid}.ext)
  file_url         TEXT,                         -- Public URL from Supabase Storage
  file_size        TEXT,
  status           TEXT DEFAULT 'pending',       -- pending | approved | rejected
  upload_status    TEXT DEFAULT 'uploaded',      -- uploaded | failed
  rejection_reason TEXT,                         -- per-document rejection note from admin
  reviewed_at      TIMESTAMPTZ,                  -- when admin approved/rejected this document
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  uploaded_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ── 16. AUDIT LOG ────────────────────────────────────────────────
-- Used by server for all admin actions (disable user, KYC approve/reject, etc.)
CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   TEXT DEFAULT 'admin',
  action     TEXT NOT NULL,       -- disable_user | enable_user | kyc_approved | kyc_rejected | settlement_approved | disbursement_approved | ...
  target_id  TEXT,
  detail     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Run AFTER the tables above are created
-- ════════════════════════════════════════════════════════════════

ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE disbursements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links          ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_configs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_whitelist           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
-- audit_log: no RLS — only accessible via service role key (server-side)

-- Policies — users only see their own rows
CREATE POLICY "own profile"        ON profiles               FOR ALL USING (auth.uid() = id);
CREATE POLICY "own wallets"        ON wallets                FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own transactions"   ON transactions           FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own settlements"    ON settlements            FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own disbursements"  ON disbursements          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own beneficiaries"  ON beneficiaries          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own payment_links"  ON payment_links          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own webhooks"       ON webhook_history        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own webhook_configs" ON webhook_configs       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own api_keys"       ON api_keys               FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own ip_whitelist"   ON ip_whitelist           FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own notifications"  ON notifications          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own settings"       ON user_settings          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own verif_sub"      ON verification_submissions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own verif_docs"     ON verification_documents FOR ALL USING (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════
-- ALTER TABLE SCRIPTS — run these if tables already exist
-- (use instead of the CREATE TABLE statements above for live DBs)
-- ════════════════════════════════════════════════════════════════

-- profiles additions
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_number      TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tax_id         TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS disable_reason TEXT;

-- wallets unique constraint (for Zimbabwe dual-wallet support)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wallets_user_id_currency_key'
  ) THEN
    ALTER TABLE wallets ADD CONSTRAINT wallets_user_id_currency_key UNIQUE (user_id, currency);
  END IF;
END $$;

-- beneficiaries additions
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS network TEXT;

-- notifications: rename read → is_read (run only if migrating existing data)
-- Option A: add is_read alongside read
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
-- Option B (destructive): run only if column "read" exists and "is_read" does not:
-- ALTER TABLE notifications RENAME COLUMN read TO is_read;

-- verification_submissions additions
ALTER TABLE verification_submissions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE verification_submissions ADD COLUMN IF NOT EXISTS document_count   INTEGER DEFAULT 0;

-- verification_documents additions
ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS file_path        TEXT;
ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS upload_status    TEXT DEFAULT 'uploaded';
ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS reviewed_at      TIMESTAMPTZ;

-- Create audit_log if migrating from admin_audit
CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   TEXT DEFAULT 'admin',
  action     TEXT NOT NULL,
  target_id  TEXT,
  detail     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════════
-- SUPABASE STORAGE — KYC Documents bucket
-- Run this AFTER creating the bucket named "kyc-documents" in
-- Supabase → Storage → New Bucket (set to Private)
-- ════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "upload own kyc docs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "read own kyc docs" ON storage.objects FOR SELECT
  USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ════════════════════════════════════════════════════════════════
-- SUPPORTED CURRENCIES
--   ZMW  — Zambian Kwacha      (Zambia)
--   USD  — US Dollar           (Zimbabwe, primary)
--   ZiG  — Zimbabwe Gold       (Zimbabwe, secondary — launched 2024)
--   NAD  — Namibian Dollar     (Namibia)
--   BWP  — Botswana Pula       (Botswana)
-- ════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════
-- DONE — 16 tables + RLS + storage + migration scripts
-- ════════════════════════════════════════════════════════════════

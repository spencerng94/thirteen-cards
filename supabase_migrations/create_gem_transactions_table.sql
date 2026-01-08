-- Create gem_transactions table to track all gem transactions
-- This table prevents double-counting by tracking provider_id (Stripe/RevenueCat transaction IDs)

CREATE TABLE IF NOT EXISTS gem_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Positive for additions, negative for deductions
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'spend', 'reward')),
  provider_id TEXT, -- Stripe payment_intent_id or RevenueCat transaction_id (for deduplication)
  provider TEXT CHECK (provider IN ('stripe', 'revenuecat', 'internal')), -- Payment provider
  metadata JSONB DEFAULT '{}', -- Additional metadata (pack_id, item_id, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_gem_transactions_user_id ON gem_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_gem_transactions_provider_id ON gem_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_gem_transactions_created_at ON gem_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gem_transactions_type ON gem_transactions(transaction_type);

-- Unique constraint to prevent duplicate transactions from same provider
-- This ensures we don't credit the same Stripe/RevenueCat transaction twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_gem_transactions_provider_unique 
  ON gem_transactions(provider_id) 
  WHERE provider_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE gem_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own transactions
CREATE POLICY "Users can view their own gem transactions"
  ON gem_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Only system (via RPC functions or webhooks) can insert transactions
-- Users cannot directly create transactions
CREATE POLICY "System can insert gem transactions"
  ON gem_transactions
  FOR INSERT
  WITH CHECK (false); -- Block all direct inserts, only allow via RPC/webhook

-- Policy: No updates or deletes allowed (transactions are immutable)
CREATE POLICY "No updates to gem transactions"
  ON gem_transactions
  FOR UPDATE
  USING (false);

CREATE POLICY "No deletes to gem transactions"
  ON gem_transactions
  FOR DELETE
  USING (false);

-- Add comment for documentation
COMMENT ON TABLE gem_transactions IS 
  'Tracks all gem transactions (purchases, spends, rewards). provider_id prevents double-counting from payment providers.';

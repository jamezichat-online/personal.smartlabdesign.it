-- Indici per la lettura del workspace. Idempotente e sicuro su un database esistente.
-- Applicare con: npm run migrate:indexes (richiede wrangler autenticato sul proprio Cloudflare).
CREATE INDEX IF NOT EXISTS idx_records_kind_updated ON records(kind, updated DESC);
CREATE INDEX IF NOT EXISTS idx_sync_runs_captured ON sync_runs(captured DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
CREATE INDEX IF NOT EXISTS idx_login_limits_until ON login_limits(until);

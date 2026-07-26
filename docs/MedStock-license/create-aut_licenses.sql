CREATE TABLE IF NOT EXISTS aut_licenses (
  id BIGSERIAL PRIMARY KEY,
  license_key VARCHAR(19) NOT NULL UNIQUE,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aut_licenses_active ON aut_licenses(is_active, expires_at);

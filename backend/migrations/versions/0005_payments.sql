-- Up Migration

-- Phase 6: the plan (pricing lives in the DB, FR-P-04/05) and payments.
-- All money is BIGINT paise (DR-01). ₹3,499 = 349900.

CREATE TABLE plans (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    mrp_paise   BIGINT      NOT NULL CHECK (mrp_paise > 0),
    price_paise BIGINT      NOT NULL CHECK (price_paise > 0),
    currency    TEXT        NOT NULL DEFAULT 'INR',
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exactly one plan can be active at a time.
CREATE UNIQUE INDEX plans_one_active_idx ON plans (is_active) WHERE is_active;

CREATE TABLE payments (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    plan_id             UUID        NOT NULL REFERENCES plans (id) ON DELETE RESTRICT,
    -- UNIQUE is what makes double-crediting impossible (DR-07): verify and the
    -- webhook can both fire, but there is only one row to move to 'paid'.
    razorpay_order_id   TEXT        NOT NULL UNIQUE,
    razorpay_payment_id TEXT,
    amount_paise        BIGINT      NOT NULL,
    currency            TEXT        NOT NULL DEFAULT 'INR',
    -- Only created -> paid or created -> failed (FR-P-13).
    status              TEXT        NOT NULL DEFAULT 'created'
                        CHECK (status IN ('created', 'paid', 'failed')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX payments_user_idx ON payments (user_id);

-- Down Migration

DROP TABLE payments;
DROP TABLE plans;

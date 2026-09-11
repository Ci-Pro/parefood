-- ==========================================
-- PareFood Database Migration
-- 0006_payment_finance.sql
-- Payment, Proof & Refund Schema
-- ==========================================

-- ==========================================
-- FINANCE DOMAIN
-- ==========================================

-- Payment transactions (one per order, server-created)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    method VARCHAR(50) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    provider VARCHAR(50) NOT NULL DEFAULT 'manual',
    provider_reference VARCHAR(100),
    idempotency_key VARCHAR(150) NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_removed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_payment_tx_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_payment_tx_customer FOREIGN KEY (customer_id) REFERENCES profiles (id),
    CONSTRAINT uq_payment_tx_order UNIQUE (order_id),
    CONSTRAINT uq_payment_tx_idempotency UNIQUE (idempotency_key),
    CONSTRAINT chk_payment_tx_method CHECK (method IN ('cash', 'bank_transfer', 'qris', 'virtual_account', 'ewallet')),
    CONSTRAINT chk_payment_tx_status CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED')),
    CONSTRAINT chk_payment_tx_amount CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_order ON payment_transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_customer ON payment_transactions (customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON payment_transactions (status);

-- Payment events (immutable append-only log of transaction lifecycle)
CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_payment_event_tx FOREIGN KEY (transaction_id) REFERENCES payment_transactions (id),
    CONSTRAINT chk_payment_event_type CHECK (event_type IN ('created', 'confirmed', 'failed', 'refunded', 'cancelled', 'webhook_received'))
);

CREATE INDEX IF NOT EXISTS idx_payment_event_tx ON payment_events (transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_event_created ON payment_events (created_at);

-- Payment proofs (proof image for manual/offline confirmation)
CREATE TABLE IF NOT EXISTS payment_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL,
    order_id UUID NOT NULL,
    profile_id UUID NOT NULL,
    image_url TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_proof_tx FOREIGN KEY (transaction_id) REFERENCES payment_transactions (id),
    CONSTRAINT fk_proof_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_proof_profile FOREIGN KEY (profile_id) REFERENCES profiles (id)
);

CREATE INDEX IF NOT EXISTS idx_proof_tx ON payment_proofs (transaction_id);
CREATE INDEX IF NOT EXISTS idx_proof_order ON payment_proofs (order_id);

-- Refunds (requested against orders)
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'REQUESTED',
    requested_by UUID,
    approved_by UUID,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_refund_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_refund_requested_by FOREIGN KEY (requested_by) REFERENCES profiles (id),
    CONSTRAINT fk_refund_approved_by FOREIGN KEY (approved_by) REFERENCES profiles (id),
    CONSTRAINT chk_refund_status CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSED')),
    CONSTRAINT chk_refund_amount CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_refund_order ON refunds (order_id);
CREATE INDEX IF NOT EXISTS idx_refund_status ON refunds (status);

-- ==========================================
-- ENABLE RLS
-- ==========================================

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Payment transactions: read via order access (customer, merchant, admin).
-- Writes are server-side (service role bypasses RLS).
CREATE POLICY payment_transactions_select ON payment_transactions
    FOR SELECT USING (
        order_id IN (SELECT id FROM orders WHERE
            customer_id = auth.uid() OR
            merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid()) OR
            merchant_id IN (SELECT merchant_id FROM merchant_staff WHERE profile_id = auth.uid()) OR
            get_claim(auth.uid(), 'role') IN ('admin_operations', 'admin_support', 'admin_finance', 'super_admin')
        )
    );

-- Payment events: read via order access
CREATE POLICY payment_events_select ON payment_events
    FOR SELECT USING (
        transaction_id IN (
            SELECT pt.id FROM payment_transactions pt
            WHERE pt.order_id IN (SELECT id FROM orders WHERE
                customer_id = auth.uid() OR
                merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid()) OR
                merchant_id IN (SELECT merchant_id FROM merchant_staff WHERE profile_id = auth.uid()) OR
                get_claim(auth.uid(), 'role') IN ('admin_operations', 'admin_support', 'admin_finance', 'super_admin')
            )
        )
    );

-- Payment proofs: upload own proof, read via order access
CREATE POLICY payment_proofs_insert_own ON payment_proofs
    FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY payment_proofs_select ON payment_proofs
    FOR SELECT USING (
        profile_id = auth.uid() OR
        order_id IN (SELECT id FROM orders WHERE
            merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid()) OR
            get_claim(auth.uid(), 'role') IN ('admin_operations', 'admin_support', 'admin_finance', 'super_admin')
        )
    );

-- Refunds: read via order access
CREATE POLICY refunds_select ON refunds
    FOR SELECT USING (
        order_id IN (SELECT id FROM orders WHERE
            customer_id = auth.uid() OR
            merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid()) OR
            get_claim(auth.uid(), 'role') IN ('admin_operations', 'admin_support', 'admin_finance', 'super_admin')
        )
    );
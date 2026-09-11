-- ==========================================
-- PareFood Database Migration
-- 0009_finance.sql
-- Merchant / Driver / Platform earnings &
-- settlement ledger
-- ==========================================

-- ==========================================
-- SETTLEMENTS (created first; earnings FK here)
-- ==========================================

CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_number VARCHAR(30) NOT NULL UNIQUE,
    party_type VARCHAR(10) NOT NULL,
    party_id UUID NOT NULL,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    gross NUMERIC(12, 2) NOT NULL DEFAULT 0,
    adjustments NUMERIC(12, 2) NOT NULL DEFAULT 0,
    fees NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_settlement_type CHECK (party_type IN ('merchant', 'driver')),
    CONSTRAINT chk_settlement_status CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'CANCELLED')),
    CONSTRAINT fk_settlement_approved_by FOREIGN KEY (approved_by) REFERENCES profiles (id)
);

CREATE INDEX IF NOT EXISTS idx_settlement_party ON settlements (party_type, party_id);
CREATE INDEX IF NOT EXISTS idx_settlement_status ON settlements (status);

-- ==========================================
-- MERCHANT EARNINGS (per completed order)
-- gross = food value paid to merchant
-- ==========================================

CREATE TABLE IF NOT EXISTS merchant_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    merchant_id UUID NOT NULL,
    gross_amount NUMERIC(12, 2) NOT NULL,
    adjustments NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    settlement_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_merchant_earning_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_merchant_earning_merchant FOREIGN KEY (merchant_id) REFERENCES merchants (id),
    CONSTRAINT fk_merchant_earning_settlement FOREIGN KEY (settlement_id) REFERENCES settlements (id),
    CONSTRAINT uq_merchant_earning_order UNIQUE (order_id),
    CONSTRAINT chk_merchant_earning_status CHECK (status IN ('PENDING', 'CLEARED', 'PAID'))
);

CREATE INDEX IF NOT EXISTS idx_merchant_earning_merchant ON merchant_earnings (merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_merchant_earning_settlement ON merchant_earnings (settlement_id);

-- ==========================================
-- DRIVER EARNINGS (per completed delivery)
-- gross = delivery fee paid to driver
-- ==========================================

CREATE TABLE IF NOT EXISTS driver_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID NOT NULL,
    order_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    gross_amount NUMERIC(12, 2) NOT NULL,
    adjustments NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    settlement_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_driver_earning_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries (id),
    CONSTRAINT fk_driver_earning_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_driver_earning_driver FOREIGN KEY (driver_id) REFERENCES profiles (id),
    CONSTRAINT fk_driver_earning_settlement FOREIGN KEY (settlement_id) REFERENCES settlements (id),
    CONSTRAINT uq_driver_earning_delivery UNIQUE (delivery_id),
    CONSTRAINT uq_driver_earning_order UNIQUE (order_id),
    CONSTRAINT chk_driver_earning_status CHECK (status IN ('PENDING', 'CLEARED', 'PAID'))
);

CREATE INDEX IF NOT EXISTS idx_driver_earning_driver ON driver_earnings (driver_id, status);
CREATE INDEX IF NOT EXISTS idx_driver_earning_settlement ON driver_earnings (settlement_id);

-- ==========================================
-- PLATFORM EARNINGS (per completed order)
-- gross = service fee (+ tax) kept by PareFood
-- ==========================================

CREATE TABLE IF NOT EXISTS platform_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    gross_amount NUMERIC(12, 2) NOT NULL,
    net_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_platform_earning_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT uq_platform_earning_order UNIQUE (order_id)
);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_earnings ENABLE ROW LEVEL SECURITY;

-- Merchant owner can read their own earnings & settlements
CREATE POLICY merchant_earnings_read_owner ON merchant_earnings
    FOR SELECT USING (
        merchant_id IN (SELECT m.id FROM merchants m WHERE m.owner_id = auth.uid())
    );

CREATE POLICY settlements_read_merchant ON settlements
    FOR SELECT USING (
        party_type = 'merchant'
        AND party_id IN (SELECT m.id FROM merchants m WHERE m.owner_id = auth.uid())
    );

-- Driver can read their own earnings & settlements
CREATE POLICY driver_earnings_read_own ON driver_earnings
    FOR SELECT USING (driver_id = auth.uid());

CREATE POLICY settlements_read_driver ON settlements
    FOR SELECT USING (
        party_type = 'driver'
        AND party_id IN (SELECT d.id FROM drivers d WHERE d.profile_id = auth.uid())
    );

-- Admins can read & manage everything finance-related
CREATE POLICY finance_admin_all ON merchant_earnings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin_operations', 'super_admin')
        )
    );

CREATE POLICY finance_admin_driver ON driver_earnings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin_operations', 'super_admin')
        )
    );

CREATE POLICY finance_admin_platform ON platform_earnings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin_operations', 'super_admin')
        )
    );

CREATE POLICY finance_admin_settlement ON settlements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin_operations', 'super_admin')
        )
    );
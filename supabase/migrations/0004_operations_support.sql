-- ==========================================
-- PareFood Database Migration
-- 0004_operations_support.sql
-- Promotions, Drivers, Deliveries, Support
-- ==========================================

-- ==========================================
-- FIX: Add is_removed to carts & cart_items
-- (Backend queries filter by is_removed)
-- ==========================================

ALTER TABLE carts ADD COLUMN IF NOT EXISTS is_removed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS is_removed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_cart_profile_active ON carts (profile_id) WHERE is_removed = FALSE;
CREATE INDEX IF NOT EXISTS idx_cart_items_active ON cart_items (cart_id) WHERE is_removed = FALSE;

-- ==========================================
-- PROMOTIONS DOMAIN
-- ==========================================

CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
    discount_value NUMERIC(12, 2) NOT NULL,
    max_discount NUMERIC(12, 2),
    min_order NUMERIC(12, 2),
    scope_type VARCHAR(20) NOT NULL DEFAULT 'all',
    scope_id UUID,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    usage_limit INTEGER,
    per_customer_limit INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_removed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_promo_discount_type CHECK (discount_type IN ('fixed', 'percentage')),
    CONSTRAINT chk_promo_scope CHECK (scope_type IN ('all', 'merchant'))
);

CREATE INDEX IF NOT EXISTS idx_promo_code ON promotions (code);
CREATE INDEX IF NOT EXISTS idx_promo_active ON promotions (is_active) WHERE is_removed = FALSE;
CREATE INDEX IF NOT EXISTS idx_promo_valid ON promotions (valid_from, valid_until);

-- Deferred FK: orders.promotion_id → promotions.id
-- (orders created in 0003 without this FK; safe to add now)
ALTER TABLE orders
    ADD CONSTRAINT fk_order_promotion
    FOREIGN KEY (promotion_id) REFERENCES promotions (id);

-- Promotion redemptions table
CREATE TABLE IF NOT EXISTS promotion_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_id UUID NOT NULL,
    user_id UUID NOT NULL,
    order_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_redemption_promo FOREIGN KEY (promotion_id) REFERENCES promotions (id),
    CONSTRAINT fk_redemption_user FOREIGN KEY (user_id) REFERENCES profiles (id)
);

CREATE INDEX IF NOT EXISTS idx_redemption_promo ON promotion_redemptions (promotion_id);
CREATE INDEX IF NOT EXISTS idx_redemption_user ON promotion_redemptions (user_id);

-- ==========================================
-- DRIVERS DOMAIN
-- ==========================================

CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    vehicle_type VARCHAR(50),
    vehicle_plate VARCHAR(20),
    current_latitude NUMERIC(10, 7),
    current_longitude NUMERIC(10, 7),
    last_location_at TIMESTAMPTZ,
    total_deliveries INTEGER NOT NULL DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_removed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_driver_profile FOREIGN KEY (profile_id) REFERENCES profiles (id),
    CONSTRAINT chk_driver_status CHECK (status IN ('pending', 'approved', 'offline', 'online', 'suspended'))
);

CREATE INDEX IF NOT EXISTS idx_drivers_profile ON drivers (profile_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers (status);
CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers (current_latitude, current_longitude) WHERE status = 'online';

-- ==========================================
-- DELIVERIES DOMAIN
-- ==========================================

CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OFFERED',
    assigned_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    delivery_proof_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_delivery_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_delivery_driver FOREIGN KEY (driver_id) REFERENCES profiles (id),
    CONSTRAINT chk_delivery_status CHECK (status IN (
        'OFFERED', 'ACCEPTED', 'PICKING_UP', 'PICKED_UP', 'ON_DELIVERY', 'DELIVERED', 'CANCELLED'
    ))
);

CREATE INDEX IF NOT EXISTS idx_delivery_order ON deliveries (order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_driver ON deliveries (driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status ON deliveries (status);

-- ==========================================
-- SUPPORT DOMAIN
-- ==========================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(20) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    subject VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    related_order_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_removed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_ticket_user FOREIGN KEY (user_id) REFERENCES profiles (id),
    CONSTRAINT fk_ticket_order FOREIGN KEY (related_order_id) REFERENCES orders (id),
    CONSTRAINT chk_ticket_status CHECK (status IN ('OPEN', 'IN_PROGRESS', 'REOPENED', 'CLOSED'))
);

CREATE INDEX IF NOT EXISTS idx_ticket_user ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_status ON support_tickets (status);

CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL,
    user_id UUID NOT NULL,
    message TEXT NOT NULL,
    is_from_support BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_msg_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets (id),
    CONSTRAINT fk_msg_user FOREIGN KEY (user_id) REFERENCES profiles (id)
);

CREATE INDEX IF NOT EXISTS idx_msg_ticket ON support_messages (ticket_id);

-- ==========================================
-- ENABLE RLS
-- ==========================================

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Promotions: read for all authenticated, write for admin
CREATE POLICY promotions_read_active ON promotions FOR SELECT USING (is_active AND NOT is_removed);
CREATE POLICY promotions_write_admin ON promotions
    FOR ALL USING (get_claim(auth.uid(), 'role') IN ('admin_operations', 'admin_finance', 'super_admin'));

-- Promotion redemptions: users see own, admin sees all
CREATE POLICY redemptions_select_own ON promotion_redemptions FOR SELECT
    USING (user_id = auth.uid() OR get_claim(auth.uid(), 'role') IN ('admin_operations', 'super_admin'));

-- Drivers: read for admin, own profile for driver
CREATE POLICY drivers_select ON drivers FOR SELECT
    USING (profile_id = auth.uid() OR get_claim(auth.uid(), 'role') IN ('admin_operations', 'super_admin'));
CREATE POLICY drivers_update_own ON drivers FOR UPDATE
    USING (profile_id = auth.uid());

-- Deliveries: driver sees own, merchant sees assigned, admin sees all
CREATE POLICY deliveries_select ON deliveries FOR SELECT USING (
    driver_id = auth.uid() OR
    order_id IN (SELECT id FROM orders WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())) OR
    get_claim(auth.uid(), 'role') IN ('admin_operations', 'admin_support', 'super_admin')
);

-- Support tickets: own or admin
CREATE POLICY tickets_select ON support_tickets FOR SELECT USING (
    user_id = auth.uid() OR
    get_claim(auth.uid(), 'role') IN ('admin_support', 'super_admin')
);
CREATE POLICY tickets_insert_own ON support_tickets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY tickets_update_own ON support_tickets FOR UPDATE
    USING (user_id = auth.uid() OR get_claim(auth.uid(), 'role') IN ('admin_support', 'super_admin'));

-- Support messages: read via ticket access, insert own ticket
CREATE POLICY messages_select ON support_messages FOR SELECT USING (
    ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid()) OR
    get_claim(auth.uid(), 'role') IN ('admin_support', 'super_admin')
);
CREATE POLICY messages_insert_own ON support_messages FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    ticket_id IN (SELECT id FROM support_tickets WHERE user_id = auth.uid() AND status != 'CLOSED')
);

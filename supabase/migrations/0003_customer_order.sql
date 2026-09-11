-- ==========================================
-- PareFood Database Migration
-- 0003_customer_order.sql
-- Customer & Order Schema
-- ==========================================

-- ==========================================
-- CUSTOMER DOMAIN
-- ==========================================

-- Customer profiles table
CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL,
    preferred_payment VARCHAR(50) DEFAULT 'cash',
    is_member BOOLEAN NOT NULL DEFAULT FALSE,
    member_since TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_removed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_cust_profile FOREIGN KEY (profile_id) REFERENCES profiles (id),
    CONSTRAINT uq_cust_profile UNIQUE (profile_id)
);

-- Customer addresses table
CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL,
    label VARCHAR(50) NOT NULL DEFAULT 'Rumah',
    address VARCHAR(255) NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    note VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_removed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_addr_profile FOREIGN KEY (profile_id) REFERENCES profiles (id)
);

CREATE INDEX IF NOT EXISTS idx_addr_profile ON customer_addresses (profile_id);

-- Carts table
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL,
    merchant_id UUID NOT NULL,
    session_token VARCHAR(100),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_cart_profile FOREIGN KEY (profile_id) REFERENCES profiles (id),
    CONSTRAINT fk_cart_merchant FOREIGN KEY (merchant_id) REFERENCES merchants (id),
    CONSTRAINT uq_cart_profile_merchant UNIQUE (profile_id, merchant_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_profile ON carts (profile_id);

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL,
    menu_item_id UUID NOT NULL,
    variant_id UUID,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL,
    notes VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_cart_item_cart FOREIGN KEY (cart_id) REFERENCES carts (id),
    CONSTRAINT fk_cart_item_menu FOREIGN KEY (menu_item_id) REFERENCES menu_items (id),
    CONSTRAINT fk_cart_item_variant FOREIGN KEY (variant_id) REFERENCES menu_variants (id),
    CONSTRAINT chk_cart_qty CHECK (quantity > 0)
);

-- Cart item addon options table
CREATE TABLE IF NOT EXISTS cart_item_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_item_id UUID NOT NULL,
    addon_id UUID NOT NULL,
    addon_option_id UUID NOT NULL,
    option_name VARCHAR(100) NOT NULL,
    option_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_cart_addon_item FOREIGN KEY (cart_item_id) REFERENCES cart_items (id),
    CONSTRAINT fk_cart_addon_addon FOREIGN KEY (addon_id) REFERENCES menu_addons (id),
    CONSTRAINT fk_cart_addon_option FOREIGN KEY (addon_option_id) REFERENCES menu_addon_options (id)
);

-- ==========================================
-- ORDERS DOMAIN
-- ==========================================

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(20) NOT NULL UNIQUE,
    customer_id UUID NOT NULL,
    merchant_id UUID NOT NULL,
    address_id UUID NOT NULL,
    delivery_address VARCHAR(255),
    delivery_latitude NUMERIC(10, 7),
    delivery_longitude NUMERIC(10, 7),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    service_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    payment_method VARCHAR(50),
    promotion_id UUID,
    notes TEXT,
    customer_notes TEXT,
    estimated_time_minutes INTEGER,
    accepted_at TIMESTAMPTZ,
    prepared_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    cancelled_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_removed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_order_customer FOREIGN KEY (customer_id) REFERENCES profiles (id),
    CONSTRAINT fk_order_merchant FOREIGN KEY (merchant_id) REFERENCES merchants (id),
    CONSTRAINT fk_order_address FOREIGN KEY (address_id) REFERENCES customer_addresses (id),
    CONSTRAINT fk_order_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES profiles (id),
    CONSTRAINT chk_order_status CHECK (status IN (
        'PENDING_PAYMENT', 'PAID', 'WAITING_MERCHANT', 'MERCHANT_ACCEPTED',
        'PREPARING', 'READY_FOR_PICKUP', 'DRIVER_ASSIGNED', 'DRIVER_PICKING_UP',
        'PICKED_UP', 'ON_DELIVERY', 'DELIVERED', 'COMPLETED',
        'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_MERCHANT', 'CANCELLED_BY_ADMIN',
        'REJECTED_BY_MERCHANT', 'REFUND_PENDING', 'REFUNDED', 'FAILED'
    )),
    CONSTRAINT chk_order_payment_status CHECK (payment_status IN ('UNPAID', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_order_customer ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_order_merchant ON orders (merchant_id);
CREATE INDEX IF NOT EXISTS idx_order_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_order_created ON orders (created_at);

-- Order items table (with price snapshots)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    menu_item_id UUID,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    unit_price NUMERIC(12, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    variant_name VARCHAR(100),
    variant_price NUMERIC(12, 2) DEFAULT 0,
    notes VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT chk_order_item_qty CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_item_order ON order_items (order_id);

-- Order item options (addons snapshot)
CREATE TABLE IF NOT EXISTS order_item_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL,
    addon_name VARCHAR(100) NOT NULL,
    option_name VARCHAR(100) NOT NULL,
    option_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_order_item_option FOREIGN KEY (order_item_id) REFERENCES order_items (id)
);

-- Order status history table
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    actor_id UUID,
    actor_role VARCHAR(50),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_status_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_status_actor FOREIGN KEY (actor_id) REFERENCES profiles (id)
);

CREATE INDEX IF NOT EXISTS idx_status_order ON order_status_history (order_id);
CREATE INDEX IF NOT EXISTS idx_status_created ON order_status_history (created_at);

-- ==========================================
-- ENABLE RLS
-- ==========================================

ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_item_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Customer profiles: own only
CREATE POLICY customer_profiles_own ON customer_profiles
    FOR ALL USING (profile_id = auth.uid());

-- Customer addresses: own only
CREATE POLICY customer_addresses_own ON customer_addresses
    FOR ALL USING (profile_id = auth.uid());

-- Carts: own only
CREATE POLICY carts_own ON carts
    FOR ALL USING (profile_id = auth.uid());

-- Cart items: via own cart
CREATE POLICY cart_items_own ON cart_items
    FOR ALL USING (cart_id IN (SELECT id FROM carts WHERE profile_id = auth.uid()));

-- Cart addons: via own cart item
CREATE POLICY cart_item_addons_own ON cart_item_addons
    FOR ALL USING (cart_item_id IN (SELECT id FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE profile_id = auth.uid())));

-- Orders: customer owns orders, merchant sees own orders, driver sees assigned, admin sees all
CREATE POLICY orders_select ON orders FOR SELECT USING (
    customer_id = auth.uid() OR
    merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid()) OR
    merchant_id IN (SELECT merchant_id FROM merchant_staff WHERE profile_id = auth.uid()) OR
    get_claim(auth.uid(), 'role') IN ('admin_operations', 'admin_support', 'admin_finance', 'super_admin')
);

-- Order items: via order access
CREATE POLICY order_items_select ON order_items FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE
        customer_id = auth.uid() OR
        merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid()) OR
        get_claim(auth.uid(), 'role') IN ('admin_operations', 'admin_support', 'admin_finance', 'super_admin'))
);

-- Order options: via order item access
CREATE POLICY order_item_options_select ON order_item_options FOR SELECT USING (
    order_item_id IN (SELECT id FROM order_items WHERE
        order_id IN (SELECT id FROM orders WHERE
            customer_id = auth.uid() OR
            merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid()) OR
            get_claim(auth.uid(), 'role') IN ('admin_operations', 'admin_support', 'admin_finance', 'super_admin'))
    )
);

-- Order status history: read via order access
CREATE POLICY order_status_history_select ON order_status_history FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE
        customer_id = auth.uid() OR
        merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid()) OR
        merchant_id IN (SELECT merchant_id FROM merchant_staff WHERE profile_id = auth.uid()) OR
        get_claim(auth.uid(), 'role') IN ('admin_operations', 'admin_support', 'admin_finance', 'super_admin'))
);
-- ==========================================
-- PareFood Database Migration
-- 0002_merchant_catalog.sql
-- Merchant & Catalog Schema
-- ==========================================

-- ==========================================
-- MERCHANT DOMAIN
-- ==========================================

-- Merchants table
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    address VARCHAR(255) NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    phone VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    is_open BOOLEAN NOT NULL DEFAULT FALSE,
    min_order NUMERIC(12, 2) NOT NULL DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    is_removed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_merchants_owner FOREIGN KEY (owner_id) REFERENCES profiles (id),
    CONSTRAINT fk_merchants_approved_by FOREIGN KEY (approved_by) REFERENCES profiles (id),
    CONSTRAINT chk_merchant_status CHECK (status IN ('pending', 'approved', 'rejected', 'suspended', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_merchants_owner ON merchants (owner_id);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants (status);
CREATE INDEX IF NOT EXISTS idx_merchants_is_open ON merchants (is_open);

-- Merchant staff table
CREATE TABLE IF NOT EXISTS merchant_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL,
    profile_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'staff',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_removed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_staff_merchant FOREIGN KEY (merchant_id) REFERENCES merchants (id),
    CONSTRAINT fk_staff_profile FOREIGN KEY (profile_id) REFERENCES profiles (id),
    CONSTRAINT uq_staff_merchant_profile UNIQUE (merchant_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_merchant ON merchant_staff (merchant_id);
CREATE INDEX IF NOT EXISTS idx_staff_profile ON merchant_staff (profile_id);

-- Merchant operating hours table
CREATE TABLE IF NOT EXISTS merchant_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL DEFAULT 0,
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_hours_merchant FOREIGN KEY (merchant_id) REFERENCES merchants (id),
    CONSTRAINT chk_hours_day CHECK (day_of_week BETWEEN 0 AND 6)
);

CREATE INDEX IF NOT EXISTS idx_hours_merchant ON merchant_hours (merchant_id);

-- Merchant categories table
CREATE TABLE IF NOT EXISTS merchant_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icon_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_removed BOOLEAN NOT NULL DEFAULT FALSE
);

-- Merchant category mapping
CREATE TABLE IF NOT EXISTS merchant_category_map (
    merchant_id UUID NOT NULL,
    category_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (merchant_id, category_id),
    CONSTRAINT fk_map_merchant FOREIGN KEY (merchant_id) REFERENCES merchants (id),
    CONSTRAINT fk_map_category FOREIGN KEY (category_id) REFERENCES merchant_categories (id)
);

-- ==========================================
-- CATALOG DOMAIN
-- ==========================================

-- Menu categories table
CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_removed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_menu_cat_merchant FOREIGN KEY (merchant_id) REFERENCES merchants (id),
    CONSTRAINT uq_menu_cat_slug UNIQUE (merchant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_menu_cat_merchant ON menu_categories (merchant_id);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL,
    category_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL,
    old_price NUMERIC(12, 2),
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    preparation_time_minutes INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_removed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_menu_item_merchant FOREIGN KEY (merchant_id) REFERENCES merchants (id),
    CONSTRAINT fk_menu_item_category FOREIGN KEY (category_id) REFERENCES menu_categories (id),
    CONSTRAINT chk_menu_item_price CHECK (price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_menu_item_merchant ON menu_items (merchant_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_category ON menu_items (category_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_available ON menu_items (is_available);

-- Menu variants table (e.g., Size, Spice level)
CREATE TABLE IF NOT EXISTS menu_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_variant_item FOREIGN KEY (menu_item_id) REFERENCES menu_items (id)
);

CREATE INDEX IF NOT EXISTS idx_variant_item ON menu_variants (menu_item_id);

-- Menu addons table (e.g., Extra sambal, Extra cheese)
CREATE TABLE IF NOT EXISTS menu_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    min_selection INTEGER NOT NULL DEFAULT 0,
    max_selection INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_addon_merchant FOREIGN KEY (merchant_id) REFERENCES merchants (id)
);

CREATE INDEX IF NOT EXISTS idx_addon_merchant ON menu_addons (merchant_id);

-- Menu item addon options table
CREATE TABLE IF NOT EXISTS menu_addon_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    addon_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_addon_option FOREIGN KEY (addon_id) REFERENCES menu_addons (id)
);

CREATE INDEX IF NOT EXISTS idx_addon_option_addon ON menu_addon_options (addon_id);

-- Menu item addons mapping
CREATE TABLE IF NOT EXISTS menu_item_addons (
    menu_item_id UUID NOT NULL,
    addon_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (menu_item_id, addon_id),
    CONSTRAINT fk_item_addons_item FOREIGN KEY (menu_item_id) REFERENCES menu_items (id),
    CONSTRAINT fk_item_addons_addon FOREIGN KEY (addon_id) REFERENCES menu_addons (id)
);

-- ==========================================
-- ENABLE RLS
-- ==========================================

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_category_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_addon_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_addons ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Merchants: read for all authenticated users, write for owner/admin
CREATE POLICY merchants_read_all ON merchants FOR SELECT USING (true);
CREATE POLICY merchants_write_owner ON merchants
    FOR ALL USING (owner_id = auth.uid() OR get_claim(auth.uid(), 'role') IN ('admin_operations', 'super_admin'));

-- Merchant staff: read for staff/admin, write for owner/admin
CREATE POLICY merchant_staff_read_member ON merchant_staff FOR SELECT
    USING (profile_id = auth.uid() OR
           merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid()) OR
           get_claim(auth.uid(), 'role') IN ('admin_operations', 'super_admin'));
CREATE POLICY merchant_staff_write_owner ON merchant_staff FOR ALL
    USING (merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid()) OR
           get_claim(auth.uid(), 'role') IN ('admin_operations', 'super_admin'));

-- Merchant hours: read for all, write for merchant owner/admin
CREATE POLICY merchant_hours_read_all ON merchant_hours FOR SELECT USING (true);
CREATE POLICY merchant_hours_write_owner ON merchant_hours FOR ALL
    USING (merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid()) OR
           merchant_id IN (SELECT merchant_id FROM merchant_staff WHERE profile_id = auth.uid()) OR
           get_claim(auth.uid(), 'role') IN ('admin_operations', 'super_admin'));

-- Merchant categories: read all, write admin only
CREATE POLICY merchant_categories_read_all ON merchant_categories FOR SELECT USING (true);
CREATE POLICY merchant_categories_write_admin ON merchant_categories FOR ALL
    USING (get_claim(auth.uid(), 'role') IN ('admin_operations', 'super_admin'));

-- Category map: read all
CREATE POLICY merchant_category_map_read_all ON merchant_category_map FOR SELECT USING (true);

-- Menu categories: read all, write merchant owner/admin
CREATE POLICY menu_categories_read_all ON menu_categories FOR SELECT USING (true);
CREATE POLICY menu_categories_write_owner ON menu_categories FOR ALL
    USING (merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid()) OR
           merchant_id IN (SELECT merchant_id FROM merchant_staff WHERE profile_id = auth.uid()) OR
           get_claim(auth.uid(), 'role') IN ('admin_operations', 'super_admin'));

-- Menu items: read all, write merchant owner/admin
CREATE POLICY menu_items_read_all ON menu_items FOR SELECT USING (true);
CREATE POLICY menu_items_write_owner ON menu_items FOR ALL
    USING (merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid()) OR
           merchant_id IN (SELECT merchant_id FROM merchant_staff WHERE profile_id = auth.uid()) OR
           get_claim(auth.uid(), 'role') IN ('admin_operations', 'super_admin'));

-- Menu variants: read all, write merchant owner/admin
CREATE POLICY menu_variants_read_all ON menu_variants FOR SELECT USING (true);
CREATE POLICY menu_variants_write_owner ON menu_variants FOR ALL
    USING (menu_item_id IN (SELECT id FROM menu_items WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())) OR
           get_claim(auth.uid(), 'role') IN ('admin_operations', 'super_admin'));

-- Menu addons: read all, write merchant owner/admin
CREATE POLICY menu_addons_read_all ON menu_addons FOR SELECT USING (true);
CREATE POLICY menu_addons_write_owner ON menu_addons FOR ALL
    USING (merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid()) OR
           merchant_id IN (SELECT merchant_id FROM merchant_staff WHERE profile_id = auth.uid()) OR
           get_claim(auth.uid(), 'role') IN ('admin_operations', 'super_admin'));

-- Menu addon options: read all, write merchant owner/admin
CREATE POLICY menu_addon_options_read_all ON menu_addon_options FOR SELECT USING (true);
CREATE POLICY menu_addon_options_write_owner ON menu_addon_options FOR ALL
    USING (addon_id IN (SELECT id FROM menu_addons WHERE merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())) OR
           get_claim(auth.uid(), 'role') IN ('admin_operations', 'super_admin'));

-- Menu item addons: read all
CREATE POLICY menu_item_addons_read_all ON menu_item_addons FOR SELECT USING (true);
-- ==========================================
-- PareFood Database Migration
-- 0001_initial_schema.sql
-- Identity & Core Schema
-- ==========================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- IDENTITY DOMAIN
-- ==========================================

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_removed BOOLEAN NOT NULL DEFAULT FALSE
);

-- Insert default roles
INSERT INTO roles (code, name, description) VALUES
    ('customer', 'Customer', 'Pengguna yang membeli makanan'),
    ('merchant_owner', 'Merchant Owner', 'Pemilik bisnis/restoran/warung'),
    ('merchant_staff', 'Merchant Staff', 'Staf yang mengelola pesanan merchant'),
    ('driver', 'Driver', 'Pengemudi yang mengantar pesanan'),
    ('admin_operations', 'Admin Operations', 'Admin operasional platform'),
    ('admin_finance', 'Admin Finance', 'Admin keuangan dan settlement'),
    ('admin_support', 'Admin Support', 'Admin dukungan pengguna'),
    ('super_admin', 'Super Admin', 'Administrator tertinggi sistem')
ON CONFLICT (code) DO NOTHING;

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    password_hash TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'customer',
    avatar_url TEXT,
    bio TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_removed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_profiles_role FOREIGN KEY (role) REFERENCES roles (code)
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles (is_active);

-- ==========================================
-- ENGAGEMENT DOMAIN
-- ==========================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_removed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES profiles (id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (is_read);

-- ==========================================
-- OPERATIONS DOMAIN
-- ==========================================

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID,
    actor_role VARCHAR(50),
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES profiles (id)
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at);

-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_settings_updated_by FOREIGN KEY (updated_by) REFERENCES profiles (id)
);

-- ==========================================
-- ENABLE RLS
-- ==========================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Profiles: users can read their own profile
CREATE POLICY profiles_select_own ON profiles
    FOR SELECT USING (id = auth.uid() OR is_removed = FALSE AND role = 'super_admin');

CREATE POLICY profiles_update_own ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Roles: read-only for all authenticated, write for super_admin
CREATE POLICY roles_read_all ON roles
    FOR SELECT USING (true);

CREATE POLICY roles_write_admin ON roles
    FOR ALL USING (get_claim(auth.uid(), 'role') = 'super_admin');

-- Notifications: only recipients can read, only owner can mark read
CREATE POLICY notifications_read_own ON notifications
    FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY notifications_update_own ON notifications
    FOR UPDATE USING (recipient_id = auth.uid());

-- Audit logs: read-only for admins
CREATE POLICY audit_logs_read_admin ON audit_logs
    FOR SELECT USING (get_claim(auth.uid(), 'role') IN ('admin_operations', 'admin_finance', 'admin_support', 'super_admin'));

-- App settings: read for all authenticated, write for super_admin only
CREATE POLICY app_settings_read_all ON app_settings
    FOR SELECT USING (is_removed = FALSE OR true);

CREATE POLICY app_settings_write_admin ON app_settings
    FOR ALL USING (get_claim(auth.uid(), 'role') = 'super_admin');
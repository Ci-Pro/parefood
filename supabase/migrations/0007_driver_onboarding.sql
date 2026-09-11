-- ==========================================
-- PareFood Database Migration
-- 0007_driver_onboarding.sql
-- Driver Approval & Documents
-- ==========================================

-- Approval tracking for drivers (used by Admin approval flow)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS approved_by UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_driver_approved_by'
    ) THEN
        ALTER TABLE drivers
            ADD CONSTRAINT fk_driver_approved_by FOREIGN KEY (approved_by) REFERENCES profiles (id);
    END IF;
END
$$;

-- Driver identity documents (onboarding evidence)
CREATE TABLE IF NOT EXISTS driver_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL,
    doc_type VARCHAR(50) NOT NULL,
    image_url TEXT NOT NULL,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    verified_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_removed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_doc_driver FOREIGN KEY (driver_id) REFERENCES drivers (id),
    CONSTRAINT fk_doc_verified_by FOREIGN KEY (verified_by) REFERENCES profiles (id),
    CONSTRAINT chk_doc_type CHECK (doc_type IN ('ktp', 'sim', 'stnk', 'vehicle_photo', 'other')),
    CONSTRAINT chk_doc_status CHECK (status IN ('pending', 'verified', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_doc_driver ON driver_documents (driver_id);
CREATE INDEX IF NOT EXISTS idx_doc_status ON driver_documents (status) WHERE is_removed = FALSE;

-- ==========================================
-- ENABLE RLS
-- ==========================================

ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Driver documents: own upload/read, admin sees all
CREATE POLICY docs_select_own ON driver_documents FOR SELECT USING (
    driver_id IN (SELECT id FROM drivers WHERE profile_id = auth.uid()) OR
    get_claim(auth.uid(), 'role') IN ('admin_operations', 'admin_support', 'super_admin')
);

CREATE POLICY docs_insert_own ON driver_documents FOR INSERT WITH CHECK (
    driver_id IN (SELECT id FROM drivers WHERE profile_id = auth.uid())
);
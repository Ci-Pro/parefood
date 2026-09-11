-- ==========================================
-- PareFood Database Migration
-- 0008_reviews.sql
-- Reviews & Ratings Schema
-- ==========================================

-- Reviews table (one review per completed order)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    merchant_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    admin_reply TEXT,
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_removed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_review_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_review_merchant FOREIGN KEY (merchant_id) REFERENCES merchants (id),
    CONSTRAINT fk_review_customer FOREIGN KEY (customer_id) REFERENCES profiles (id),
    CONSTRAINT uq_review_order UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_review_merchant ON reviews (merchant_id);
CREATE INDEX IF NOT EXISTS idx_review_customer ON reviews (customer_id);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Reviews are public (shown on merchant page)
CREATE POLICY reviews_read_all ON reviews
    FOR SELECT USING (NOT is_removed);

-- Customer can post a review for their own order
CREATE POLICY reviews_insert_own ON reviews
    FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Customer can edit/remove their own review
CREATE POLICY reviews_update_own ON reviews
    FOR UPDATE USING (customer_id = auth.uid());

-- Merchant owner can reply to a review on their merchant
CREATE POLICY reviews_reply_merchant ON reviews
    FOR UPDATE USING (
        merchant_id IN (SELECT m.id FROM merchants m WHERE m.owner_id = auth.uid())
    );

-- Admins can moderate reviews
CREATE POLICY reviews_moderate_admin ON reviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin_operations', 'super_admin')
        )
    );
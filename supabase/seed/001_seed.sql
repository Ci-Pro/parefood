-- ==========================================
-- PareFood Database Seed
-- ==========================================

-- Seed merchant categories
INSERT INTO merchant_categories (name, slug, sort_order, is_active) VALUES
    ('Makanan', 'makanan', 1, TRUE),
    ('Minuman', 'minuman', 2, TRUE),
    ('Kopi', 'kopi', 3, TRUE),
    ('Nasi & Lauk', 'nasi-lauk', 4, TRUE),
    ('Mie & Pasta', 'mie-pasta', 5, TRUE),
    ('Makanan Ringan', 'makanan-ringan', 6, TRUE),
    ('Dessert', 'dessert', 7, TRUE),
    ('Sayur & Buah', 'sayur-buah', 8, TRUE),
    ('Kesehatan', 'kesehatan', 9, TRUE),
    ('Lainnya', 'lainnya', 10, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Seed initial app settings
INSERT INTO app_settings (key, value, description) VALUES
    ('app.name', '{"value": "PareFood"}', 'Application display name'),
    ('app.currency', '{"value": "IDR"}', 'Default currency'),
    ('app.language', '{"value": "id"}', 'Default language'),
    ('app.timezone', '{"value": "Asia/Jakarta"}', 'Default timezone'),
    ('app.service_area', '{"name": "Kecamatan Pare", "center_lat": -7.7677, "center_lng": 112.2019, "radius_km": 10}', 'Primary service area'),
    ('delivery.base_fee', '{"value": 5000}', 'Base delivery fee in IDR'),
    ('delivery.fee_per_km', '{"value": 2000}', 'Per kilometer delivery fee'),
    ('delivery.min_order_distance', '{"value": 500}', 'Minimum delivery distance in meters'),
    ('delivery.max_order_distance', '{"value": 10000}', 'Maximum delivery distance in meters'),
    ('service_fee.percentage', '{"value": 5}', 'Service fee percentage'),
    ('service_fee.minimum', '{"value": 1000}', 'Minimum service fee in IDR'),
    ('service_fee.maximum', '{"value": 10000}', 'Maximum service fee in IDR'),
    ('tax.enabled', '{"value": false}', 'Whether tax is enabled'),
    ('order.cancellation_window_minutes', '{"value": 10}', 'Time window to cancel before restrictions'),
    ('order.auto_accept_seconds', '{"value": 60}', 'Auto-accept timeout for merchant'),
    ('order.auto_assign_seconds', '{"value": 0}', 'Auto-assign timeout for driver (0 = manual)')
ON CONFLICT (key) DO NOTHING;

-- Seed a demo admin super_admin profile
-- Note: password should be changed after first login
-- Default: admin@parefood.id / Admin@123456
INSERT INTO profiles (email, name, role, password_hash, is_active, is_verified) VALUES
    (
        'admin@parefood.id',
        'Super Admin PareFood',
        'super_admin',
        '$2b$10$KEM5nQ3HKQaGVZqIeA1X9eBhPd9K7QmCwjmn28rM8cMZ8ZqDwaHNK',
        TRUE,
        TRUE
    )
ON CONFLICT (email) DO NOTHING;

-- Seed a demo customer
-- Default: customer@parefood.id / User@123456
INSERT INTO profiles (email, name, phone, role, password_hash, is_active, is_verified) VALUES
    (
        'customer@parefood.id',
        'Demo Customer',
        '081234567890',
        'customer',
        '$2b$10$KEM5nQ3HKQaGVZqIeA1X9eBhPd9K7QmCwjmn28rM8cMZ8ZqDwaHNK',
        TRUE,
        TRUE
    )
ON CONFLICT (email) DO NOTHING;
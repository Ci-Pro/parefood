// ==========================================
// PareFood Backend — Production Configuration
// ==========================================

// Core settings
CONF.name = 'parefood-backend';
CONF.version = '1.0.0';
CONF.port = process.env.PORT || 8000;
CONF.debug = false;
CONF.ip = '0.0.0.0';

// Database (Supabase PostgreSQL)
CONF.database = process.env.SUPABASE_DATABASE_URL || '';

// JWT Authentication
CONF.jwt_secret = process.env.JWT_SECRET || '';
CONF.jwt_expires_in = process.env.JWT_EXPIRES_IN || '7d';

// CORS
CONF.cors = process.env.CORS_ORIGIN || '';

// Supabase
CONF.supabase_url = process.env.SUPABASE_URL || '';
CONF.supabase_anon_key = process.env.SUPABASE_ANON_KEY || '';
CONF.supabase_service_key = process.env.SUPABASE_SERVICE_KEY || '';

// Rate limiting
CONF.rate_limit_window = 15 * 60 * 1000;
CONF.rate_limit_max = 60;

// Image upload
CONF.max_upload_size = 10 * 1024 * 1024; // 10MB

// Payment provider config (Phase 6)
CONF.payment_provider = process.env.PAYMENT_PROVIDER || 'manual';
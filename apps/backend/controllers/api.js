// ==========================================
// PareFood Backend — API Routes
// Version: v1
// ==========================================

exports.install = function() {
    const authRoles = ['customer', 'merchant_owner', 'merchant_staff', 'driver', 'admin_operations', 'admin_finance', 'admin_support', 'super_admin'];

    // ---------------------------
    // AUTH
    // ---------------------------
    ROUTE('POST   /api/v1/auth/register/{role}    --> Auth/register');
    ROUTE('POST   /api/v1/auth/login              --> Auth/login');
    ROUTE('POST   /api/v1/auth/refresh            --> Auth/refresh');
    ROUTE('GET    /api/v1/auth/me                 --> Auth/me', FUNC.auth());
    ROUTE('POST   /api/v1/auth/logout             --> Auth/logout', FUNC.auth());

    // ---------------------------
    // PROFILES
    // ---------------------------
    ROUTE('GET    /api/v1/profiles/me             --> Profiles/read', FUNC.auth());
    ROUTE('PUT    /api/v1/profiles/me             --> Profiles/update', FUNC.auth());

    // ---------------------------
    // HEALTH & INFO
    // ---------------------------
    ROUTE('GET    /api/v1/version                 --> default/health');
};
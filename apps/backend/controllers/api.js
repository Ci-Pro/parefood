// ==========================================
// PareFood Backend — API Routes
// Version: v1
// ==========================================

exports.install = function() {

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
    // CUSTOMER ADDRESSES
    // ---------------------------
    ROUTE('GET    /api/v1/addresses               --> Addresses/list', FUNC.auth(['customer']));
    ROUTE('POST   /api/v1/addresses               --> Addresses/create', FUNC.auth(['customer']));
    ROUTE('GET    /api/v1/addresses/{id}          --> Addresses/read', FUNC.auth(['customer']));
    ROUTE('PUT    /api/v1/addresses/{id}          --> Addresses/update', FUNC.auth(['customer']));
    ROUTE('DELETE /api/v1/addresses/{id}          --> Addresses/remove', FUNC.auth(['customer']));

    // ---------------------------
    // MERCHANTS (public)
    // ---------------------------
    ROUTE('GET    /api/v1/merchants               --> Merchants/list');
    ROUTE('GET    /api/v1/merchants/{slug}        --> Merchants/read');
    ROUTE('GET    /api/v1/merchants/{id}/menu     --> Merchants/menu');
    ROUTE('GET    /api/v1/merchants/menu-items/{id} --> Merchants/readItem');
    ROUTE('GET    /api/v1/merchant-categories     --> MerchantCategories/list');

    // ---------------------------
    // MERCHANTS (authenticated - owner)
    // ---------------------------
    ROUTE('GET    /api/v1/my/merchant             --> MyMerchant/read', FUNC.auth(['merchant_owner']));
    ROUTE('PUT    /api/v1/my/merchant             --> MyMerchant/update', FUNC.auth(['merchant_owner']));
    ROUTE('POST   /api/v1/my/merchant/apply       --> MyMerchant/apply', FUNC.auth(['merchant_owner']));
    ROUTE('PUT    /api/v1/my/merchant/hours       --> MyMerchant/updateHours', FUNC.auth(['merchant_owner']));
    ROUTE('GET    /api/v1/my/merchant/orders      --> MyMerchantOrders/list', FUNC.auth(['merchant_owner', 'merchant_staff']));
    ROUTE('GET    /api/v1/my/merchant/orders/{id} --> MyMerchantOrders/read', FUNC.auth(['merchant_owner', 'merchant_staff']));
    ROUTE('POST   /api/v1/my/merchant/orders/{id}/accept   --> MyMerchantOrders/accept', FUNC.auth(['merchant_owner', 'merchant_staff']));
    ROUTE('POST   /api/v1/my/merchant/orders/{id}/reject   --> MyMerchantOrders/reject', FUNC.auth(['merchant_owner', 'merchant_staff']));
    ROUTE('POST   /api/v1/my/merchant/orders/{id}/preparing --> MyMerchantOrders/preparing', FUNC.auth(['merchant_owner', 'merchant_staff']));
    ROUTE('POST   /api/v1/my/merchant/orders/{id}/ready    --> MyMerchantOrders/ready', FUNC.auth(['merchant_owner', 'merchant_staff']));

    // ---------------------------
    // MENU MANAGEMENT (merchant)
    // ---------------------------
    ROUTE('GET    /api/v1/my/menu/categories      --> MyMenuCategories/list', FUNC.auth(['merchant_owner', 'merchant_staff']));
    ROUTE('POST   /api/v1/my/menu/categories      --> MyMenuCategories/create', FUNC.auth(['merchant_owner']));
    ROUTE('PUT    /api/v1/my/menu/categories/{id} --> MyMenuCategories/update', FUNC.auth(['merchant_owner']));
    ROUTE('DELETE /api/v1/my/menu/categories/{id} --> MyMenuCategories/remove', FUNC.auth(['merchant_owner']));

    ROUTE('GET    /api/v1/my/menu/items           --> MyMenuItems/list', FUNC.auth(['merchant_owner', 'merchant_staff']));
    ROUTE('POST   /api/v1/my/menu/items           --> MyMenuItems/create', FUNC.auth(['merchant_owner']));
    ROUTE('GET    /api/v1/my/menu/items/{id}      --> MyMenuItems/read', FUNC.auth(['merchant_owner']));
    ROUTE('PUT    /api/v1/my/menu/items/{id}      --> MyMenuItems/update', FUNC.auth(['merchant_owner']));
    ROUTE('DELETE /api/v1/my/menu/items/{id}      --> MyMenuItems/remove', FUNC.auth(['merchant_owner']));
    ROUTE('PUT    /api/v1/my/menu/items/{id}/availability --> MyMenuItems/toggleAvailability', FUNC.auth(['merchant_owner', 'merchant_staff']));

    // ---------------------------
    // CART
    // ---------------------------
    ROUTE('GET    /api/v1/cart                    --> Cart/read', FUNC.auth(['customer']));
    ROUTE('POST   /api/v1/cart/items              --> Cart/addItem', FUNC.auth(['customer']));
    ROUTE('PUT    /api/v1/cart/items/{id}         --> Cart/updateItem', FUNC.auth(['customer']));
    ROUTE('DELETE /api/v1/cart/items/{id}         --> Cart/removeItem', FUNC.auth(['customer']));
    ROUTE('DELETE /api/v1/cart                    --> Cart/clear', FUNC.auth(['customer']));

    // ---------------------------
    // ORDERS
    // ---------------------------
    ROUTE('POST   /api/v1/orders/checkout         --> Orders/checkout', FUNC.auth(['customer']));
    ROUTE('GET    /api/v1/orders/mine             --> Orders/mine', FUNC.auth(['customer']));
    ROUTE('GET    /api/v1/orders/{id}             --> Orders/read', FUNC.auth());
    ROUTE('POST   /api/v1/orders/{id}/cancel      --> Orders/cancel', FUNC.auth(['customer']));
    ROUTE('POST   /api/v1/orders/{id}/confirm-delivery --> Orders/confirmDelivery', FUNC.auth(['customer']));

    // ---------------------------
    // DRIVER
    // ---------------------------
    ROUTE('GET    /api/v1/driver/available        --> DriverOrders/available', FUNC.auth(['driver']));
    ROUTE('POST   /api/v1/driver/orders/{id}/accept  --> DriverOrders/accept', FUNC.auth(['driver']));
    ROUTE('POST   /api/v1/driver/orders/{id}/pickup  --> DriverOrders/pickup', FUNC.auth(['driver']));
    ROUTE('POST   /api/v1/driver/orders/{id}/deliver --> DriverOrders/deliver', FUNC.auth(['driver']));
    ROUTE('GET    /api/v1/driver/mine             --> DriverOrders/mine', FUNC.auth(['driver']));
    ROUTE('PUT    /api/v1/driver/location         --> DriverLocation/update', FUNC.auth(['driver']));
    ROUTE('PUT    /api/v1/driver/status           --> DriverStatus/update', FUNC.auth(['driver']));

    // ---------------------------
    // PROMOTIONS (public)
    // ---------------------------
    ROUTE('GET    /api/v1/promotions              --> Promotions/list');
    ROUTE('POST   /api/v1/promotions/apply        --> Promotions/apply', FUNC.auth(['customer']));
    ROUTE('POST   /api/v1/promotions/validate     --> Promotions/validate', FUNC.auth(['customer']));

    // ---------------------------
    // NOTIFICATIONS
    // ---------------------------
    ROUTE('GET    /api/v1/notifications            --> Notifications/list', FUNC.auth());
    ROUTE('PUT    /api/v1/notifications/{id}/read  --> Notifications/markRead', FUNC.auth());

    // ---------------------------
    // SUPPORT
    // ---------------------------
    ROUTE('POST   /api/v1/support/tickets         --> Support/createTicket', FUNC.auth());
    ROUTE('GET    /api/v1/support/tickets          --> Support/listTickets', FUNC.auth());
    ROUTE('GET    /api/v1/support/tickets/{id}     --> Support/readTicket', FUNC.auth());
    ROUTE('POST   /api/v1/support/tickets/{id}/reply --> Support/replyTicket', FUNC.auth());

    // ---------------------------
    // ADMIN
    // ---------------------------
    ROUTE('GET    /api/v1/admin/dashboard          --> Admin/dashboard', FUNC.auth(['admin_operations', 'super_admin']));
    ROUTE('GET    /api/v1/admin/merchants/pending   --> Admin/merchantsPending', FUNC.auth(['admin_operations', 'super_admin']));
    ROUTE('POST   /api/v1/admin/merchants/{id}/approve --> Admin/approveMerchant', FUNC.auth(['admin_operations', 'super_admin']));
    ROUTE('POST   /api/v1/admin/merchants/{id}/reject  --> Admin/rejectMerchant', FUNC.auth(['admin_operations', 'super_admin']));
    ROUTE('GET    /api/v1/admin/orders              --> Admin/orders', FUNC.auth(['admin_operations', 'super_admin']));
    ROUTE('GET    /api/v1/admin/users               --> Admin/users', FUNC.auth(['admin_operations', 'super_admin']));

    // ---------------------------
    // HEALTH & INFO
    // ---------------------------
    ROUTE('GET    /api/v1/version                 --> default/health');
};
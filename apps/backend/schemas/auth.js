// ==========================================
// PareFood Backend — Auth Schema
// ==========================================

NEWSCHEMA('Auth', function(schema) {

    // Register a new user with a specific role
    schema.action('register', {
        name: 'Register new user',
        params: '*role:String',
        input: '*name:String,*email:Email,*password:String(*min:8),phone:String',
        action: function($, model) {
            var role = $.params.role;
            var validRoles = ['customer', 'driver', 'merchant_owner'];

            if (validRoles.indexOf(role) === -1) {
                return $.invalid(400, 'Invalid role. Must be one of: ' + validRoles.join(', '));
            }

            var self = this;

            // Check existing email
            DB().one('profiles')
                .fields('id')
                .where('email', model.email.toLowerCase())
                .where('is_removed', false)
                .callback(function(err, existingUser) {
                    if (existingUser) {
                        return $.invalid(409, 'Email already registered');
                    }

                    var id = FUNC.generateId();
                    var now = new Date();

                    var profile = {
                        id: id,
                        name: model.name,
                        email: model.email.toLowerCase(),
                        phone: model.phone || null,
                        password_hash: FUNC.hashPassword(model.password),
                        role: role,
                        is_active: true,
                        is_verified: false,
                        created_at: now,
                        updated_at: now,
                        is_removed: false
                    };

                    DB().insert('profiles', profile)
                        .callback(function(err, response) {
                            if (err) {
                                return $.invalid(500, 'Failed to register user');
                            }

                            FUNC.audit($, {
                                entity_type: 'profiles',
                                entity_id: id,
                                action: 'register',
                                metadata: { role: role }
                            });

                            // Generate JWT token
                            var token = FUNC.tokenSign({
                                id: id,
                                role: role,
                                email: profile.email
                            });

                            $.callback({
                                token: token,
                                user: {
                                    id: id,
                                    name: profile.name,
                                    email: profile.email,
                                    role: role
                                }
                            });
                        });
                });
        }
    });

    // Login with email & password
    schema.action('login', {
        name: 'Login user',
        input: '*email:Email,*password:String',
        action: function($, model) {
            DB().one('profiles')
                .fields('id,name,email,phone,password_hash,role,is_active')
                .where('email', model.email.toLowerCase())
                .where('is_removed', false)
                .callback(function(err, user) {
                    if (!user) {
                        return $.invalid(401, 'Invalid email or password');
                    }

                    if (!user.is_active) {
                        return $.invalid(403, 'Account is disabled');
                    }

                    if (!FUNC.verifyPassword(model.password, user.password_hash)) {
                        return $.invalid(401, 'Invalid email or password');
                    }

                    FUNC.audit($, {
                        entity_type: 'profiles',
                        entity_id: user.id,
                        action: 'login'
                    });

                    var token = FUNC.tokenSign({
                        id: user.id,
                        role: user.role,
                        email: user.email
                    });

                    $.callback({
                        token: token,
                        user: {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            phone: user.phone,
                            role: user.role
                        }
                    });
                });
        }
    });

    // Refresh token
    schema.action('refresh', {
        name: 'Refresh token',
        action: function($) {
            var authHeader = $.req.headers.authorization || '';
            var token = authHeader.replace('Bearer ', '');

            if (!token) {
                return $.invalid(401, 'Token required');
            }

            var decoded = FUNC.tokenVerify(token);
            if (!decoded) {
                return $.invalid(401, 'Invalid or expired token');
            }

            var newToken = FUNC.tokenSign({
                id: decoded.sub,
                role: decoded.role,
                email: decoded.email
            });

            $.callback({ token: newToken });
        }
    });

    // Get current user info
    schema.action('me', {
        name: 'Get current user',
        action: function($) {
            var userId = $.user.sub;

            DB().one('profiles')
                .fields('id,name,email,phone,role,is_active,is_verified,created_at')
                .where('id', userId)
                .where('is_removed', false)
                .callback(function(err, user) {
                    if (!user) {
                        return $.invalid(404, 'User not found');
                    }
                    $.callback({ user: user });
                });
        }
    });

    // Logout
    schema.action('logout', {
        name: 'Logout user',
        action: function($) {
            FUNC.audit($, {
                entity_type: 'profiles',
                entity_id: $.user.sub,
                action: 'logout'
            });
            $.success();
        }
    });
});
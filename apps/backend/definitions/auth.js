// ==========================================
// PareFood Backend — Authentication & JWT
// ==========================================

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Token generation
FUNC.tokenSign = function(user) {
    const payload = {
        sub: user.id,
        role: user.role,
        email: user.email
    };
    return jwt.sign(payload, CONF.jwt_secret, { expiresIn: CONF.jwt_expires_in });
};

// Token verification
FUNC.tokenVerify = function(token) {
    try {
        return jwt.verify(token, CONF.jwt_secret);
    } catch (err) {
        return null;
    }
};

// Password hashing
FUNC.hashPassword = function(password) {
    return bcrypt.hashSync(password, 10);
};

// Password verification
FUNC.verifyPassword = function(password, hash) {
    return bcrypt.compareSync(password, hash);
};

// Authentication middleware
FUNC.auth = function(roles) {
    return function() {
        var self = this;
        var token = self.headers.authorization ? self.headers.authorization.replace('Bearer ', '') : null;

        if (!token) {
            return self.invalid(401, 'Unauthorized');
        }

        var decoded = FUNC.tokenVerify(token);
        if (!decoded) {
            return self.invalid(401, 'Invalid token');
        }

        // Check role if specified
        if (roles && roles.length > 0 && roles.indexOf(decoded.role) === -1) {
            return self.invalid(403, 'Forbidden');
        }

        self.user = decoded;
        self.$done();
    };
};

// Middleware for optional auth (public routes with user context)
FUNC.authOptional = function() {
    return function() {
        var self = this;
        var token = self.headers.authorization ? self.headers.authorization.replace('Bearer ', '') : null;

        if (token) {
            var decoded = FUNC.tokenVerify(token);
            if (decoded) {
                self.user = decoded;
            }
        }
        self.$done();
    };
};
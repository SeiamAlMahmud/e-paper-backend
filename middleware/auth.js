const { verifyToken } = require('../utils/auth');
const User = require('../models/user.model');
const connectDB = require('../config/db');

/**
 * Middleware to authenticate requests
 * Verifies JWT token and attaches user to request
 */
async function authenticate(req, res, next) {
    try {
        await connectDB();

        // Get token from cookie or Authorization header
        let token = req.cookies?.token;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided',
            });
        }

        // Verify token
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token',
            });
        }

        // Get user
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found',
            });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Authentication failed',
        });
    }
}

/**
 * Check if user has required role
 */
function hasRole(userRole, allowedRoles) {
    return allowedRoles.includes(userRole);
}

/**
 * Check if user has required permission
 */
function hasPermission(user, permissionKey) {
    if (user.role === 'admin') return true;
    if (!user.permissions) return false;
    return user.permissions[permissionKey] === true;
}

/**
 * Middleware to check roles
 */
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
            });
        }

        if (!hasRole(req.user.role, allowedRoles)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Insufficient role',
            });
        }

        next();
    };
}

/**
 * Middleware to check permissions
 */
function requirePermission(permissionKey) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
            });
        }

        if (!hasPermission(req.user, permissionKey)) {
            return res.status(403).json({
                success: false,
                error: `Forbidden: Missing ${permissionKey} permission`,
            });
        }

        next();
    };
}

module.exports = {
    authenticate,
    hasRole,
    hasPermission,
    requireRole,
    requirePermission,
};

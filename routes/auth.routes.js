const express = require('express');
const router = express.Router();
const connectDB = require('../config/db');
const User = require('../models/user.model');
const { comparePassword, generateToken, sanitizeUser, hashPassword } = require('../utils/auth');

/**
 * POST /api/auth/login - User login
 */
router.post('/login', async (req, res) => {
    try {
        await connectDB();

        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required',
            });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
            });
        }

        // Check password
        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
            });
        }

        // Generate token
        const token = generateToken(user._id.toString());

        // Return user data (without password) and token
        const sanitizedUser = sanitizeUser(user);

        return res.status(200).json({
            success: true,
            data: {
                user: sanitizedUser,
                token,
            },
            message: 'Login successful',
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * POST /api/auth/register - User registration
 */
router.post('/register', async (req, res) => {
    try {
        await connectDB();

        const { email, password, name, role } = req.body;

        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and name are required',
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User already exists',
            });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user
        const user = await User.create({
            email: email.toLowerCase(),
            password: hashedPassword,
            name,
            role: role || 'editor',
        });

        // Generate token
        const token = generateToken(user._id.toString());

        // Return sanitized user
        const sanitizedUser = sanitizeUser(user);

        return res.status(201).json({
            success: true,
            data: {
                user: sanitizedUser,
                token,
            },
            message: 'Registration successful',
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * POST /api/auth/logout - User logout
 */
router.post('/logout', (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'Logout successful',
    });
});

/**
 * GET /api/auth/me - Get current user
 */
router.get('/me', async (req, res) => {
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
                error: 'Not authenticated',
            });
        }

        // Verify token
        const { verifyToken } = require('../utils/auth');
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
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        return res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

module.exports = router;

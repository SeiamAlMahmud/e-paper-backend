const express = require('express');
const router = express.Router();
const connectDB = require('../config/db');
const User = require('../models/user.model');
const { authenticate, hasRole, hasPermission } = require('../middleware/auth');
const { hashPassword } = require('../utils/auth');

/**
 * GET /api/users - List all users
 */
router.get('/', authenticate, async (req, res) => {
    try {
        await connectDB();

        if (!hasPermission(req.user, 'users_view')) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: Missing users_view permission',
            });
        }

        const users = await User.find().select('-password').sort({ createdAt: -1 });

        return res.json({
            success: true,
            data: users,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * POST /api/users - Create user
 */
router.post('/', authenticate, async (req, res) => {
    try {
        await connectDB();

        if (!hasPermission(req.user, 'users_create')) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: Missing users_create permission',
            });
        }

        const { email, password, name, role, permissions } = req.body;

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
            permissions: permissions || {},
        });

        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;

        return res.status(201).json({
            success: true,
            data: userWithoutPassword,
            message: 'User created successfully',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * PATCH /api/users/:id - Update user
 */
router.patch('/:id', authenticate, async (req, res) => {
    try {
        await connectDB();

        if (!hasPermission(req.user, 'users_edit')) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: Missing users_edit permission',
            });
        }

        const updates = req.body;

        // Don't allow password updates through this endpoint
        delete updates.password;

        const user = await User.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        }).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        return res.json({
            success: true,
            data: user,
            message: 'User updated successfully',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * DELETE /api/users/:id - Delete user
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        await connectDB();

        if (!hasPermission(req.user, 'users_delete')) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: Missing users_delete permission',
            });
        }

        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        return res.json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * PATCH /api/users/:id/password - Reset user password
 */
router.patch('/:id/password', authenticate, async (req, res) => {
    try {
        await connectDB();

        if (!hasPermission(req.user, 'users_passwordReset')) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: Missing users_passwordReset permission',
            });
        }

        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({
                success: false,
                error: 'New password is required',
            });
        }

        const hashedPassword = await hashPassword(newPassword);

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { password: hashedPassword },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        return res.json({
            success: true,
            data: user,
            message: 'Password reset successfully',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;

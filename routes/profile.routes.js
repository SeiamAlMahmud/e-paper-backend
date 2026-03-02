const express = require('express');
const router = express.Router();
const connectDB = require('../config/db');
const { authenticate, hasPermission } = require('../middleware/auth');
const { hashPassword } = require('../utils/auth');
const User = require('../models/user.model');
const { uploadSingle } = require('../middleware/upload');
const fs = require('fs').promises;
const path = require('path');

/**
 * PUT /api/profile - Update user profile
 */
router.put('/', authenticate, uploadSingle.single('image'), async (req, res) => {
    try {
        await connectDB();

        const updates = {};

        if (req.body.name) updates.name = req.body.name;
        if (req.body.email) updates.email = req.body.email.toLowerCase();

        // Handle password update
        if (req.body.password) {
            updates.password = await hashPassword(req.body.password);
        }

        // Handle image upload - either from file or URL
        if (req.file) {
            // File uploaded via multipart
            const buffer = req.file.buffer;
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const filename = `profile-${uniqueSuffix}.webp`;
            const uploadDir = path.join(process.cwd(), '../public/uploads/profiles');

            await fs.mkdir(uploadDir, { recursive: true });
            const filePath = path.join(uploadDir, filename);
            await fs.writeFile(filePath, buffer);

            updates.image = `/uploads/profiles/${filename}`;
        } else if (req.body.image) {
            // Image URL provided (already uploaded via /api/upload)
            updates.image = req.body.image;
        }

        const user = await User.findByIdAndUpdate(req.user._id, updates, {
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
            message: 'Profile updated successfully',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;

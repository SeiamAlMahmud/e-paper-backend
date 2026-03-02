const express = require('express');
const router = express.Router();
const connectDB = require('../config/db');
const Settings = require('../models/settings.model');
const { authenticate, hasPermission } = require('../middleware/auth');

/**
 * GET /api/settings - Get site settings
 */
router.get('/', async (req, res) => {
    try {
        await connectDB();

        let settings = await Settings.findOne();

        // Create default settings if none exist
        if (!settings) {
            settings = await Settings.create({
                siteTitle: 'My E-Paper',
                siteDescription: '',
                contact: { email: '', phone: '', address: '' },
                socials: {},
            });
        }

        return res.json({
            success: true,
            data: settings,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * PUT /api/settings - Update site settings
 */
router.put('/', authenticate, async (req, res) => {
    try {
        await connectDB();

        if (!hasPermission(req.user, 'settings_edit')) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: Missing settings_edit permission',
            });
        }

        let settings = await Settings.findOne();

        if (!settings) {
            settings = await Settings.create(req.body);
        } else {
            settings = await Settings.findByIdAndUpdate(settings._id, req.body, {
                new: true,
                runValidators: true,
            });
        }

        return res.json({
            success: true,
            data: settings,
            message: 'Settings updated successfully',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;

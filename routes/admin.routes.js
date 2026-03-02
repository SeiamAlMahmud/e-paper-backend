const express = require('express');
const router = express.Router();
const connectDB = require('../config/db');
const Edition = require('../models/edition.model');
const Page = require('../models/page.model');
const Article = require('../models/article.model');
const User = require('../models/user.model');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/admin/dashboard - Get dashboard statistics
 */
router.get('/dashboard', authenticate, async (req, res) => {
    try {
        await connectDB();

        const [totalEditions, totalPages, totalArticles, totalUsers, publishedEditions] =
            await Promise.all([
                Edition.countDocuments(),
                Page.countDocuments(),
                Article.countDocuments(),
                User.countDocuments(),
                Edition.countDocuments({ status: 'published' }),
            ]);

        // Get recent editions
        const recentEditions = await Edition.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('createdBy', 'name email');

        return res.json({
            success: true,
            data: {
                stats: {
                    totalEditions,
                    totalPages,
                    totalArticles,
                    totalUsers,
                    publishedEditions,
                },
                recentEditions,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;

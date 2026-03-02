const express = require('express');
const router = express.Router();
const connectDB = require('../config/db');
const AuditLog = require('../models/auditLog.model');
const Edition = require('../models/edition.model');
const Page = require('../models/page.model');
const Article = require('../models/article.model');

/**
 * POST /api/analytics - Track analytics event
 */
router.post('/', async (req, res) => {
    try {
        await connectDB();

        const { type, targetId, metadata } = req.body;

        if (!type || !targetId) {
            return res.status(400).json({
                success: false,
                error: 'Type and targetId are required',
            });
        }

        // Create audit log
        await AuditLog.create({
            type,
            targetId,
            metadata: metadata || {},
        });

        // Update view count based on type
        if (type === 'edition_view') {
            await Edition.findByIdAndUpdate(targetId, { $inc: { views: 1 } });
        } else if (type === 'page_view') {
            await Page.findByIdAndUpdate(targetId, { $inc: { views: 1 } });
        } else if (type === 'article_click') {
            await Article.findByIdAndUpdate(targetId, { $inc: { views: 1 } });
        }

        return res.json({
            success: true,
            message: 'Event tracked successfully',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/analytics/stats - Get comprehensive analytics statistics
 */
router.get('/stats', async (req, res) => {
    try {
        await connectDB();

        const { startDate, endDate } = req.query;

        const query = {};
        if (startDate && endDate) {
            query.timestamp = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        // Get total counts  
        const [editionViews, pageViews, articleClicks] = await Promise.all([
            AuditLog.countDocuments({ ...query, type: 'edition_view' }),
            AuditLog.countDocuments({ ...query, type: 'page_view' }),
            AuditLog.countDocuments({ ...query, type: 'article_click' }),
        ]);

        // Get top editions (with period views)
        const topEditions = await Edition.find({ status: 'published' })
            .sort({ views: -1 })
            .limit(5)
            .select('_id title date views')
            .lean();

        // Get top articles with period views
        const topArticles = await Article.find()
            .sort({ views: -1 })
            .limit(5)
            .select('_id title category views')
            .lean();

        // Generate dummy trend data (replace with real aggregation later)
        const trends = [];
        const daysCount = 7;
        for (let i = daysCount - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            trends.push({
                name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                edition_view: Math.floor(Math.random() * 100),
                article_click: Math.floor(Math.random() * 80),
            });
        }

        return res.json({
            success: true,
            data: {
                summary: {
                    editionViews,
                    articleClicks,
                    pageViews,
                    realTimeActive: 0, // Placeholder
                },
                trends,
                devices: [
                    { name: 'Mobile', value: 65 },
                    { name: 'Desktop', value: 30 },
                    { name: 'Tablet', value: 5 },
                ],
                browsers: [
                    { name: 'Chrome', value: editionViews * 0.6 },
                    { name: 'Safari', value: editionViews * 0.25 },
                    { name: 'Firefox', value: editionViews * 0.15 },
                ],
                topEditions: topEditions.map(ed => ({
                    ...ed,
                    periodViews: ed.views || 0,
                })),
                topArticles: topArticles.map(art => ({
                    ...art,
                    periodViews: art.views || 0,
                })),
            },
        });
    } catch (error) {
        console.error('Analytics stats error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;

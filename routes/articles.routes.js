const express = require('express');
const router = express.Router();
const connectDB = require('../config/db');
const Article = require('../models/article.model');
const Page = require('../models/page.model');
const Edition = require('../models/edition.model');
const { authenticate, requirePermission, hasPermission } = require('../middleware/auth');

/**
 * POST /api/articles - Create article
 */
router.post('/', authenticate, async (req, res) => {
    try {
        await connectDB();

        if (!hasPermission(req.user, 'articles_create')) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: Missing articles_create permission',
            });
        }

        const body = req.body;

        // Validate required fields
        if (!body.editionId || !body.startPage || !body.region || !body.category) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            });
        }

        const article = await Article.create({
            ...body,
            createdBy: req.user._id,
        });

        // Sync with Page model
        await Page.findByIdAndUpdate(body.startPage, {
            $addToSet: { articles: article._id },
        });

        return res.status(201).json({
            success: true,
            data: article,
        });
    } catch (error) {
        console.error('Create Article Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/articles - List articles with filters
 */
router.get('/', async (req, res) => {
    try {
        await connectDB();

        const { editionId, date, pageId, category, search, page = 1, limit = 10 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const query = {};

        // Filter by Date (Find Edition first)
        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);

            const edition = await Edition.findOne({
                date: {
                    $gte: startDate,
                    $lte: endDate,
                },
            });

            if (edition) {
                query.editionId = edition._id;
            } else {
                return res.json({
                    success: true,
                    data: [],
                    meta: { total: 0, page: parseInt(page), limit: parseInt(limit), totalPages: 0 },
                });
            }
        } else if (editionId) {
            query.editionId = editionId;
        }

        if (pageId) query.startPage = pageId;
        if (category && category !== 'all') query.category = category;
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const [articles, total] = await Promise.all([
            Article.find(query)
                .populate('startPage', 'pageNumber')
                .populate({ path: 'editionId', select: 'date' })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Article.countDocuments(query),
        ]);

        return res.json({
            success: true,
            data: articles,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/articles/:id - Get article by ID
 */
router.get('/:id', async (req, res) => {
    try {
        await connectDB();

        const article = await Article.findById(req.params.id)
            .populate('startPage')
            .populate('editionId')
            .populate('createdBy', 'name email');

        if (!article) {
            return res.status(404).json({
                success: false,
                error: 'Article not found',
            });
        }

        return res.json({
            success: true,
            data: article,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * PUT /api/articles/:id - Update article
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        await connectDB();

        if (!hasPermission(req.user, 'articles_edit')) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: Missing articles_edit permission',
            });
        }

        const article = await Article.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!article) {
            return res.status(404).json({
                success: false,
                error: 'Article not found',
            });
        }

        return res.json({
            success: true,
            data: article,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * DELETE /api/articles/:id - Delete article
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        await connectDB();

        if (!hasPermission(req.user, 'articles_delete')) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: Missing articles_delete permission',
            });
        }

        const article = await Article.findByIdAndDelete(req.params.id);

        if (!article) {
            return res.status(404).json({
                success: false,
                error: 'Article not found',
            });
        }

        // Remove from page
        await Page.findByIdAndUpdate(article.startPage, {
            $pull: { articles: article._id },
        });

        return res.json({
            success: true,
            message: 'Article deleted successfully',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;

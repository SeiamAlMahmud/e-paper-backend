const express = require('express');
const router = express.Router();
const connectDB = require('../config/db');
const Edition = require('../models/edition.model');
const Page = require('../models/page.model');
const Article = require('../models/article.model');
const { authenticate, hasRole, requireRole } = require('../middleware/auth');
const { resolveUploadUrlToPath } = require('../utils/storage');
const fs = require('fs').promises;

/**
 * GET /api/editions - List all editions with filters
 */
router.get('/', async (req, res) => {
    try {
        await connectDB();

        const { startDate, endDate, status, date, page = 1, limit = 20 } = req.query;

        // Build query
        const query = {};

        if (date) {
            const targetDate = new Date(date);
            const start = new Date(targetDate);
            start.setUTCHours(0, 0, 0, 0);
            const end = new Date(targetDate);
            end.setUTCHours(23, 59, 59, 999);
            query.date = { $gte: start, $lte: end };
        } else if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        if (status) {
            query.status = status;
        }

        // Count total documents
        const total = await Edition.countDocuments(query);

        // Fetch editions
        const editions = await Edition.find(query)
            .sort({ date: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .populate('createdBy', 'name email role')
            .lean();

        return res.json({
            success: true,
            data: editions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get editions error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * POST /api/editions - Create new edition
 */
router.post('/', authenticate, async (req, res) => {
    try {
        if (!hasRole(req.user.role, ['admin', 'editor', 'publisher', 'computer_operator'])) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized',
            });
        }

        await connectDB();

        const { date, title } = req.body;

        // Validation
        if (!date || !title) {
            return res.status(400).json({
                success: false,
                error: 'Date and title are required',
            });
        }

        // Check if edition for this date already exists
        const existingEdition = await Edition.findOne({ date: new Date(date) });

        if (existingEdition) {
            return res.status(409).json({
                success: false,
                error: 'Edition for this date already exists',
            });
        }

        // Create edition
        const edition = await Edition.create({
            date: new Date(date),
            title,
            totalPages: 0,
            pages: [],
            status: 'draft',
            createdBy: req.user._id,
        });

        await edition.populate('createdBy', 'name email role');

        return res.status(201).json({
            success: true,
            data: edition,
            message: 'Edition created successfully',
        });
    } catch (error) {
        console.error('Create edition error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/editions/:id - Get edition by ID
 */
router.get('/:id', async (req, res) => {
    try {
        await connectDB();

        const edition = await Edition.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('pages');

        if (!edition) {
            return res.status(404).json({
                success: false,
                error: 'Edition not found',
            });
        }

        // Fetch articles for this edition
        const articles = await Article.find({ editionId: req.params.id });

        const responseData = {
            ...edition.toObject(),
            articles,
        };

        return res.json({
            success: true,
            data: responseData,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * PATCH /api/editions/:id - Partial update edition
 */
router.patch('/:id', authenticate, async (req, res) => {
    try {
        await connectDB();

        if (!hasRole(req.user.role, ['admin', 'editor', 'publisher'])) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized',
            });
        }

        const edition = await Edition.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).populate('createdBy', 'name email');

        if (!edition) {
            return res.status(404).json({
                success: false,
                error: 'Edition not found',
            });
        }

        return res.json({
            success: true,
            data: edition,
            message: 'Edition updated successfully',
        });
    } catch (error) {
        console.error('Update Edition Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * DELETE /api/editions/:id - Delete edition
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        await connectDB();

        if (!hasRole(req.user.role, ['admin', 'editor'])) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized',
            });
        }

        const edition = await Edition.findById(req.params.id);

        if (!edition) {
            return res.status(404).json({
                success: false,
                error: 'Edition not found',
            });
        }

        // Cleanup Articles and their images
        const articles = await Article.find({ editionId: req.params.id });
        for (const article of articles) {
            if (article.images && article.images.length > 0) {
                for (const imgUrl of article.images) {
                    try {
                        const filePath = resolveUploadUrlToPath(imgUrl);
                        await fs.unlink(filePath).catch(() => { });
                    } catch (err) {
                        console.error(`Failed to delete article image: ${imgUrl}`, err);
                    }
                }
            }
        }
        await Article.deleteMany({ editionId: req.params.id });

        // Cleanup Pages and their images
        const pages = await Page.find({ editionId: req.params.id });
        for (const page of pages) {
            const filesToDelete = [page.imageUrl, page.thumbnailUrl];
            for (const fileUrl of filesToDelete) {
                if (fileUrl) {
                    try {
                        const filePath = resolveUploadUrlToPath(fileUrl);
                        await fs.unlink(filePath).catch(() => { });
                    } catch (err) {
                        console.error(`Failed to delete page file: ${fileUrl}`, err);
                    }
                }
            }
        }
        await Page.deleteMany({ editionId: req.params.id });

        // Delete the Edition
        await Edition.findByIdAndDelete(req.params.id);

        return res.json({
            success: true,
            message: 'Edition and all associated assets deleted successfully',
        });
    } catch (error) {
        console.error('Delete Edition Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * PUT /api/editions/:id/reorder - Reorder pages
 */
router.put('/:id/reorder', authenticate, async (req, res) => {
    try {
        await connectDB();

        const { pageIds } = req.body;

        if (!Array.isArray(pageIds)) {
            return res.status(400).json({
                success: false,
                error: 'pageIds must be an array',
            });
        }

        const edition = await Edition.findByIdAndUpdate(
            req.params.id,
            { pages: pageIds, totalPages: pageIds.length },
            { new: true }
        );

        if (!edition) {
            return res.status(404).json({
                success: false,
                error: 'Edition not found',
            });
        }

        return res.json({
            success: true,
            data: edition,
            message: 'Pages reordered successfully',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const connectDB = require('../config/db');
const Article = require('../models/article.model');
const Edition = require('../models/edition.model');

/**
 * GET /api/search - Search articles and editions
 */
router.get('/', async (req, res) => {
    try {
        await connectDB();

        const { q, type = 'all', limit = 10 } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required',
            });
        }

        const searchRegex = { $regex: q, $options: 'i' };
        const results = {};

        if (type === 'all' || type === 'articles') {
            results.articles = await Article.find({ title: searchRegex })
                .limit(parseInt(limit))
                .populate('editionId', 'date title')
                .select('title category excerpt editionId');
        }

        if (type === 'all' || type === 'editions') {
            results.editions = await Edition.find({ title: searchRegex })
                .limit(parseInt(limit))
                .select('title date status coverImage');
        }

        return res.json({
            success: true,
            data: results,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;

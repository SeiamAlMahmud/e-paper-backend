const express = require('express');
const router = express.Router();
const connectDB = require('../config/db');
const fs = require('fs').promises;
const path = require('path');
const { getUploadDir } = require('../utils/storage');

/**
 * GET /api/media - List media files
 */
router.get('/', async (req, res) => {
    try {
        const { type = 'all', page = 1, limit = 20 } = req.query;

        const uploadsDir = getUploadDir();
        const subdirs = ['pages', 'thumbnails', 'articles', 'site', 'profiles'];

        const files = [];

        for (const subdir of subdirs) {
            if (type !== 'all' && subdir !== type) continue;

            const dirPath = path.join(uploadsDir, subdir);
            try {
                const dirFiles = await fs.readdir(dirPath);
                for (const file of dirFiles) {
                    const filePath = path.join(dirPath, file);
                    const stats = await fs.stat(filePath);
                    files.push({
                        name: file,
                        path: `/uploads/${subdir}/${file}`,
                        size: stats.size,
                        type: subdir,
                        createdAt: stats.birthtime,
                    });
                }
            } catch (err) {
                // Directory might not exist
                continue;
            }
        }

        // Sort by creation date (newest first)
        files.sort((a, b) => b.createdAt - a.createdAt);

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedFiles = files.slice(skip, skip + parseInt(limit));

        return res.json({
            success: true,
            data: paginatedFiles,
            meta: {
                total: files.length,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(files.length / parseInt(limit)),
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

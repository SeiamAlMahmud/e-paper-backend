const express = require('express');
const router = express.Router();
const connectDB = require('../config/db');
const Edition = require('../models/edition.model');
const Page = require('../models/page.model');
const { optimizeImage, generateThumbnail } = require('../utils/image');
const { authenticate } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const { getUploadDir, toUploadUrl, resolveUploadUrlToPath } = require('../utils/storage');
const fs = require('fs').promises;
const path = require('path');

/**
 * POST /api/pages - Upload new page
 */
router.post('/', authenticate, uploadSingle.single('image'), async (req, res) => {
    try {
        await connectDB();

        const { editionId, pageNumber } = req.body;
        const imageFile = req.file;

        // Validation
        if (!editionId || !pageNumber || !imageFile) {
            return res.status(400).json({
                success: false,
                error: 'Edition ID, page number, and image are required',
            });
        }

        // Check if edition exists
        const edition = await Edition.findById(editionId);
        if (!edition) {
            return res.status(404).json({
                success: false,
                error: 'Edition not found',
            });
        }

        // Check for duplicate page number
        const existingPage = await Page.findOne({ editionId, pageNumber: parseInt(pageNumber) });
        if (existingPage) {
            return res.status(409).json({
                success: false,
                error: `Page ${pageNumber} already exists for this edition`,
            });
        }

        // Save temporary image file
        const buffer = imageFile.buffer;
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const tempImageFilename = `temp-${uniqueSuffix}${path.extname(imageFile.originalname)}`;
        const uploadDir = getUploadDir('pages');
        const tempImagePath = path.join(uploadDir, tempImageFilename);

        // Ensure directory exists
        await fs.mkdir(uploadDir, { recursive: true });
        await fs.writeFile(tempImagePath, buffer);

        // Optimize and convert to high-res WebP
        const finalFilename = `page-${uniqueSuffix}.webp`;
        const finalPath = path.join(uploadDir, finalFilename);
        await optimizeImage(tempImagePath, finalPath, 95);

        // Generate thumbnail
        const thumbnailFilename = `thumb-${uniqueSuffix}.webp`;
        const thumbnailDir = getUploadDir('thumbnails');
        await fs.mkdir(thumbnailDir, { recursive: true });
        const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);
        await generateThumbnail(finalPath, thumbnailPath, 300);

        // Delete temp file
        await fs.unlink(tempImagePath).catch(() => { });

        // Create page document
        const page = await Page.create({
            editionId,
            pageNumber: parseInt(pageNumber),
            imageUrl: toUploadUrl('pages', finalFilename),
            thumbnailUrl: toUploadUrl('thumbnails', thumbnailFilename),
            articles: [],
        });

        // Update edition
        edition.pages.push(page._id);
        edition.totalPages = edition.pages.length;

        // Set cover image if this is page 1
        if (parseInt(pageNumber) === 1) {
            edition.coverImage = page.thumbnailUrl;
        }

        await edition.save();

        return res.status(201).json({
            success: true,
            data: page,
            message: 'Page uploaded successfully',
        });
    } catch (error) {
        console.error('Upload page error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/pages - Get all pages for an edition
 */
router.get('/', async (req, res) => {
    try {
        await connectDB();

        const { editionId } = req.query;

        if (!editionId) {
            return res.status(400).json({
                success: false,
                error: 'Edition ID is required',
            });
        }

        const pages = await Page.find({ editionId })
            .sort({ pageNumber: 1 })
            .populate('articles')
            .lean();

        return res.status(200).json({
            success: true,
            data: pages,
        });
    } catch (error) {
        console.error('Get pages error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * DELETE /api/pages/:id - Delete page
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        await connectDB();

        const page = await Page.findById(req.params.id);

        if (!page) {
            return res.status(404).json({
                success: false,
                error: 'Page not found',
            });
        }

        // Delete image files
        const imagePath = resolveUploadUrlToPath(page.imageUrl);
        const thumbnailPath = resolveUploadUrlToPath(page.thumbnailUrl);
        await fs.unlink(imagePath).catch(() => { });
        await fs.unlink(thumbnailPath).catch(() => { });

        // Remove from edition
        await Edition.findByIdAndUpdate(page.editionId, {
            $pull: { pages: page._id },
            $inc: { totalPages: -1 },
        });

        await Page.findByIdAndDelete(req.params.id);

        return res.json({
            success: true,
            message: 'Page deleted successfully',
        });
    } catch (error) {
        console.error('Delete page error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

module.exports = router;

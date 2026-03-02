const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const { optimizeImage } = require('../utils/image');
const fs = require('fs').promises;
const path = require('path');

/**
 * POST /api/upload - Upload file
 */
router.post('/', authenticate, uploadSingle.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const type = req.body.type || 'articles';

        // Check permissions based on type
        if (type === 'articles') {
            if (!hasPermission(req.user, 'articles_create') && !hasPermission(req.user, 'articles_edit')) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized: Missing article creation/edit permission',
                });
            }
        } else if (type === 'logo' || type === 'favicon') {
            if (!hasPermission(req.user, 'settings_edit')) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized: Missing settings_edit permission',
                });
            }
        } else if (type === 'page') {
            if (!hasPermission(req.user, 'uploadPages_create')) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized: Missing uploadPages_create permission',
                });
            }
        } else if (type === 'profile') {
            if (!hasPermission(req.user, 'dashboard')) {
                return res.status(403).json({ success: false, error: 'Unauthorized' });
            }
        }

        if (!file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
            });
        }

        const buffer = file.buffer;

        // Determine directory based on type
        let subDir = 'articles';
        if (type === 'logo' || type === 'favicon') subDir = 'site';
        if (type === 'profile') subDir = 'profiles';

        const uploadDir = path.join(process.cwd(), '../public/uploads', subDir);

        // Ensure directory exists
        await fs.mkdir(uploadDir, { recursive: true });

        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

        // Write temporary file to optimize
        const extension = file.originalname.split('.').pop()?.toLowerCase() || 'png';
        const tempFilename = `temp-${uniqueSuffix}.${extension}`;
        const tempPath = path.join(uploadDir, tempFilename);
        await fs.writeFile(tempPath, buffer);

        let finalFilename = `${uniqueSuffix}.webp`;
        let finalPath = path.join(uploadDir, finalFilename);
        let fileUrl = `/uploads/${subDir}/${finalFilename}`;

        if (type === 'favicon' && extension === 'ico') {
            // Just move the temp to final
            finalFilename = `${uniqueSuffix}.ico`;
            finalPath = path.join(uploadDir, finalFilename);
            await fs.writeFile(finalPath, buffer);
            fileUrl = `/uploads/${subDir}/${finalFilename}`;
        } else {
            // Optimize and convert to WebP
            await optimizeImage(tempPath, finalPath, 95);
        }

        // Delete temp file
        await fs.unlink(tempPath).catch(() => { });

        return res.json({
            success: true,
            message: 'File uploaded successfully',
            data: { url: fileUrl },
        });
    } catch (error) {
        console.error('Upload Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;

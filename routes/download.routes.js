const express = require('express');
const router = express.Router();
const connectDB = require('../config/db');
const Edition = require('../models/edition.model');
const Page = require('../models/page.model');
const { generatePDFFromImage, mergePDFs } = require('../utils/pdf');
const fs = require('fs').promises;
const path = require('path');

/**
 * GET /api/download/edition/:id - Download full edition as PDF
 */
router.get('/edition/:id', async (req, res) => {
    try {
        await connectDB();

        const edition = await Edition.findById(req.params.id).populate('pages');

        if (!edition) {
            return res.status(404).json({
                success: false,
                error: 'Edition not found',
            });
        }

        if (!edition.pages || edition.pages.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No pages found in this edition',
            });
        }

        const pdfDir = path.join(process.cwd(), '../public/uploads/pdfs');
        await fs.mkdir(pdfDir, { recursive: true });

        const pdfPaths = [];

        // Generate PDF for each page
        for (const page of edition.pages) {
            const imagePath = path.join(process.cwd(), '../public', page.imageUrl);
            const pdfPath = path.join(pdfDir, `temp-page-${page._id}.pdf`);
            await generatePDFFromImage(imagePath, pdfPath);
            pdfPaths.push(pdfPath);
        }

        // Merge all PDFs
        const finalPdfFileName = `edition-${edition._id}-${Date.now()}.pdf`;
        const finalPdfPath = path.join(pdfDir, finalPdfFileName);
        await mergePDFs(pdfPaths, finalPdfPath);

        // Cleanup temp PDFs
        for (const pdfPath of pdfPaths) {
            await fs.unlink(pdfPath).catch(() => { });
        }

        // Send file
        res.download(finalPdfPath, `${edition.title}.pdf`, async (err) => {
            if (err) {
                console.error('Download error:', err);
            }
            // Cleanup final PDF after download
            await fs.unlink(finalPdfPath).catch(() => { });
        });
    } catch (error) {
        console.error('Download edition error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/download/page/:id - Download single page as PDF
 */
router.get('/page/:id', async (req, res) => {
    try {
        await connectDB();

        const page = await Page.findById(req.params.id);

        if (!page) {
            return res.status(404).json({
                success: false,
                error: 'Page not found',
            });
        }

        const imagePath = path.join(process.cwd(), '../public', page.imageUrl);
        const pdfDir = path.join(process.cwd(), '../public/uploads/pdfs');
        await fs.mkdir(pdfDir, { recursive: true });

        const pdfFileName = `page-${page._id}-${Date.now()}.pdf`;
        const pdfPath = path.join(pdfDir, pdfFileName);

        await generatePDFFromImage(imagePath, pdfPath);

        // Send file
        res.download(pdfPath, `page-${page.pageNumber}.pdf`, async (err) => {
            if (err) {
                console.error('Download error:', err);
            }
            // Cleanup PDF after download
            await fs.unlink(pdfPath).catch(() => { });
        });
    } catch (error) {
        console.error('Download page error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;

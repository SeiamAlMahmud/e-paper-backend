const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;

/**
 * Generate PDF from image
 * @param {string} imagePath - Path to image file
 * @param {string} outputPath - Path to save PDF
 */
async function generatePDFFromImage(imagePath, outputPath) {
    try {
        const imageBytes = await fs.readFile(imagePath);
        const pdfDoc = await PDFDocument.create();

        let image;
        if (imagePath.endsWith('.png') || imagePath.endsWith('.webp')) {
            image = await pdfDoc.embedPng(imageBytes);
        } else {
            image = await pdfDoc.embedJpg(imageBytes);
        }

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
        });

        const pdfBytes = await pdfDoc.save();
        await fs.writeFile(outputPath, pdfBytes);

        return outputPath;
    } catch (error) {
        console.error('PDF generation error:', error);
        throw error;
    }
}

/**
 * Merge multiple PDFs into one
 */
async function mergePDFs(pdfPaths, outputPath) {
    try {
        const mergedPdf = await PDFDocument.create();

        for (const pdfPath of pdfPaths) {
            const pdfBytes = await fs.readFile(pdfPath);
            const pdf = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        await fs.writeFile(outputPath, mergedPdfBytes);

        return outputPath;
    } catch (error) {
        console.error('PDF merge error:', error);
        throw error;
    }
}

module.exports = {
    generatePDFFromImage,
    mergePDFs,
};

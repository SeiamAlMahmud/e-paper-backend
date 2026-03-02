const sharp = require('sharp');

/**
 * Optimize image and convert to WebP format
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save optimized image
 * @param {number} quality - Quality (1-100)
 */
async function optimizeImage(inputPath, outputPath, quality = 95) {
    try {
        await sharp(inputPath)
            .webp({ quality })
            .toFile(outputPath);

        return outputPath;
    } catch (error) {
        console.error('Image optimization error:', error);
        throw error;
    }
}

/**
 * Resize image to specific dimensions
 */
async function resizeImage(inputPath, outputPath, width, height, quality = 90) {
    try {
        await sharp(inputPath)
            .resize(width, height, {
                fit: 'cover',
                position: 'center'
            })
            .webp({ quality })
            .toFile(outputPath);

        return outputPath;
    } catch (error) {
        console.error('Image resize error:', error);
        throw error;
    }
}

/**
 * Generate thumbnail from image
 */
async function generateThumbnail(imagePath, outputPath, width = 300) {
    try {
        await sharp(imagePath)
            .resize(width, undefined, {
                fit: 'inside',
                withoutEnlargement: true,
            })
            .webp({ quality: 90 })
            .toFile(outputPath);

        return outputPath;
    } catch (error) {
        console.error('Thumbnail generation error:', error);
        throw error;
    }
}

module.exports = {
    optimizeImage,
    resizeImage,
    generateThumbnail,
};

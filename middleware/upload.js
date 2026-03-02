const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getUploadDir } = require('../utils/storage');

// Ensure upload directories exist
const uploadDirs = [
    getUploadDir('pages'),
    getUploadDir('thumbnails'),
    getUploadDir('pdfs'),
    getUploadDir('articles'),
    getUploadDir('site'),
    getUploadDir('profiles'),
];

uploadDirs.forEach((dir) => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch (error) {
        // Don't crash app startup in restricted environments (e.g. serverless).
        console.warn(`Upload directory unavailable: ${dir}`, error.message);
    }
});

// Configure storage for page images
const pageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, getUploadDir('pages'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `page-${uniqueSuffix}${ext}`);
    },
});

// Configure storage for thumbnails
const thumbnailStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, getUploadDir('thumbnails'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `thumb-${uniqueSuffix}${ext}`);
    },
});

// File filter for images only
const imageFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
    }
};

// Max file size: 10MB
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760');

// Page image uploader
const uploadPageImage = multer({
    storage: pageStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
});

// Thumbnail uploader
const uploadThumbnail = multer({
    storage: thumbnailStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
});

// Generic single file uploader
const uploadSingle = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
});

/**
 * Delete file from filesystem
 */
function deleteFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error('Error deleting file:', error);
    }
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (error) {
        return 0;
    }
}

module.exports = {
    uploadPageImage,
    uploadThumbnail,
    uploadSingle,
    deleteFile,
    getFileSize,
};

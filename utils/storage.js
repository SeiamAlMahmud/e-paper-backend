const os = require('os');
const path = require('path');

const isVercel = Boolean(process.env.VERCEL);

const uploadRoot = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : isVercel
        ? path.join(os.tmpdir(), 'uploads')
        : path.join(process.cwd(), '../public/uploads');

function getUploadDir(subDir = '') {
    return subDir ? path.join(uploadRoot, subDir) : uploadRoot;
}

function toUploadUrl(subDir, filename) {
    return `/uploads/${subDir}/${filename}`;
}

function resolveUploadUrlToPath(fileUrl) {
    if (!fileUrl) return null;

    const normalized = fileUrl.replace(/\\/g, '/');
    const relativePath = normalized.startsWith('/uploads/')
        ? normalized.slice('/uploads/'.length)
        : normalized.replace(/^\/+/, '');

    return path.join(uploadRoot, relativePath);
}

module.exports = {
    getUploadDir,
    toUploadUrl,
    resolveUploadUrlToPath,
};

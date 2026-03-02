const mongoose = require('mongoose');
const { Schema } = mongoose;

const PageSchema = new Schema(
    {
        editionId: {
            type: Schema.Types.ObjectId,
            ref: 'Edition',
            required: [true, 'Edition ID is required'],
            index: true,
        },
        pageNumber: {
            type: Number,
            required: [true, 'Page number is required'],
            min: [1, 'Page number must be at least 1'],
        },
        imageUrl: {
            type: String,
            required: [true, 'Page image is required'],
        },
        thumbnailUrl: {
            type: String,
            required: [true, 'Thumbnail is required'],
        },
        articles: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Article',
            },
        ],
        views: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index: one edition can't have duplicate page numbers
PageSchema.index({ editionId: 1, pageNumber: 1 }, { unique: true });
PageSchema.index({ editionId: 1 });

module.exports = mongoose.models.Page || mongoose.model('Page', PageSchema);

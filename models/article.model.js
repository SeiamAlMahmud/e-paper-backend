const mongoose = require('mongoose');
const { Schema } = mongoose;

const ArticleContinuationSchema = new Schema(
    {
        pageId: {
            type: Schema.Types.ObjectId,
            ref: 'Page',
            required: true,
        },
        pageNumber: {
            type: Number,
            required: true,
        },
        order: {
            type: Number,
            required: true,
        },
    },
    { _id: false }
);

const ArticleSchema = new Schema(
    {
        editionId: {
            type: Schema.Types.ObjectId,
            ref: 'Edition',
            required: [true, 'Edition ID is required'],
            index: true,
        },
        title: {
            type: String,
            required: false,
            trim: true,
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true,
            index: true,
        },
        startPage: {
            type: Schema.Types.ObjectId,
            ref: 'Page',
            required: [true, 'Start page is required'],
        },
        region: {
            x: { type: Number, required: true },
            y: { type: Number, required: true },
            width: { type: Number, required: true },
            height: { type: Number, required: true },
        },
        continuations: {
            type: [ArticleContinuationSchema],
            default: [],
        },
        content: {
            type: String,
            required: false,
        },
        images: {
            type: [String],
            default: [],
        },
        excerpt: {
            type: String,
            required: false,
            maxlength: [500, 'Excerpt cannot exceed 500 characters'],
        },
        views: {
            type: Number,
            default: 0,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
ArticleSchema.index({ editionId: 1 });
ArticleSchema.index({ category: 1 });
ArticleSchema.index({ startPage: 1 });
ArticleSchema.index({ editionId: 1, category: 1 });

// Virtual for total pages count
ArticleSchema.virtual('totalParts').get(function () {
    return this.continuations.length;
});

// Method to check if article has continuations
ArticleSchema.methods.hasContinuation = function () {
    return this.continuations.length > 0;
};

module.exports = mongoose.models.Article || mongoose.model('Article', ArticleSchema);

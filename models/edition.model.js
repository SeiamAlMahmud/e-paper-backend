const mongoose = require('mongoose');
const { Schema } = mongoose;

const EditionSchema = new Schema(
    {
        date: {
            type: Date,
            required: [true, 'Publication date is required'],
            unique: true,
            index: true,
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        totalPages: {
            type: Number,
            required: true,
            min: [0, 'Must have at least 0 pages'],
            default: 0,
        },
        coverImage: {
            type: String,
            required: false,
        },
        pages: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Page',
            },
        ],
        pdfUrl: {
            type: String,
            required: false,
        },
        status: {
            type: String,
            enum: ['draft', 'published', 'archived'],
            default: 'draft',
            required: true,
        },
        views: {
            type: Number,
            default: 0,
            required: true,
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

// Indexes for efficient queries
EditionSchema.index({ date: -1 });
EditionSchema.index({ status: 1 });
EditionSchema.index({ createdBy: 1 });
EditionSchema.index({ date: -1, status: 1 });

// Virtual for formatted date
EditionSchema.virtual('formattedDate').get(function () {
    return this.date.toISOString().split('T')[0];
});

module.exports = mongoose.models.Edition || mongoose.model('Edition', EditionSchema);

const mongoose = require('mongoose');
const { Schema } = mongoose;

const AuditLogSchema = new Schema(
    {
        type: {
            type: String,
            enum: ['edition_view', 'page_view', 'article_click'],
            required: true,
            index: true,
        },
        targetId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: false,
    }
);

// Indexes for peak tracking
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ type: 1, timestamp: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

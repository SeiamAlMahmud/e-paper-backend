const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        role: {
            type: String,
            enum: ['admin', 'editor', 'publisher', 'computer_operator'],
            default: 'editor',
            required: true,
        },
        status: {
            type: String,
            enum: ['active', 'suspended'],
            default: 'active',
        },
        image: {
            type: String,
            default: '',
        },
        permissions: {
            dashboard_view: { type: Boolean, default: true },
            editions_view: { type: Boolean, default: true },
            editions_create: { type: Boolean, default: false },
            editions_edit: { type: Boolean, default: false },
            editions_delete: { type: Boolean, default: false },
            uploadPages_view: { type: Boolean, default: false },
            uploadPages_create: { type: Boolean, default: false },
            articles_view: { type: Boolean, default: false },
            articles_create: { type: Boolean, default: false },
            articles_edit: { type: Boolean, default: false },
            articles_delete: { type: Boolean, default: false },
            mediaLibrary_view: { type: Boolean, default: false },
            mediaLibrary_delete: { type: Boolean, default: false },
            users_view: { type: Boolean, default: false },
            users_create: { type: Boolean, default: false },
            users_edit: { type: Boolean, default: false },
            users_delete: { type: Boolean, default: false },
            users_permissions: { type: Boolean, default: false },
            users_passwordReset: { type: Boolean, default: false },
            analytics_view: { type: Boolean, default: false },
            settings_view: { type: Boolean, default: false },
            settings_edit: { type: Boolean, default: false },
        },
    },
    {
        timestamps: true,
    }
);

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);

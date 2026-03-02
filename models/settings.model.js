const mongoose = require('mongoose');
const { Schema } = mongoose;

const SiteSettingsSchema = new Schema(
    {
        siteTitle: { type: String, required: true, default: 'My E-Paper' },
        siteDescription: { type: String, default: '' },
        logo: { type: String, default: '' },
        favicon: { type: String, default: '' },
        footerText: { type: String, default: '© 2026 E-Paper. All rights reserved.' },
        contact: {
            email: { type: String, default: '' },
            phone: { type: String, default: '' },
            address: { type: String, default: '' },
        },
        socials: {
            facebook: { type: String, default: '' },
            twitter: { type: String, default: '' },
            instagram: { type: String, default: '' },
            youtube: { type: String, default: '' },
            linkedin: { type: String, default: '' },
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.models.SiteSettings || mongoose.model('SiteSettings', SiteSettingsSchema);

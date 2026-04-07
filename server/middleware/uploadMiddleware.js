const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let destFolder = 'others';
        const url = (req.originalUrl || req.url).toLowerCase();
        console.log('[DEBUG] Multer destination check. URL:', url);

        if (url.includes('delivery-challan')) destFolder = 'delivery_challan';
        else if (url.includes('hash-code')) destFolder = 'hash_code';
        else if (url.includes('tax-invoice')) destFolder = 'tax_invoice';
        else if (url.includes('d2-form')) destFolder = 'd2_form';
        else if (url.includes('d3-form')) destFolder = 'd3_form';
        else if (url.includes('upload-photo')) destFolder = 'geotag_photos';
        else if (url.includes('call')) destFolder = 'call_recordings';

        const uploadPath = path.join('uploads', destFolder);

        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        let prefix = 'file-';
        const url = (req.originalUrl || req.url).toLowerCase();
        console.log('[DEBUG] Multer filename check. URL:', url);

        if (url.includes('hash-code')) prefix = 'hash-';
        else if (url.includes('tax-invoice')) prefix = 'invoice-';
        else if (url.includes('delivery-challan')) prefix = 'challan-';
        else if (url.includes('d2-form')) prefix = 'd2-';
        else if (url.includes('d3-form')) prefix = 'd3-';
        else if (url.includes('upload-photo')) prefix = 'geotag-';
        else if (url.includes('call')) prefix = 'call-';

        cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf', 
        'image/jpeg', 
        'image/png', 
        'image/jpg',
        'audio/mpeg', 
        'audio/wav', 
        'audio/x-m4a', 
        'audio/aac', 
        'audio/ogg', 
        'audio/webm',
        'audio/amr',
        'audio/mp3'
    ];
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF, images, and audio files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Increased to 10MB
    }
});

module.exports = upload;

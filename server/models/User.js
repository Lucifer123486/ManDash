const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['admin', 'staff', 'qi', 'client'],
        default: 'staff'
    },
    // Staff type for workflow access control
    staffType: {
        type: String,
        enum: ['service_engineer', 'production_manager', 'assembly_line_incharge', 'quality_inspector', 'packaging_dispatch_operator', 'director_am', 'call_centre_staff', 'sales_staff'],
        default: 'service_engineer'
    },
    phone: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    pinCode: {
        type: String,
        trim: true
    },
    // For FCM notifications
    fcmToken: {
        type: String,
        default: null
    },
    // For staff - assigned drones
    assignedDrones: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Drone'
    }],
    // For clients - their orders
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    certificate10th: {
        type: String // URL or Base64
    },
    aadharCard: {
        type: String // URL or Base64
    },
    idProof: {
        type: String // URL or Base64 (Driving license/passport/voter id card/rationcard)
    },
    egcaId: {
        type: String,
        trim: true
    },
    hasAMC: {
        type: Boolean,
        default: false
    },
    hasASS: {
        type: Boolean,
        default: false
    },
    amcStartDate: {
        type: Date
    },
    assStartDate: {
        type: Date
    },
    freeServicesUsed: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

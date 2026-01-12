const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required']
    },
    name: {
        type: String,
        required: [true, 'Goal name is required'],
        trim: true,
        maxlength: [100, 'Goal name cannot exceed 100 characters']
    },
    targetAmount: {
        type: Number,
        required: [true, 'Target amount is required'],
        min: [0.01, 'Target amount must be greater than 0']
    },
    currentAmount: {
        type: Number,
        default: 0,
        min: [0, 'Current amount cannot be negative']
    },
    deadline: {
        type: Date,
        required: [true, 'Deadline is required']
    },
    color: {
        type: String,
        default: '#4ECDC4'
    },
    icon: {
        type: String,
        default: 'flag'
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date,
        default: null
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    autoContribute: {
        enabled: {
            type: Boolean,
            default: false
        },
        amount: {
            type: Number,
            default: 0,
            min: [0, 'Auto-contribute amount cannot be negative']
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly'],
            default: 'monthly'
        }
    },
    notifications: {
        enabled: {
            type: Boolean,
            default: true
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly'],
            default: 'weekly'
        }
    }
}, {
    timestamps: true
});

// Index for efficient querying
goalSchema.index({ user: 1, deadline: 1 });
goalSchema.index({ user: 1, isCompleted: 1 });

// Virtual for progress percentage
goalSchema.virtual('progress').get(function() {
    return Math.min(100, Math.round((this.currentAmount / this.targetAmount) * 100));
});

// Virtual for days remaining
goalSchema.virtual('daysRemaining').get(function() {
    const now = new Date();
    const deadline = new Date(this.deadline);
    const diffTime = deadline - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for amount needed
goalSchema.virtual('amountNeeded').get(function() {
    return Math.max(0, this.targetAmount - this.currentAmount);
});

// Virtual for daily amount to save
goalSchema.virtual('dailyAmountToSave').get(function() {
    const daysRemaining = this.daysRemaining;
    if (daysRemaining <= 0) return this.amountNeeded;
    return this.amountNeeded / daysRemaining;
});

// Pre-save hook to check if goal is completed
goalSchema.pre('save', function(next) {
    if (this.currentAmount >= this.targetAmount && !this.isCompleted) {
        this.isCompleted = true;
        this.completedAt = new Date();
    } else if (this.currentAmount < this.targetAmount && this.isCompleted) {
        this.isCompleted = false;
        this.completedAt = null;
    }
    next();
});

const Goal = mongoose.model('Goal', goalSchema);

module.exports = Goal;
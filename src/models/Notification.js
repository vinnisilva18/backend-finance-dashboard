const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required']
    },
    type: {
        type: String,
        enum: [
            'transaction',
            'budget',
            'goal',
            'bill',
            'credit_card',
            'system',
            'reminder',
            'alert'
        ],
        required: [true, 'Notification type is required']
    },
    title: {
        type: String,
        required: [true, 'Notification title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    message: {
        type: String,
        required: [true, 'Notification message is required'],
        trim: true,
        maxlength: [500, 'Message cannot exceed 500 characters']
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date,
        default: null
    },
    actionRequired: {
        type: Boolean,
        default: false
    },
    actionUrl: {
        type: String,
        default: null
    },
    expiresAt: {
        type: Date,
        default: function() {
            const date = new Date();
            date.setDate(date.getDate() + 30); // Expire after 30 days
            return date;
        }
    },
    scheduledFor: {
        type: Date,
        default: null
    },
    category: {
        type: String,
        default: 'general'
    },
    icon: {
        type: String,
        default: 'notification'
    },
    color: {
        type: String,
        default: '#4ECDC4'
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ scheduledFor: 1 });

// Pre-save hook for scheduled notifications
notificationSchema.pre('save', function(next) {
    if (this.scheduledFor && this.scheduledFor > new Date()) {
        this.isRead = false;
        this.readAt = null;
    }
    next();
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
};

// Method to mark as unread
notificationSchema.methods.markAsUnread = function() {
    this.isRead = false;
    this.readAt = null;
    return this.save();
};

// Static method to create budget alert
notificationSchema.statics.createBudgetAlert = async function(userId, category, spent, budget) {
    const percentage = (spent / budget) * 100;
    let title, message, priority;

    if (percentage >= 100) {
        title = 'Budget Exceeded!';
        message = `You've exceeded your ${category} budget by ${Math.round(percentage - 100)}%`;
        priority = 'urgent';
    } else if (percentage >= 90) {
        title = 'Budget Warning';
        message = `You've used ${Math.round(percentage)}% of your ${category} budget`;
        priority = 'high';
    } else if (percentage >= 75) {
        title = 'Budget Alert';
        message = `You've used ${Math.round(percentage)}% of your ${category} budget`;
        priority = 'medium';
    }

    if (title) {
        return await this.create({
            user: userId,
            type: 'budget',
            title,
            message,
            priority,
            data: { category, spent, budget, percentage },
            category: 'budget'
        });
    }

    return null;
};

// Static method to create goal progress notification
notificationSchema.statics.createGoalProgressNotification = async function(userId, goal, progress) {
    let title, message, priority;

    if (progress >= 100) {
        title = 'Goal Completed! 🎉';
        message = `Congratulations! You've completed your goal: ${goal.name}`;
        priority = 'high';
    } else if (progress >= 75) {
        title = 'Goal Progress Update';
        message = `You're ${Math.round(progress)}% towards your goal: ${goal.name}`;
        priority = 'medium';
    }

    if (title) {
        return await this.create({
            user: userId,
            type: 'goal',
            title,
            message,
            priority,
            data: { goalId: goal._id, goalName: goal.name, progress },
            category: 'goal'
        });
    }

    return null;
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
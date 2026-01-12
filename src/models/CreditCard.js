const mongoose = require('mongoose');

const creditCardSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required']
    },
    cardName: {
        type: String,
        required: [true, 'Card name is required'],
        trim: true,
        maxlength: [50, 'Card name cannot exceed 50 characters']
    },
    cardNumber: {
        type: String,
        required: [true, 'Card number is required'],
        match: [/^\d{16}$/, 'Card number must be 16 digits']
    },
    lastFourDigits: {
        type: String,
        required: true
    },
    cardHolderName: {
        type: String,
        required: [true, 'Card holder name is required'],
        trim: true,
        maxlength: [100, 'Card holder name cannot exceed 100 characters']
    },
    expiryDate: {
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12
        },
        year: {
            type: Number,
            required: true,
            min: new Date().getFullYear()
        }
    },
    cvv: {
        type: String,
        required: [true, 'CVV is required'],
        match: [/^\d{3,4}$/, 'CVV must be 3 or 4 digits']
    },
    cardType: {
        type: String,
        enum: ['visa', 'mastercard', 'amex', 'discover', 'other'],
        required: true
    },
    issuingBank: {
        type: String,
        trim: true,
        default: ''
    },
    creditLimit: {
        type: Number,
        required: [true, 'Credit limit is required'],
        min: [0, 'Credit limit cannot be negative']
    },
    currentBalance: {
        type: Number,
        default: 0,
        min: [0, 'Current balance cannot be negative']
    },
    availableCredit: {
        type: Number,
        default: function() {
            return this.creditLimit - this.currentBalance;
        }
    },
    billingCycleStart: {
        type: Number,
        min: 1,
        max: 31,
        default: 1
    },
    billingCycleEnd: {
        type: Number,
        min: 1,
        max: 31,
        default: 30
    },
    paymentDueDate: {
        type: Number,
        min: 1,
        max: 31,
        default: 10
    },
    minPaymentPercentage: {
        type: Number,
        default: 5,
        min: 1,
        max: 100
    },
    minPaymentAmount: {
        type: Number,
        default: function() {
            return this.currentBalance * (this.minPaymentPercentage / 100);
        }
    },
    interestRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    isActive: {
        type: Boolean,
        default: true
    },
    color: {
        type: String,
        default: '#4ECDC4'
    },
    icon: {
        type: String,
        default: 'credit_card'
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    lastUsed: {
        type: Date,
        default: null
    },
    autoPayEnabled: {
        type: Boolean,
        default: false
    },
    autoPayAmount: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

// Indexes
creditCardSchema.index({ user: 1, cardNumber: 1 }, { unique: true });

// Pre-save hook to set last four digits
creditCardSchema.pre('save', function(next) {
    if (this.cardNumber && this.cardNumber.length >= 4) {
        this.lastFourDigits = this.cardNumber.slice(-4);
    }
    next();
});

// Virtual for utilization percentage
creditCardSchema.virtual('utilizationPercentage').get(function() {
    if (this.creditLimit === 0) return 0;
    return (this.currentBalance / this.creditLimit) * 100;
});

// Virtual for next payment due date
creditCardSchema.virtual('nextPaymentDueDate').get(function() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let paymentDate = new Date(currentYear, currentMonth, this.paymentDueDate);
    
    if (paymentDate < now) {
        paymentDate = new Date(currentYear, currentMonth + 1, this.paymentDueDate);
    }
    
    return paymentDate;
});

// Virtual for days until payment due
creditCardSchema.virtual('daysUntilPaymentDue').get(function() {
    const now = new Date();
    const paymentDate = this.nextPaymentDueDate;
    const diffTime = paymentDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

const CreditCard = mongoose.model('CreditCard', creditCardSchema);

module.exports = CreditCard;
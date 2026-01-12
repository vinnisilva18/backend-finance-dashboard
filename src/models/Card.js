const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['visa', 'mastercard', 'amex', 'discover', 'other'],
    required: true
  },
  lastFourDigits: {
    type: String,
    required: true,
    minlength: 4,
    maxlength: 4
  },
  limit: {
    type: Number,
    required: true,
    min: 0
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  color: {
    type: String,
    default: '#1a237e'
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt on save
cardSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for available credit
cardSchema.virtual('availableCredit').get(function() {
  return this.limit - this.balance;
});

// Virtual for utilization rate
cardSchema.virtual('utilizationRate').get(function() {
  return this.limit > 0 ? this.balance / this.limit : 0;
});

module.exports = mongoose.model('Card', cardSchema);
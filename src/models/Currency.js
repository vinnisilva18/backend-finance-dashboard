const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 3
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  symbol: {
    type: String,
    trim: true
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  isBase: {
    type: Boolean,
    default: false
  },
  flag: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
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
currencySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure unique currency codes per user
currencySchema.index({ user: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Currency', currencySchema);
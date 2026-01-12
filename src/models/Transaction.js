const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card'
  },
  notes: {
    type: String,
    trim: true
  },
  // Investment fields
  isInvestment: {
    type: Boolean,
    default: false
  },
  investmentType: {
    type: String,
    enum: ['CDI', 'Dólar', 'Tesouro Direto', 'Ações', 'FIIs', 'Cripto', 'Poupança'],
    required: function() { return this.isInvestment; }
  },
  amountBRL: {
    type: Number,
    required: function() { return this.isInvestment; }
  },
  amountUSD: {
    type: Number,
    required: function() { return this.isInvestment; }
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
transactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
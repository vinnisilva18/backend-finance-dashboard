const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
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
    enum: ['income', 'expense'],
    required: true
  },
  color: {
    type: String,
    default: '#4CAF50'
  },
  icone: {
    type: String,
    default: 'category'
  },
  // Manter icon para compatibilidade com dados antigos
  icon: {
    type: String
  },
  image: {
    type: String, // Base64 encoded image or URL
    default: null
  },
  budget: {
    type: Number,
    default: 0
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
categorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure unique category names per user
categorySchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);

// Vercel serverless function for categories list and create
const mongoose = require('../src/config/database');
const Category = require('../src/models/Category');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Auth middleware
const auth = (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    throw new Error('No token, authorization denied');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.user;
  } catch (err) {
    throw new Error('Token is not valid');
  }
};

// Validation
const categoryValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be either income or expense'),
  body('color').optional().isHexColor().withMessage('Invalid color format'),
  body('icon').optional().isString().withMessage('Icon must be a string')
];

const validateRequest = async (req) => {
  await Promise.all(categoryValidation.map(validation => validation.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new Error(JSON.stringify(errors.array()));
  }
};

module.exports = async (req, res) => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);

    // Authenticate user
    const user = auth(req);

    if (req.method === 'GET') {
      // Get all categories for user
      const { type } = req.query;
      let query = { user: user.id };
      if (type) query.type = type;
      const categories = await Category.find(query).sort({ name: 1 });
      res.json(categories);
    } else if (req.method === 'POST') {
      // Validate request
      await validateRequest(req);

      // Create new category
      const { name, type, color, icon, budget } = req.body;

      // Check if category already exists for this user
      const existingCategory = await Category.findOne({ name, user: user.id });
      if (existingCategory) {
        return res.status(400).json({ message: 'Category already exists' });
      }

      const category = new Category({
        name,
        type,
        color,
        icon,
        budget,
        user: user.id
      });

      await category.save();
      res.status(201).json(category);
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (err) {
    console.error(err.message);
    if (err.message.includes('authorization') || err.message.includes('Token')) {
      res.status(401).json({ message: err.message });
    } else if (err.message.includes('Validation failed')) {
      res.status(400).json({ message: 'Validation failed', errors: JSON.parse(err.message) });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

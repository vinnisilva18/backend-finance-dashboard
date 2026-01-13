// Vercel serverless function for categories
const mongoose = require('../../../src/config/database');
const Category = require('../../../src/models/Category');
const jwt = require('jsonwebtoken');

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

module.exports = async (req, res) => {
  try {
    // Authenticate user
    const user = auth(req);

    if (req.method === 'GET') {
      // Get all categories for user
      const categories = await Category.find({ user: user.id });
      res.json(categories);
    } else if (req.method === 'POST') {
      // Create new category
      const { name, type, color } = req.body;

      const category = new Category({
        name,
        type,
        color,
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
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

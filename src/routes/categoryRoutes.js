const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');

// @route   GET /api/categories
// @desc    Get all categories
// @access  Private
router.get('/', auth, categoryController.getCategories);

// @route   GET /api/categories/:id
// @desc    Get single category
// @access  Private
router.get('/:id', auth, categoryController.getCategory);

// @route   POST /api/categories
// @desc    Create category
// @access  Private
router.post('/', auth, categoryController.createCategory);

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private
router.put('/:id', auth, categoryController.updateCategory);

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private
router.delete('/:id', auth, categoryController.deleteCategory);

module.exports = router;
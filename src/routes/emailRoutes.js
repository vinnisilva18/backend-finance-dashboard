const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Email routes (placeholder - implemente conforme necessário)
router.get('/test', auth, (req, res) => {
  res.json({ message: 'Email API is working' });
});

module.exports = router;

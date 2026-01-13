// Vercel serverless function for health check
const mongoose = require('../src/config/database');

module.exports = async (req, res) => {
  // Connect to database if not already connected
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connectDB();
  }

  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  res.status(200).json({
    status: 'OK',
    message: 'Finance Dashboard API is running',
    database: statusMap[dbStatus] || 'unknown',
    timestamp: new Date().toISOString()
  });
};

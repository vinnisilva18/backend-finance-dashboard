// backend/src/seed.js (opcional)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const connectDB = require('./config/database');
require('dotenv').config();

const seedDatabase = async () => {
  await connectDB();
  
  // Create test user
  const testUser = new User({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  });
  
  // Hash password
  const salt = await bcrypt.genSalt(10);
  testUser.password = await bcrypt.hash(testUser.password, salt);
  
  await testUser.save();
  
  console.log('Test user created:', testUser.email);
  process.exit(0);
};

seedDatabase().catch(console.error);
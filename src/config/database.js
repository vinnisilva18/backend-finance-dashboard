const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI;

    if (process.env.VERCEL && !mongoURI) {
      throw new Error('MONGODB_URI environment variable is required for Vercel deployment');
    } else if (!mongoURI) {
      mongoURI = 'mongodb://127.0.0.1:27017/finance_dashboard';
    }

    // Fix for MongoDB password with special characters
    // If the URI contains unescaped special characters in password, encode them
    if (mongoURI && (mongoURI.includes('mongodb://') || mongoURI.includes('mongodb+srv://')) && mongoURI.includes('@')) {
      const match = mongoURI.match(/(mongodb(?:\+srv)?):\/\/([^:]+):([^@]+)@/);
      if (match) {
        const username = match[2];
        const password = match[3];
        // Check if password contains unescaped characters
        if (password.match(/[#@\$%\^&\*\(\)\+\[\]\{\}\|\\:;"'<>,\.\?\/~`]/)) {
          console.log('🔧 Detected unescaped characters in MongoDB password, encoding...');
          const encodedPassword = encodeURIComponent(password);
          mongoURI = mongoURI.replace(`${username}:${password}@`, `${username}:${encodedPassword}@`);
          console.log('✅ Password encoded successfully');
        }
      }
    }

    console.log('Attempting to connect to MongoDB...');
    console.log('Environment:', process.env.VERCEL ? 'Vercel' : 'Local');
    console.log('MongoDB URI:', mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // Hide credentials
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Listen for connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
    
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('Please make sure:');
    console.error('1. MongoDB is installed and running');
    console.error('2. The connection string in .env is correct');
    console.error('3. No other application is using port 27017');
    
    // Retry connection after 5 seconds
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
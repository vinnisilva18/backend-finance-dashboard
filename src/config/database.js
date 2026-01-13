const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // For Vercel deployment, require MONGODB_URI
    let mongoURI;
    if (process.env.VERCEL) {
      mongoURI = process.env.MONGODB_URI;
      if (!mongoURI) {
        throw new Error('MONGODB_URI environment variable is required for Vercel deployment');
      }
    } else {
      mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finance_dashboard';
    }

    console.log('Attempting to connect to MongoDB...');
    console.log('Environment:', process.env.VERCEL ? 'Vercel' : 'Local');

    // URL encode the password and ensure database name is included
    if (process.env.VERCEL && mongoURI.includes('@')) {
      const parts = mongoURI.split('@');
      if (parts.length === 2) {
        const authPart = parts[0];
        const hostPart = parts[1];
        const authParts = authPart.split('//')[1].split(':');
        if (authParts.length === 2) {
          const username = authParts[0];
          const password = encodeURIComponent(authParts[1]);

          // Ensure database name is included
          let finalHostPart = hostPart;
          if (!hostPart.includes('/')) {
            finalHostPart = `${hostPart}/finance_dashboard`;
          } else if (hostPart.endsWith('/')) {
            finalHostPart = `${hostPart}finance_dashboard`;
          }

          mongoURI = `mongodb+srv://${username}:${password}@${finalHostPart}`;
        }
      }
    }

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
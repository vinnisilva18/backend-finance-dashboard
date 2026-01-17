// index.js - Vercel serverless function
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require('../src/config/database');

// Import routes
const authRoutes = require('../src/routes/authRoutes');
const transactionRoutes = require('../src/routes/transactionRoutes');
const categoryRoutes = require('../src/routes/categoryRoutes');
const cardRoutes = require('../src/routes/cardRoutes');
const goalRoutes = require('../src/routes/goalRoutes');
const currencyRoutes = require('../src/routes/currencyRoutes');
const userRoutes = require('../src/routes/userRoutes');
const emailRoutes = require('../src/routes/emailRoutes');
const notificationRoutes = require('../src/routes/notificationRoutes');

// Initialize express app
const app = express();

// ✅ CRÍTICO: Log das variáveis de ambiente (para debug no Vercel)
console.log('🔍 Environment Check:', {
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET ? '***SET***' : '❌ MISSING',
  MONGODB_URI: process.env.MONGODB_URI ? '***SET***' : '❌ MISSING',
  VERCEL_URL: process.env.VERCEL_URL || 'Not set'
});

// ✅ IMPROVED CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all localhost origins
    if (/localhost:\d+$/.test(origin) || /127\.0\.0\.1:\d+$/.test(origin)) {
      return callback(null, true);
    }
    
    // Allow all vercel.app subdomains
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    // Specific allowed origins
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://finance-dashboard-rich.vercel.app',
      'https://finance-dashboard-frontend.vercel.app',
      'https://finance-dashboard-backend-ashy.vercel.app',
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('🔒 CORS blocked origin:', origin);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'X-Auth-Token',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// ✅ CRITICAL: Handle OPTIONS requests (pre-flight) FIRST
app.options('*', cors(corsOptions));

// ✅ Middleware in correct order
app.use(cors(corsOptions));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// ✅ Request logging with more details
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`, {
    origin: req.get('origin'),
    userAgent: req.get('user-agent'),
    contentType: req.get('content-type'),
    authorization: req.get('authorization') ? 'present' : 'missing'
  });
  next();
});

// ✅ Connect to database with better error handling
const connectDBWithRetry = async () => {
  try {
    await connectDB();
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // Don't crash the app, just log error
  }
};

// Connect immediately (Vercel may reuse containers)
connectDBWithRetry();

// ✅ Routes
console.log('🚀 Setting up API routes...');

// Add a simple test route first
app.get('/test-simple', (req, res) => {
  res.json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path
  });
});

// Register routes
app.use('/auth', authRoutes);
app.use('/transactions', transactionRoutes);
app.use('/categories', categoryRoutes);
app.use('/cards', cardRoutes);
app.use('/goals', goalRoutes);
app.use('/currencies', currencyRoutes);
app.use('/user', userRoutes);
app.use('/email', emailRoutes);
app.use('/notifications', notificationRoutes);

console.log('✅ API routes configured successfully');

// ✅ Health check with database status
app.get('/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({
    status: 'OK',
    message: 'Finance Dashboard API is running',
    database: statusMap[dbStatus] || 'unknown',
    dbStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// ✅ Test route for POST requests
app.post('/test-post', (req, res) => {
  console.log('Test POST route called:', {
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers
  });
  res.json({
    message: 'POST request received!',
    yourData: req.body,
    timestamp: new Date().toISOString()
  });
});

// ✅ 404 handler for API routes
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.originalUrl);
  res.status(404).json({ 
    message: 'API endpoint not found',
    requestedPath: req.originalUrl,
    availableEndpoints: [
      '/auth/*',
      '/transactions/*',
      '/categories/*',
      '/cards/*',
      '/goals/*',
      '/currencies/*',
      '/user/*',
      '/email/*',
      '/notifications/*',
      '/health',
      '/test',
      '/test-simple',
      '/test-post'
    ]
  });
});

// ✅ Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Finance Dashboard API',
    documentation: 'Check /health for API status',
    endpoints: '/*',
    version: '1.0.0'
  });
});

// ✅ Error handling middleware
app.use((err, req, res, next) => {
  console.error('🔥 Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    origin: req.get('origin'),
    timestamp: new Date().toISOString()
  });

  // CORS error
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS error',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Forbidden',
      allowedOrigins: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://finance-dashboard-rich.vercel.app'
      ]
    });
  }

  // JWT/auth error
  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: 'Invalid or missing token'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// ✅ Vercel serverless function export - CRITICAL FOR VERCEL
// O Vercel precisa deste export específico
module.exports = app;

// ✅ Para desenvolvimento local
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}
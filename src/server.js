const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cardRoutes = require('./routes/cardRoutes');
const goalRoutes = require('./routes/goalRoutes');
const currencyRoutes = require('./routes/currencyRoutes');
const userRoutes = require('./routes/userRoutes');
const emailRoutes = require('./routes/emailRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Adicione isso logo após os imports das rotas
console.log('🔍 Verificando rotas importadas...');
console.log('authRoutes:', authRoutes ? '✓ Importado' : '✗ FALTOU');
console.log('transactionRoutes:', transactionRoutes ? '✓ Importado' : '✗ FALTOU');
console.log('categoryRoutes:', categoryRoutes ? '✓ Importado' : '✗ FALTOU');
console.log('cardRoutes:', cardRoutes ? '✓ Importado' : '✗ FALTOU');
console.log('goalRoutes:', goalRoutes ? '✓ Importado' : '✗ FALTOU');
console.log('currencyRoutes:', currencyRoutes ? '✓ Importado' : '✗ FALTOU');
console.log('userRoutes:', userRoutes ? '✓ Importado' : '✗ FALTOU');
console.log('emailRoutes:', emailRoutes ? '✓ Importado' : '✗ FALTOU');
console.log('notificationRoutes:', notificationRoutes ? '✓ Importado' : '✗ FALTOU');

// Initialize express app
const app = express();

// Check for essential environment variables
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET is not defined in .env file. Authentication will likely fail.');
} else {
  console.log(`✅ JWT_SECRET loaded (length: ${process.env.JWT_SECRET.length})`);
}

// Connect to database
connectDB();

// CORS configuration - More permissive for all environments
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://finance-dashboard-rich.vercel.app',
  'https://finance-dashboard-frontend.vercel.app',
  'https://finance-dashboard-backend-ashy.vercel.app',
  'https://finance-dashboard-adjtzrjc7-vinicius-silvas-projects.vercel.app'
];

// Add Vercel URLs dynamically
if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow all localhost origins for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true);

    // Allow Vercel preview deployments
    if (origin.includes('vercel.app')) return callback(null, true);

    // Check against allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // For production, be more restrictive
    if (process.env.NODE_ENV === 'production') {
      console.log('Blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'), false);
    }

    // For development, allow all
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan('combined')); // Changed to combined for more detailed logs
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Debug middleware for Authorization
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && !req.path.includes('/auth/') && !req.path.includes('/health')) {
    if (!req.headers.authorization) {
      console.warn(`⚠️  [Auth Check] Missing Authorization header for: ${req.method} ${req.path}`);
    } else {
      const token = req.headers.authorization.split(' ')[1];
      console.log(`ℹ️  [Auth Check] Token received for ${req.path}: ${token ? token.substring(0, 15) + '...' : 'Invalid format'}`);
    }
  }
  next();
});

// Handle preflight requests
app.options('*', cors(corsOptions));

// Test route
app.get('/api/test', (req, res) => {
  console.log('Test route called:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
  res.json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Routes with detailed logging
console.log('🔧 Setting up API routes...');

app.use('/api/auth', (req, res, next) => {
  console.log(`📥 Auth route called: ${req.method} ${req.originalUrl}`);
  next();
}, authRoutes);

app.use('/api/transactions', (req, res, next) => {
  console.log(`📥 Transactions route called: ${req.method} ${req.originalUrl}`);
  next();
}, transactionRoutes);

app.use('/api/categories', (req, res, next) => {
  console.log(`📥 Categories route called: ${req.method} ${req.originalUrl}`);
  next();
}, categoryRoutes);

app.use('/api/cards', (req, res, next) => {
  console.log(`📥 Cards route called: ${req.method} ${req.originalUrl}`);
  next();
}, cardRoutes);

app.use('/api/goals', (req, res, next) => {
  console.log(`📥 Goals route called: ${req.method} ${req.originalUrl}`);
  next();
}, goalRoutes);

app.use('/api/currencies', (req, res, next) => {
  console.log(`📥 Currencies route called: ${req.method} ${req.originalUrl}`);
  next();
}, currencyRoutes);

app.use('/api/user', (req, res, next) => {
  console.log(`📥 User route called: ${req.method} ${req.originalUrl}`);
  next();
}, userRoutes);

app.use('/api/email', (req, res, next) => {
  console.log(`📥 Email route called: ${req.method} ${req.originalUrl}`);
  next();
}, emailRoutes);

app.use('/api/notifications', (req, res, next) => {
  console.log(`📥 Notifications route called: ${req.method} ${req.originalUrl}`);
  next();
}, notificationRoutes);

console.log('✅ API routes configured successfully');

// Health check route
app.get('/api/health', (req, res) => {
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
    timestamp: new Date().toISOString()
  });
});

// Test route (simples)
app.get('/api/test-simple', (req, res) => {
  res.json({ message: 'Simple test works!' });
});

// Test POST route
app.post('/api/test-post', (req, res) => {
  res.json({
    message: 'POST test works!',
    received: req.body
  });
});

// Debug route para verificar todas as rotas registradas
app.get('/api/debug-routes', (req, res) => {
  const routes = [];

  // Função para extrair rotas
  function printRoutes(layer, prefix = '') {
    if (layer.route) {
      const path = prefix + layer.route.path;
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(', ');
      routes.push({ path, methods });
    } else if (layer.name === 'router' && layer.handle.stack) {
      const routerPrefix = layer.regexp.toString()
        .replace('/^', '')
        .replace('\\/?(?=\\/|$)/i', '')
        .replace(/\\\//g, '/')
        .replace(/\/\^/g, '')
        .replace(/\$\/i/g, '')
        .replace(/\?/g, '')
        .replace(/\(\?=\\\/\|\$\)/g, '');

      layer.handle.stack.forEach(sublayer => {
        printRoutes(sublayer, routerPrefix);
      });
    }
  }

  app._router.stack.forEach(layer => {
    printRoutes(layer);
  });

  res.json({
    totalRoutes: routes.length,
    routes: routes
  });
});

// 404 handler - DEVE SER A ÚLTIMA ROTA
app.use('/api/*', (req, res) => {
  const availableEndpoints = [
    '/api/auth/*',
    '/api/transactions/*',
    '/api/categories/*',
    '/api/cards/*',
    '/api/goals/*',
    '/api/currencies/*',
    '/api/user/*',
    '/api/email/*',
    '/api/notifications/*',
    '/api/health',
    '/api/test',
    '/api/test-simple',
    '/api/test-post'
  ];

  console.log(`⚠️  API endpoint not found: ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    message: 'API endpoint not found',
    requestedPath: req.path,
    method: req.method,
    availableEndpoints: availableEndpoints
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Handle CORS errors
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  // Handle CORS policy violations
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Forbidden'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// For Vercel deployment, export the app directly
module.exports = app;

// For local development, start the server
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    console.log(`
    ===========================================
    🚀 Server running on port ${PORT}
    ===========================================
    Environment: ${process.env.NODE_ENV || 'development'}
    Frontend URL: http://localhost:5173
    API URL: http://localhost:${PORT}/api
    Health check: http://localhost:${PORT}/api/health
    ===========================================
    `);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      mongoose.connection.close();
    });
  });
}

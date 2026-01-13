// middleware/cors.js
const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir todas as origens em desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Em produção, especifique os domínios permitidos
    const allowedOrigins = [
      'https://finance-dashboard-rich.vercel.app',
      'https://seu-frontend.vercel.app',
      'http://localhost:3000'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

module.exports = cors(corsOptions);
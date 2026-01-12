const express = require('express');
const cors = require('cors');

const app = express();

// Configuração CORS mais permissiva para teste
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Rota de teste CORS
app.get('/api/test-cors', (req, res) => {
  res.json({
    message: 'CORS test successful!',
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
});

// Rota de login de teste
app.post('/api/test-login', (req, res) => {
  console.log('Login attempt:', req.body);
  
  // Simulação de login bem-sucedido
  if (req.body.email && req.body.password) {
    return res.json({
      success: true,
      token: 'test-jwt-token-12345',
      user: {
        id: 1,
        email: req.body.email,
        name: 'Test User'
      }
    });
  }
  
  res.status(401).json({
    success: false,
    message: 'Invalid credentials'
  });
});

app.listen(3001, () => {
  console.log('Test CORS server running on http://localhost:3001');
});
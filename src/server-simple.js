const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware básico
app.use(cors());
app.use(express.json());

// Configuração do banco de dados
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finance_dashboard';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Continuando sem MongoDB para testes...');
});

// Rotas de teste
app.get('/', (req, res) => {
    res.json({ 
        message: 'Finance Dashboard API',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

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
        api: 'running',
        database: statusMap[dbStatus] || 'unknown',
        timestamp: new Date().toISOString()
    });
});

// Rota de teste de autenticação simulada
app.post('/api/auth/register', (req, res) => {
    console.log('Registration attempt:', req.body);
    res.json({
        success: true,
        message: 'User registered successfully (simulated)',
        data: {
            user: {
                id: 'simulated-id',
                name: req.body.name,
                email: req.body.email
            },
            token: 'simulated-jwt-token'
        }
    });
});

app.post('/api/auth/login', (req, res) => {
    console.log('Login attempt:', req.body);
    res.json({
        success: true,
        message: 'Login successful (simulated)',
        data: {
            user: {
                id: 'simulated-id',
                name: 'John Doe',
                email: req.body.email
            },
            token: 'simulated-jwt-token'
        }
    });
});

// Middleware de erro simples
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Rota para 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🏠 Home: http://localhost:${PORT}/`);
    console.log(`🔗 MongoDB URI: ${MONGODB_URI}`);
});
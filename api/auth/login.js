// Redireciona para a aplicação principal (Express) em api/index.js
// Isso garante que CORS, Autenticação e Rotas sejam tratados corretamente pelo app principal
module.exports = async (req, res) => {
  try {
    // Import the main Express app
    const app = require('../index');

    // Modify the URL to match the internal routing
    req.url = '/api/auth/login';

    // Handle the request with the main app
    return app(req, res);
  } catch (error) {
    console.error('Error in login handler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

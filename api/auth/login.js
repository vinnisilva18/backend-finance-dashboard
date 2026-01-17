// Redireciona para a aplicação principal (Express) em api/index.js
// Isso garante que CORS, Autenticação e Rotas sejam tratados corretamente pelo app principal
module.exports = (req, res) => {
  req.url = '/api/auth/login';
  const app = require('../index');
  return app(req, res);
};

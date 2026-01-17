// Redireciona para a aplicação principal (Express) em api/index.js
module.exports = (req, res) => {
  req.url = '/api/health';
  const app = require('./index');
  return app(req, res);
};

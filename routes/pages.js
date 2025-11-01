const express = require('express');
const router = express.Router();

// --- Rutas de las páginas ---
router.get('/', (req, res) => {
  res.render('index', { title: 'Editor Web' });
});

router.get('/curl', (req, res) => {
  res.render('curl', { title: 'Herramienta cURL' });
});

router.get('/database', (req, res) => {
  res.render('database', { title: 'Herramienta Database' });
});

module.exports = router;
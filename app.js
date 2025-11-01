const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { importer } = require('@dbml/core');
const cors = require('cors');

const editorApiRouter = require('./routes/editor');
const databaseApiRouter = require('./routes/database');
const pagesRouter = require('./routes/pages');

const app = express();
app.use(cors()); // --- NUEVO ---
app.use(express.json()); // Middleware para parsear el cuerpo de las peticiones JSON

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// --- Usar los enrutadores ---
// Monta las rutas de la API bajo prefijos específicos
app.use('/api/files', editorApiRouter);
app.use('/api/database', databaseApiRouter);

// Monta las rutas de las páginas en la raíz
app.use('/', pagesRouter);

module.exports = app;

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

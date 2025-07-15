const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();

// Directorio donde se guardan los archivos
const FILES_DIR = path.join(__dirname, "files_to_edit");

// Configuración del motor de vistas (EJS)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Servir archivos estáticos (CSS, JS del cliente) desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// --- RUTAS DE LA API ---

// API para obtener la lista de archivos
app.get('/api/files', (req, res) => {
  fs.readdir(FILES_DIR, (err, files) => {
    if (err) {
      console.error("No se pudo leer el directorio de archivos:", err);
      // Si el directorio no existe, devuelve una lista vacía en lugar de un error.
      if (err.code === 'ENOENT') {
        return res.json([]);
      }
      return res.status(500).json({ error: "Error al leer el directorio de archivos." });
    }
    res.json(files.filter(file => fs.statSync(path.join(FILES_DIR, file)).isFile()));
  });
});

// API para obtener el contenido de un archivo
app.get('/api/files/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(FILES_DIR, filename);

  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) {
      console.error(`No se pudo leer el archivo ${filename}:`, err);
      return res.status(404).json({ error: "Archivo no encontrado." });
    }
    res.json({ filename, content });
  });
});

// --- RUTAS DE LAS PÁGINAS ---

// Ruta para la página del editor
app.get('/', (req, res) => {
  res.render('index', { title: 'Editor Web' });
});

// Ruta para la página de la herramienta cURL
app.get('/curl', (req, res) => {
  res.render('curl', { title: 'Herramienta cURL' });
});

module.exports = app;

// Nota: WebStorm usualmente maneja el inicio del servidor en un archivo 'bin/www'.
// Si tu proyecto tiene ese archivo, no necesitas las siguientes líneas aquí.
// Si app.js es tu archivo principal de inicio, descoméntalas.
/*
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
*/
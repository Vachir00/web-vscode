const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(express.json()); // Middleware para parsear el cuerpo de las peticiones JSON

const FILES_DIR = path.join(__dirname, "files_to_edit");

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// --- API Endpoints ---

// API para listar archivos
app.get('/api/files', (req, res) => {
  fs.readdir(FILES_DIR, (err, files) => {
    if (err) {
      console.error("No se pudo leer el directorio:", err);
      if (err.code === 'ENOENT') {
        return res.json([]);
      }
      return res.status(500).json({ error: "Error al leer el directorio." });
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
      console.error(`Error leyendo ${filename}:`, err);
      return res.status(404).json({ error: "Archivo no encontrado." });
    }
    res.json({ filename, content });
  });
});

// API para CREAR un nuevo archivo
app.post('/api/files', (req, res) => {
  const { filename, content } = req.body;
  const filePath = path.join(FILES_DIR, filename);

  if (!filename) {
    return res.status(400).json({ error: "El nombre del archivo es requerido." });
  }

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (!err) {
      return res.status(409).json({ error: `El archivo "${filename}" ya existe.` });
    }

    fs.writeFile(filePath, content || '', 'utf8', (writeErr) => {
      if (writeErr) {
        console.error(`Error creando ${filename}:`, writeErr);
        return res.status(500).json({ error: `No se pudo crear el archivo "${filename}".` });
      }
      res.status(201).json({ message: `Archivo "${filename}" creado exitosamente.` });
    });
  });
});

// API para GUARDAR el contenido de un archivo existente
app.put('/api/files/:filename', (req, res) => {
  const { filename } = req.params;
  const { content } = req.body;
  const filePath = path.join(FILES_DIR, filename);

  fs.writeFile(filePath, content, 'utf8', (err) => {
    if (err) {
      console.error(`Error guardando ${filename}:`, err);
      return res.status(500).json({ error: `No se pudieron guardar los cambios en "${filename}".` });
    }
    res.json({ message: `Archivo "${filename}" guardado correctamente.` });
  });
});

// --- Rutas de las páginas ---
app.get('/', (req, res) => {
  res.render('index', { title: 'Editor Web' });
});

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
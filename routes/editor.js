const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Ajustamos la ruta para que suba un nivel desde 'routes'
const FILES_DIR = path.join(__dirname, "..", "files_to_edit");

// API para listar archivos (la ruta base es /)
router.get('/', (req, res) => {
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
router.get('/:filename', (req, res) => {
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
router.post('/', (req, res) => {
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
router.put('/:filename', (req, res) => {
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

module.exports = router;
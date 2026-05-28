const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Base de datos en la raíz del proyecto
const dbPath = path.join(__dirname, '..', 'segundo_cerebro.db');
const db = new sqlite3.Database(dbPath);

// Inicializar la tabla
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS notas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        contenido_json TEXT, -- Aquí se guardará el JSON de Editor.js como String
        actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// API: Listar notas para el sidebar izquierdo
router.get('/api/notas', (req, res) => {
    db.all("SELECT id, titulo, actualizado_en FROM notas ORDER BY actualizado_en DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API: Obtener el contenido de una nota específica
router.get('/api/notas/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM notas WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Nota no encontrada" });

        // Convertimos el string de la BD de vuelta a Objeto JSON para Editor.js
        row.contenido = row.contenido_json ? JSON.parse(row.contenido_json) : null;
        res.json(row);
    });
});

// API: Guardar o actualizar una nota
router.post('/api/notas', (req, res) => {
    const { id, titulo, contenido } = req.body; // 'contenido' viene como Objeto desde el front
    const contenidoString = JSON.stringify(contenido);

    if (id) {
        // Actualizar
        const query = `UPDATE notas SET titulo = ?, contenido_json = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`;
        db.run(query, [titulo, contenidoString, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Nota actualizada", id });
        });
    } else {
        // Crear nueva
        const query = `INSERT INTO notas (titulo, contenido_json) VALUES (?, ?)`;
        db.run(query, [titulo, contenidoString], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Nota creada", id: this.lastID });
        });
    }
});

module.exports = router;
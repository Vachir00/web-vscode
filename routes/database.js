const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { importer } = require('@dbml/core');

const util = require('util');
const execPromise = util.promisify(exec);

// Ajustamos la ruta para que suba un nivel desde 'routes'
const DATABASES_DIR = path.join(__dirname, "..", "database_configs");

// API para obtener las configuraciones existentes
router.get('/', (req, res) => {
    fs.readdir(DATABASES_DIR, (err, files) => {
        if (err) {
            if (err.code === 'ENOENT') return res.json([]);
            return res.status(500).json({ error: "Error al leer el directorio." });
        }
        res.json(files.filter(file => fs.statSync(path.join(DATABASES_DIR, file)).isFile()));
    });
});

// API para OBTENER el contenido de un config de BD
router.get('/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(DATABASES_DIR, filename);

    fs.readFile(filePath, 'utf8', (err, content) => {
        if (err) {
            return res.status(404).json({ error: "Configuración no encontrada." });
        }
        try {
            res.json(JSON.parse(content));
        } catch (parseErr) {
            res.status(500).json({ error: "Error al parsear el archivo de configuración." });
        }
    });
});

// API para CREAR un nuevo config de BD
router.post('/', (req, res) => {
    const { filename } = req.body;
    if (!filename.endsWith('.json')) {
        return res.status(400).json({ error: "El nombre debe terminar en .json" });
    }
    const filePath = path.join(DATABASES_DIR, filename);
    const defaultContent = JSON.stringify({
        dbType: "postgres", host: "localhost", port: 5432, user: "root", password: "", dbname: "mi_base_de_datos"
    }, null, 2);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (!err) {
            return res.status(409).json({ error: `La conexión "${filename}" ya existe.` });
        }
        fs.writeFile(filePath, defaultContent, 'utf8', (writeErr) => {
            if (writeErr) {
                return res.status(500).json({ error: `No se pudo crear la conexión.` });
            }
            res.status(201).json({ message: `Conexión "${filename}" creada.` });
        });
    });
});

// API para GUARDAR un config de BD
router.put('/:filename', (req, res) => {
    const { filename } = req.params;
    const { dbType, host, port, user, password, dbname } = req.body;
    const filePath = path.join(DATABASES_DIR, filename);
    const content = JSON.stringify({ dbType, host, port, user, password, dbname }, null, 2);

    fs.writeFile(filePath, content, 'utf8', (err) => {
        if (err) {
            return res.status(500).json({ error: `No se pudo guardar la conexión.` });
        }
        res.json({ message: `Conexión "${filename}" guardada.` });
    });
});

// --- API PARA GENERAR DBML (REESCRITA CON ASYNC/AWAIT Y VISTAS) ---
router.post('/generate-dbml', async (req, res) => {
    const { host, port, user, password, dbname, dbType } = req.body;
    let env = { ...process.env };
    let dumpCommand = '';
    let queryViewsCommand = '';

    try {
        // Paso 1: Configurar comandos para el motor de BD
        if (dbType === 'postgres') {
            env.PGPASSWORD = password;
            dumpCommand = `pg_dump --schema-only -h ${host} -p ${port} -U ${user} -d ${dbname}`;

            // Consulta para obtener Vistas (schema public por defecto)
            const viewQuery = `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'VIEW') ORDER BY table_name, ordinal_position;`;
            // psql: -A (sin alinear), -F, (separador coma), -t (solo tuplas, sin headers)
            queryViewsCommand = `psql -h ${host} -p ${port} -U ${user} -d ${dbname} -A -F, -t -c "${viewQuery}"`;

        } else if (dbType === 'mysql') {
            env.MYSQL_PWD = password;
            dumpCommand = `mysqldump --no-data -h ${host} -P ${port} -u ${user} ${dbname}`;

            // Consulta para obtener Vistas
            const viewQuery = `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = '${dbname}' AND table_name IN (SELECT table_name FROM information_schema.tables WHERE table_schema = '${dbname}' AND table_type = 'VIEW') ORDER BY table_name, ordinal_position;`;
            // mysql: -s (silent) y -N (sin headers) para output limpio, separado por tabs
            queryViewsCommand = `mysql -h ${host} -P ${port} -u ${user} -D ${dbname} -s -N -e "${viewQuery}"`;

        } else {
            return res.status(400).json({ error: "Tipo de base de datos no soportado." });
        }

        // Paso 2: Ejecutar el dump para obtener Tablas y Relaciones
        const { stdout: sql_dump } = await execPromise(dumpCommand, { env });
        const dbml_text_tables = importer.import(sql_dump, dbType);

        // Paso 4: Combinar el DBML
        const final_dbml = dbml_text_tables

        // Paso 5: Renderizar el DBML final a SVG
        const dbmlRendererModule = await import('@softwaretechnik/dbml-renderer');
        const renderFunction = dbmlRendererModule.run;
        const svg_content = renderFunction(final_dbml, 'svg', );

        // Paso 6: Enviar el SVG
        res.json({ svg: svg_content });

    } catch (error) {
        // Catch global para cualquier error (dump, render, etc.)
        console.error('Error al generar el diagrama:', error.message);
        res.status(500).json({
            error: "Error al generar el diagrama.",
            details: error.stderr || error.message
        });
    }
});

module.exports = router;
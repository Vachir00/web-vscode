const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { importer } = require('@dbml/core');
// const dbmlCore = require('@dbml/core');
const cors = require('cors');
// const dbmlRenderer = require('@softwaretechnik/dbml-renderer');


const app = express();
app.use(cors()); // --- NUEVO ---
app.use(express.json()); // Middleware para parsear el cuerpo de las peticiones JSON

const FILES_DIR = path.join(__dirname, "files_to_edit");
const DATABASES_DIR = path.join(__dirname, "database_configs");

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

// APIS DATABASE MANAGEMENT

// API para obtener las configuraciones existentes si las hay
app.get('/api/database', (req, res) => {
  fs.readdir(DATABASES_DIR, (err, files) => {
    if (err) {
      console.error("No se pudo leer el directorio:", err);
      if (err.code === 'ENOENT') {
        return res.json([]);
      }
      return res.status(500).json({ error: "Error al leer el directorio." });
    }
    // --- CORREGIDO ---
    // Corregí el path aquí, estaba usando FILES_DIR en lugar de DATABASES_DIR
    res.json(files.filter(file => fs.statSync(path.join(DATABASES_DIR, file)).isFile()));
  });
});

// --- NUEVO: API para OBTENER el contenido de un config de BD ---
app.get('/api/database/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(DATABASES_DIR, filename);

  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) {
      console.error(`Error leyendo ${filename}:`, err);
      return res.status(404).json({ error: "Configuración no encontrada." });
    }
    // Asumimos que el contenido es JSON
    try {
      res.json(JSON.parse(content));
    } catch (parseErr) {
      res.status(500).json({ error: "Error al parsear el archivo de configuración." });
    }
  });
});

// --- NUEVO: API para CREAR un nuevo config de BD ---
app.post('/api/database', (req, res) => {
  const { filename } = req.body; // Solo necesitamos un nombre de archivo
  const filePath = path.join(DATABASES_DIR, filename);

  if (!filename.endsWith('.json')) {
    return res.status(400).json({ error: "El nombre debe terminar en .json" });
  }

  // Contenido por defecto
  const defaultContent = JSON.stringify({
    dbType: "postgres",
    host: "localhost",
    port: 5432,
    user: "root",
    password: "",
    dbname: "mi_base_de_datos"
  }, null, 2);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (!err) {
      return res.status(409).json({ error: `La conexión "${filename}" ya existe.` });
    }

    fs.writeFile(filePath, defaultContent, 'utf8', (writeErr) => {
      if (writeErr) {
        console.error(`Error creando ${filename}:`, writeErr);
        return res.status(500).json({ error: `No se pudo crear la conexión.` });
      }
      res.status(201).json({ message: `Conexión "${filename}" creada.` });
    });
  });
});

// --- NUEVO: API para GUARDAR un config de BD ---
app.put('/api/database/:filename', (req, res) => {
  const { filename } = req.params;
  // Recibimos el objeto de conexión completo
  const { dbType, host, port, user, password, dbname } = req.body;
  const filePath = path.join(DATABASES_DIR, filename);

  const content = JSON.stringify({
    dbType, host, port, user, password, dbname
  }, null, 2);

  fs.writeFile(filePath, content, 'utf8', (err) => {
    if (err) {
      console.error(`Error guardando ${filename}:`, err);
      return res.status(500).json({ error: `No se pudo guardar la conexión.` });
    }
    res.json({ message: `Conexión "${filename}" guardada.` });
  });
});

// --- NUEVO ENDPOINT DE DBML ---
// API para conectarse a la BD, dumpear el schema y convertirlo a DBML
app.post('/api/database/generate-dbml', (req, res) => {
  // ... (toda la parte de 'command' y 'env' se queda igual) ...
  const { host, port, user, password, dbname, dbType } = req.body;

  let command = '';
  let env = { ...process.env };

  if (dbType === 'postgres') {
    env.PGPASSWORD = password;
    command = `pg_dump --schema-only -h ${host} -p ${port} -U ${user} -d ${dbname}`;
  } else if (dbType === 'mysql') {
    env.MYSQL_PWD = password;
    command = `mysqldump --no-data -h ${host} -P ${port} -u ${user} ${dbname}`;
  } else {
    return res.status(400).json({ error: "Tipo de base de datos no soportado." });
  }

  // Hacemos que la función callback sea asíncrona
  exec(command, { env }, async (error, stdout, stderr) => {
    if (error) {
      console.error('Error al ejecutar dump:', stderr);
      return res.status(500).json({
        error: `Error al conectarse o dumpear la base de datos.`,
        details: `Asegúrate de que las credenciales son correctas.`
      });
    }

    try {
      // 1. Convertimos SQL a DBML (esto funciona)
      const dbml_text = importer.import(stdout, dbType);

      // --- ¡NUEVO PASO DE DEPURACIÓN! ---
      // console.log("--- Iniciando depuración de dbml-renderer ---");
      const dbmlRendererModule = await import('@softwaretechnik/dbml-renderer');
      // console.log("CONTENIDO DE dbmlRendererModule:", dbmlRendererModule);
      // console.log("--- Fin de la depuración ---");
      // --- FIN DE LA DEPURACIÓN ---

      // La función que queremos es la exportación 'run'
      const renderFunction = dbmlRendererModule.run;

      // 3. Convertimos DBML a SVG
      const svg_content = renderFunction(dbml_text, 'svg');

      // 4. Enviamos el SVG como respuesta
      res.json({ svg: svg_content });

    } catch (importError) {
      console.error('Error al convertir a DBML o SVG:', importError.message);
      res.status(500).json({
        error: "El schema SQL se obtuvo, pero falló la conversión a DBML o SVG.",
        details: importError.message
      });
    }
  });
});
// --- FIN NUEVO ENDPOINT ---


// --- Rutas de las páginas ---
app.get('/', (req, res) => {
  res.render('index', { title: 'Editor Web' });
});

app.get('/curl', (req, res) => {
  res.render('curl', { title: 'Herramienta cURL' });
});

app.get('/database', (req, res) => {
  res.render('database', { title: 'Herramienta Database' });
});

module.exports = app;

// Nota: WebStorm usualmente maneja el inicio del servidor en un archivo 'bin/www'.
// Si tu proyecto tiene ese archivo, no necesitas las siguientes líneas aquí.
// Si app.js es tu archivo principal de inicio, descoméntalas.

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

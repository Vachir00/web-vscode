document.addEventListener('DOMContentLoaded', () => {
    // Verificamos que estamos en la página correcta
    if (!document.getElementById('db-sidebar')) {
        return;
    }

    let currentConnectionFile = null;
    const dbListContainer = document.getElementById('db-list');
    const createDbBtn = document.getElementById('create-db-btn');
    const saveDbBtn = document.getElementById('save-db-btn');
    const dbForm = document.getElementById('db-form');
    const diagramContainer = document.getElementById('diagram-container');
    let currentSvgContent = null;
    const downloadSvgBtn = document.getElementById('download-svg-btn');
    const downloadPngBtn = document.getElementById('download-png-btn');

    // --- Cargar lista de conexiones (como loadFileList) ---
    async function loadDbList() {
        try {
            const response = await fetch('/api/database'); // API de configs
            if (!response.ok) throw new Error('No se pudo obtener la lista de conexiones.');

            const files = await response.json();
            dbListContainer.innerHTML = '';

            if (files.length === 0) {
                dbListContainer.innerHTML = '<div class="file-item" style="color: #888;">No hay conexiones.</div>';
            } else {
                files.forEach(filename => {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-item';
                    fileItem.textContent = filename;
                    // Al hacer clic, cargamos los datos de esa conexión
                    fileItem.addEventListener('click', () => loadDbConfig(filename));
                    dbListContainer.appendChild(fileItem);
                });
            }
        } catch (error) {
            dbListContainer.innerHTML = `<div class="file-item" style="color: #ff8a8a;">${error.message}</div>`;
        }
    }

    // --- Cargar datos de una conexión al formulario (como loadFileContent) ---
    async function loadDbConfig(filename) {
        try {
            const response = await fetch(`/api/database/${filename}`); // API para 1 config
            if (!response.ok) throw new Error('No se pudo cargar la conexión.');

            const config = await response.json();

            // Llenar el formulario
            document.getElementById('dbType').value = config.dbType;
            document.getElementById('host').value = config.host;
            document.getElementById('port').value = config.port;
            document.getElementById('dbname').value = config.dbname;
            document.getElementById('user').value = config.user;
            document.getElementById('password').value = config.password;

            currentConnectionFile = filename; // Marcar como archivo actual
            diagramContainer.innerHTML = `<h3 style="color: #888; text-align: center; margin-top: 50px;">Configuración "${filename}" cargada. Presiona "Generar Diagrama".</h3>`;

        } catch (error) {
            diagramContainer.innerHTML = `<h3>Error al cargar ${filename}: ${error.message}</h3>`;
            currentConnectionFile = null;
        }
    }

    // --- Lógica para Crear Nueva Conexión (como createFileBtn) ---
    createDbBtn.addEventListener('click', async () => {
        const newFilename = prompt('Nombre de la conexión (ej: produccion.json):');
        if (newFilename) {
            try {
                const response = await fetch('/api/database', { // API POST
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: newFilename })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'No se pudo crear la conexión.');
                }

                await loadDbList(); // Recargar lista
                loadDbConfig(newFilename); // Cargar el nuevo config

            } catch (error) {
                alert(`Error al crear conexión: ${error.message}`);
            }
        }
    });

    // --- Lógica para Guardar Conexión (como saveFileBtn) ---
    saveDbBtn.addEventListener('click', async () => {
        if (currentConnectionFile) {
            const config = {
                dbType: document.getElementById('dbType').value,
                host: document.getElementById('host').value,
                port: document.getElementById('port').value,
                dbname: document.getElementById('dbname').value,
                user: document.getElementById('user').value,
                password: document.getElementById('password').value
            };

            try {
                const response = await fetch(`/api/database/${currentConnectionFile}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'No se pudieron guardar los cambios.');
                }

                alert(`Conexión "${currentConnectionFile}" guardada.`);

            } catch (error) {
                alert(`Error al guardar la conexión: ${error.message}`);
            }
        } else {
            alert('No hay ninguna conexión seleccionada para guardar.');
        }
    });

    // --- NUEVO: Lógica para Generar el Diagrama ---
    dbForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        diagramContainer.innerHTML = `<h3 style="color: #888; text-align: center; margin-top: 50px;">Generando diagrama...</h3>`;

        // --- NUEVO: Reseteamos el SVG guardado ---
        currentSvgContent = null;

        try {
            const formData = new FormData(dbForm);
            const config = Object.fromEntries(formData.entries());

            const response = await fetch('/api/database/generate-dbml', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Error desconocido del servidor.');
            }

            const data = await response.json();

            // 1. Guardamos el SVG en nuestra variable global
            currentSvgContent = data.svg;

            // 2. Mostramos el SVG (como antes)
            diagramContainer.innerHTML = currentSvgContent;

            // 3. Estilizamos el SVG (como antes)
            const svgElement = diagramContainer.querySelector('svg');
            if (svgElement) {
                svgElement.style.width = '100%';
                svgElement.style.height = 'auto';
                svgElement.style.maxWidth = '100%';
            }

        } catch (error) {
            diagramContainer.innerHTML = `<h3 style="color: #ff8a8a; padding: 20px;">Error al generar: ${error.message}</h3>`;
        }
    });


    // --- NUEVO: Lógica de descarga ---

    // 1. Descargar SVG
    downloadSvgBtn.addEventListener('click', () => {
        if (!currentSvgContent) {
            alert('Por favor, genera un diagrama primero.');
            return;
        }
        // Usamos la función helper de abajo
        downloadFile(currentSvgContent, 'diagrama.svg', 'image/svg+xml');
    });

    // 2. Descargar PNG
    downloadPngBtn.addEventListener('click', () => {
        if (!currentSvgContent) {
            alert('Por favor, genera un diagrama primero.');
            return;
        }
        // Usamos la función helper de abajo
        downloadSvgAsPng(currentSvgContent);
    });


    // --- NUEVO: Funciones Helper de Descarga ---

    /**
     * Helper genérico para crear y descargar un archivo en el navegador.
     */
    function downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Helper para convertir el SVG a PNG usando un Canvas.
     */
    function downloadSvgAsPng() {
        // 1. Obtenemos el SVG que ya está en la página
        const svgElement = diagramContainer.querySelector('svg');
        if (!svgElement) {
            alert('Error: No se encontró el SVG para convertir.');
            return;
        }

        // 2. Creamos un Canvas
        const canvas = document.createElement('canvas');

        // Obtenemos el tamaño real del SVG
        const bbox = svgElement.getBBox();
        const padding = 20; // Añadir un poco de espacio
        canvas.width = bbox.width + (padding * 2);
        canvas.height = bbox.height + (padding * 2);

        const ctx = canvas.getContext('2d');

        // 3. Creamos una imagen a partir del string SVG
        const img = new Image();
        img.onload = () => {
            // 4. Dibujamos el SVG en el Canvas
            // (Añadimos un fondo blanco, ya que el PNG soporta transparencia)
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, padding, padding); // Dibujar con el padding

            // 5. Obtenemos la URL de datos del Canvas (formato PNG)
            const pngDataUrl = canvas.toDataURL('image/png');

            // 6. Usamos un link para descargar
            const a = document.createElement('a');
            a.href = pngDataUrl;
            a.download = 'diagrama.png';
            a.click();
        };

        // Asignamos el contenido SVG (como data URI) a la fuente de la imagen
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(currentSvgContent);
    }

    // Carga inicial de la lista
    loadDbList();
});
require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.49.0/min/vs' } });

// Añadimos curlPreviewEditor a las variables globales
let headersEditor, bodyEditor, responseEditor, curlPreviewEditor;

require(['vs/editor/editor.main'], function() {
    const miniLogConfig = {
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        lineNumbers: 'off',
        glyphMargin: false,
        folding: false,
        scrollbar: { vertical: 'auto', horizontal: 'auto' }
    };

    // Editor de Headers
    headersEditor = monaco.editor.create(document.getElementById('headers-editor-container'), {
        value: '{\n  "Accept": "*/*"\n}',
        language: 'json',
        ...miniLogConfig
    });

    // Editor de Body
    bodyEditor = monaco.editor.create(document.getElementById('body-editor-container'), {
        value: '{\n  \n}',
        language: 'json',
        ...miniLogConfig
    });

    // NUEVO: Editor para previsualizar el cURL (Solo lectura, tipo shell)
    curlPreviewEditor = monaco.editor.create(document.getElementById('curl-preview-container'), {
        value: 'curl -X GET http://localhost:3000/api/curl/test-api',
        language: 'shell',
        theme: 'vs-dark',
        readOnly: true,
        automaticLayout: true,
        minimap: { enabled: false },
        lineNumbers: 'off',
        scrollbar: { vertical: 'hidden', horizontal: 'auto' }
    });

    // Editor de Respuesta (Lectura)
    responseEditor = monaco.editor.create(document.getElementById('response-editor-container'), {
        value: '// La respuesta de la API aparecerá aquí...',
        language: 'json',
        theme: 'vs-dark',
        readOnly: true,
        automaticLayout: true,
        minimap: { enabled: true }
    });

    // Escuchar cambios en los editores para actualizar el comando cURL en tiempo real
    headersEditor.onDidChangeModelContent(updateCurlPreview);
    bodyEditor.onDidChangeModelContent(updateCurlPreview);

    // Generar estado inicial
    updateCurlPreview();
});

// Elementos de la interfaz
const methodSelect = document.getElementById('request-method');
const urlInput = document.getElementById('request-url');
const bodyPanel = document.getElementById('body-panel');

// Escuchar cambios en los inputs tradicionales
methodSelect.addEventListener('change', (e) => {
    if (e.target.value === 'GET' || e.target.value === 'DELETE') {
        bodyPanel.style.display = 'none';
    } else {
        bodyPanel.style.display = 'block';
    }
    updateCurlPreview();
});

urlInput.addEventListener('input', updateCurlPreview);

// NUEVA FUNCIÓN: Genera el string de cURL dinámicamente
function updateCurlPreview() {
    if (!curlPreviewEditor) return; // Esperar a que Monaco esté listo

    const method = methodSelect.value;
    const url = urlInput.value || 'https://api.ejemplo.com/v1/...';

    let curlCommand = `curl -X ${method} "${url}"`;

    // 1. Parsear e incluir Headers si existen
    try {
        const headersRaw = headersEditor.getValue();
        if (headersRaw.trim()) {
            const headers = JSON.parse(headersRaw);
            Object.keys(headers).forEach(key => {
                curlCommand += ` \\\n  -H "${key}: ${headers[key]}"`;
            });
        }
    } catch (e) {
        // Ignoramos el error de parseo mientras el usuario escribe JSON incompleto
    }

    // 2. Incluir Body si aplica
    if (method !== 'GET' && method !== 'DELETE') {
        try {
            const bodyRaw = bodyEditor.getValue();
            if (bodyRaw.trim() && bodyRaw !== '{\n  \n}') {
                // Minificamos el JSON del body para que quepa bien en una sola línea de cURL
                const minifiedBody = JSON.stringify(JSON.parse(bodyRaw));
                curlCommand += ` \\\n  -d '${minifiedBody}'`;
            }
        } catch (e) {
            // Ignoramos mientras el JSON no esté completamente estructurado
        }
    }

    curlPreviewEditor.setValue(curlCommand);
}

// Evento de envío de la petición (se mantiene igual)
document.getElementById('send-request-btn').addEventListener('click', async () => {
    const url = urlInput.value;
    const method = methodSelect.value;
    const statusBadge = document.getElementById('response-status');
    const timeBadge = document.getElementById('response-time');

    if (!url) {
        alert('Por favor, ingresa una URL válida.');
        return;
    }

    statusBadge.innerText = 'Enviando...';
    statusBadge.style.color = '#e1b12c';
    timeBadge.innerText = '';
    responseEditor.setValue('// Esperando respuesta del servidor...');

    let headers = {};
    try {
        const headersRaw = headersEditor.getValue();
        if (headersRaw.trim()) headers = JSON.parse(headersRaw);
    } catch (e) {
        statusBadge.innerText = 'Error';
        statusBadge.style.color = '#e84118';
        responseEditor.setValue(`// Error al procesar JSON de Headers:\n${e.message}`);
        return;
    }

    let body = null;
    if (method !== 'GET' && method !== 'DELETE') {
        try {
            const bodyRaw = bodyEditor.getValue();
            if (bodyRaw.trim()) body = JSON.parse(bodyRaw);
        } catch (e) {
            statusBadge.innerText = 'Error';
            statusBadge.style.color = '#e84118';
            responseEditor.setValue(`// Error al procesar JSON del Body:\n${e.message}`);
            return;
        }
    }

    try {
        const res = await fetch('/api/curl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, method, headers, body })
        });

        const result = await res.json();

        if (res.ok && !result.error) {
            statusBadge.innerText = `${result.status} ${result.statusText}`;
            statusBadge.style.color = result.status >= 200 && result.status < 300 ? '#4cd137' : '#e84118';
            timeBadge.innerText = `Tiempo: ${result.time}`;

            const contentString = typeof result.data === 'object'
                ? JSON.stringify(result.data, null, 2)
                : result.data;
            responseEditor.setValue(contentString);
        } else {
            statusBadge.innerText = 'Error Server';
            statusBadge.style.color = '#e84118';
            responseEditor.setValue(JSON.stringify(result, null, 2));
        }

    } catch (error) {
        statusBadge.innerText = 'Error de Red';
        statusBadge.style.color = '#e84118';
        responseEditor.setValue(`// No se pudo conectar con el proxy local.\n${error.message}`);
    }
});

document.getElementById('copy-curl-btn').addEventListener('click', async function() {
    if (!curlPreviewEditor) return;

    const curlCode = curlPreviewEditor.getValue();

    try {
        // Copia el texto directo al portapapeles
        await navigator.clipboard.writeText(curlCode);

        // Feedback visual en el botón
        this.innerText = '¡Copiado!';
        this.style.background = '#4cd137'; // Verde éxito breve
        this.style.color = '#fff';

        // Revertir el botón a su estado original tras 1.5 segundos
        setTimeout(() => {
            this.innerText = 'Copiar';
            this.style.background = '#2d2d2d';
            this.style.color = '#aaa';
        }, 1500);

    } catch (err) {
        console.error('Error al copiar el código: ', err);
        alert('No se pudo copiar el comando automáticamente.');
    }
});

// Evento para copiar el contenido de la Respuesta al portapapeles
document.getElementById('copy-response-btn').addEventListener('click', async function() {
    if (!responseEditor) return;

    const responseCode = responseEditor.getValue();

    // Evitamos copiar el texto por defecto si el editor está vacío o tiene el placeholder inicial
    if (!responseCode || responseCode.startsWith('// La respuesta') || responseCode.startsWith('// Esperando')) {
        return;
    }

    try {
        await navigator.clipboard.writeText(responseCode);

        // Feedback visual en el botón
        this.innerText = '¡Copiado!';
        this.style.background = '#4cd137';
        this.style.color = '#fff';

        // Revertir a los 1.5 segundos
        setTimeout(() => {
            this.innerText = 'Copiar';
            this.style.background = '#2d2d2d';
            this.style.color = '#aaa';
        }, 1500);

    } catch (err) {
        console.error('Error al copiar la respuesta: ', err);
        alert('No se pudo copiar la respuesta automáticamente.');
    }
});
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('editor-container')) {
        return;
    }

    let editor;
    let currentFilename = null;
    const fileListContainer = document.getElementById('file-list');
    const editorContainer = document.getElementById('editor-container');
    const createFileBtn = document.getElementById('create-file-btn');
    const saveFileBtn = document.getElementById('save-file-btn');

    require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.49.0/min/vs' }});

    require(['vs/editor/editor.main'], function () {
        editor = monaco.editor.create(editorContainer, {
            value: '# Selecciona un archivo para comenzar a editar o crea uno nuevo.',
            language: 'markdown',
            theme: 'vs-dark',
            automaticLayout: true
        });
    });

    function getLanguageByExtension(filename) {
        const extension = filename.split('.').pop();
        switch (extension) {
            case 'py': return 'python';
            case 'js': return 'javascript';
            case 'json': return 'json';
            case 'html': return 'html';
            case 'css': return 'css';
            case 'yaml': case 'yml': return 'yaml';
            default: return 'plaintext';
        }
    }

    async function loadFileContent(filename) {
        try {
            const response = await fetch(`/api/files/${filename}`);
            if (!response.ok) throw new Error('No se pudo cargar el archivo.');

            const data = await response.json();

            const model = editor.getModel();
            const language = getLanguageByExtension(data.filename);

            monaco.editor.setModelLanguage(model, language);
            editor.setValue(data.content);
            currentFilename = data.filename; // Actualizar el archivo actual
        } catch (error) {
            editor.setValue(`# Error al cargar ${filename}:\n${error.message}`);
            currentFilename = null;
        }
    }

    async function loadFileList() {
        try {
            const response = await fetch('/api/files');
            if (!response.ok) throw new Error('No se pudo obtener la lista de archivos.');

            const files = await response.json();
            fileListContainer.innerHTML = '';

            if (files.length === 0) {
                fileListContainer.innerHTML = '<div class="file-item" style="color: #888;">No hay archivos.</div>';
            } else {
                files.forEach(filename => {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-item';
                    fileItem.textContent = filename;
                    fileItem.addEventListener('click', () => loadFileContent(filename));
                    fileListContainer.appendChild(fileItem);
                });
            }
        } catch (error) {
            fileListContainer.innerHTML = `<div class="file-item" style="color: #ff8a8a;">${error.message}</div>`;
        }
    }

    // --- Lógica para Crear Nuevo Archivo ---
    createFileBtn.addEventListener('click', async () => {
        const newFilename = prompt('Ingrese el nombre del nuevo archivo:');
        if (newFilename) {
            try {
                const response = await fetch('/api/files', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ filename: newFilename, content: '' })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'No se pudo crear el archivo.');
                }

                await loadFileList(); // Recargar la lista de archivos
                loadFileContent(newFilename); // Cargar el nuevo archivo en el editor

            } catch (error) {
                alert(`Error al crear el archivo: ${error.message}`);
            }
        }
    });

    // --- Lógica para Guardar Archivo ---
    saveFileBtn.addEventListener('click', async () => {
        if (currentFilename) {
            const content = editor.getValue();
            try {
                const response = await fetch(`/api/files/${currentFilename}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'No se pudieron guardar los cambios.');
                }

                alert(`Archivo "${currentFilename}" guardado.`);

            } catch (error) {
                alert(`Error al guardar el archivo: ${error.message}`);
            }
        } else {
            alert('No hay ningún archivo abierto para guardar.');
        }
    });

    loadFileList();
});
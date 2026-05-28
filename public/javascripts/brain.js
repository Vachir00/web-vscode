let editor;
let currentNoteId = null;

// 1. Inicializar Editor.js
function initEditor(initialData = null) {
    if (editor && typeof editor.destroy === 'function') {
        editor.destroy();
    }

    editor = new EditorJS({
        holder: 'editorjs',
        placeholder: '¡Empieza a escribir tus notas o snippets aquí!',

        // 1. IMPORTANTE: Le decimos a Editor.js qué herramienta usar para los párrafos normales
        // Usamos window.Paragraph si existe, o intentamos acceder a su exportación por defecto
        defaultBlock: 'paragraph',

        tools: {
            // No es necesario definir la clase de Paragraph porque viene incluida por defecto en el core
            paragraph: {
                inlineToolbar: true,
            },
            // Encabezados
            header: {
                class: window.Header,
                shortcut: 'CMD+SHIFT+H',
                config: { placeholder: 'Encabezado' }
            },
            // Listas (El nombre global en la v2.x cambió a EditorjsList)
            list: {
                class: window.EditorjsList || window.List,
                inlineToolbar: true
            },
            // Bloques de Código
            code: {
                class: window.CodeTool || window.Code
            }
        },
        data: initialData
    });
}

// 2. Cargar la lista de notas en el sidebar
async function loadNotesList() {
    const res = await fetch('/brain/api/notas');
    const notas = await res.json();
    const listContainer = document.getElementById('notes-list');
    listContainer.innerHTML = '';

    if (notas.length === 0) {
        listContainer.innerHTML = '<p style="color: #555; padding: 10px; font-size: 13px;">No hay notas guardadas</p>';
        return;
    }

    notas.forEach(nota => {
        const item = document.createElement('div');
        item.className = `file-item ${currentNoteId == nota.id ? 'active' : ''}`;
        item.innerText = nota.titulo || 'Nota sin título';
        item.style.cursor = 'pointer';
        item.style.padding = '8px 10px';

        item.addEventListener('click', () => loadNote(nota.id));
        listContainer.appendChild(item);
    });
}

// 3. Cargar una nota seleccionada al editor
async function loadNote(id) {
    currentNoteId = id;
    const res = await fetch(`/brain/api/notas/${id}`);
    const nota = await res.json();

    document.getElementById('note-title').value = nota.titulo;

    // Inicializamos el editor pasándole los bloques JSON que recuperamos de la BD
    initEditor(nota.contenido);
    loadNotesList(); // refrescar clase active
}

// 4. Guardar Nota (Botón Guardar)
document.getElementById('save-note-btn').addEventListener('click', async () => {
    const titulo = document.getElementById('note-title').value.trim() || 'Nota sin título';

    if (!editor) return;

    try {
        // El método .save() de EditorJS extrae el objeto JSON limpio estructurado en bloques
        const contenidoBlocks = await editor.save();

        const res = await fetch('/brain/api/notas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: currentNoteId,
                titulo,
                contenido: contenidoBlocks
            })
        });

        const result = await res.json();
        currentNoteId = result.id; // Asignamos el ID si era una nota nueva

        // Pequeño feedback visual
        const saveBtn = document.getElementById('save-note-btn');
        saveBtn.innerText = '¡Guardado!';
        saveBtn.style.background = '#4cd137';
        setTimeout(() => {
            saveBtn.innerText = 'Guardar Nota';
            saveBtn.style.background = '';
        }, 1000);

        loadNotesList();
    } catch (error) {
        console.error('Error al guardar la nota:', error);
        alert('Error al guardar la nota');
    }
});

// 5. Botón Nueva Nota
document.getElementById('new-note-btn').addEventListener('click', () => {
    currentNoteId = null;
    document.getElementById('note-title').value = '';
    initEditor(); // Carga un lienzo en blanco
    loadNotesList();
});

// Arrancar la interfaz
document.addEventListener('DOMContentLoaded', () => {
    initEditor();
    loadNotesList();
});
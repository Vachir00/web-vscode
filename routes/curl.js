const express = require('express');
const router = express.Router();

// API que actúa como Proxy "cURL"
router.post('/', async (req, res) => {
    const { url, method, headers, body } = req.body;

    if (!url) {
        return res.status(400).json({ error: "La URL es requerida." });
    }

    const startTime = Date.now();

    try {
        // Configuración para la petición externa
        const options = {
            method: method || 'GET',
            headers: headers || {}
        };

        // Si el método permite cuerpo, lo añadimos stringificado
        if (body && Object.keys(body).length > 0 && method !== 'GET' && method !== 'DELETE') {
            options.body = JSON.stringify(body);
            if (!options.headers['Content-Type']) {
                options.headers['Content-Type'] = 'application/json';
            }
        }

        // Ejecución de la petición
        const apiResponse = await fetch(url, options);
        const duration = Date.now() - startTime;

        // Intentar parsear como JSON, si falla se lee como texto plano
        let responseData;
        const contentType = apiResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            responseData = await apiResponse.json();
        } else {
            responseData = await apiResponse.text();
        }

        res.json({
            status: apiResponse.status,
            statusText: apiResponse.statusText,
            time: `${duration}ms`,
            data: responseData
        });

    } catch (error) {
        console.error('Error ejecutando el proxy cURL:', error.message);
        res.status(500).json({
            error: "No se pudo realizar la petición externa.",
            details: error.message
        });
    }
});

module.exports = router;
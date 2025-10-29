# 1. Usar una imagen base oficial de Node.js
# --- MODIFICACIÓN 1: Usamos Node 22 (basado en Alpine 3.20) ---
FROM node:22-alpine

# --- MODIFICACIÓN 2: DEPENDENCIAS DEL SISTEMA ---
# Instalamos 'postgresql17-client' (disponible en Alpine 3.20) y 'mysql-client'
RUN apk add --no-cache postgresql17-client mysql-client

# 2. Establecer el directorio de trabajo
WORKDIR /app

# 3. Copiar los archivos de dependencias
# Esto aprovecha el caché de Docker.
COPY package.json ./
# Asegúrate de copiar también el lockfile si existe
COPY package-lock.json ./

# 4. Instalar las dependencias de Node.js (solo producción)
# Usamos --omit=dev para no instalar 'nodemon' en la imagen final
RUN npm install --omit=dev

# 5. Copiar el resto del código de la aplicación
# Copiamos las carpetas y el app.js que la aplicación necesita
COPY app.js ./
COPY bin/ ./bin/
COPY public/ ./public/
COPY routes/ ./routes/
COPY views/ ./views/

# Creamos las carpetas de datos
# 'app.js' espera que 'files_to_edit' y 'database_configs' existan
RUN mkdir -p /app/files_to_edit
RUN mkdir -p /app/database_configs

# Opcional: Si quieres que el contenedor inicie con archivos/configs
# que ya tienes localmente, descomenta las siguientes líneas:
# COPY files_to_edit/ ./files_to_edit/
# COPY database_configs/ ./database_configs/

# 6. Exponer el puerto
EXPOSE 3000

# 7. El comando para iniciar (usa 'node ./bin/www' de tu package.json)
CMD ["npm", "start"]


# 1. Usar una imagen base oficial de Node.js
# Usamos la versión 20 y 'alpine' para que sea ligera
FROM node:20-alpine

# 2. Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# 3. Copiar los archivos de dependencias y package-lock.json
# Esto aprovecha el caché de Docker. Si no cambian, no reinstala todo.
COPY package.json ./
COPY package-lock.json ./

# 4. Instalar las dependencias del proyecto
RUN npm install

# 5. Copiar el resto del código de la aplicación al contenedor
RUN mkdir -p /app/bin
RUN mkdir -p /app/public
RUN mkdir -p /app/routes
RUN mkdir -p /app/views
COPY bin/* ./bin/
COPY public/* ./public/
COPY routes/* ./routes/
COPY views/* ./views/
COPY app.js ./
COPY files_to_edit/* ./files_to_edit/


# 6. Exponer el puerto en el que corre la aplicación
EXPOSE 8080

# 7. El comando para iniciar la aplicación cuando se ejecute el contenedor
CMD ["npm", "start"]
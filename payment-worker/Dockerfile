FROM node:20-alpine

WORKDIR /app

# On copie les fichiers de configuration en premier (optimisation cache)
COPY package*.json ./
RUN npm install

# On copie tout le reste du code
COPY . .

# Indispensable pour que le worker puisse parler à la DB
RUN npx prisma generate

# Commande de lancement
CMD ["node", "index.js"]
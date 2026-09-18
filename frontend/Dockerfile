# =============================================================================
# KAIJU - Crisis Manager : Frontend Angular Dockerfile (Multi-stage Build)
# =============================================================================

# --- Stage 1 : Build Angular App ---
FROM node:20-alpine AS build

WORKDIR /app

# Optimisation du cache npm
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copie des sources et compilation
COPY . .
RUN npm run build

# --- Stage 2 : Serveur Nginx de Production ---
FROM nginx:alpine

# Remplacement de la configuration par défaut
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copie des fichiers statiques compilés
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

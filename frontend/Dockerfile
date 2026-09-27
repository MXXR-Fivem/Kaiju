FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

FROM alpine:3.20 AS tiles

RUN apk add --no-cache curl

WORKDIR /tiles-build
COPY tiles-build/tile-list.txt tiles-build/fetch-tiles.sh ./
RUN chmod +x fetch-tiles.sh && ./fetch-tiles.sh /tiles tile-list.txt 48

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY --from=tiles /tiles /usr/share/nginx/html/tiles

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

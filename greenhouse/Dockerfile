# ══════════════════════════════════════════════════════════
#  Greenhouse Dashboard — React + Vite + Nginx
#  Build multi-stage, imagem final ~30MB
# ══════════════════════════════════════════════════════════

# ── Estágio 1: Build ────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Copia apenas o necessário para instalar dependências
# (cache de camada: muda só quando package.json muda)
COPY package.json package-lock.json ./
RUN npm ci

# Copia o código-fonte e faz o build
COPY index.html vite.config.ts tsconfig.json ./
COPY public ./public
COPY src ./src

# VITE_API_URL será injetado no build (proxy reverso via nginx)
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ── Estágio 2: Servir com Nginx ─────────────────────────
FROM nginx:1.27-alpine AS runtime

# Configuração custom do nginx (proxy /api para o servidor)
COPY <<'NGINX_EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/javascript application/json;

    # SPA — fallback para index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy reverso: /api/* → servidor Node.js
    location /api/ {
        proxy_pass http://server:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # Timeouts longos para polling de 3s
        proxy_read_timeout 30s;
    }

    # Cache de assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_EOF

# Copia o build do React para o diretório do nginx
COPY --from=build /app/dist /usr/share/nginx/html


EXPOSE 80

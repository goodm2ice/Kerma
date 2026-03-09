FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    KERMA_SOURCES_DIR=/data/sources \
    KERMA_EDITIONS_DIR=/data/editions \
    KERMA_CONFIG_DIR=/data/config

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx supervisor openssl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/log/supervisor /run/nginx /etc/nginx/certs /data/sources /data/editions /data/config

COPY core/requirements.txt /app/core/requirements.txt
RUN pip install --no-cache-dir -r /app/core/requirements.txt

COPY core /app/core
COPY --from=frontend-builder /build/frontend/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/start-backend.sh /app/start-backend.sh
COPY docker/kerma.env.example /data/config/kerma.env.example

RUN chmod +x /app/start-backend.sh \
    && openssl req -x509 -nodes -newkey rsa:2048 \
      -keyout /etc/nginx/certs/default.key \
      -out /etc/nginx/certs/default.crt \
      -days 3650 \
      -subj "/CN=localhost"

EXPOSE 80 443
VOLUME ["/data/sources", "/data/editions", "/data/config"]

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

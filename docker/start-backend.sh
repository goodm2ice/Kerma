#!/bin/sh
set -eu

cd /app/core

if [ -f /data/config/kerma.env ]; then
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --env-file /data/config/kerma.env
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000

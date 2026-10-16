FROM node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392 AS frontend
WORKDIR /build/frontend
ENV NODE_OPTIONS=--max-old-space-size=320
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/src/ ./src/
COPY frontend/public/ ./public/
COPY frontend/index.html frontend/tsconfig.json frontend/vite.config.ts ./
RUN npm run build

FROM python:3.12-slim-bookworm@sha256:34386ef0cb081344d7ec1c103ba398e6e9f64e9ab3a1509accc92a4e24a07258 AS runtime
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/app/backend GESTAO_ENV=railway
WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
COPY backend/app/ /app/backend/app/
COPY backend/migrations/ /app/backend/migrations/
COPY backend/alembic.ini /app/backend/alembic.ini
COPY --from=frontend /build/frontend/dist /app/frontend/dist
# /data must be a Railway volume at runtime; no VOLUME/image fallback and no build migration.
CMD ["python", "-m", "app.start"]

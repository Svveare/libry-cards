# Bothost: custom Dockerfile — monorepo root has package.json (Vite Mini App),
# so auto-detect picks Node and runs `node bot/main.py`. Force Python instead.
# Docs: https://bothost.ru/docs/custom-dockerfile
FROM python:3.11-slim

# Keep code outside /app — Bothost may bind-mount Git onto /app at runtime.
WORKDIR /usr/src/app

COPY bot/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY bot/ .

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
# Persist store/images on the mounted volume when present.
ENV DATA_PATH=/app/data/store.json
ENV CARDS_DIR=/app/data/cards

EXPOSE 3000
CMD ["python", "main.py"]

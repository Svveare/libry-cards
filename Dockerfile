# Bothost: root has requirements.txt + main.py (Python). Mini App lives in web/
# so package.json does not trigger Node autodetection.
FROM python:3.11-slim

WORKDIR /usr/src/app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY bot/ ./bot/
COPY web/src/data/content.json bot/data/content.json
COPY main.py .

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONMALLOC=malloc
ENV DATA_PATH=/app/data/store.json
ENV CARDS_DIR=/app/data/cards

EXPOSE 3000
CMD ["python", "main.py"]

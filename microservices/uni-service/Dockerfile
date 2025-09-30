FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENV=prod

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
# universities.json can be baked in OR mounted via volume/env path
COPY universities.json ./universities.json

# Health check (optional)
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8000/health || exit 1

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

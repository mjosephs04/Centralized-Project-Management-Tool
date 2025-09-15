FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    FLASK_ENV=production \
    PORT=8080

COPY ../requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn

# If your backend lives at src/backend, still copy the whole tree so imports work
COPY src/ ./src/

EXPOSE 8080
CMD ["python", "-m", "src.backend.app"]

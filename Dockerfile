FROM node:20-alpine AS webbuilder
WORKDIR /frontend

COPY src/frontend/package*.json ./
RUN npm ci

COPY src/frontend/ .

ARG BUILD_CMD=build
RUN npm run $BUILD_CMD

RUN mkdir -p /out && \
    if [ -d "build" ]; then cp -r build/* /out/; \
    elif [ -d "dist" ]; then cp -r dist/* /out/; \
    else echo "No frontend build output found" && exit 1; fi

FROM python:3.12-slim AS runtime
ENV PYTHONUNBUFFERED=1 \
    PORT=8080 \
    FLASK_ENV=production

WORKDIR /app

# System build tools only if you need them for wheels (optional)
# RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn

COPY src/ ./src/

COPY --from=webbuilder /out ./src/frontend_build

EXPOSE 8080

CMD ["python", "-m", "src.backend.app"]
